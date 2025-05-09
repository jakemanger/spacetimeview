import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

// calculate aggregated value from a list of values
function calculateAggregate(values, aggregateType = 'MEAN') {
  if (!values || values.length === 0) return 'N/A';
  
  switch (aggregateType.toUpperCase()) {
    case 'SUM':
      return values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    case 'MEAN':
      return values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) / values.length;
    case 'COUNT':
      return values.length;
    case 'MIN':
      return Math.min(...values.filter(v => typeof v === 'number'));
    case 'MAX':
      return Math.max(...values.filter(v => typeof v === 'number'));
    case 'MODE':
      const counts = {};
      let maxCount = 0;
      let mode = null;
      values.forEach(val => {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
          maxCount = counts[val];
          mode = val;
        }
      });
      return mode;
    default:
      return values.length > 0 ? values[0] : 'N/A';
  }
}

// format a number with specified decimal places
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(decimals);
}

// generate HTML showing filter aggregates by category 
function generateFilterAggregatesHTML(object, allData, filterColumn, factorLevels, factorIcons, aggregateType = 'MEAN', columnName) {
  // check if we are dealing with an aggregation layer object (has points)
  const isAggregationLayer = object.points && Array.isArray(object.points);

  if (!filterColumn || !factorLevels || 
      (!isAggregationLayer && (!allData || allData.length === 0)) || 
      (isAggregationLayer && (!object.points || object.points.length === 0)) ) {
    console.log("Cannot generate filter aggregates HTML - missing required data", {
      hasFilterColumn: !!filterColumn,
      hasFactorLevels: !!factorLevels,
      isAggregationLayer,
      hasObjectPoints: isAggregationLayer ? (object.points?.length > 0) : 'N/A',
      hasAllData: !isAggregationLayer ? (!!allData && allData.length > 0) : 'N/A',
    });
    return '';
  }
  
  console.log("Generating filter aggregates HTML", {
    filterColumn, 
    columnName, 
    factorLevelsKeys: Object.keys(factorLevels),
    dataLength: allData.length,
    hasFactorIcons: factorIcons && factorIcons[filterColumn] ? true : false,
    factorLevelsDetail: factorLevels[filterColumn] ? 
      `Has '${filterColumn}' with ${factorLevels[filterColumn].length} levels` : 
      `Missing '${filterColumn}'`
  });
  
  // get position of current point
  const position = object.position || [object.lng, object.lat];
  const lat = position[1];
  const lng = position[0];
  
  // use object.points if available (aggregation layer), otherwise filter allData
  const pointsToProcess = isAggregationLayer 
    ? object.points.map(p => p.source) // Extract original data from points
    : allData.filter(d => // Fallback for scatter/other layers if needed
        Math.abs(d.lat - lat) < 0.001 && Math.abs(d.lng - lng) < 0.001
      );
  
  console.log(`Processing ${pointsToProcess.length} points for location [${lng.toFixed(4)}, ${lat.toFixed(4)}]`);
  
  if (pointsToProcess.length === 0) return '';
  
  // group by filter values
  const filterGroups = {};
  let filterValueOccurrences = {}; // count total occurrences of each filter value
  
  // count occurrences of each filter value
  pointsToProcess.forEach(d => {
    const filterValue = d[filterColumn];
    if (filterValue !== undefined && filterValue !== null) {
      filterValueOccurrences[filterValue] = (filterValueOccurrences[filterValue] || 0) + 1;
    }
  });
  
  // collect values to aggregate for each filter value
  pointsToProcess.forEach(point => {
    const filterValue = point[filterColumn];
    const dataValue = point[columnName];
    
    if (filterValue !== undefined && filterValue !== null) {
      if (!filterGroups[filterValue]) {
        filterGroups[filterValue] = [];
      }
      filterGroups[filterValue].push(dataValue);
    }
  });
  
  if (Object.keys(filterGroups).length === 0) {
    console.log("No filter groups found at this location");
    return '';
  }
  
  if (!factorLevels[filterColumn]) {
    console.log(`Missing factorLevels for ${filterColumn}. Available level keys: ${Object.keys(factorLevels).join(', ')}`);
    return '';
  }
  
  const levels = factorLevels[filterColumn];
  console.log("Factor levels:", levels);
  
  // calculate aggregates and prepare for display
  const aggregatedDetails = Object.keys(filterGroups).map(filterValue => {
    const values = filterGroups[filterValue];
    const aggregateValue = calculateAggregate(values, aggregateType);
    const formattedValue = formatNumber(aggregateValue);
    const label = levels[filterValue] || `Value ${filterValue}`;
    const iconPath = factorIcons && factorIcons[filterColumn] && factorIcons[filterColumn][label] 
      ? factorIcons[filterColumn][label] 
      : null;
    return {
      filterValue,
      label,
      iconPath,
      aggregateValue,
      formattedValue,
      pointCount: values.length
    };
  });
  
  // sort by aggregateValue (descending)
  aggregatedDetails.sort((a, b) => {
    const valA = typeof a.aggregateValue === 'number' ? a.aggregateValue : -Infinity;
    const valB = typeof b.aggregateValue === 'number' ? b.aggregateValue : -Infinity;
    return valB - valA;
  });
  
  // limit to top 5
  const topDetails = aggregatedDetails.slice(0, 5);
  const hiddenCount = aggregatedDetails.length - topDetails.length;
  
  // generate HTML for each filter group
  let html = `
    <div style="margin-top: 10px; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 10px;">
      <div style="font-weight: bold; margin-bottom: 6px; color: #14171A; padding-bottom: 3px; font-size: 14px;">
        ${columnName} by ${filterColumn} (Top 5)
      </div>
  `;
  
  // generate HTML for the top details
  for (const detail of topDetails) {
    console.log(`Factor level ${detail.filterValue} -> "${detail.label}", Icon: ${detail.iconPath ? "Yes" : "No"}, Agg: ${detail.formattedValue}`);
    html += `
      <div style="display: flex; align-items: center; margin-bottom: 4px; font-size: 13px;">
        ${detail.iconPath ? `<img src="${detail.iconPath}" alt="" style="width: 16px; height: 16px; margin-right: 6px;">` : ''}
        <span style="flex-grow: 1;">${detail.label}</span>
        <span style="font-weight: bold; margin-left: 5px;">${detail.formattedValue}</span>
        <span style="font-size: 11px; color: #657786; margin-left: 4px;">(${detail.pointCount} points)</span>
      </div>
    `;
  }
  
  // add indicator if some items were hidden
  if (hiddenCount > 0) {
    html += `
      <div style="font-size: 12px; color: #657786; margin-top: 5px; text-align: center;">
        + ${hiddenCount} more
      </div>
    `;
  }
  
  html += `</div>`;
  return html;
}

