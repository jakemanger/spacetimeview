import React, { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { getTooltipData } from './MapTooltip';

export default function ObservablePlotTooltip({ object, options }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !options.observable) return;

    console.log('=== OBSERVABLE PLOT DEBUG START ===');
    console.log('1. Input object:', object);
    console.log('2. Options received:', options);
    console.log('3. Observable code:', options.observable);
    console.log('4. Factor icons available:', options.factorIcons);

    try {
      // Get the data for this tooltip
      const data = getTooltipData(object, options.allData, !isNaN(options.filter[0]), options.filter);
      
      console.log('5. Raw data from getTooltipData:', data);
      console.log('6. Data type:', typeof data);
      console.log('7. Data length:', data ? data.length : 'N/A');
      
      if (data && data.length > 0) {
        console.log('8. First data item:', data[0]);
        console.log('9. Data item keys:', Object.keys(data[0]));
        console.log('10. Sample of first 3 items:', data.slice(0, 3));
      }
      
      if (!data || data.length === 0) {
        console.log('11. No data available - showing message');
        containerRef.current.innerHTML = '<div style="padding: 20px; color: #666;">No data available for this area</div>';
        return;
      }

      console.log('12. About to execute Observable code...');
      console.log('13. Plot object available:', !!Plot);
      console.log('14. Plot methods:', Object.getOwnPropertyNames(Plot));

      // Prepare factorIcons for the Observable function
      const factorIcons = options.factorIcons || {};
      console.log('15. Factor icons being passed to Observable:', factorIcons);

      // Better logging for factor icons structure
      if (factorIcons && typeof factorIcons === 'object') {
        console.log('16. Factor icon structure analysis:');
        Object.keys(factorIcons).forEach(column => {
          const iconValue = factorIcons[column];
          if (typeof iconValue === 'string') {
            // Column-level icon (single icon for the entire column)
            console.log(`   Column "${column}": Single icon (${iconValue.substring(0, 50)}...)`);
          } else if (typeof iconValue === 'object' && iconValue !== null) {
            // Factor-level icons (multiple icons for different factor levels)
            const iconKeys = Object.keys(iconValue);
            console.log(`   Column "${column}": Factor-level icons for ${iconKeys.length} levels:`, iconKeys);
          } else {
            console.log(`   Column "${column}": Unknown icon structure:`, typeof iconValue);
          }
        });
      }

      // Create a simple function context and execute the Observable code
      // Now includes factorIcons as a third parameter
      const plotFunction = new Function('Plot', 'data', 'factorIcons', `
        console.log('INSIDE OBSERVABLE FUNCTION:');
        console.log('- Plot object:', Plot);
        console.log('- Data received:', data);
        console.log('- Data length:', data.length);
        console.log('- First item:', data[0]);
        console.log('- Factor icons received:', factorIcons);
        
        // Show what factor icons are available - corrected logging
        if (factorIcons && typeof factorIcons === 'object') {
          console.log('- Factor icon columns available:', Object.keys(factorIcons));
          Object.keys(factorIcons).forEach(column => {
            const iconValue = factorIcons[column];
            if (typeof iconValue === 'string') {
              console.log('  Column "' + column + '": Column-level icon (single icon for entire column)');
            } else if (typeof iconValue === 'object' && iconValue !== null) {
              console.log('  Column "' + column + '": Factor-level icons:', Object.keys(iconValue));
            } else {
              console.log('  Column "' + column + '": Unknown icon structure:', typeof iconValue);
            }
          });
        }
        
        const result = ${options.observable};
        
        console.log('- Observable result:', result);
        console.log('- Result type:', typeof result);
        console.log('- Result constructor:', result ? result.constructor.name : 'null');
        
        return result;
      `);
      
      console.log('17. Executing Observable function...');
      const chart = plotFunction(Plot, data, factorIcons);
      
      console.log('18. Chart result:', chart);
      console.log('19. Chart type:', typeof chart);
      console.log('20. Chart is DOM element:', chart instanceof Element);
      console.log('21. Chart tagName:', chart ? chart.tagName : 'N/A');
      
      // Clear and append the chart
      containerRef.current.innerHTML = '';
      if (chart) {
        console.log('22. Appending chart to container...');
        containerRef.current.appendChild(chart);
        console.log('23. Chart successfully appended');
      } else {
        console.log('22. No chart produced - showing error message');
        containerRef.current.innerHTML = '<div style="padding: 20px; color: #666;">Could not generate chart</div>';
      }
      
    } catch (error) {
      console.error('=== OBSERVABLE PLOT ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error at line:', error.lineNumber);
      containerRef.current.innerHTML = `<div style="padding: 20px; color: #cc0000;">
        <strong>Error:</strong> ${error.message}<br>
        <small>Check browser console for details</small>
      </div>`;
    }
    
    console.log('=== OBSERVABLE PLOT DEBUG END ===');
  }, [object, options.observable, options.allData, options.filter, options.factorIcons]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        minWidth: '400px', 
        minHeight: '250px', 
        background: 'white', 
        padding: '10px',
        borderRadius: '4px'
      }}
    >
      <div style={{ padding: '20px', color: '#666' }}>Loading chart...</div>
    </div>
  );
} 