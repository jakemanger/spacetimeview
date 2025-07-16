import React, { useEffect, useState, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { MapView, _GlobeView as GlobeView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import RangeInput from '../ui/RangeInput';
import Colorbar from '../ui/Colorbar';
import * as d3 from 'd3';
import { getTooltip } from '../ui/MapTooltip';
import { determineTimeUnit, calculateTrendLine, calculateYAxisRange, getMinMaxValues, formatLabel } from '../utils/chartUtils';
import { normalizeDataByYear } from '../utils/dataUtils';
import PolygonAggregationLayer from '../layers/PolygonAggregationLayer';

const MAP_VIEW = new MapView({ repeat: true, farZMultiplier: 100 });
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';
const MS_PER_DAY = 8.64e7;
const dataFilter = new DataFilterExtension({ filterSize: 1, fp64: false });

export default function ScatterTimePlot({
  data = [],
  mapStyle = MAP_STYLE,
  timeRange = [Infinity, -Infinity],
  animationSpeed = 1,
  initialViewState = { longitude: 0, latitude: 0, zoom: 3, pitch: 0, bearing: 0 },
  radiusScale = 150,
  radiusMinPixels = 5,
  projection = 'Mercator',
  colorRange = [
    [1, 152, 189],
    [73, 227, 206],
    [216, 254, 181],
    [254, 237, 177],
    [254, 173, 84],
    [209, 55, 78],
  ],
  columnName = 'value',
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
  factorLevels = null,
  factorColors = null,
  theme = 'light',
  polygons = null,
  factorIcons = null,
  filterColumn = null,
  enableClickedTooltips = false,
  observable = null
}) {
  const [filter, setFilter] = useState(timeRange);
  const [viewMode, setViewMode] = useState('historical');
  const [clickedObject, setClickedObject] = useState(null);
  const [clickedCoordinates, setClickedCoordinates] = useState(null);

  useEffect(() => {
    // When the component mounts or the timeRange prop changes,
    // explicitly set the filter.
    // Using a new array instance ([...timeRange]) ensures that
    // React treats this as a state change, triggering a re-render
    // and providing a "fresh" filterRange to the DeckGL layer.
    if (timeRange && timeRange.length === 2 && !isNaN(timeRange[0]) && !isNaN(timeRange[1])) {
      setFilter([...timeRange]);
    }
  }, [timeRange]); // Removed setFilter from dependency array as it's a setter from useState and doesn't change

  console.log("[ScatterTimePlot] Initializing with:", { 
    filterColumn, 
    columnName,
    "Has factorLevels": factorLevels ? Object.keys(factorLevels).length > 0 : false,
    "Has factorIcons": factorIcons ? Object.keys(factorIcons).length > 0 : false
  });

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

  // use appropriate data and time range based on view mode
  const displayData = viewMode === 'seasonal' ? normalizedData : data;
  const displayTimeRange = viewMode === 'seasonal' ? normalizedTimeRange : timeRange;

  const [minValue, maxValue] = useMemo(() => getMinMaxValues(displayData, 'value'), [displayData]);

  // use d3.scaleQuantize to map the color range to the value domain
  const colorScale = useMemo(() =>
    d3.scaleQuantize()
      .domain([minValue, maxValue])
      .range(colorRange),
    [minValue, maxValue, colorRange]
  );

  // parse polygon data if provided as string
  const parsedPolygons = useMemo(() => {
    if (!polygons) {
      console.log('No polygon data in ScatterTimePlot');
      return null;
    }
    
    console.log('ScatterTimePlot processing polygon data');
    try {
      const parsed = typeof polygons === 'string' ? JSON.parse(polygons) : polygons;
      console.log('ScatterTimePlot parsed polygon data:', parsed);
      
      if (parsed && parsed.type && parsed.features) {
        console.log(`ScatterTimePlot: Valid GeoJSON with ${parsed.features.length} features`);
        return parsed;
      } else {
        console.warn('ScatterTimePlot: Invalid GeoJSON structure', parsed);
        return null;
      }
    } catch (error) {
      console.error('Error parsing polygon data in ScatterTimePlot:', error);
      console.log('Raw polygon data preview:', polygons.substring(0, 200) + '...');
      return null;
    }
  }, [polygons]);

  const layers = [
    // add polygon layer if we have polygons
    parsedPolygons && new PolygonAggregationLayer({
      id: 'polygon-layer',
      data: parsedPolygons,
      allData: displayData, // Pass all data for aggregation
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
    filter && new ScatterplotLayer({
      id: 'scatterplot',
      data: displayData,
      opacity: 0.8,
      radiusScale: radiusScale,
      radiusMinPixels: radiusMinPixels,
      wrapLongitude: true,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => {
        if (d.value != null) {
          const color = colorScale(d.value);
          if (color) {
            return color
          }
        }
        return [0, 0, 0, 255]; // fallback color for invalid or null values
      },
      getFilterValue: d => new Date(d.timestamp).getTime(),
      filterRange: [filter[0], filter[1]],
      filterSoftRange: [
        filter[0] * 0.999 + filter[1] * 0.001,
        filter[0] * 0.001 + filter[1] * 0.999
      ],
      extensions: [dataFilter],
      pickable: true,
      billboard: true
    })
  ].filter(Boolean); // filter out any nulls from the layers array

  if (projection === 'Globe') {
    let tileLayer = new TileLayer({
      data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 64,
      renderSubLayers: props => {
        const { bbox: { west, south, east, north } } = props.tile;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          bounds: [west, south, east, north]
        });
      }
    });
    layers.unshift(tileLayer);
  }

  const relevantFactorLevels = factorLevels && factorLevels[columnName] ? factorLevels[columnName] : null;

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
        hasTime: !isNaN(displayTimeRange[0]), 
        factorLevels: factorLevels,
        allData: displayData,
        filter,
        columnName: columnName,
        factorIcons: factorIcons,
        filterColumn: filterColumn,
        observable: observable
      });
    }

    return getTooltip(pickInfo, {
      hasTime: !isNaN(displayTimeRange[0]),
      factorLevels: factorLevels,
      allData: displayData,
      filter,
      columnName: columnName,
      factorIcons: factorIcons,
      filterColumn: filterColumn,
      observable: observable
    });
  };

  return (
    <>
      <DeckGL
        views={projection === 'Globe' ? new GlobeView() : MAP_VIEW}
        layers={layers}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={getTooltipContent}
        onClick={enableClickedTooltips ? handleClick : undefined}
      >
        {projection === 'Mercator' && (
          <Map reuseMaps mapStyle={mapStyle} />
        )}
      </DeckGL>
      {!isNaN(displayTimeRange[0]) && (
        <RangeInput
          min={displayTimeRange[0]}
          max={displayTimeRange[1]}
          value={filter}
          animationSpeed={MS_PER_DAY * animationSpeed}
          formatLabel={formatLabel}
          onChange={setFilter}
          data={displayData}
          onViewModeChange={(mode) => setViewMode(mode)}
          viewMode={viewMode}
        />
      )}
      <Colorbar
        colorRange={colorRange}
        colorDomain={
          factorLevels && factorLevels[columnName]
            ? Array.from({ length: factorLevels[columnName].length }, (_, i) => i)
            : [minValue, maxValue]
        }
        title={columnName}
        numDecimals={2}
        themeColors={themeColors}
        factorLevels={factorLevels}
        factorColors={factorColors}
        factorIcons={factorIcons}
      />
    </>
  );
}
