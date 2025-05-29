import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import {
  AmbientLight,
  DirectionalLight,
  LightingEffect,
  _GlobeView as GlobeView,
  MapView,
  COORDINATE_SYSTEM,
} from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, GeoJsonLayer } from '@deck.gl/layers';
import { HexagonLayer, GridLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import RangeInput from '../ui/RangeInput';
import Colorbar from '../ui/Colorbar';
import { getTooltip } from '../ui/MapTooltip';
import { determineTimeUnit, calculateTrendLine, calculateYAxisRange, findMode } from '../utils/chartUtils';
import { normalizeDataByYear } from '../utils/dataUtils';
import PolygonAggregationLayer from '../layers/PolygonAggregationLayer';

const MS_PER_DAY = 8.64e7;
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

export default function SummaryPlot({
  data = [],
  mapStyle = MAP_STYLE,
  radius = 5000,
  upperPercentile = 100,
  coverage = 1,
  elevationAggregation = 'SUM',
  colorAggregation = 'SUM',
  repeatedPointsAggregation = 'MEAN',
  preserveDomains = false,
  timeRange = [Infinity, -Infinity],
  animationSpeed = 1,
  isGridView = false,
  initialViewState = {
    longitude: -122.45,
    latitude: 37.78,
    zoom: 11,
    pitch: 30,
    bearing: 0,
  },
  projection = 'Mercator',
  summaryHeight = 25,
  colorRange = [
    [1, 152, 189],
    [73, 227, 206],
    [216, 254, 181],
    [254, 237, 177],
    [254, 173, 84],
    [209, 55, 78],
  ],
  legendTitle = 'Legend',
  colorScaleType = 'quantize',
  numDecimals = 1,
  factorLevels = null,
  themeColors = {
    elevation1: '#292d39',
    elevation2: '#181C20',
    elevation3: '#373C4B',
    accent1: '#0066DC',
    accent2: '#007BFF',
    accent3: '#3C93FF',
    highlight1: '#535760',
    highlight2: '#8C92A4',
    highlight3: '#FEFEFE',
  },
  filterColumnValues = [],
  theme = 'light',
  polygons = null,
  factorIcons = null,
  filterColumn = null,
  enableClickedTooltips = false,
  observable = null,
}) {
  const [filter, setFilter] = useState(timeRange);
  const [viewMode, setViewMode] = useState('historical');
  const [initialColorDomain, setInitialColorDomain] = useState(null);
  const [initialElevationDomain, setInitialElevationDomain] = useState(null);
  const [colorbarDomain, setColorbarDomain] = useState(initialColorDomain);
  const [clickedObject, setClickedObject] = useState(null);
  const [clickedCoordinates, setClickedCoordinates] = useState(null);

  // process data for seasonal view (normalize dates to the same year)
  const normalizedData = useMemo(() => {
    if (viewMode !== 'seasonal' || !data || data.length === 0) return data;
    return normalizeDataByYear(data);
  }, [data, viewMode]);
  
  // calculate time range for normalized data
  const normalizedTimeRange = useMemo(() => {
    if (viewMode !== 'seasonal' || !normalizedData || normalizedData.length === 0) {
      return timeRange;
    }
    
    return normalizedData.reduce(
      (range, d) => {
        const t = new Date(d.timestamp).getTime();
        range[0] = Math.min(range[0], t);
        range[1] = Math.max(range[1], t);
        return range;
      },
      [Infinity, -Infinity]
    );
  }, [normalizedData, timeRange, viewMode]);

  // update colorbarDomain when initialColorDomain changes
  useEffect(() => {
    if (initialColorDomain !== null) {
      setColorbarDomain(initialColorDomain);
    }
  }, [initialColorDomain]);

  // track domain initialization
  const domainInitializedRef = useRef(false);

  useEffect(() => {
    // reset domains when categorical variable changes
    console.log('Resetting domains due to data, time filter, filterColumnValues, or aggregation change');
    setInitialColorDomain(null);
    setInitialElevationDomain(null);

    domainInitializedRef.current = false;
  }, [data, filter, filterColumnValues, legendTitle, colorAggregation, elevationAggregation]);

  const directionalLight1 = new DirectionalLight({
    color: [255, 255, 255],
    intensity: 0.4,
    direction: [-1, -1, -1],
  });

  const directionalLight2 = new DirectionalLight({
    color: [255, 255, 255],
    intensity: 0.4,
    direction: [1, 1, 1],
  });

  const lightingEffect = new LightingEffect({ ambientLight, directionalLight1, directionalLight2 })

  function updateTimeRange(newFilter) {
    if ((filter[0] !== newFilter[0] || filter[1] !== newFilter[1]) && (!factorLevels || !factorLevels[legendTitle])) {
      setInitialColorDomain(null);
      setInitialElevationDomain(null);
    }
    setFilter(newFilter);
  }

  const aggregateRepeatedPoints = (points) => {
    const groupedPoints = points.reduce((acc, point) => {
      const timeKey = new Date(point.timestamp).getTime();
      if (!acc[timeKey]) acc[timeKey] = [];
      acc[timeKey].push(point);
      return acc;
    }, {});

    return Object.values(groupedPoints).map((group) => {
      const values = group.map((point) => point.value);
      if (repeatedPointsAggregation === 'SUM') return values.reduce((sum, val) => sum + val, 0);
      if (repeatedPointsAggregation === 'MEAN') return values.reduce((sum, val) => sum + val, 0) / values.length;
      if (repeatedPointsAggregation === 'MIN') return Math.min(...values);
      if (repeatedPointsAggregation === 'MAX') return Math.max(...values);
      if (repeatedPointsAggregation === 'MODE') return findMode(values);
      if (repeatedPointsAggregation === 'COUNT') return values.length;
      return values[0]; // default to first value
    });
  };

  const getAggregationFunction = (aggregation, defaultValue, currentFilter = filter) => (points) => {
    if (!points.length) return defaultValue;
    if (points[0].timestamp !== undefined) {
      points = points.filter((d) => {
        const timestamp = new Date(d.timestamp).getTime();
        return timestamp >= currentFilter[0] && timestamp <= currentFilter[1];
      });
    }
    if (!points.length) return defaultValue;

    if (repeatedPointsAggregation !== 'None') {
      points = aggregateRepeatedPoints(points);
    } else {
      points = points.map(point => typeof point === 'object' ? point.value : point);
    }

    if (aggregation === 'SUM') return points.reduce((sum, val) => sum + val, 0);
    if (aggregation === 'MEAN') return points.reduce((sum, val) => sum + val, 0) / points.length;
    if (aggregation === 'COUNT') return points.length;
    if (aggregation === 'MIN') return Math.min(...points);
    if (aggregation === 'MAX') return Math.max(...points);
    if (aggregation === 'MODE') return findMode(points);
    return defaultValue;
  };

  const elevationFunction = getAggregationFunction(elevationAggregation, 0);
  const colorFunction = getAggregationFunction(colorAggregation, 0);


  const onSetColorDomain = (colorDomain) => {
    // if using factor levels, set a predefined domain
    if (factorLevels && factorLevels[legendTitle]) {
      const factorLevelsDomain = [0, factorLevels[legendTitle].length - 1];
      setInitialColorDomain(factorLevelsDomain);
      return;
    }

    // prevent multiple unnecessary domain sets
    if (domainInitializedRef.current) return;

    // apply domain preservation logic
    if (preserveDomains && initialColorDomain !== null) {
      const newDomain = [
        Math.min(colorDomain[0], initialColorDomain[0]),
        Math.max(colorDomain[1], initialColorDomain[1])
      ];
      setInitialColorDomain(newDomain);
      domainInitializedRef.current = true;
    } else {
      setInitialColorDomain(colorDomain);
      domainInitializedRef.current = true;
    }

    console.log('Setting color domain to:', colorDomain);
  }

  let updateTriggers = {
    getColorValue: [filter, data, legendTitle, colorAggregation, radius, coverage],
    getPosition: [data, legendTitle, radius, coverage],
  }

  if (summaryHeight > 0) {
    updateTriggers.getElevationValue = updateTriggers.getColorValue;
  }

  // parse polygon data if provided as string
  const parsedPolygons = useMemo(() => {
    if (!polygons) return null;
    
    try {
      return typeof polygons === 'string' ? JSON.parse(polygons) : polygons;
    } catch (error) {
      console.error('Error parsing polygon data in SummaryPlot:', error);
      return null;
    }
  }, [polygons]);

  const layers = [
    // add polygon layer if we have polygons
    parsedPolygons && new PolygonAggregationLayer({
      id: 'polygon-layer',
      data: parsedPolygons,
      allData: normalizedData, // Pass all data for aggregation
      filter: filter, // Pass time filter
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      lineWidthMinPixels: 2,
      lineWidthScale: 2,
      getLineColor: [0, 0, 0, 240],
      getFillColor: [200, 200, 200, 40],
      getLineWidth: 1,
      wireframe: true,
      updateTriggers: {
        getLineColor: [theme],
        getFillColor: [theme],
        filter: [filter]
      }
    }),
    isGridView
      ? new GridLayer({
        id: 'grid-heatmap',
        colorRange,
        coverage,
        data: normalizedData,
        extruded: summaryHeight > 0,
        elevationScale: normalizedData.length ? summaryHeight : 0,
        getPosition: (d) => [d.lng, d.lat],
        pickable: true,
        cellSize: radius,
        getElevationValue: elevationFunction,
        getColorValue: colorFunction,
        upperPercentile,
        material: {
          ambient: 0.84,
          diffuse: 0.8,
          shininess: 32,
          specularColor: [51, 51, 51],
        },
        onSetColorDomain,
        onSetElevationDomain: onSetColorDomain,
        colorDomain: initialColorDomain,
        elevationDomain: initialElevationDomain,
        updateTriggers: updateTriggers,
        colorScaleType
      })
      : new HexagonLayer({
        id: 'hex-heatmap',
        colorRange,
        coverage,
        data: normalizedData,
        extruded: summaryHeight > 0,
        elevationScale: normalizedData.length ? summaryHeight : 0,
        getPosition: (d) => [d.lng, d.lat],
        pickable: true,
        radius,
        getElevationValue: elevationFunction,
        getColorValue: colorFunction,
        upperPercentile,
        material: {
          ambient: 0.84,
          diffuse: 0.8,
          shininess: 32,
          specularColor: [51, 51, 51],
        },
        onSetColorDomain,
        onSetElevationDomain: onSetColorDomain,
        colorDomain: initialColorDomain,
        elevationDomain: initialElevationDomain,
        updateTriggers: updateTriggers,
        colorScaleType
      }),
  ];

  if (projection === 'Globe') {
    let tileLayer = new TileLayer({
      data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 64,

      renderSubLayers: (props) => {
        const {
          bbox: { west, south, east, north },
        } = props.tile;

        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          bounds: [west, south, east, north],
        });
      },
    });
    // add to layers at front so rendered behind data
    layers.unshift(tileLayer);
  }

  const relevantFactorLevels = (factorLevels && factorLevels[legendTitle]) || null;

  // use normalizedData when in seasonal view
  const displayData = viewMode === 'seasonal' ? normalizedData : data;
  const displayTimeRange = viewMode === 'seasonal' ? normalizedTimeRange : timeRange;

  // handle click events on the map
  const handleClick = (info, event) => {
    if (!enableClickedTooltips) return;
    
    if (!info.object) {
      setClickedObject(null);
      setClickedCoordinates(null);
      return;
    }
    
    setClickedObject(info.object);
    setClickedCoordinates(info.coordinate);
    
    event.stopPropagation();
  };

  // return tooltip content for hover or clicked object
  const getTooltipContent = (pickInfo) => {
    if (enableClickedTooltips && !clickedObject) {
      return null;
    }

    if (enableClickedTooltips && clickedObject) {
      const clickedPickInfo = {
        object: clickedObject,
        coordinate: clickedCoordinates,
        layer: pickInfo.layer
      };
      
      return getTooltip(clickedPickInfo, {
        colorAggregation,
        filter,
        hasTime: !isNaN(timeRange[0]),
        factorLevels: factorLevels,
        allData: displayData,
        columnName: legendTitle,
        factorIcons: factorIcons,
        filterColumn: filterColumn,
        observable: observable
      });
    }
    
    return getTooltip(pickInfo, {
      colorAggregation,
      filter,
      hasTime: !isNaN(timeRange[0]),
      factorLevels: factorLevels,
      allData: displayData,
      columnName: legendTitle,
      factorIcons: factorIcons,
      filterColumn: filterColumn,
      observable: observable
    });
  };

  return (
    <>
      <DeckGL
        views={projection === 'Globe' ? new GlobeView() : new MapView()}
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={getTooltipContent}
        onClick={enableClickedTooltips ? handleClick : undefined}
      >
        {projection === 'Mercator' && <Map reuseMaps mapStyle={mapStyle} />}
      </DeckGL>
      {!isNaN(timeRange[0]) && (
        <RangeInput
          min={displayTimeRange[0]}
          max={displayTimeRange[1]}
          value={filter}
          animationSpeed={MS_PER_DAY * animationSpeed}
          formatLabel={(timestamp) => {
            const date = new Date(timestamp);
            return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
          }}
          onChange={updateTimeRange}
          data={displayData}
          onViewModeChange={(mode) => setViewMode(mode)}
          viewMode={viewMode}
        />
      )}
      <Colorbar colorRange={colorRange} colorDomain={colorbarDomain} title={legendTitle} numDecimals={numDecimals} themeColors={themeColors} factorLevels={factorLevels} />
    </>
  );
}
