import React, { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

// These functions will be exported from MapTooltip.js
import { getTooltipData, createObservablePlot } from './MapTooltip';

export default function ObservablePlotTooltip({ object, options }) {
  const containerRef = useRef(null);
  // Use a ref to ensure the ID is stable across re-renders and unique
  const chartId = useRef(`static-observable-${Date.now()}-${Math.random()}`).current;

  useEffect(() => {
    if (containerRef.current && options.observable) {
      // Wait for the DOM to be fully rendered before creating the plot
      const timer = setTimeout(() => {
        const plotFunction = (Plot) => { // Accept Plot as parameter
          try {
            const data = getTooltipData(object, options.allData, !isNaN(options.filter[0]), options.filter);
            const factorIcons = options.factorIcons;
            
            // Debug logging
            console.log('Observable plot debugging:');
            console.log('- object:', object);
            console.log('- data:', data);
            console.log('- data length:', data ? data.length : 'undefined');
            console.log('- factorIcons:', factorIcons);
            console.log('- observable code:', options.observable);
            
            // The 'observable' variable from R is a string of code to be evaluated
            // Make Plot available in the evaluation context
            // Treat the code as a return expression to get the plot object
            const result = eval(`(function(Plot, data, factorIcons) { return (${options.observable}); })`)(Plot, data, factorIcons);
            console.log('- eval result:', result);
            
            return result;
          } catch (e) {
            console.error("Error executing Observable plot code in static tooltip:", e);
            // Return null to allow createObservablePlot to handle the error message
            return null; 
          }
        };

        createObservablePlot(chartId, plotFunction, Plot); // Pass Plot object
      }, 100); // Small delay to ensure DOM is ready

      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [object, options, chartId]); // Rerun effect if these change

  return (
    <div ref={containerRef} id={chartId} style={{ minWidth: '500px', minHeight: '300px', background: 'white', padding: '1rem' }}>
      <i className="fas fa-spinner fa-spin fa-2x"></i>
    </div>
  );
} 