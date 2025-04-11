import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

// checks if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygon) {
  if (polygon.geometry.type === 'MultiPolygon') {
    return polygon.geometry.coordinates.some(coords => {
      return coords.some(ring => {
        return isPointInRing(point, ring);
      });
    });
  }
  
  if (polygon.geometry.type === 'Polygon') {
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

// determines appropriate time unit based on the data range
function determineTimeUnit(data) {
  if (!data || data.length < 2) return 'day';
  
  const timeRange = Math.max(...data.map(d => d.x)) - Math.min(...data.map(d => d.x));
  
  if (timeRange < 1000 * 60) return 'millisecond';
  if (timeRange < 1000 * 60 * 60) return 'minute';
  if (timeRange < 1000 * 60 * 60 * 24) return 'hour';
  if (timeRange < 1000 * 60 * 60 * 24 * 7) return 'day';
  if (timeRange < 1000 * 60 * 60 * 24 * 30) return 'week';
  if (timeRange < 1000 * 60 * 60 * 24 * 365) return 'month';
  return 'year';
}

// calculates LOESS regression for trend line
function calculateTrendLine(data, bandwidth = 0.3) {
  if (data.length < 3) return [];
  
  const trendData = [];
  const n = data.length;
  
  const numPoints = Math.min(100, n);
  const xRange = data[n-1].x - data[0].x;
  const step = xRange / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const x = data[0].x + i * step;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let j = 0; j < n; j++) {
      const dist = Math.abs(x - data[j].x) / xRange;
      const weight = dist <= bandwidth ? Math.pow(1 - Math.pow(dist / bandwidth, 3), 3) : 0;
      
      if (weight > 0) {
        numerator += weight * data[j].y;
        denominator += weight;
      }
    }
    
    if (denominator > 0) {
      trendData.push({
        x: x,
        y: numerator / denominator
      });
    }
  }
  
  return trendData;
}

