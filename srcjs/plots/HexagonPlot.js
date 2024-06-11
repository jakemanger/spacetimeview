import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import RangeInput from '../ui/RangeInput'; // Make sure to import the RangeInput component

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const lightingEffect = new LightingEffect({ ambientLight, pointLight1, pointLight2 });

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const colorRange = [
  [1, 152, 189],
  [73, 227, 206],
  [216, 254, 181],
  [254, 237, 177],
  [254, 173, 84],
  [209, 55, 78]
];

function getTooltip({ object }, elevationAggregation) {
  if (!object) {
    return null;
  }

  const lat = object.position[1];
  const lng = object.position[0];

  let metricName = (
    elevationAggregation.charAt(0).toUpperCase()
    + elevationAggregation.toLowerCase().slice(1)
  );

  return `\
    latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ''}
    longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ''}
    ${metricName}: ${object.elevationValue}`
}

export default function HexagonPlot({
  data = [],
  mapStyle = MAP_STYLE,
  radius = 1000,
  upperPercentile = 100,
  coverage = 1,
  elevationAggregation = 'SUM',
  colorAggregation = 'SUM',
  preserveDomains = false,
  timeRange = [Infinity, -Infinity]
}) {
  const [filter, setFilter] = useState(timeRange);
  const [triggerDomainUpdate, setTriggerDomainUpdate] = useState(false);

  const initialColorDomain = useRef(null);
  const initialElevationDomain = useRef(null);

  // Reset initial domains when data or aggregation function changes
  useEffect(() => {
    if (preserveDomains) {
      initialColorDomain.current = null;
      initialElevationDomain.current = null;

      // Temporarily set the filter to include the entire dataset
      setTriggerDomainUpdate(true);
      setFilter([0, Infinity]);
    }
  }, [data, elevationAggregation, colorAggregation, preserveDomains]);

  useEffect(() => {
    if (triggerDomainUpdate) {
      setTriggerDomainUpdate(false);
      // Reapply the original filter after domains are recalculated
      setFilter(timeRange);
    }
  }, [triggerDomainUpdate, timeRange]);

  const getAggregationFunction = (aggregation, defaultValue, currentFilter = filter) => {
    return points => {
      if (!points.length) return defaultValue;

      points = points.filter(d => {
        const timestamp = new Date(d.timestamp).getTime();
        return timestamp >= currentFilter[0] && timestamp <= currentFilter[1];
      });

      if (!points.length) return defaultValue;

      const values = points.map(point => point.value !== undefined ? point.value : defaultValue);

      if (aggregation === 'SUM') {
        return values.reduce((sum, val) => sum + val, 0);
      } else if (aggregation === 'MEAN') {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      } else if (aggregation === 'COUNT') {
        return values.length;
      } else if (aggregation === 'MIN') {
        return Math.min(...values);
      } else if (aggregation === 'MAX') {
        return Math.max(...values);
      }
      return defaultValue; // Default case, should not reach here
    };
  };

  const elevationFunction = getAggregationFunction(elevationAggregation, 1);
  const colorFunction = getAggregationFunction(colorAggregation, 1);

  // find average of longitude and latitude and use as initial view state
  let INITIAL_VIEW_STATE = {
    longitude: data.reduce((sum, d) => sum + d.lng, 0) / data.length,
    latitude: data.reduce((sum, d) => sum + d.lat, 0) / data.length,
    zoom: 6.6,
    pitch: 40.5,
    bearing: -27
  };

  const layers = [
    new HexagonLayer({
      id: 'heatmap',
      colorRange,
      coverage,
      data: data,
      elevationRange: [0, 3000], // Set an initial elevation range
      elevationScale: data.length ? 50 : 0,
      extruded: true,
      getPosition: d => [d.lng, d.lat],
      pickable: true,
      radius,
      getElevationValue: elevationFunction,
      getColorValue: colorFunction,
      upperPercentile,
      material: {
        ambient: 0.64,
        diffuse: 0.6,
        shininess: 32,
        specularColor: [51, 51, 51]
      },
      onSetColorDomain: colorDomain => {
        if (preserveDomains && !initialColorDomain.current) {
          initialColorDomain.current = colorDomain;
        }
        if (!preserveDomains) {
          initialColorDomain.current = colorDomain;
        }
      },
      onSetElevationDomain: elevationDomain => {
        if (preserveDomains && !initialElevationDomain.current) {
          initialElevationDomain.current = elevationDomain;
        }
        if (!preserveDomains) {
          initialElevationDomain.current = elevationDomain;
        }
      },
      colorDomain: preserveDomains ? initialColorDomain.current : null,
      elevationDomain: preserveDomains ? initialElevationDomain.current : null,
      updateTriggers: {
        getElevationValue: [filter, elevationAggregation],
        getColorValue: [filter, colorAggregation],
        getPosition: [filter, data]
      }
    })
  ];

  return (
    <>
      <DeckGL
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        getTooltip={({ object }) => getTooltip({ object }, elevationAggregation)}
      >
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>
      {timeRange && (
        <RangeInput
          min={timeRange[0]}
          max={timeRange[1]}
          value={filter}
          animationSpeed={8.64e7 * 30} // 30 days in milliseconds
          formatLabel={timestamp => {
            const date = new Date(timestamp);
            return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
          }}
          onChange={v => setFilter(v)}
        />
      )}
    </>
  );
}
