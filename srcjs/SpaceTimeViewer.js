import React, { useEffect, useState, useMemo } from 'react';
import SummaryPlot from './plots/SummaryPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls, Leva, folder } from 'leva';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import PinchIcon from '@mui/icons-material/Pinch';
import './SpaceTimeViewer.css';
import { Provider } from "@radix-ui/react-tooltip";
import colorbrewer from 'colorbrewer';

function hexToRgb(hex) {
  // Remove the leading '#' if it's present
  hex = hex.replace(/^#/, '');

  // Parse the hexadecimal string into RGB values
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  return [r, g, b];
}

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
  initialStyle = 'Summary',
  initialColumnToPlot = 'value',
  initialAggregate = 'SUM',
  initialRepeatedPointsAggregate = 'MEAN',
  initialPreserveDomains = false,
  initialSummaryRadius = 5000,
  initialSummaryCoverage = 1,
  initialAnimationSpeed = 10,
  initialTheme = 'light',
  initialRadiusScale = 1,
  initialRadiusMinPixels = 1,
  initialSummaryStyle = 'Hexagon',
  initialProjection = 'Mercator',
  initialSummaryHeight = 0,
  initialColorScheme = 'YlOrRd',
}) {
  // convert from R's wide format to long format
  data = HTMLWidgets.dataframeToD3(data);


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
    },
  });

  const [snackbarOpen, setSnackbarOpen] = useState(true);
  const [colorRange, setColorRange] = useState(
    [
      [1, 152, 189],
      [73, 227, 206],
      [216, 254, 181],
      [254, 237, 177],
      [254, 173, 84],
      [209, 55, 78],
    ]
  )

  // Extract column names from data
  const columnNames = useMemo(() => {
    if (data.length === 0) return [];
    // exclude lng, lat, timestamp
    return Object.keys(data[0]).filter(
      key => key !== 'lng' && key !== 'lat' && key !== 'timestamp'
    );
  }, [data]);

  // define aggregateOptions for the summary plot
  let aggregateOptions = ['SUM', 'MEAN', 'COUNT', 'MIN', 'MAX'];
  let repeatedPointsAggregateOptions = ['None', 'SUM', 'MEAN', 'COUNT', 'MIN', 'MAX'];
  // if there is no data[0].initialColumnToPLot then we can't use SUM, MEAN, MIN, MAX
  if (!data.length || !data[0].hasOwnProperty(initialColumnToPlot)) {
    aggregateOptions = ['COUNT'];
    initialAggregate = 'COUNT';
  }

  // Initialize Leva controls with props as default values
  const controlsConfig = {
    style: { value: initialStyle, options: ['Summary', 'Scatter'], label: 'Plot style', hint: 'The style of the plot. Either a summary plot or a scatter plot.' },
    animationSpeed: { value: initialAnimationSpeed, label: 'Animation Speed', step: 1, hint: 'The speed of the time animation in seconds.' },
    theme: { value: initialTheme, options: ['dark', 'light'], label: 'Theme', hint: 'The theme of the map.' },
    projection: { value: initialProjection, options: ['Mercator', 'Globe'], label: 'Projection', hint: 'The projection of the map.' },
    columnToPlot: { value: initialColumnToPlot, options: columnNames, label: 'Column to plot', hint: 'The column to plot on the map.' },
    'Additional summary settings': folder({
      summaryStyle: { value: initialSummaryStyle, options: ['Grid', 'Hexagon'], label: 'Style', hint: 'The style of the summary plot.' },
      colorScheme: {
        value: initialColorScheme,
        options: Object.keys(colorbrewer).filter(scheme => colorbrewer[scheme]['6']), // Only show schemes with 6 classes
        label: 'Color Scheme'
      },
      aggregate: { value: initialAggregate, options: aggregateOptions, label: 'Aggregation function', hint: 'The aggregation function to use for the color scale and height (if height > 0).' },
      repeatedPointsAggregate: { value: initialRepeatedPointsAggregate, options: repeatedPointsAggregateOptions, label: 'Repeated points aggregation function', hint: 'An additional aggregation function to use for data points within a grid cell that have the same time.' },
      preserveDomains: { value: initialPreserveDomains, label: 'Colour scale based on all data', hint: 'If true, the colour scale will be based on all data points. If false, the colour scale will be based on the current time window.' },
      summaryRadius: { value: initialSummaryRadius, label: 'Radius', step: 1, hint: 'The radius of the grid cell or hexagon.' },
      summaryCoverage: { value: initialSummaryCoverage, label: 'Size of cell', step: 0.1, hint: 'The cell size factor. The size of a cell is calculated as `Size of cell * Radius`.' },
      summaryHeight: { value: initialSummaryHeight, label: 'Height', step: 1, hint: 'The height of the grid cell or hexagon.', hint: 'The height of the grid cell or hexagon.' },
    }, { collapsed: true, render: (get) => get('style') === 'Summary' }),
    'Scatter settings': folder({
      radiusScale: { value: initialRadiusScale, label: 'Radius', step: 100, hint: 'The radius scale factor.' },
      radiusMinPixels: { value: initialRadiusMinPixels, label: 'Minimum radius', step: 0.001, hint: 'The minimum radius in pixels.' },
    }, { collapsed: true, render: (get) => get('style') === 'Scatter' }),
  };

  // Remove columnToPlot from controlsConfig if initialColumnToPlot is not valid
  if (!columnNames.includes(initialColumnToPlot)) {
    delete controlsConfig.columnToPlot;
  }

  const {
    style,
    columnToPlot,
    animationSpeed,
    theme,
    projection,
    colorScheme,
    aggregate,
    repeatedPointsAggregate,
    preserveDomains,
    summaryRadius,
    summaryCoverage,
    summaryHeight,
    summaryStyle,
    radiusScale,
    radiusMinPixels,
  } = useControls(controlsConfig);


  useEffect(() => {
    // Check if the selected color scheme has 6 classes
    if (colorbrewer[colorScheme] && colorbrewer[colorScheme]['6']) {
      const newColorRange = colorbrewer[colorScheme]['6'].map(hexToRgb); // Convert hex to RGB

      setColorRange(newColorRange);
    } else {
      console.error(`Color scheme ${colorScheme} does not have 6 classes`);
      setColorRange([]); // Set an empty or default color range
    }
  }, [colorScheme]);

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

  // Transform data based on selected columnToPlot
  const transformedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      value: d[columnToPlot]
    }));
  }, [data, columnToPlot]);

  // Determine the plot component based on the selected style
  const plot = useMemo(() => {
    if (!transformedData || !transformedData.some(d => d.lng && d.lat)) {
      let columnsInData = transformedData.map(d => Object.keys(d));
      console.error(
        'Unsupported columns: ',
        columnsInData,
        'Columns should include: "lng", "lat", an optional timestamp and columns to plot.'
      );
      return <div>Unsupported data type: {columnsInData}</div>;
    }

    let MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    if (theme === 'light') {
      MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
    }

    if (style === 'Scatter') {
      return (
        <ScatterTimePlot
          // Sort data by value in ascending order, so that higher value points are rendered on top
          data={transformedData.sort((a, b) => a.value - b.value)}
          timeRange={timeRange}
          theme={theme}
          mapStyle={MAP_STYLE}
          initialViewState={INITIAL_VIEW_STATE}
          radiusScale={radiusScale}
          radiusMinPixels={radiusMinPixels}
          projection={projection}
        />
      );
    } else if (style === 'Summary') {
      return (
        <SummaryPlot
          // sort by time
          data={transformedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
          colorAggregation={aggregate}
          elevationAggregation={aggregate}
          repeatedPointsAggregation={repeatedPointsAggregate}
          preserveDomains={preserveDomains}
          timeRange={timeRange}
          radius={summaryRadius}
          coverage={Math.min(Math.max(summaryCoverage, 0), 1)}
          animationSpeed={animationSpeed}
          theme={theme}
          mapStyle={MAP_STYLE}
          isGridView={summaryStyle === 'Grid'}
          initialViewState={INITIAL_VIEW_STATE}
          projection={projection}
          summaryHeight={summaryHeight}
          colorRange={colorRange}
        />
      );
    } else {
      console.error('Unsupported style:', style, 'Supported styles are: Scatter, Summary');
      return null;
    }
  }, [
    style,
    aggregate,
    colorRange,
    repeatedPointsAggregate,
    preserveDomains,
    transformedData,
    timeRange,
    summaryRadius,
    summaryCoverage,
    animationSpeed,
    summaryHeight,
    theme,
    radiusScale,
    radiusMinPixels,
    summaryStyle,
    projection,
  ]);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  return (
    <div className="space-time-viewer">
      {plot}
      <Provider delayDuration={0}>
        <Leva theme={levaTheme} />
      </Provider>
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