// calculates appropriate y-axis range with padding
function calculateYAxisRange(data) {
  if (!data || data.length === 0) return { min: 0, max: 1 };
  
  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  
  const padding = (maxY - minY) * 0.1;
  
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

// initializes tooltip state if it doesn't exist
function initTooltipState() {
  if (!window.tooltipState) {
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
}

// cleans up chart tooltip state
function cleanupChartTooltip() {
  if (window.tooltipState?.chartContainer) {
    window.tooltipState.chartContainer.style.display = 'none';
  }
  if (window.tooltipState?.moveListener) {
    document.removeEventListener('mousemove', window.tooltipState.moveListener);
    window.tooltipState.moveListener = null;
  }
}

// creates or updates a chart in the tooltip
function createOrUpdateChart(elementId, seriesData) {
  window.requestAnimationFrame(() => {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;
    
    const trendLineData = calculateTrendLine(seriesData);
    const yAxisRange = calculateYAxisRange([...seriesData, ...trendLineData]);
    
    if (window.tooltipState.chartInstances[elementId]) {
      const chart = window.tooltipState.chartInstances[elementId];
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
      window.tooltipState.chartInstances[elementId] = chart;
    }
  });
}

// creates move listener for tooltip positioning
function createMoveListener() {
  const moveContainer = (event) => {
    const container = window.tooltipState.chartContainer;
    if (!container || container.style.display === 'none') return;

    const padding = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    let left = event.clientX + padding;
    let top = event.clientY + padding;

    if (left + containerWidth > viewportWidth - padding) {
      left = event.clientX - containerWidth - padding;
      if (left < padding) {
        left = Math.max(padding, (viewportWidth - containerWidth) / 2);
      }
    }

    if (top + containerHeight > viewportHeight - padding) {
      top = event.clientY - containerHeight - padding;
      if (top < padding) {
        top = Math.max(padding, (viewportHeight - containerHeight) / 2);
      }
    }

    left = Math.max(padding, Math.min(left, viewportWidth - containerWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - containerHeight - padding));

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
  };

  if (!window.tooltipState.moveListener) {
    window.tooltipState.moveListener = moveContainer;
    document.addEventListener('mousemove', window.tooltipState.moveListener);
  }
}

// handles polygon tooltips
function handlePolygonTooltip(object, hasTime, allData, filter) {
  const pointsInPolygon = allData.filter(point => {
    return isPointInPolygon([point.lng, point.lat], object);
  });
  
  const name = object.properties?.name || object.properties?.NAME || 'Polygon Area';
  
  if (pointsInPolygon.length > 0 && hasTime) {
    initTooltipState();
    
    const objectId = `polygon-${object.properties?.id || object.id || name.replace(/\s+/g, '-').toLowerCase()}`;
    
    const seriesData = pointsInPolygon
      .map(d => ({
        x: new Date(d.timestamp).getTime(),
        y: d.value,
      }))
      .filter(d => d.x >= filter[0] && d.x <= filter[1]);
    
    seriesData.sort((a, b) => a.x - b.x);
    
    const avgValue = seriesData.length > 0 
      ? (seriesData.reduce((sum, d) => sum + d.y, 0) / seriesData.length).toFixed(2)
      : 'N/A';
    
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
      
      if (window.tooltipState.currentObjectId !== objectId && window.tooltipState.chartInstances[window.tooltipState.currentObjectId]) {
        window.tooltipState.chartInstances[window.tooltipState.currentObjectId].destroy();
        delete window.tooltipState.chartInstances[window.tooltipState.currentObjectId];
      }
      
      window.tooltipState.currentObjectId = objectId;
      window.tooltipState.lastData[objectId] = seriesData;
      
      createOrUpdateChart(objectId, seriesData);
    }
    
    createMoveListener();
    
    return {
      html: '',
      style: {
        display: 'none'
      }
    };
  } else {
    cleanupChartTooltip();
    
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

// handles aggregate data tooltips (for hexagon/grid layers)
function handleAggregateTooltip(object, colorAggregation, filter, hasTime, factorLevels) {
  initTooltipState();

  const position = object.position;
  const objectId = `${position[0].toFixed(6)}-${position[1].toFixed(6)}`;
  
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

  seriesData.sort((a, b) => a.x - b.x);

  const chartNeedsUpdate = !window.tooltipState.lastData[objectId] || 
    JSON.stringify(seriesData) !== JSON.stringify(window.tooltipState.lastData[objectId]);

  if (hasTime) {
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
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
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
          <div style="color: #657786; font-size: 14px; margin-bottom: 4px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
            ${metricName}: ${colorValue}
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

      if (window.tooltipState.currentObjectId !== objectId && window.tooltipState.chartInstances[window.tooltipState.currentObjectId]) {
        window.tooltipState.chartInstances[window.tooltipState.currentObjectId].destroy();
        delete window.tooltipState.chartInstances[window.tooltipState.currentObjectId];
      }

      window.tooltipState.currentObjectId = objectId;
      window.tooltipState.lastData[objectId] = seriesData;

      createOrUpdateChart(chartId, seriesData);
    }

    createMoveListener();
    
    return {
      html: '',
      style: {
        display: 'none'
      }
    };
  } else {
    cleanupChartTooltip();
  }

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
        <div style="color: #657786; font-size: 14px; margin-bottom: 4px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
          ${metricName}: ${colorValue}
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

// handles point tooltips (for scatter layers)
function handlePointTooltip(object, hasTime, factorLevels) {
  cleanupChartTooltip();

  let valueToShow = object.value != null ? object.value : '';
  if (factorLevels) {
    valueToShow = factorLevels[valueToShow];
  } else {
    if (object.value === null) {
      valueToShow = null;
    } else {
      valueToShow = object.value.toFixed(2);
    }
  }

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
    `,
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      borderRadius: 0
    }
  };
}

// main tooltip function
export function getTooltip({
  object,
  layer
}, {
  colorAggregation = 'SUM',
  filter = [0, Infinity],
  hasTime = false,
  factorLevels = null,
  allData = []
} = {}) {
  if (!object) {
    cleanupChartTooltip();
    return null;
  }

  // check if polygon layer
  if (layer && layer.id === 'polygon-layer') {
    return handlePolygonTooltip(object, hasTime, allData, filter);
  }

  // check if aggregation layer (HexagonLayer/GridLayer)
  if (object.points && object.position) {
    return handleAggregateTooltip(object, colorAggregation, filter, hasTime, factorLevels);
  }

  // for point data (ScatterplotLayer)
  return handlePointTooltip(object, hasTime, factorLevels);
}

export default {
  getTooltip,
  cleanupChartTooltip
}; 