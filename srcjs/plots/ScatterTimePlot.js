import React, { useEffect, useState, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { MapView, _GlobeView as GlobeView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import RangeInput from '../ui/RangeInput';
import Colorbar from '../ui/Colorbar'; // Import Colorbar
import * as d3 from 'd3';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

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

function getTooltip({ object, layer }, hasTime, factorLevels = null, allData = [], filter = [0, Infinity]) {
  // Function to clean up chart tooltip state
  const cleanupChartTooltip = () => {
    if (window.tooltipState?.chartContainer) {
      window.tooltipState.chartContainer.style.display = 'none';
    }
    if (window.tooltipState?.moveListener) {
      document.removeEventListener('mousemove', window.tooltipState.moveListener);
      window.tooltipState.moveListener = null;
    }
  };

  if (!object) {
    cleanupChartTooltip();
    return null;
  }

  // Check if the hovered object is from the polygon layer
  if (layer && layer.id === 'polygon-layer') {
    // Find all points within this polygon
    const pointsInPolygon = allData.filter(point => {
      return isPointInPolygon([point.lng, point.lat], object);
    });
    
    // Get polygon name for display
    const name = object.properties?.name || object.properties?.NAME || 'Polygon Area';
    
    // If we have points inside this polygon and we have time data, show a chart
    if (pointsInPolygon.length > 0 && hasTime) {
      // Initialize chart container if needed
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
          chartContainer: container,
          moveListener: null
        };
      }
      
      // Create a unique identifier for this polygon
      const objectId = `polygon-${object.properties?.id || object.id || name.replace(/\s+/g, '-').toLowerCase()}`;
      
      // Create time series data from points
      const seriesData = pointsInPolygon
        .map(d => ({
          x: new Date(d.timestamp).getTime(),
          y: d.value,
        }))
        .filter(d => d.x >= filter[0] && d.x <= filter[1]);
      
      // Sort by time
      seriesData.sort((a, b) => a.x - b.x);
      
      // Calculate average value for display
      const avgValue = seriesData.length > 0 
        ? (seriesData.reduce((sum, d) => sum + d.y, 0) / seriesData.length).toFixed(2)
        : 'N/A';
      
      // Check if we need to update
      const chartNeedsUpdate = !window.tooltipState.lastData[objectId] || 
        JSON.stringify(seriesData) !== JSON.stringify(window.tooltipState.lastData[objectId]);
      
      window.tooltipState.chartContainer.style.display = 'block';
      
      if (chartNeedsUpdate || window.tooltipState.currentObjectId !== objectId) {
        window.tooltipState.chartContainer.innerHTML = `
          <div style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.4;
            border-radius: 16px;
            background: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 16px;
            padding-bottom: 12px;
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
                  <path d="M11 15h2v2h-2zm0-8h2v6h-2z"/>
                </svg>
              </div>
              <div>
                <div style="font-weight: bold; color: #14171A; font-size: 16px;">${name}</div>
                <div style="color: #657786; font-size: 14px; display: flex; align-items: center; gap: 4px;">
                  Region Summary
                </div>
              </div>
            </div>
            <div style="color: #657786; font-size: 14px; margin-bottom: 4px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
              Points in region: ${pointsInPolygon.length}
            </div>
            <div style="color: #657786; font-size: 14px; margin-bottom: 4px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
              Average value: ${avgValue}
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
                <canvas id="${objectId}" width="300" height="200"></canvas>
              </div>
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
          const ctx = document.getElementById(objectId)?.getContext('2d');
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
      
      // Define the function to position the chart container
      const movePolygonContainer = (event) => {
        const container = window.tooltipState.chartContainer;
        if (!container || container.style.display === 'none') return;
        
        const padding = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        let left = event.clientX + padding;
        let top = event.clientY + padding;
        
        // Check if container would go off the right edge
        if (left + containerWidth > viewportWidth - padding) {
          left = event.clientX - containerWidth - padding;
          if (left < padding) {
            left = Math.max(padding, (viewportWidth - containerWidth) / 2);
          }
        }
        
        // Check if container would go off the bottom edge
        if (top + containerHeight > viewportHeight - padding) {
          top = event.clientY - containerHeight - padding;
          if (top < padding) {
            top = Math.max(padding, (viewportHeight - containerHeight) / 2);
          }
        }
        
        // Ensure minimum padding from edges
        left = Math.max(padding, Math.min(left, viewportWidth - containerWidth - padding));
        top = Math.max(padding, Math.min(top, viewportHeight - containerHeight - padding));
        
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
      };
      
      // Ensure listener is added only once and store the reference
      if (!window.tooltipState.moveListener) {
        window.tooltipState.moveListener = movePolygonContainer;
        document.addEventListener('mousemove', window.tooltipState.moveListener);
      }
      
      // Return minimal tooltip, the chart container handles the visual
      return {
        html: '',
        style: {
          display: 'none'  // Hide the default tooltip
        }
      };
    } else {
      // If no points or no time data, just show a simple tooltip with the polygon name
      cleanupChartTooltip(); // Clean up any existing chart
      
      return {
        html: `
          <div style="font-family: sans-serif; background: #333; color: #fff; padding: 8px 12px; border-radius: 4px; font-size: 13px;">
            ${name} ${pointsInPolygon.length > 0 ? `(${pointsInPolygon.length} points)` : ''}
          </div>
        `,
        style: { background: 'none', border: 'none' }
      };
    }
  }

  // When hovering over a scatter point, hide any regional tooltip
  cleanupChartTooltip();

  // Existing tooltip logic for scatter points
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
  factorLevels = null,
  theme = 'light',
  polygons = null
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

  // Parse polygon data if it's provided as a string
  const parsedPolygons = useMemo(() => {
    if (!polygons) {
      console.log('No polygon data in ScatterTimePlot');
      return null;
    }
    
    console.log('ScatterTimePlot processing polygon data');
    try {
      const parsed = typeof polygons === 'string' ? JSON.parse(polygons) : polygons;
      console.log('ScatterTimePlot parsed polygon data:', parsed);
      
      // Check if it's a valid GeoJSON object
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
    // Add polygon layer if we have polygons
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
      // Additional props for better visualization
      wireframe: true,
      getElevation: 0,
      // Make sure polygons are visible
      opacity: 1,
      parameters: {
        depthTest: false // Ensure polygons render on top
      },
      updateTriggers: {
        getLineColor: [theme], // Update based on theme
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
  ].filter(Boolean); // Filter out any nulls from the layers array

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
        getTooltip={({ object, layer }) => getTooltip(
          { object, layer },
          !isNaN(displayTimeRange[0]),
          factorLevels && factorLevels[columnName] ? factorLevels[columnName] : null,
          displayData,
          filter
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
