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
import { Helmet } from 'react-helmet';
import Header from './ui/Header';


function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
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
  initialAggregate = 'MEAN',
  initialRepeatedPointsAggregate = 'MEAN',
  initialStickyRange = true,
  initialSummaryRadius = 5000,
  initialSummaryCoverage = 1,
  initialAnimationSpeed = 60,
  initialTheme = 'light',
  initialRadiusScale = 1,
  initialRadiusMinPixels = 3,
  initialSummaryStyle = 'Hexagon',
  initialProjection = 'Mercator',
  initialSummaryHeight = 0,
  initialColorScheme = 'YlOrRd',
  initialColorScaleType = 'quantize',
  initialNumDecimals = 1,
  headerLogo = '',
  headerTitle = '',
  headerWebsiteLink = '',
  socialLinks = {}
}) {
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

  const columnNames = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(
      key => key !== 'lng' && key !== 'lat' && key !== 'timestamp'
    );
  }, [data]);

  let aggregateOptions = ['SUM', 'MEAN', 'COUNT', 'MIN', 'MAX'];
  let repeatedPointsAggregateOptions = ['None', 'SUM', 'MEAN', 'COUNT', 'MIN', 'MAX'];
  if (!data.length || !data[0].hasOwnProperty(initialColumnToPlot)) {
    aggregateOptions = ['COUNT'];
    initialAggregate = 'COUNT';
  }

  const controlsConfig = {
    'General Settings': folder({
      style: {
        value: initialStyle,
        options: ['Summary', 'Scatter'],
        label: 'Plot Type',
        hint: 'Select whether to display a Summary or Scatter plot.'
      },
      columnToPlot: {
        value: initialColumnToPlot,
        options: columnNames,
        label: 'Column to Plot',
        hint: 'Choose the data column to visualize on the map.'
      },
      projection: {
        value: initialProjection,
        options: ['Mercator', 'Globe'],
        label: 'Map Projection',
        hint: 'Choose how the map projection is displayed.'
      },
      colorScheme: {
        value: initialColorScheme,
        options: Object.keys(colorbrewer).filter(scheme => colorbrewer[scheme]['6']),
        label: 'Color Scheme',
        hint: 'Select a color scheme to represent data visually.'
      },
      theme: {
        value: initialTheme,
        options: ['light', 'dark'],
        label: 'Theme',
        hint: 'Choose between light and dark themes for the map.'
      },
    }),

    'Summary Plot Settings': folder({
      summaryStyle: {
        value: initialSummaryStyle,
        options: ['Grid', 'Hexagon'],
        label: 'Grid/Hexagon Style',
        hint: 'Choose whether the summary plot uses a grid or hexagon layout.'
      },
      summaryRadius: {
        value: initialSummaryRadius,
        label: 'Radius',
        step: 1,
        hint: 'The radius of each grid cell or hexagon in the summary plot.'
      },
      summaryCoverage: {
        value: initialSummaryCoverage,
        label: 'Cell Size Factor',
        step: 0.1,
        hint: 'Controls the size of the grid cell or hexagon as a multiple of the radius.'
      },
      summaryHeight: {
        value: initialSummaryHeight,
        label: 'Height of Cells',
        step: 1,
        hint: 'Sets the 3D height of grid cells or hexagons in the summary plot.'
      },
      preserveDomains: {
        value: initialStickyRange,
        label: 'Sticky Range',
        hint: 'If enabled, the min and max color/elevation values will persist across time intervals.'
      },
      aggregate: {
        value: initialAggregate,
        options: aggregateOptions,
        label: 'Aggregation Type',
        hint: 'Select the aggregation function for summarizing data in the grid or hexagon cells.'
      },
      repeatedPointsAggregate: {
        value: initialRepeatedPointsAggregate,
        options: repeatedPointsAggregateOptions,
        label: 'Repeat Handling',
        hint: 'Choose how to aggregate data points that share the same time and location.'
      },
      colorScaleType: {
        value: initialColorScaleType,
        options: ['quantize', 'quantile'],
        label: 'Color Scale Type',
        hint: 'Choose between quantize or quantile color scales for the summary plot.'
      },
      numDecimals: {
        value: initialNumDecimals,
        label: 'Decimals in Legend',
        hint: 'Set the number of decimal places to display in the legend.'
      },
    }, { collapsed: true, render: (get) => get('General Settings.style') === 'Summary' }),

    'Scatter Plot Settings': folder({
      radiusScale: {
        value: initialRadiusScale,
        label: 'Point Radius Scale',
        step: 100,
        hint: 'Adjust the size of scatter plot points.'
      },
      radiusMinPixels: {
        value: initialRadiusMinPixels,
        label: 'Minimum Point Radius',
        step: 0.001,
        hint: 'Set the minimum size for scatter plot points, in pixels.'
      },
    }, { collapsed: true, render: (get) => get('General Settings.style') === 'Scatter' }),

    'Animation & Interaction': folder({
      animationSpeed: {
        value: initialAnimationSpeed,
        label: 'Animation Speed',
        step: 1,
        hint: 'Adjust the speed of the time animation, in seconds.'
      },
    })
  };

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
    colorScaleType,
    numDecimals,
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
    if (colorbrewer[colorScheme] && colorbrewer[colorScheme]['6']) {
      const newColorRange = colorbrewer[colorScheme]['6'].map(hexToRgb);
      setColorRange(newColorRange);
    } else {
      console.error(`Color scheme ${colorScheme} does not have 6 classes`);
      setColorRange([]);
    }
  }, [colorScheme]);

  useEffect(() => {
    const newLevaThemeColors = theme === 'dark' ? {
      elevation1: '#292d39',
      elevation2: '#181C20',
      elevation3: '#373C4B',
      accent1: '#0066DC',
      accent2: '#007BFF',
      accent3: '#3C93FF',
      highlight1: '#535760',
      highlight2: '#F1F3F5',
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
    setLevaTheme({ colors: newLevaThemeColors });
  }, [theme]);

  let INITIAL_VIEW_STATE = {
    longitude: data.reduce((sum, d) => sum + d.lng, 0) / data.length,
    latitude: data.reduce((sum, d) => sum + d.lat, 0) / data.length,
    zoom: 3,
    pitch: 0,
    bearing: 0
  };

  const timeRange = useMemo(() => getTimeRange(data), [data]);

  const transformedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      value: d[columnToPlot]
    }));
  }, [data, columnToPlot]);

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
          data={transformedData.sort((a, b) => a.value - b.value)}
          timeRange={timeRange}
          theme={theme}
          mapStyle={MAP_STYLE}
          initialViewState={INITIAL_VIEW_STATE}
          radiusScale={radiusScale}
          radiusMinPixels={radiusMinPixels}
          animationSpeed={animationSpeed}
          projection={projection}
          colorRange={colorRange}
          columnName={columnToPlot}
          themeColors={levaTheme.colors}
        />
      );
    } else if (style === 'Summary') {
      return (
        <SummaryPlot
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
          legendTitle={columnToPlot}
          colorScaleType={colorScaleType}
          numDecimals={numDecimals}
          themeColors={levaTheme.colors}
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
    colorScaleType,
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
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      <Header
        logo={headerLogo}
        title={headerTitle}
        websiteLink={headerWebsiteLink}
        socialLinks={socialLinks}
        themeColors={levaTheme.colors}
      />
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
