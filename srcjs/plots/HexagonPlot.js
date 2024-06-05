import React, { useState, useMemo } from 'react';
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

const INITIAL_VIEW_STATE = {
  longitude: -1.415727,
  latitude: 52.232395,
  zoom: 6.6,
  pitch: 40.5,
  bearing: -27
};

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

	// console.log(object)
	
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

function getTimeRange(data) {
  if (!data) {
    return null;
  }
  return data.reduce(
    (range, d) => {
      const t = new Date(d.timestamp).getTime();
      range[0] = Math.min(range[0], t);
      range[1] = Math.max(range[1], t);
      return range;
    },
    [Infinity, -Infinity]
  );
}

export default function HexagonPlot({
  data = [],
  mapStyle = MAP_STYLE,
  radius = 1000,
  upperPercentile = 100,
  coverage = 1,
  elevationAggregation = 'SUM',
  colorAggregation = 'SUM'
}) {
  const timeRange = useMemo(() => getTimeRange(data), [data]);
  const [filter, setFilter] = useState(timeRange);

  const filteredData = useMemo(() => {
    if (!filter || !data.length) {
      return data;
    }
    return data.filter(d => {
      const timestamp = new Date(d.timestamp).getTime();
      return timestamp >= filter[0] && timestamp <= filter[1];
    });
  }, [data, filter]);

  const getAggregationFunction = (aggregation, defaultValue) => {
    return points => {
      if (!points.length) return 0;
      const values = points.map(point => point.value !== undefined ? point.value : defaultValue);
      if (aggregation === 'SUM') {
        return values.reduce((sum, val) => sum + val, 0);
      } else if (aggregation === 'MEAN') {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      }
      return 0; // Default case, should not reach here
    };
  };

  const elevationFunction = getAggregationFunction(elevationAggregation, 1);
  const colorFunction = getAggregationFunction(colorAggregation, 1);

  const layers = [
    new HexagonLayer({
      id: 'heatmap',
      colorRange,
      coverage,
      data: filteredData,
      elevationRange: [0, 3000], // Set an initial elevation range
      elevationScale: filteredData.length ? 50 : 0,
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
      transitions: {
        elevationScale: 3000
      },
      onSetColorValue: ({ value }) => {
        if (value !== undefined) {
          return value;
        }
        return 1; // Default to 1 if no value is defined
      },
      onSetElevationValue: ({ value }) => {
        if (value !== undefined) {
          return value;
        }
        return 1; // Default to 1 if no value is defined
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
          onChange={setFilter}
        />
      )}
    </>
  );
}
