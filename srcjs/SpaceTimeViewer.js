import React, { useEffect, useState, useMemo } from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls, Leva } from 'leva';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import PinchIcon from '@mui/icons-material/Pinch';
import './SpaceTimeViewer.css'; // Add this import for CSS file

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

  const [snackbarOpen, setSnackbarOpen] = useState(true);

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

  // find average of longitude and latitude and use as initial view state
  let INITIAL_VIEW_STATE = {
    longitude: data.reduce((sum, d) => sum + d.lng, 0) / data.length,
    latitude: data.reduce((sum, d) => sum + d.lat, 0) / data.length,
    zoom: 3,
    pitch: 0,
    bearing: 0
  };

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
					// Sort data by value in ascending order, so that higher value points are rendered on top
          data={data.sort((a, b) => a.value - b.value)}
          timeRange={timeRange}
          theme={theme}
          mapStyle={MAP_STYLE}
          initialViewState={INITIAL_VIEW_STATE}
        />
      );
    } else if (style === 'summary') {
      return (
        <HexagonPlot
					// sort by time
          data={data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
          colorAggregation={aggregate}
          elevationAggregation={aggregate}
          preserveDomains={preserveDomains}
          timeRange={timeRange}
          radius={hexagonRadius}
          coverage={hexagonCoverage}
          animationSpeed={animationSpeed}
          theme={theme}
          mapStyle={MAP_STYLE}
          initialViewState={INITIAL_VIEW_STATE}
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

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  return (
    <div className="space-time-viewer">
      {plot}
      <Leva theme={levaTheme} />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity="info" sx={{ width: '100%' }}>
          {isMobile ? (
            <>
              <PinchIcon fontSize="small" /> to zoom and adjust time with the slider.
            </>
          ) : (
            <>
              Scroll to zoom, <Tooltip title="Shift"><Typography component="span">⇧</Typography></Tooltip> + Click to rotate and adjust time with the slider.
            </>
          )}
        </Alert>
      </Snackbar>
    </div>
  );
}
