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
    cleanupTooltip();
    return null;
  }

  // check if polygon layer
  if (layer && layer.id === 'polygon-layer') {
    return handlePolygonTooltip(object, hasTime, allData, filter, filterColumn, factorLevels, factorIcons);
  }

  // Check if this is factor data that should display a factor chart
  if (factorLevels) {
    const value = object.points ? 
      (object.points[0]?.source?.value !== undefined ? object.points[0].source.value : object.colorValue) : 
      object.value;
    
    if (value !== undefined && value !== null && 
        (typeof value === 'number' && Number.isInteger(value) && factorLevels[value] !== undefined)) {
      let result = handleFactorTooltip(object, factorLevels, columnName, factorIcons);
      
      // Add filter aggregates if applicable
      if (filterColumn && filterColumn !== columnName && result.html === '') {
        const filterAggregatesHTML = generateFilterAggregatesHTML(
          object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
        );
        
        if (filterAggregatesHTML && window.tooltipState.chartContainer) {
          const currentHTML = window.tooltipState.chartContainer.innerHTML;
          window.tooltipState.chartContainer.innerHTML = currentHTML.replace('</div>', filterAggregatesHTML + '</div>');
        }
      }
      
      return result;
    }
  }

  // check if aggregation layer (HexagonLayer/GridLayer)
  if (object.points && object.position) {
    let result = handleAggregateTooltip(object, colorAggregation, filter, hasTime, factorLevels);
    
    // Add filter aggregates if applicable and if we're in chart mode (html is empty)
    if (filterColumn && filterColumn !== columnName && result.html === '' && window.tooltipState.chartContainer) {
      const filterAggregatesHTML = generateFilterAggregatesHTML(
        object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
      );
      
      if (filterAggregatesHTML) {
        const currentHTML = window.tooltipState.chartContainer.innerHTML;
        window.tooltipState.chartContainer.innerHTML = currentHTML.replace('</div>', filterAggregatesHTML + '</div>');
      }
    } else if (filterColumn && filterColumn !== columnName) {
      // For non-chart tooltips, append the filter aggregates to the HTML
      const filterAggregatesHTML = generateFilterAggregatesHTML(
        object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
      );
      
      if (filterAggregatesHTML) {
        const resultHTML = result.html;
        result.html = resultHTML.replace('</div>', filterAggregatesHTML + '</div>');
      }
    }
    
    return result;
  }

  // for point data (ScatterplotLayer)
  let result = handlePointTooltip(object, hasTime, factorLevels, factorIcons, columnName);
  
  // Add filter aggregates if applicable
  if (filterColumn && filterColumn !== columnName) {
    const filterAggregatesHTML = generateFilterAggregatesHTML(
      object, allData, filterColumn, factorLevels, factorIcons, colorAggregation, columnName
    );
    
    if (filterAggregatesHTML) {
      result.html = result.html.replace('</div>', filterAggregatesHTML + '</div>');
    }
  }
  
  return result;
} 