import React, { useEffect, useState, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { MapView, _GlobeView as GlobeView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import RangeInput from '../ui/RangeInput';
import Colorbar from '../ui/Colorbar'; // Import Colorbar
import * as d3 from 'd3';

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

function getTooltip({ object }, hasTime, factorLevels = null) {
  if (!object) {
    return;
  }

  let valueToShow = object.value != null ? object.value : '';
  if (factorLevels) {
    valueToShow = factorLevels[valueToShow];
  } else {
    if (object.value === null) {
      valueToShow = null;
    } else {
      valueToShow = object.value.toFixed(2)
    }
  }

  const html = `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.4;
      border-radius: 16px;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      max-width: 300px;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #1DA1F2;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        ">

            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
        </div>
        <div>
          <div style="font-weight: bold; color: #14171A; font-size: 16px;">Location Data</div>
          <div style="color: #657786; font-size: 14px; display: flex; align-items: center; gap: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            ${object.lng.toFixed(4)}°, ${object.lat.toFixed(4)}°
          </div>
        </div>
      </div>
      ${hasTime ? `
        <div style="color: #657786; font-size: 14px; margin-bottom: 8px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          ${new Date(object.timestamp).toUTCString()}
        </div>
      ` : ''}
      <div style="color: #657786; font-size: 14px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
        Value: ${valueToShow}
      </div>
    </div>
  `;

  return {
    html,
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      borderRadius: 0
    }
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
  colorRange = [ // Define a default color range
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
  factorLevels = null
}) {
  const [filter, setFilter] = useState(timeRange);
  const [viewMode, setViewMode] = useState('historical');

  // Process data for seasonal view (normalize all dates to the same year)
  const normalizedData = useMemo(() => {
    if (viewMode !== 'seasonal' || !data || data.length === 0) return data;
    
    // Use a reference year (2000 as it's a leap year)
    const referenceYear = 2000;
    
    return data.map(d => {
      const date = new Date(d.timestamp);
      // Create a new date with the same month/day but reference year
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
  
  // Calculate time range for the normalized data
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

  // Use the appropriate data and time range based on view mode
  const displayData = viewMode === 'seasonal' ? normalizedData : data;
  const displayTimeRange = viewMode === 'seasonal' ? normalizedTimeRange : timeRange;

  const [minValue, maxValue] = useMemo(() => getMinMaxValues(displayData, 'value'), [displayData]);

  // Use d3.scaleQuantize to map the color range to the value domain
  const colorScale = useMemo(() =>
    d3.scaleQuantize()
      .domain([minValue, maxValue])
      .range(colorRange),
    [minValue, maxValue, colorRange]
  );

  const layers = [
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
        return [0, 0, 0, 255]; // Fallback color for invalid or null values
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
  ];

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

  return (
    <>
      <DeckGL
        views={projection === 'Globe' ? new GlobeView() : MAP_VIEW}
        layers={layers}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={({ object }) => getTooltip(
          { object },
          !isNaN(displayTimeRange[0]),
          factorLevels && factorLevels[columnName] ? factorLevels[columnName] : null
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
      />
    </>
  );
}
