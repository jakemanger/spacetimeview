import React, { useState, useRef, useEffect } from 'react';
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
import { BitmapLayer } from '@deck.gl/layers';
import { HexagonLayer, GridLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import RangeInput from '../ui/RangeInput';
import Colorbar from '../ui/Colorbar';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const MS_PER_DAY = 8.64e7;
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});


function getTooltip({ object }, colorAggregation, filter, hasTime, factorLevels = null) {
  if (!object) return null;

  let { position, points, colorValue } = object;
  if (factorLevels && factorLevels[colorValue]) {
    colorValue = factorLevels[colorValue];
  } else {
    colorValue = colorValue.toFixed(2);
  }

  const lat = position[1];
  const lng = position[0];
  const metricName =
    colorAggregation.charAt(0).toUpperCase() +
    colorAggregation.slice(1).toLowerCase();
  const chartId = `chart-${lat}-${lng}`;

  let seriesData = points
    .map(d => ({
      x: new Date(d.source.timestamp).getTime(),
      y: d.source.value,
    }))
    .filter(d => d.x >= filter[0] && d.x <= filter[1]);

  // Sort data by x-value for the trend line calculation
  seriesData.sort((a, b) => a.x - b.x);

  // Calculate LOESS regression if we have enough points
  const calculateTrendLine = (data, bandwidth = 0.75) => {
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
  };

  // Calculate trend line
  const trendLineData = calculateTrendLine(seriesData);

  setTimeout(() => {
    const ctx = document.getElementById(chartId)?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Data Points',
              type: 'scatter',
              data: seriesData,
              pointBackgroundColor: 'rgba(54, 162, 235, 0.8)',
              pointBorderColor: 'rgba(54, 162, 235, 1)',
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Trend Line',
              type: 'line',
              data: trendLineData,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              pointRadius: 0,
              fill: false,
              tension: 0.4,
              // Add confidence interval fill
              fill: '+1',
            }
          ],
        },
        options: {
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day'
              },
              title: {
                display: true,
                text: 'Time'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Values',
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const point = context.raw;
                  return `Value: ${point.y.toFixed(2)} at ${new Date(point.x).toLocaleDateString()}`;
                }
              }
            },
            legend: {
              display: true,
              position: 'top',
            }
          },
          interaction: {
            intersect: false,
            mode: 'nearest'
          }
        },
      });
    }
  }, 0);

  return {
    html: `
      <div>
        <p>Latitude: ${lat.toFixed(2)}</p>
        <p>Longitude: ${lng.toFixed(2)}</p>
        <p>${metricName}: ${colorValue}</p>
        ${hasTime ? `<canvas id="${chartId}" style="width: 300px; height: 200px;"></canvas>` : ''}
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


function findMode(arr, factorLevels = null) {
  const frequency = {};
  let maxCount = 0;
  let mode = null;

  // Count occurrences of each element
  for (let num of arr) {
    frequency[num] = (frequency[num] || 0) + 1;

    // Keep track of the mode and the maximum count
    if (frequency[num] > maxCount) {
      maxCount = frequency[num];
      mode = num;
    }
  }

  return mode;
}

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
  theme = 'dark',
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
  filterColumnValues = []
}) {
  const [filter, setFilter] = useState(timeRange);

  const [initialColorDomain, setInitialColorDomain] = useState(null);
  const [initialElevationDomain, setInitialElevationDomain] = useState(null);
  const [colorbarDomain, setColorbarDomain] = useState(initialColorDomain);

  // uudate colorbarDomain only when initialColorDomain is not null
  useEffect(() => {
    if (initialColorDomain !== null) {
      setColorbarDomain(initialColorDomain);
    }
  }, [initialColorDomain]);

  // Introduce a ref to track domain initialization
  const domainInitializedRef = useRef(false);

  useEffect(() => {
    // reset domains when the categorical variable changes
    console.log('Resetting domains due to data, time filter, filterColumnValues, or aggregation change');
    setInitialColorDomain(null);
    setInitialElevationDomain(null);

    // reset the initialization tracking
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

  const layers = [
    isGridView
      ? new GridLayer({
        id: 'grid-heatmap',
        colorRange,
        coverage,
        data,
        extruded: summaryHeight > 0,
        elevationScale: data.length ? summaryHeight : 0,
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
        data,
        extruded: summaryHeight > 0,
        elevationScale: data.length ? summaryHeight : 0,
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

  return (
    <>
      <DeckGL
        views={projection === 'Globe' ? new GlobeView() : new MapView()}
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={({ object }) =>
          getTooltip({ object }, colorAggregation, filter, !isNaN(timeRange[0]), relevantFactorLevels)
        }
      >
        {projection === 'Mercator' && <Map reuseMaps mapStyle={mapStyle} />}
      </DeckGL>
      {!isNaN(timeRange[0]) && (
        <RangeInput
          min={timeRange[0]}
          max={timeRange[1]}
          value={filter}
          animationSpeed={MS_PER_DAY * animationSpeed}
          formatLabel={(timestamp) => {
            const date = new Date(timestamp);
            return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
          }}
          onChange={updateTimeRange}
          data={data}
        />
      )}
      <Colorbar colorRange={colorRange} colorDomain={colorbarDomain} title={legendTitle} numDecimals={numDecimals} themeColors={themeColors} factorLevels={factorLevels} />
    </>
  );
}
