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

const MAP_VIEW = new MapView({ repeat: true, farZMultiplier: 100 });
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';
const MS_PER_DAY = 8.64e7;
const dataFilter = new DataFilterExtension({ filterSize: 1, fp64: false });

function formatLabel(timestamp) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
}

function getMinMaxValues(data, key) {
  return data.reduce(
    (range, d) => {
      const value = d[key];
      range[0] = Math.min(range[0], value);
      range[1] = Math.max(range[1], value);
      return range;
    },
    [Infinity, -Infinity]
  );
}

// Function to check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygon) {
  // For MultiPolygon, check each polygon
  if (polygon.geometry.type === 'MultiPolygon') {
    return polygon.geometry.coordinates.some(coords => {
      // Check main polygon (first coordinate array)
      return coords.some(ring => {
        return isPointInRing(point, ring);
      });
    });
  }
  
  // For simple Polygon
  if (polygon.geometry.type === 'Polygon') {
    // Check if the point is in the outer ring
    return isPointInRing(point, polygon.geometry.coordinates[0]);
  }
  
  return false;
}

function isPointInRing(point, ring) {
  const x = point[0], y = point[1];
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Function to determine the appropriate time unit based on the data range
function determineTimeUnit(data) {
  if (!data || data.length < 2) return 'day';
  
  // Calculate time range in milliseconds
  const timeRange = Math.max(...data.map(d => d.x)) - Math.min(...data.map(d => d.x));
  
  // Determine appropriate unit based on range
  if (timeRange < 1000 * 60) return 'millisecond'; // Less than a minute
  if (timeRange < 1000 * 60 * 60) return 'minute'; // Less than an hour
  if (timeRange < 1000 * 60 * 60 * 24) return 'hour'; // Less than a day
  if (timeRange < 1000 * 60 * 60 * 24 * 7) return 'day'; // Less than a week
  if (timeRange < 1000 * 60 * 60 * 24 * 30) return 'week'; // Less than a month
  if (timeRange < 1000 * 60 * 60 * 24 * 365) return 'month'; // Less than a year
  return 'year'; // More than a year
}

// Calculate LOESS regression for trend line
function calculateTrendLine(data, bandwidth = 0.3) {
  if (data.length < 3) return [];
  
  // Simple implementation of LOESS (locally weighted regression)
  const trendData = [];
  const n = data.length;
  
  // Create x points for smooth curve
  const numPoints = Math.min(100, n);
  const xRange = data[n-1].x - data[0].x;
  const step = xRange / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const x = data[0].x + i * step;
    
    // Calculate weighted regression at this point
    let numerator = 0;
    let denominator = 0;
    
    for (let j = 0; j < n; j++) {
      // Calculate distance-based weight
      const dist = Math.abs(x - data[j].x) / xRange;
      const weight = dist <= bandwidth ? Math.pow(1 - Math.pow(dist / bandwidth, 3), 3) : 0;
      
      if (weight > 0) {
        numerator += weight * data[j].y;
        denominator += weight;
      }
    }
    
    // Only add points where we have enough data for smoothing
    if (denominator > 0) {
      trendData.push({
        x: x,
        y: numerator / denominator
      });
    }
  }
  
  return trendData;
}

// Calculate appropriate y-axis range with padding
function calculateYAxisRange(data) {
  if (!data || data.length === 0) return { min: 0, max: 1 };
  
  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  
  // Add 10% padding above and below
  const padding = (maxY - minY) * 0.1;
  
  // If min and max are very close, add some separation
  if (Math.abs(maxY - minY) < 0.001) {
    return { 
      min: minY - 0.5, 
      max: maxY + 0.5 
    };
  }
  
  return { 
    min: minY - padding, 
    max: maxY + padding 
  };
}

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
  theme = 'light',
  polygons = null,
  factorIcons = null,
  filterColumn = null
}) {
  const [filter, setFilter] = useState(timeRange);
  const [viewMode, setViewMode] = useState('historical');

  console.log("[ScatterTimePlot] Initializing with:", { 
    filterColumn, 
    columnName,
    "Has factorLevels": factorLevels ? Object.keys(factorLevels).length > 0 : false,
    "Has factorIcons": factorIcons ? Object.keys(factorIcons).length > 0 : false
  });

  // process data for seasonal view (normalize all dates to the same year)
  const normalizedData = useMemo(() => {
    if (viewMode !== 'seasonal' || !data || data.length === 0) return data;
    
    // use a reference year (2000 as it's a leap year)
    const referenceYear = 2000;
    
    return data.map(d => {
      const date = new Date(d.timestamp);
      // create a new date with the same month/day but reference year
      const normalizedDate = new Date(
        referenceYear,
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      );
      
      return {
        ...d,
        originalTimestamp: d.timestamp,
        timestamp: normalizedDate.toISOString()
      };
    });
  }, [data, viewMode]);
  
  // calculate time range for the normalized data
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

  // use the appropriate data and time range based on view mode
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

  // parse polygon data if it's provided as a string
  const parsedPolygons = useMemo(() => {
    if (!polygons) {
      console.log('No polygon data in ScatterTimePlot');
      return null;
    }
    
    console.log('ScatterTimePlot processing polygon data');
    try {
      const parsed = typeof polygons === 'string' ? JSON.parse(polygons) : polygons;
      console.log('ScatterTimePlot parsed polygon data:', parsed);
      
      // check if it's a valid GeoJSON object
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
    parsedPolygons && new GeoJsonLayer({
      id: 'polygon-layer',
      data: parsedPolygons,
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
      getElevation: 0,
      opacity: 1,
      parameters: {
        depthTest: false // ensure polygons render on top
      },
      updateTriggers: {
        getLineColor: [theme], // update based on theme
        getFillColor: [theme],
      },
      onAfterUpdate: () => {
        console.log('GeoJsonLayer updated in ScatterTimePlot');
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

  return (
    <>
      <DeckGL
        views={projection === 'Globe' ? new GlobeView() : MAP_VIEW}
        layers={layers}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={({ object, layer }) => getTooltip(
          { object, layer },
          {
            hasTime: !isNaN(displayTimeRange[0]),
            factorLevels: factorLevels,
            allData: displayData,
            filter,
            columnName: columnName,
            factorIcons: factorIcons,
            filterColumn: filterColumn
          }
        )}
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
        factorIcons={factorIcons}
      />
    </>
  );
}
