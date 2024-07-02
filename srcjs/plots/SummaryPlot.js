import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import { HexagonLayer, GridLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import RangeInput from '../ui/RangeInput';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const MS_PER_DAY = 8.64e7;

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

function getTooltip({ object }, elevationAggregation, filter) {
  if (!object) {
    return null;
  }

  const lat = object.position[1];
  const lng = object.position[0];

  let metricName = (
    elevationAggregation.charAt(0).toUpperCase()
    + elevationAggregation.toLowerCase().slice(1)
  );

  let seriesData = object.points.map(d => ({
    x: new Date(d.source.timestamp).getTime(),
    y: d.source.value,
  }));

  // filter by timestamp
  seriesData = seriesData.filter(d => {
    let timestamp = d.x;
    return timestamp >= filter[0] && timestamp <= filter[1];
  });

  const chartId = `chart-${lat}-${lng}`;

  setTimeout(() => {
    const ctx = document.getElementById(chartId).getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: seriesData.map(d => new Date(d.x).toISOString().slice(0, 10)),
        datasets: [
          {
            label: 'Data Over Time',
            data: seriesData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            cubicInterpolationMode: 'monotone',
            tension: 0.4
          }
        ]
      },
      options: {
        scales: {
          x: {
            type: 'time',
          },
          y: {
            title: {
              display: true,
              text: 'Values'
            }
          }
        }
      }
    });
  }, 0);

  return {
    html: `
      <div>
        <p>Latitude: ${Number.isFinite(lat) ? lat.toFixed(2) : ''}</p>
        <p>Longitude: ${Number.isFinite(lng) ? lng.toFixed(2) : ''}</p>
        <p>${metricName}: ${object.elevationValue.toFixed(2)}</p>
        <canvas id="${chartId}" style="width: 300px; height: 200px;"></canvas>
      </div>
    `,
    style: {
      color: '#333',
      backgroundColor: '#fff',
      borderRadius: '5px',
      lineHeight: '0.5',
      padding: '5px',
    },
  };
}

export default function SummaryPlot({
  data = [],
  mapStyle = MAP_STYLE,
  radius = 5000,
  upperPercentile = 100,
  coverage = 1,
  elevationAggregation = 'SUM',
  colorAggregation = 'SUM',
  preserveDomains = false,
  timeRange = [Infinity, -Infinity],
  animationSpeed = 1,
  theme = 'dark',
  isGridView = false,
  initialViewState = {
    longitude: -122.45,
    latitude: 37.78,
    zoom: 11,
    pitch: 30,
    bearing: 0
  }
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
  }, [data, elevationAggregation, colorAggregation, preserveDomains, radius, coverage]);

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
        return timestamp >= currentFilter[0] && currentFilter[1] !== -Infinity ? timestamp <= currentFilter[1] : true;
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

  const layers = [
    isGridView
      ? new GridLayer({
          id: 'grid-heatmap',
          colorRange,
          coverage,
          data: data,
          elevationRange: [0, 3000], // Set an initial elevation range
          elevationScale: data.length ? 50 : 0,
          extruded: true,
          getPosition: d => [d.lng, d.lat],
          pickable: true,
          cellSize: radius,
          getElevationValue: elevationFunction,
          getColorValue: colorFunction,
          upperPercentile,
          material: {
            ambient: 0.84,
            diffuse: 0.8,
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
            getElevationValue: [filter, elevationAggregation, radius, coverage],
            getColorValue: [filter, colorAggregation, radius, coverage],
            getPosition: [filter, data, radius, coverage]
          }
        })
      : new HexagonLayer({
          id: 'hex-heatmap',
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
            ambient: 0.84,
            diffuse: 0.8,
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
            getElevationValue: [filter, elevationAggregation, radius, coverage],
            getColorValue: [filter, colorAggregation, radius, coverage],
            getPosition: [filter, data, radius, coverage]
          }
        })
  ];

  return (
    <>
      <DeckGL
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={({ object }) => getTooltip({ object }, elevationAggregation, filter)}
      >
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>
      {timeRange && (
        <RangeInput
          min={timeRange[0]}
          max={timeRange[1]}
          value={filter}
          animationSpeed={MS_PER_DAY * animationSpeed}
          formatLabel={timestamp => {
            const date = new Date(timestamp);
            return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
          }}
          onChange={v => setFilter(v)}
          data={data}
        />
      )}
    </>
  );
}
