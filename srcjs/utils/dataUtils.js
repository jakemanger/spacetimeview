/**
 * Utility functions for data processing and manipulation
 */

/**
 * Calculate aggregated value from a list of values
 * @param {Array} values - List of values to aggregate
 * @param {string} aggregateType - Type of aggregation (SUM, MEAN, COUNT, MIN, MAX, MODE)
 * @returns {number|string} Aggregated value or 'N/A' if values array is empty
 */
export function calculateAggregate(values, aggregateType = 'MEAN') {
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

/**
 * Format a number with specified decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted number or 'N/A' if value is not a number
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(decimals);
}

/**
 * Normalize dates in a dataset to the same year for seasonal analysis
 * @param {Array} data - Array of data objects with timestamp property
 * @param {number} referenceYear - Year to normalize to (default 2000)
 * @returns {Array} Data with normalized timestamps
 */
export function normalizeDataByYear(data, referenceYear = 2000) {
  if (!data || data.length === 0) return data;
  
  return data.map(d => {
    const date = new Date(d.timestamp);
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
} 