import React, { useEffect, useState, useMemo } from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls } from 'leva';

function getTimeRange(data) {
  if (!data || data.length === 0) {
    return null;
  }
  return data.reduce(
    (range, d) => {
      const t = new Date(d.timestamp).getTime();
      range[0] = Math.min(range[0], t);
      range[1] = Math.max(range[1], t);
      return range;
    },
    [Infinity, -Infinity]
  );
}

export default function SpaceTimeViewer({
  data = [],
  initialStyle = 'summary',
  initialAggregate = 'SUM',
  initialPreserveDomains = true,
	initialHexagonRadius = 5000,
	initialHexagonCoverage = 1,
	initialAnimationSpeed = 1,
}) {
  console.log('Received data:', data);

  // Initialize Leva controls with props as default values
  const { 
		style, 
		aggregate, 
		preserveDomains,
		hexagonRadius,
		hexagonCoverage,
		animationSpeed,
		theme
	} = useControls({
    style: { value: initialStyle, options: ['independent', 'summary'] },
    aggregate: { value: initialAggregate, options: ['SUM', 'MEAN', 'COUNT', 'MIN', 'MAX'] },
    preserveDomains: { value: initialPreserveDomains, label: 'Preserve Domains' },
		hexagonRadius: { value: initialHexagonRadius, label: 'Hexagon Radius' },
		hexagonCoverage: { value: initialHexagonCoverage, label: 'Hexagon Coverage' },
		animationSpeed: { value: initialAnimationSpeed, label: 'Animation Speed' },
		theme: { value: 'dark', options: ['dark', 'light'] }
  });

  const timeRange = useMemo(() => getTimeRange(data), [data]);

  // Determine the plot component based on the selected style
  const plot = useMemo(() => {
    if (!data || !data.some(d => d.lng && d.lat)) {
      let columnsInData = data.map(d => Object.keys(d));
      console.error(
        'Unsupported data type: ',
        columnsInData,
        'Supported data types are: lng, lat, timestamp, value'
      );
      return <div>Unsupported data type: {columnsInData}</div>;
    }

		let MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
		if (theme === 'light') {
			MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
		}

    if (style === 'independent') {
      return (
        <ScatterTimePlot
          data={data}
          timeRange={timeRange}
					theme={theme}
					mapStyle={MAP_STYLE}
        />
      );
    } else if (style === 'summary') {
      return (
        <HexagonPlot
          data={data}
          colorAggregation={aggregate}
          elevationAggregation={aggregate}
          preserveDomains={preserveDomains}
          timeRange={timeRange}
					radius={hexagonRadius}
					coverage={hexagonCoverage}
					animationSpeed={animationSpeed}
					theme={theme}
					mapStyle={MAP_STYLE}
        />
      );
    } else {
      console.error('Unsupported style:', style, 'Supported styles are: independent, summary');
      return null;
    }
  }, [
			style, 
			aggregate, 
			preserveDomains, 
			data, 
			timeRange, 
			hexagonRadius, 
			hexagonCoverage, 
			animationSpeed, 
			theme
	]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {plot}
    </div>
  );
}
