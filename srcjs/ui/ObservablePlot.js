import React, { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

const ObservablePlot = ({ 
  observableCode, 
  data, 
  width = 400, 
  height = 300,
  containerId = 'observable-plot-container'
}) => {
  const containerRef = useRef(null);
  const plotRef = useRef(null);

  useEffect(() => {
    if (!observableCode || !data || data.length === 0) {
      return;
    }

    // clean up previous plot
    if (plotRef.current) {
      plotRef.current.remove();
      plotRef.current = null;
    }

    try {
      // create a safe execution context with the data and Plot library
      const context = {
        data: data,
        Plot: Plot,
        d3: require('d3'),
        // add common functions that might be used in Observable code
        Math: Math,
        console: console
      };

      // create a function that executes the observable code
      const executeCode = new Function(
        'data', 'Plot', 'd3', 'Math', 'console',
        `
        try {
          ${observableCode}
        } catch (error) {
          console.error('Error executing Observable code:', error);
          return Plot.plot({
            marks: [
              Plot.text([["Error executing Observable code"]], {
                x: 0.5,
                y: 0.5,
                text: d => d,
                fontSize: 14,
                fill: "red"
              })
            ],
            width: ${width},
            height: ${height}
          });
        }
        `
      );

      // execute the code with the context
      const plot = executeCode(
        context.data,
        context.Plot,
        context.d3,
        context.Math,
        context.console
      );

      if (plot && containerRef.current) {
        // ensure the plot has the correct dimensions
        if (plot.setAttribute) {
          plot.setAttribute('width', width);
          plot.setAttribute('height', height);
        }
        
        containerRef.current.appendChild(plot);
        plotRef.current = plot;
      }
    } catch (error) {
      console.error('Error creating Observable plot:', error);
      
      // create an error plot
      if (containerRef.current) {
        const errorPlot = Plot.plot({
          marks: [
            Plot.text([["Error creating plot"]], {
              x: 0.5,
              y: 0.5,
              text: d => d,
              fontSize: 14,
              fill: "red"
            })
          ],
          width: width,
          height: height
        });
        
        containerRef.current.appendChild(errorPlot);
        plotRef.current = errorPlot;
      }
    }

    // cleanup function
    return () => {
      if (plotRef.current) {
        plotRef.current.remove();
        plotRef.current = null;
      }
    };
  }, [observableCode, data, width, height]);

  return (
    <div 
      id={containerId}
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden'
      }}
    />
  );
};

export default ObservablePlot; 