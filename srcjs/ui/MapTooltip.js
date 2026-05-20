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

  // custom tooltip content is now handled by ObservablePlotTooltip component
  if (observable && isStaticMode) {
     return null;
  }

  // check if aggregation layer (HexagonLayer/GridLayer)
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

  // for point data (ScatterplotLayer)
  return generatePointHTML(object, hasTime, factorLevels, factorIcons, columnName);
}


// --- data processing for observable plots ---

export function getTooltipData(object, allData, hasTime, filter) {
  console.log('--- getTooltipData DEBUG ---');
  console.log('Input object:', object);
  console.log('Object has points:', !!object.points);
  console.log('Object has position:', !!object.position);
  console.log('Has time data:', hasTime);
  console.log('Filter:', filter);
  
  if (!object || !allData) {
    console.log('Early return: missing object or allData');
    return [];
  }
  
  // for aggregated objects (hexagon/grid), extract points from cell
  if (object.points && object.position) {
    let points = object.points;
    console.log('Processing aggregated object with', points.length, 'points');

    // extract source data from each point (hexagon points have structure: {source: {...}, screenCoord: [...], index: ...})
    // Some Deck.gl wrappers omit non-visual fields from source, so merge back the original row by index when available.
    let sourceData = points.map(point => {
      const indexedData = Number.isInteger(point.index) && allData[point.index] ? allData[point.index] : {};
      const source = point.source || point;
      let mergedData = {
        ...indexedData,
        ...source
      };

      if (mergedData.grid_id === undefined && allData.length > 0) {
        const matchedData = allData.find(d =>
          d.timestamp === source.timestamp &&
          Number(d.lat) === Number(source.lat) &&
          Number(d.lng) === Number(source.lng)
        );

        if (matchedData) {
          mergedData = {
            ...matchedData,
            ...source
          };
        }
      }

      return mergedData;
    });
    console.log('Extracted source data:', sourceData);
    console.log('Source data length:', sourceData.length);

    // apply time filter if we have time data AND the data actually has timestamps
    if (hasTime && filter && sourceData.length > 0 && sourceData[0].timestamp) {
      const beforeFilter = sourceData.length;
      sourceData = sourceData.filter(d => {
        if (!d.timestamp) return true; // keep data without timestamps
        const timestamp = new Date(d.timestamp).getTime();
        if (isNaN(timestamp)) return true; // keep data with invalid timestamps
        return timestamp >= filter[0] && timestamp <= filter[1];
      });
      console.log('Applied time filter: from', beforeFilter, 'to', sourceData.length, 'items');
    }

    console.log('Final source data for aggregated:', sourceData);
    return sourceData;
  }

  // for individual points, return as array
  console.log('Processing individual point');
  const result = [object];
  console.log('Returning single object as array:', result);
  return result;
}

// --- main exported functions for use by components ---

export function getTooltip({ object, layer }, options = {}) {
  if (!object) {
    return null;
  }
  return generateTooltipHTML({ object, layer, options, isStaticMode: false });
}

export function getStaticTooltip(pickInfo, options) {
  if (options.observable) {
    // handled by ObservablePlotTooltip component in SummaryPlot.js
    return null;
  }
  return generateTooltipHTML({
    object: pickInfo.object,
    layer: pickInfo.layer,
    options: options,
    isStaticMode: true
  });
}

export function createObservablePlot(chartId, plot, Plot, retryCount = 0) { // accept Plot as argument
  const container = document.getElementById(chartId);
  if (container) {
    container.innerHTML = ''; // clear previous content
    try {
      // plot function receives Plot object as argument
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
    // retry up to 3 times with increasing delays
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