// check if a point is inside a polygon using ray casting algorithm
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

// determine appropriate time unit based on data range
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

// calculate LOESS regression for trend line
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

// calculate appropriate y-axis range with padding
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

// initialize tooltip state if it doesn't exist
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
      moveListener: null,
      lastVisitTime: {}
    };
  }
}

// clean up chart tooltip state
function cleanupChartTooltip() {
  if (window.tooltipState?.chartContainer) {
    window.tooltipState.chartContainer.style.display = 'none';
  }
  if (window.tooltipState?.moveListener) {
    document.removeEventListener('mousemove', window.tooltipState.moveListener);
    window.tooltipState.moveListener = null;
  }
  
  // destroy all chart instances
  if (window.tooltipState?.chartInstances) {
    Object.keys(window.tooltipState.chartInstances).forEach(key => {
      if (window.tooltipState.chartInstances[key]) {
        try {
          window.tooltipState.chartInstances[key].destroy();
        } catch (e) {
          console.log(`Error destroying chart ${key}:`, e);
        }
        delete window.tooltipState.chartInstances[key];
      }
    });
  }
  
  if (window.tooltipState) {
    window.tooltipState.currentObjectId = null;
  }
}

// create or update a chart in the tooltip
function createOrUpdateChart(elementId, seriesData) {
  window.requestAnimationFrame(() => {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) {
      console.log(`Cannot find canvas context for ${elementId}`);
      return;
    }
    
    const trendLineData = calculateTrendLine(seriesData);
    const yAxisRange = calculateYAxisRange([...seriesData, ...trendLineData]);
    
    // destroy existing chart instance before creating a new one
    if (window.tooltipState.chartInstances[elementId]) {
      window.tooltipState.chartInstances[elementId].destroy();
      delete window.tooltipState.chartInstances[elementId];
    }
    
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
  });
}

