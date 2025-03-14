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
  if (!object) {
    if (window.tooltipState?.chartContainer) {
      window.tooltipState.chartContainer.style.display = 'none';
    }
    return null;
  }

  // Initialize global state if needed
  if (!window.tooltipState) {
    // Create a persistent container for charts
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '10000';
    container.style.backgroundColor = 'transparent';
    container.style.padding = '0';
    container.style.borderRadius = '0';
    container.style.boxShadow = 'none';
    document.body.appendChild(container);

    window.tooltipState = {
      currentObjectId: null,
      chartInstances: {},
      lastData: {},
      chartContainer: container
    };
  }

  // Create a unique identifier for this object
  const position = object.position;
  const objectId = `${position[0].toFixed(6)}-${position[1].toFixed(6)}`;
  
  // Extract data
  let { points, colorValue } = object;
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
  const chartId = `chart-${objectId}`;

  let seriesData = points
    .map(d => ({
      x: new Date(d.source.timestamp).getTime(),
      y: d.source.value,
    }))
    .filter(d => d.x >= filter[0] && d.x <= filter[1]);

  // Sort data by x-value for the trend line calculation
  seriesData.sort((a, b) => a.x - b.x);

  // Calculate LOESS regression if we have enough points
  const calculateTrendLine = (data, bandwidth = 0.3) => {
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

  // Calculate appropriate y-axis range with a small padding
  const calculateYAxisRange = (data) => {
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
  };

  // Check if we need to update the chart
  const chartNeedsUpdate = !window.tooltipState.lastData[objectId] || 
    JSON.stringify(seriesData) !== JSON.stringify(window.tooltipState.lastData[objectId]);

  if (hasTime) {
    // Update chart container content and position
    window.tooltipState.chartContainer.style.display = 'block';
    
    // Only update chart content if needed
    if (chartNeedsUpdate || window.tooltipState.currentObjectId !== objectId) {
      window.tooltipState.chartContainer.innerHTML = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.4;
          border-radius: 16px;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px;
          max-width: 350px;
          pointer-events: auto;
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
              flex-shrink: 0;
            ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <path d="M12 17l-5-5h10z"/>
              </svg>
            </div>
            <div>
              <div style="font-weight: bold; color: #14171A; font-size: 16px;">Location Summary</div>
              <div style="color: #657786; font-size: 14px; display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
              </div>
            </div>
          </div>
          <div style="
            color: #14171A;
            font-size: 15px;
            margin-bottom: 12px;
            padding: 0 4px;
            display: flex;
            align-items: center;
          ">
            <span style="font-weight: 500;">${metricName}:</span>
            <span style="margin-left: 8px; color: #1DA1F2;">${colorValue}</span>
          </div>
          ${seriesData.length > 0 ? `
            <div style="color: #657786; font-size: 14px; margin-bottom: 12px; padding: 0 4px;">
              <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                ${new Date(seriesData[0].x).toLocaleDateString()} - ${new Date(seriesData[seriesData.length - 1].x).toLocaleDateString()}
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                  <path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z"/>
                </svg>
                ${seriesData.length} data points
              </div>
            </div>
          ` : ''}
          <div style="
            background: white;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
          ">
            <div style="width: 100%; height: 200px;">
              <canvas id="${chartId}" width="300" height="200"></canvas>
            </div>
          </div>
          <div style="
            text-align: center;
            margin-top: 8px;
            font-size: 13px;
            color: #657786;
            display: flex;
            justify-content: center;
            gap: 16px;
          ">
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="color: rgba(0, 0, 0, 0.8); font-weight: bold; font-size: 16px;">●</span>
              Data Points
            </span>
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="color: rgba(0, 0, 0, 0.8); font-weight: bold;">—</span>
              Trend Line
            </span>
          </div>
        </div>
      `;

      // Clean up old chart if switching to new object
      if (window.tooltipState.currentObjectId !== objectId && window.tooltipState.chartInstances[window.tooltipState.currentObjectId]) {
        window.tooltipState.chartInstances[window.tooltipState.currentObjectId].destroy();
        delete window.tooltipState.chartInstances[window.tooltipState.currentObjectId];
      }

      window.tooltipState.currentObjectId = objectId;
      window.tooltipState.lastData[objectId] = seriesData;

      // Create or update chart
      window.requestAnimationFrame(() => {
        const ctx = document.getElementById(chartId)?.getContext('2d');
        if (!ctx) return;

        const trendLineData = calculateTrendLine(seriesData);
        const yAxisRange = calculateYAxisRange([...seriesData, ...trendLineData]);

        if (window.tooltipState.chartInstances[objectId]) {
          const chart = window.tooltipState.chartInstances[objectId];
          chart.data.datasets[0].data = seriesData;
          chart.data.datasets[1].data = trendLineData;
          chart.options.scales.y.min = yAxisRange.min;
          chart.options.scales.y.max = yAxisRange.max;
          chart.options.scales.x.time.unit = determineTimeUnit(seriesData);
          chart.update('none');
        } else {
          const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
              datasets: [
                {
                  label: 'Data Points',
                  type: 'scatter',
                  data: seriesData,
                  pointBackgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointBorderColor: 'rgba(0, 0, 0, 0.8)',
                  pointRadius: 2,
                  pointHoverRadius: 4,
                  showLine: false,
                },
                {
                  label: 'Trend Line',
                  type: 'line',
                  data: trendLineData,
                  borderColor: 'rgba(0, 0, 0, 0.8)',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  pointRadius: 0,
                  fill: false,
                  tension: 0.4,
                }
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 1.5,
              animation: false,
              scales: {
                x: {
                  type: 'time',
                  time: {
                    unit: determineTimeUnit(seriesData),
                    displayFormats: {
                      millisecond: 'HH:mm:ss.SSS',
                      second: 'HH:mm:ss',
                      minute: 'HH:mm',
                      hour: 'HH:mm',
                      day: 'MMM d',
                      week: 'MMM d',
                      month: 'MMM yyyy',
                      quarter: 'MMM yyyy',
                      year: 'yyyy'
                    }
                  },
                  title: {
                    display: true,
                    text: 'Time'
                  },
                  ticks: {
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 0
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: 'Values',
                  },
                  min: yAxisRange.min,
                  max: yAxisRange.max,
                  beginAtZero: false
                },
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const point = context.raw;
                      return `Value: ${point.y.toFixed(2)} at ${new Date(point.x).toLocaleString()}`;
                    }
                  }
                },
                legend: {
                  display: false,
                }
              },
              interaction: {
                intersect: false,
                mode: 'nearest'
              }
            },
          });
          window.tooltipState.chartInstances[objectId] = chart;
        }
      });
    }

    // Position the container near the mouse
    const moveContainer = (event) => {
      const container = window.tooltipState.chartContainer;
      const padding = 20;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get container dimensions
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Calculate initial position (prefer right of cursor)
      let left = event.clientX + padding;
      let top = event.clientY + padding;
      
      // Check if container would go off the right edge
      if (left + containerWidth > viewportWidth - padding) {
        // Try positioning to the left of the cursor
        left = event.clientX - containerWidth - padding;
        
        // If that would go off the left edge, center horizontally
        if (left < padding) {
          left = Math.max(padding, (viewportWidth - containerWidth) / 2);
        }
      }
      
      // Check if container would go off the bottom edge
      if (top + containerHeight > viewportHeight - padding) {
        // Try positioning above the cursor
        top = event.clientY - containerHeight - padding;
        
        // If that would go off the top edge, center vertically
        if (top < padding) {
          top = Math.max(padding, (viewportHeight - containerHeight) / 2);
        }
      }
      
      // Ensure minimum padding from edges
      left = Math.max(padding, Math.min(left, viewportWidth - containerWidth - padding));
      top = Math.max(padding, Math.min(top, viewportHeight - containerHeight - padding));
      
      // Apply the position
      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
    };

    // Update position on mousemove
    document.addEventListener('mousemove', moveContainer);
    
    // Return minimal tooltip
    return {
      html: '',
      style: {
        display: 'none'  // Hide the default tooltip
      }
    };
  }

  // For non-time data, return simple tooltip
  return {
    html: `
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <path d="M12 17l-5-5h10z"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: bold; color: #14171A; font-size: 16px;">Location Data</div>
            <div style="color: #657786; font-size: 14px;">📍 ${lat.toFixed(4)}°, ${lng.toFixed(4)}°</div>
          </div>
        </div>
        <div style="
          color: #14171A;
          font-size: 15px;
          padding: 0 4px;
          display: flex;
          align-items: center;
        ">
          <span style="font-weight: 500;">${metricName}:</span>
          <span style="margin-left: 8px; color: #1DA1F2;">${colorValue}</span>
        </div>
      </div>
    `,
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      borderRadius: 0
    }
  };
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
