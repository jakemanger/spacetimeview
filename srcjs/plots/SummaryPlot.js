import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import {
	AmbientLight, 
	PointLight, 
	LightingEffect, 
	_GlobeView as GlobeView, 
	MapView,
	COORDINATE_SYSTEM
} from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { HexagonLayer, GridLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import RangeInput from '../ui/RangeInput';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const MS_PER_DAY = 8.64e7;
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

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

const colorRange = [
  [1, 152, 189], [73, 227, 206], [216, 254, 181],
  [254, 237, 177], [254, 173, 84], [209, 55, 78]
];

function getTooltip({ object }, elevationAggregation, filter) {
  if (!object) return null;

  const { position, points, elevationValue } = object;
  const lat = position[1];
  const lng = position[0];
  const metricName =
    elevationAggregation.charAt(0).toUpperCase() +
    elevationAggregation.slice(1).toLowerCase();
  const chartId = `chart-${lat}-${lng}`;

  let seriesData = points
    .map(d => ({
      x: new Date(d.source.timestamp).getTime(),
      y: d.source.value
    }))
    .filter(d => d.x >= filter[0] && d.x <= filter[1]);

  setTimeout(() => {
    const ctx = document.getElementById(chartId)?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: seriesData.map(d =>
            new Date(d.x).toISOString().slice(0, 10)
          ),
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
              type: 'time'
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
    }
  }, 0);

  return {
    html: `
      <div>
        <p>Latitude: ${lat.toFixed(2)}</p>
        <p>Longitude: ${lng.toFixed(2)}</p>
        <p>${metricName}: ${elevationValue.toFixed(2)}</p>
        <canvas id="${chartId}" style="width: 300px; height: 200px;"></canvas>
      </div>
    `,
    style: {
      color: '#333',
      backgroundColor: '#fff',
      borderRadius: '5px',
      lineHeight: '0.5',
      padding: '5px'
    }
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
  },
  projection = 'Mercator'
}) {
  const [filter, setFilter] = useState(timeRange);
  const [triggerDomainUpdate, setTriggerDomainUpdate] = useState(false);

  const initialColorDomain = useRef(null);
  const initialElevationDomain = useRef(null);

  useEffect(() => {
    if (preserveDomains) {
      initialColorDomain.current = null;
      initialElevationDomain.current = null;
      setTriggerDomainUpdate(true);
      setFilter([0, Infinity]);
    }
  }, [data, elevationAggregation, colorAggregation, preserveDomains, radius, coverage]);

  useEffect(() => {
    if (triggerDomainUpdate) {
      setTriggerDomainUpdate(false);
      setFilter(timeRange);
    }
  }, [triggerDomainUpdate, timeRange]);

  const getAggregationFunction = (aggregation, defaultValue, currentFilter = filter) => points => {
    if (!points.length) return defaultValue;
    points = points.filter(d => {
      const timestamp = new Date(d.timestamp).getTime();
      return timestamp >= currentFilter[0] && timestamp <= currentFilter[1];
    });
    if (!points.length) return defaultValue;

    const values = points.map(point => (point.value !== undefined ? point.value : defaultValue));
    if (aggregation === 'SUM') return values.reduce((sum, val) => sum + val, 0);
    if (aggregation === 'MEAN') return values.reduce((sum, val) => sum + val, 0) / values.length;
    if (aggregation === 'COUNT') return values.length;
    if (aggregation === 'MIN') return Math.min(...values);
    if (aggregation === 'MAX') return Math.max(...values);
    return defaultValue;
  };

  const elevationFunction = getAggregationFunction(elevationAggregation, 1);
  const colorFunction = getAggregationFunction(colorAggregation, 1);

  const layers = [
    isGridView
      ? new GridLayer({
          id: 'grid-heatmap',
          colorRange,
          coverage,
          data,
          elevationRange: [0, 3000],
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
            if (preserveDomains && !initialColorDomain.current)
              initialColorDomain.current = colorDomain;
            if (!preserveDomains) initialColorDomain.current = colorDomain;
          },
          onSetElevationDomain: elevationDomain => {
            if (preserveDomains && !initialElevationDomain.current)
              initialElevationDomain.current = elevationDomain;
            if (!preserveDomains) initialElevationDomain.current = elevationDomain;
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
          data,
          elevationRange: [0, 3000],
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
            if (preserveDomains && !initialColorDomain.current)
              initialColorDomain.current = colorDomain;
            if (!preserveDomains) initialColorDomain.current = colorDomain;
          },
          onSetElevationDomain: elevationDomain => {
            if (preserveDomains && !initialElevationDomain.current)
              initialElevationDomain.current = elevationDomain;
            if (!preserveDomains) initialElevationDomain.current = elevationDomain;
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

	if (projection === 'Globe') {
		let tileLayer =  new TileLayer({
      data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 64,

      renderSubLayers: props => {
        const {
          bbox: {west, south, east, north}
        } = props.tile;

        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          bounds: [west, south, east, north]
        });
      }
    });
		// add to layers
		layers.push(tileLayer);
	}

  return (
    <>
      <p>{projection}</p>
      <DeckGL
        views={projection === 'Globe' ? new GlobeView() : new MapView()}
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={({ object }) => getTooltip({ object }, elevationAggregation, filter)}
      >
				{ projection === 'Mercator' && (
					<Map 
						reuseMaps 
						mapStyle={mapStyle} 
					/>
				)}
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
          onChange={setFilter}
          data={data}
        />
      )}
    </>
  );
}