// create move listener for tooltip positioning
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

// handle polygon tooltips
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
          min-height: 450px;
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
            <canvas id="${objectId}" width="300" height="250"></canvas>
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

// handle aggregate data tooltips (for hexagon/grid layers)
function handleAggregateTooltip(object, colorAggregation, filter, hasTime, factorLevels, factorIcons, columnName, filterColumn, allData) {
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

  // check if we need to update based on time since last visit
  const currentTime = Date.now();
  const lastVisitTime = window.tooltipState.lastVisitTime?.[objectId] || 0;
  const timeSinceLastVisit = currentTime - lastVisitTime;
  const forceUpdate = timeSinceLastVisit > 500;
  
  if (!window.tooltipState.lastVisitTime) {
    window.tooltipState.lastVisitTime = {};
  }
  window.tooltipState.lastVisitTime[objectId] = currentTime;

  const chartNeedsUpdate = !window.tooltipState.lastData[objectId] || 
    JSON.stringify(seriesData) !== JSON.stringify(window.tooltipState.lastData[objectId]) ||
    forceUpdate;

  if (hasTime) {
    window.tooltipState.chartContainer.style.display = 'block';
    
    // clear chart instances when creating a new tooltip
    if (window.tooltipState.currentObjectId !== objectId) {
      Object.keys(window.tooltipState.chartInstances).forEach(key => {
        if (window.tooltipState.chartInstances[key]) {
          window.tooltipState.chartInstances[key].destroy();
          delete window.tooltipState.chartInstances[key];
        }
      });
    }
    
    // recreate chart and HTML for stability
    if (chartNeedsUpdate || window.tooltipState.currentObjectId !== objectId || forceUpdate) {
      window.tooltipState.chartContainer.innerHTML = '';
      
      // prepare filter aggregates HTML
      let filterAggregatesHTML = '';
      if (filterColumn && filterColumn !== columnName && allData && allData.length > 0) {
        console.log("Adding filter aggregates to chart tooltip");
        filterAggregatesHTML = generateFilterAggregatesHTML(
          object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
        ) || '';
      }
      
      // create tooltip HTML
      const tooltipHTML = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.4;
          border-radius: 16px;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px;
          padding-bottom: 12px;
          max-width: 350px;
          min-height: 450px;
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
            <canvas id="${chartId}" width="300" height="250"></canvas>
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
          ${filterAggregatesHTML}
        </div>
      `;
      
      window.tooltipState.chartContainer.innerHTML = tooltipHTML;
      window.tooltipState.currentObjectId = objectId;
      window.tooltipState.lastData[objectId] = seriesData;

      // wait for DOM update before creating chart
      setTimeout(() => {
        createOrUpdateChart(chartId, seriesData);
      }, 50);
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
        min-height: 150px;
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
        ${filterColumn && filterColumn !== columnName ? generateFilterAggregatesHTML(
          object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
        ) : ''}
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

// handle point tooltips (for scatter layers)
function handlePointTooltip(object, hasTime, factorLevels, factorIcons, columnName) {
  cleanupChartTooltip();

  let valueToShow = object.value != null ? object.value : '';
  let labelForIcon = '';
  if (factorLevels && factorLevels[columnName] && object.value !== null && object.value !== undefined) {
    labelForIcon = factorLevels[columnName][object.value];
    valueToShow = labelForIcon;
  } else {
    if (object.value === null) {
      valueToShow = null;
    } else {
      valueToShow = object.value.toFixed(2);
    }
  }

  const iconPath = factorIcons && factorIcons[columnName] && labelForIcon ? factorIcons[columnName][labelForIcon] : null;

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
        <div style="color: #657786; font-size: 14px; margin-bottom: 8px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
          ${iconPath ? `<img src="${iconPath}" alt="" style="width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;">` : ''}
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

// handle factor data with a horizontal bar chart
function handleFactorTooltip(object, factorLevels, columnName, factorIcons, filterColumn, allData) {
  initTooltipState();
  
  const position = object.position || [object.lng, object.lat];
  const objectId = `factor-${position[0].toFixed(6)}-${position[1].toFixed(6)}`;
  const chartId = `chart-${objectId}`;
  
  // count frequency of each factor level
  const factorFrequencies = {};
  const factorData = object.points || [object];
  
  factorData.forEach(point => {
    const value = point.source ? point.source.value : point.value;
    if (value !== undefined && value !== null) {
      const levelKey = factorLevels[value] || value.toString();
      factorFrequencies[levelKey] = (factorFrequencies[levelKey] || 0) + 1;
    }
  });
  
  // prepare data for chart
  const chartLabels = [];
  const chartData = [];
  const sortedFactorsForDisplay = Object.entries(factorFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  sortedFactorsForDisplay.forEach(([label, count]) => {
    chartLabels.push(label);
    chartData.push(count);
  });
  
  // prepare horizontal bar chart data
  const barChartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Frequency',
      data: chartData,
      backgroundColor: 'rgba(54, 162, 235, 0.8)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };
  
  const totalCount = sortedFactorsForDisplay.reduce((sum, [_, count]) => sum + count, 0);
  const lat = position[1];
  const lng = position[0];
  
  window.tooltipState.chartContainer.style.display = 'block';
  
  // check if update needed based on time since last visit
  const currentTime = Date.now();
  const lastVisitTime = window.tooltipState.lastVisitTime?.[objectId] || 0;
  const timeSinceLastVisit = currentTime - lastVisitTime;
  const forceUpdate = timeSinceLastVisit > 500;
  
  if (!window.tooltipState.lastVisitTime) {
    window.tooltipState.lastVisitTime = {};
  }
  window.tooltipState.lastVisitTime[objectId] = currentTime;
  
  const chartNeedsUpdate = !window.tooltipState.lastData[objectId] || 
    JSON.stringify(barChartData) !== JSON.stringify(window.tooltipState.lastData[objectId]) ||
    forceUpdate;
  
  // clear existing chart instances for new tooltip
  if (window.tooltipState.currentObjectId !== objectId) {
    Object.keys(window.tooltipState.chartInstances).forEach(key => {
      if (window.tooltipState.chartInstances[key]) {
        window.tooltipState.chartInstances[key].destroy();
        delete window.tooltipState.chartInstances[key];
      }
    });
  }
  
  if (chartNeedsUpdate || window.tooltipState.currentObjectId !== objectId || forceUpdate) {
    window.tooltipState.chartContainer.innerHTML = '';
    
    // prepare list of factors with icons
    const factorListHtml = sortedFactorsForDisplay.map(([label, count]) => {
      const iconPath = factorIcons && factorIcons[columnName] && factorIcons[columnName][label];
      const percentage = ((count / totalCount) * 100).toFixed(1);
      console.log(`Tooltip Debug: Col='${columnName}', Label='${label}', Icon Key Exists?`, factorIcons && factorIcons[columnName] ? (label in factorIcons[columnName]) : 'N/A', 'Icon Path Found:', iconPath ? iconPath.substring(0, 30) + '...' : 'None');
      return `
        <div style="display: flex; align-items: center; font-size: 13px; margin-bottom: 4px;">
          ${iconPath ? `<img src="${iconPath}" alt="" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;">` : ''}
          <span style="flex-grow: 1;">${label}:</span>
          <span style="font-weight: bold; margin-left: 5px;">${count} (${percentage}%)</span>
        </div>
      `;
    }).join('');

    // calculate height based on number of factors
    const chartHeight = Math.max(350, Math.min(sortedFactorsForDisplay.length * 30 + 50, 500));
    
    // prepare filter aggregates HTML
    let filterAggregatesHTML = '';
    if (filterColumn && filterColumn !== columnName) {
      filterAggregatesHTML = generateFilterAggregatesHTML(
        object, allData, filterColumn, factorLevels, factorIcons, 'MEAN', columnName
      ) || '';
    }
    
    window.tooltipState.chartContainer.innerHTML = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.4;
        border-radius: 16px;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        padding-bottom: 12px;
        max-width: 450px;
        min-height: ${chartHeight + 200}px;
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
            overflow: 'hidden';
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: bold; color: #14171A; font-size: 16px;">${columnName || 'Factor Data'}</div>
            <div style="color: #657786; font-size: 14px; display: flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
            </div>
          </div>
        </div>
        <div style="color: #657786; font-size: 14px; margin-bottom: 8px; padding: 0 4px; display: flex; align-items: center; gap: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#657786">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
          </svg>
          Total count: ${totalCount}
        </div>
        <div style="
          max-height: 150px;
          overflow-y: auto;
          margin-bottom: 12px;
          padding-right: 5px;
        ">
          ${factorListHtml}
        </div>
        <div style="
          background: white;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          height: ${chartHeight}px;
        ">
          <canvas id="${chartId}" width="400" height="${chartHeight}"></canvas>
        </div>
        <div style="font-size: 12px; color: #657786; text-align: center;">
          ${sortedFactorsForDisplay.length < Object.keys(factorFrequencies).length ? 
            `Showing top ${sortedFactorsForDisplay.length} of ${Object.keys(factorFrequencies).length} categories` : 
            ''}
        </div>
        ${filterAggregatesHTML}
      </div>
    `;
    
    window.tooltipState.currentObjectId = objectId;
    window.tooltipState.lastData[objectId] = barChartData;
    
    // give DOM time to update before creating chart
    setTimeout(() => {
      const ctx = document.getElementById(chartId)?.getContext('2d');
      if (!ctx) {
        console.log(`Cannot find canvas context for ${chartId}`);
        return;
      }
      
      if (window.tooltipState.chartInstances[chartId]) {
        window.tooltipState.chartInstances[chartId].destroy();
      }
      
      window.tooltipState.chartInstances[chartId] = new Chart(ctx, {
        type: 'bar',
        data: barChartData,
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.raw;
                  const percentage = (value / totalCount * 100).toFixed(1);
                  return `${value} (${percentage}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                display: false
              },
              ticks: {
                precision: 0
              },
              title: {
                display: true,
                text: 'Count'
              }
            },
            y: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }, 50);
  }
  
  createMoveListener();
  
  return {
    html: '',
    style: {
      display: 'none'
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
  allData = [],
  columnName = null,
  factorIcons = null,
  filterColumn = null
} = {}) {
  if (!object) {
    cleanupChartTooltip();
    return null;
  }

  // check if polygon layer
  if (layer && layer.id === 'polygon-layer') {
    return handlePolygonTooltip(object, hasTime, allData, filter);
  }

  // check if factor data that should display a factor chart
  if (factorLevels) {
    const value = object.points ? 
      (object.points[0]?.source?.value !== undefined ? object.points[0].source.value : object.colorValue) : 
      object.value;
    
    if (value !== undefined && value !== null && 
        (typeof value === 'number' && Number.isInteger(value) && factorLevels[value] !== undefined)) {
      return handleFactorTooltip(object, factorLevels, columnName, factorIcons, filterColumn, allData);
    }
  }

  // check if aggregation layer (HexagonLayer/GridLayer)
  if (object.points && object.position) {
    let result = handleAggregateTooltip(
      object, 
      colorAggregation, 
      filter, 
      hasTime, 
      factorLevels, 
      factorIcons, 
      columnName, 
      filterColumn, 
      allData
    );
    
    return result;
  }

  // for point data (ScatterplotLayer)
  let result = handlePointTooltip(object, hasTime, factorLevels, factorIcons, columnName);
  
  // add filter aggregates if applicable
  if (filterColumn && filterColumn !== columnName) {
    const filterAggregatesHTML = generateFilterAggregatesHTML(
      object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
    );
    
    if (filterAggregatesHTML) {
      const lastClosingDiv = result.html.lastIndexOf('</div>');
      if (lastClosingDiv !== -1) {
        result.html = result.html.substring(0, lastClosingDiv) + 
                       filterAggregatesHTML + 
                       result.html.substring(lastClosingDiv);
      }
    }
  }
  
  return result;
}

export default {
  getTooltip,
  cleanupChartTooltip
}; 