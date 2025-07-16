// --- HTML Generation for Tooltips ---

function generatePointHTML(object, hasTime, factorLevels, factorIcons, columnName) {
    let value = object.value;
    if (factorLevels && factorLevels[columnName] && factorLevels[columnName][value]) {
        value = factorLevels[columnName][value];
    }
    const iconPath = factorIcons && factorIcons[columnName] && factorIcons[columnName][value];
    let iconHtml = '';
    if (iconPath) {
        iconHtml = `<img src="${iconPath}" alt="${value}" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;">`;
    }

      return `
    <div style="font-family: sans-serif; font-size: 13px;">
      <div><strong>${columnName}:</strong> ${iconHtml}${value}</div>
      ${hasTime ? `<div><strong>Time:</strong> ${new Date(object.timestamp).toLocaleString()}</div>` : ''}
        </div>
      `;
}


function generateAggregateHTML(object, colorAggregation, filter, hasTime, factorLevels, factorIcons, columnName, filterColumn, allData, isStaticMode) {
    const { position, points, colorValue } = object;
  const lat = position[1];
  const lng = position[0];
    const numPoints = points.length;

    let valueDisplay = colorValue.toFixed(2);
    if (factorLevels && factorLevels[columnName] && factorLevels[columnName][colorValue]) {
        valueDisplay = factorLevels[columnName][colorValue];
    }

    const html = `
    <div style="font-family: sans-serif; font-size: 13px; max-width: 300px;">
      <div><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
      <div><strong>Points in cell:</strong> ${numPoints}</div>
      <div><strong>${colorAggregation}:</strong> ${valueDisplay}</div>
      </div>
    `;
    return html;
}

function generateTooltipHTML({ object, layer, options, isStaticMode = false }) {
  const {
    colorAggregation = 'SUM',
    filter = [0, Infinity],
    hasTime = false,
    factorLevels = null,
    allData = [],
    columnName = null,
    factorIcons = null,
    filterColumn = null,
    observable = null
  } = options;

  if (!object) return null;

  if (observable && isStaticMode) {
     // This case is now handled by the ObservablePlotTooltip component
     return null;
  }

  // Check if aggregation layer (HexagonLayer/GridLayer)
  if (object.points && object.position) {
    return generateAggregateHTML(
      object, 
      colorAggregation, 
      filter, 
      hasTime, 
      factorLevels, 
      factorIcons, 
      columnName, 
      filterColumn, 
      allData,
      isStaticMode
    );
  }

  // For point data (ScatterplotLayer)
  return generatePointHTML(object, hasTime, factorLevels, factorIcons, columnName);
}


// --- Data Processing for Observable Plots ---

export function getTooltipData(object, allData, hasTime, filter) {
  if (!object || !allData) return [];
  
  // If it's an aggregated object (hexagon/grid), extract points from that cell
  if (object.points && object.position) {
    let points = object.points;
    
    // Extract the source data from each point (hexagon points have structure: {source: {...}, screenCoord: [...], index: ...})
    let sourceData = points.map(point => point.source || point);
    
    // Apply time filter if we have time data
    if (hasTime && filter) {
      sourceData = sourceData.filter(d => {
        const timestamp = new Date(d.timestamp).getTime();
        return timestamp >= filter[0] && timestamp <= filter[1];
      });
    }
    
    return sourceData;
  }
  
  // For individual points, return the object as an array
  return [object];
}

// --- Main Exported Functions for Use by Components ---

export function getTooltip({ object, layer }, options = {}) {
  if (!object) {
    return null;
  }
  return generateTooltipHTML({ object, layer, options, isStaticMode: false });
}

export function getStaticTooltip(pickInfo, options) {
  if (options.observable) {
    // This case is handled by the dedicated ObservablePlotTooltip component in SummaryPlot.js
    return null;
  }
  return generateTooltipHTML({
    object: pickInfo.object,
    layer: pickInfo.layer,
    options: options,
    isStaticMode: true
  });
}

export function createObservablePlot(chartId, plot, Plot, retryCount = 0) { // Accept Plot as an argument
  const container = document.getElementById(chartId);
  if (container) {
    container.innerHTML = ''; // Clear previous content
    try {
      // The plot function receives the Plot object as an argument
      const chart = typeof plot === 'function' ? plot(Plot) : plot;
      if (chart) {
        container.appendChild(chart);
      } else {
        container.innerHTML = '<div style="color: grey; padding: 10px;">Could not generate plot.</div>';
      }
    } catch (e) {
      console.error("Error rendering Observable plot:", e);
      container.innerHTML = `<div style="color: red; padding: 10px;">Error: ${e.message}</div>`;
    }
  } else {
    // Retry up to 3 times with increasing delays
    if (retryCount < 3) {
      console.warn(`Plot container not found, retrying in ${(retryCount + 1) * 50}ms: ${chartId}`);
      setTimeout(() => {
        createObservablePlot(chartId, plot, Plot, retryCount + 1);
      }, (retryCount + 1) * 50);
    } else {
      console.error(`Plot container not found after ${retryCount} retries: ${chartId}`);
    }
  }
}