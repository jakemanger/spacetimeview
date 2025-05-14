/**
 * Utility functions for data visualization charts
 */

/**
 * Determine appropriate time unit based on data range
 * @param {Array} data - Array of data points with x property (time in ms)
 * @returns {string} Appropriate time unit (millisecond, minute, hour, day, etc)
 */
export function determineTimeUnit(data) {
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

/**
 * Calculate LOESS regression for trend line
 * Uses a simple implementation of LOESS (locally weighted regression)
 * @param {Array} data - Data points with x and y properties
 * @param {number} bandwidth - Bandwidth parameter for LOESS (default 0.3)
 * @returns {Array} Trend line data points
 */
export function calculateTrendLine(data, bandwidth = 0.3) {
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
    
    // calculate weighted regression at this point
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

/**
 * Calculate y-axis range with padding
 * @param {Array} data - Data points with y property
 * @returns {Object} Object with min and max values for y axis
 */
export function calculateYAxisRange(data) {
  if (!data || data.length === 0) return { min: 0, max: 1 };
  
  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  
  // add y padding
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

/**
 * Find the mode (most common value) in an array
 * @param {Array} arr - Array of values
 * @param {Object} factorLevels - Optional lookup for factor levels
 * @returns {*} The mode value
 */
export function findMode(arr, factorLevels = null) {
  const frequency = {};
  let maxCount = 0;
  let mode = null;

  for (let num of arr) {
    frequency[num] = (frequency[num] || 0) + 1;

    if (frequency[num] > maxCount) {
      maxCount = frequency[num];
      mode = num;
    }
  }

  return mode;
}

/**
 * Get minimum and maximum values from data array for a specific key
 * @param {Array} data - Array of data objects
 * @param {string} key - Key to extract values from
 * @returns {Array} Array with [min, max] values
 */
export function getMinMaxValues(data, key) {
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

/**
 * Format timestamp to readable label
 * @param {number|string} timestamp - Timestamp to format
 * @returns {string} Formatted date string
 */
export function formatLabel(timestamp) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
} 