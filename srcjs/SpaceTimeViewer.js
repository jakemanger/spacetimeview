import React, { useEffect, useState, useMemo } from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls, Leva } from 'leva';

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
	initialTheme = 'light'
}) {
  console.log('Received data:', data);

	let [levaTheme, setLevaTheme] = useState({
		colors: {
			elevation1: '#F1F3F5',
			elevation2: '#FFFFFF',
			elevation3: '#E0E3E6',
			accent1: '#4D88FF',
			accent2: '#2680EB',
			accent3: '#1473E6',
			highlight1: '#1F2933',
			highlight2: '#323F4B',
			highlight3: '#3E4C59',
			vivid1: '#FFC107',
		}
	});

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
		theme: { value: initialTheme, options: ['dark', 'light'] }
  });

	useEffect(() => {
		// Depending on the current theme from useControls, set the corresponding theme colors.
		const newLevaThemeColors = theme === 'dark' ? {
			elevation1: '#292d39',
			elevation2: '#181C20',
			elevation3: '#373C4B',
			accent1: '#0066DC',
			accent2: '#007BFF',
			accent3: '#3C93FF',
			highlight1: '#535760',
			highlight2: '#8C92A4',
			highlight3: '#FEFEFE',
			vivid1: '#ffcc00',
		} : {
			elevation1: '#F1F3F5',
			elevation2: '#FFFFFF',
			elevation3: '#E0E3E6',
			accent1: '#4D88FF',
			accent2: '#2680EB',
			accent3: '#1473E6',
			highlight1: '#1F2933',
			highlight2: '#323F4B',
			highlight3: '#3E4C59',
			vivid1: '#FFC107',
		};

		// Set the state of levaTheme to the new theme colors.
		setLevaTheme({ colors: newLevaThemeColors });
	}, [theme]);


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
			<Leva theme={levaTheme} />
    </div>
  );
}
