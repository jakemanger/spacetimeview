import React, { useEffect, useState, useMemo } from 'react';
import SummaryPlot from './plots/SummaryPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls, Leva } from 'leva';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import PinchIcon from '@mui/icons-material/Pinch';
import './SpaceTimeViewer.css';
import colorbrewer from 'colorbrewer';
import { Helmet } from 'react-helmet';
import Header from './ui/Header';
import { interpolateRgb } from 'd3-interpolate';
import ControlsMenu from './ui/ControlsMenu';


function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  return [r, g, b];
}

function rgbStringToArray(rgbString) {
  // Convert "rgb(r, g, b)" to [r, g, b]
  return rgbString
    .slice(4, -1) // Remove "rgb(" and ")"
    .split(",")   // Split by ","
    .map(Number); // Convert each part to a number
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

// Function to safely get nested properties
function getNested(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj);
}

export default function SpaceTimeViewer({
  data = [],
  initialStyle = 'Summary',
  initialColumnToPlot = 'value',
  initialAggregate = 'MEAN',
  initialRepeatedPointsAggregate = 'None',
  initialStickyRange = true,
  initialSummaryRadius = 5000,
  initialSummaryCoverage = 1,
  initialAnimationSpeed = 1,
  initialTheme = 'light',
  initialRadiusScale = 1,
  initialRadiusMinPixels = 3,
  initialSummaryStyle = 'Hexagon',
  initialProjection = 'Mercator',
  initialSummaryHeight = 0,
  initialColorScheme = 'YlOrRd',
  initialColorScaleType = 'quantize',
  initialNumDecimals = 1,
  factorLevels = null,
  factorColors = null,
  headerLogo = '',
  headerTitle = '',
  headerWebsiteLink = '',
  socialLinks = {},
  visibleControls = [
    'column_to_plot',
    'style',
    'color_scheme',
    'animation_speed',
    'summary_radius',
    'summary_height',
    'radius_min_pixels',
    'aggregate',
    'filter_column',
    'enable_clicked_tooltips',
  ],
  controlNames = {
    'column_to_plot': 'Dataset',
    'style': 'Plot Type',
    'color_scheme': 'Color Scheme',
    'animation_speed': 'Animation Speed',
    'summary_radius': 'Cell Radius',
    'summary_height': 'Cell Height',
    'radius_min_pixels': 'Minimum Point Radius',
    'aggregate': 'Aggregate',
    'filter_column': 'Filter Column',
    'enable_clicked_tooltips': 'Clickable Tooltips'
  },
  initialFilterColumn = null,
  defaultFilterValue = null,
  draggableMenu = false,
  polygons = null,
  factorIcons = null,
  enableClickedTooltips = true, // highly experimental, undocumented and not recommended
  tabTitles = [],
  activeTab = 0,
  onTabChange = () => {},
  observable = null,
  ...props // Capture any other props
}) {
  // Memoize the data transformation to prevent unnecessary re-renders
  const transformedData = useMemo(() => {
    const convertedData = HTMLWidgets.dataframeToD3(data);
    return convertedData;
  }, [data]);

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
  );

  const [filterColumnValues, setFilterColumnValues] = useState([]);
  const [filterOptions, setFilterOptions] = useState([]);

  // Add new state for columns to plot selection
  const [columnsToPlotValues, setColumnsToPlotValues] = useState([]);
  const [columnsToPlotOptions, setColumnsToPlotOptions] = useState([]);

  const columnNames = useMemo(() => {
    if (transformedData.length === 0) return [];
    return Object.keys(transformedData[0]).filter(
      key => key !== 'lng' && key !== 'lat' && key !== 'timestamp'
    );
  }, [transformedData]);

  let aggregateOptions = ['SUM', 'MEAN', 'COUNT', 'MIN', 'MAX', 'MODE'];
  let factorAggregateOptions = ['MODE'];
  let repeatedPointsAggregateOptions = ['None', 'SUM', 'MEAN', 'COUNT', 'MIN', 'MAX', 'MODE'];
  if (!transformedData.length || !transformedData[0].hasOwnProperty(initialColumnToPlot)) {
    aggregateOptions = ['COUNT'];
    initialAggregate = 'COUNT';
  }

  // Check whether initialAggregate is in aggregateOptions
  if (!initialAggregate || !aggregateOptions.includes(initialAggregate)) {
    console.error(`Invalid initial aggregate: ${initialAggregate}. Defaulting to ${aggregateOptions[0]}`);
    initialAggregate = aggregateOptions[0];
  }

  const controlsConfig = {
    style: {
      value: initialStyle,
      options: ['Summary', 'Scatter'],
      label: controlNames['style'] || 'Plot Type',
      hint: 'Select whether to display a Summary or Scatter plot.',
      render: () => visibleControls.includes('style')
    },
    projection: {
      value: initialProjection,
      options: ['Mercator', 'Globe'],
      label: controlNames['projection'] || 'Map Projection',
      hint: 'Choose how the map projection is displayed.',
      render: () => visibleControls.includes('projection')
    },
    colorScheme: {
      value: initialColorScheme,
      options: Object.keys(colorbrewer).filter(scheme => colorbrewer[scheme]['6']),
      label: controlNames['color_scheme'] || 'Color Scheme',
      hint: 'Select a color scheme to represent data visually.',
      render: () => visibleControls.includes('color_scheme')
    },
    theme: {
      value: initialTheme,
      options: ['light', 'dark'],
      label: controlNames['theme'] || 'Theme',
      hint: 'Choose between light and dark themes for the map.',
      render: () => visibleControls.includes('theme')
    },
    summaryStyle: {
      value: initialSummaryStyle,
      options: ['Grid', 'Hexagon'],
      label: controlNames['summary_style'] || 'Grid/Hexagon Style',
      hint: 'Choose whether the summary plot uses a grid or hexagon layout.',
      render: () => visibleControls.includes('summary_style')
    },
    summaryRadius: {
      value: initialSummaryRadius,
      label: controlNames['summary_radius'] || 'Radius',
      step: 1,
      hint: 'The radius of each grid cell or hexagon in the summary plot.',
      render: get => visibleControls.includes('summary_radius') && get('style') === 'Summary'
    },
    summaryCoverage: {
      value: initialSummaryCoverage,
      label: controlNames['summary_coverage'] || 'Cell Size Factor',
      step: 0.1,
      hint: 'Controls the size of the grid cell or hexagon as a multiple of the radius.',
      render: get => visibleControls.includes('summary_coverage') && get('style') === 'Summary'
    },
    summaryHeight: {
      value: initialSummaryHeight,
      label: controlNames['summary_height'] || 'Height of Cells',
      step: 1,
      hint: 'Sets the 3D height of grid cells or hexagons in the summary plot.',
      render: get => visibleControls.includes('summary_height') && get('style') === 'Summary'
    },
    preserveDomains: {
      value: initialStickyRange,
      label: controlNames['preserve_domains'] || 'Sticky Range',
      hint: 'If enabled, the min and max color/elevation values will persist across time intervals.',
      render: get => visibleControls.includes('preserve_domains') && get('style') === 'Summary'
    },
    aggregate: {
      value: aggregateOptions.includes(initialAggregate) ? initialAggregate : aggregateOptions[0],
      options: aggregateOptions,
      label: controlNames['aggregate'] || 'Aggregation Type',
      hint: 'Select the aggregation function for summarizing data in the grid or hexagon cells.',
      render: get => visibleControls.includes('aggregate') && get('style') === 'Summary' && (!factorLevels || !factorLevels[get('columnToPlot')])
    },
    factorAggregate: {
      value: factorAggregateOptions.includes(initialAggregate) ? initialAggregate : factorAggregateOptions[0],
      options: factorAggregateOptions,
      label: controlNames['aggregate'] || 'Aggregation Type',
      hint: 'Select the aggregation function for summarizing data in the grid or hexagon cells.',
      render: get => visibleControls.includes('aggregate') && get('style') === 'Summary' && factorLevels && factorLevels[get('columnToPlot')]
    },
    repeatedPointsAggregate: {
      value: initialRepeatedPointsAggregate,
      options: repeatedPointsAggregateOptions,
      label: controlNames['repeated_points_aggregate'] || 'Repeat Handling',
      hint: 'Choose how to aggregate data points that share the same time and location.',
      render: () => visibleControls.includes('repeated_points_aggregate')
    },
    colorScaleType: {
      value: initialColorScaleType,
      options: ['quantize', 'quantile'],
      label: controlNames['color_scale_type'] || 'Color Scale Type',
      hint: 'Choose between quantize or quantile color scales for the summary plot.',
      render: () => visibleControls.includes('color_scale_type')
    },
    numDecimals: {
      value: initialNumDecimals,
      label: controlNames['num_decimals'] || 'Decimals in Legend',
      hint: 'Set the number of decimal places to display in the legend.',
      render: () => visibleControls.includes('num_decimals')
    },
    radiusScale: {
      value: initialRadiusScale,
      label: controlNames['radius_scale'] || 'Point Radius Scale',
      step: 100,
      hint: 'Adjust the size of scatter plot points.',
      render: get => visibleControls.includes('radius_scale') && get('style') === 'Scatter'
    },
    radiusMinPixels: {
      value: initialRadiusMinPixels,
      label: controlNames['radius_min_pixels'] || 'Minimum Point Radius',
      step: 0.001,
      hint: 'Set the minimum size for scatter plot points, in pixels.',
      render: get => visibleControls.includes('radius_min_pixels') && get('style') === 'Scatter'
    },
    animationSpeed: {
      value: initialAnimationSpeed,
      label: controlNames['animation_speed'] || 'Animation Speed',
      step: 1,
      hint: 'Adjust the speed of the time animation, in seconds.',
      render: () => visibleControls.includes('animation_speed')
    },
    filterColumn: {
      value: initialFilterColumn,
      options: columnNames.concat(null),
      label: controlNames['filter_column'] || 'Filter Column',
      hint: 'Choose a column to filter the data by.',
      render: () => visibleControls.includes('filter_column'),
    },
    enableClickedTooltips: {
      value: enableClickedTooltips,
      label: controlNames['enable_clicked_tooltips'] || 'Clickable Tooltips',
      hint: 'Enable to pin tooltips when clicking on data points.',
      render: () => visibleControls.includes('enable_clicked_tooltips')
    }
  };


  const [
    {
      style,
      animationSpeed,
      theme,
      projection,
      colorScheme,
      colorScaleType,
      numDecimals,
      aggregate,
      factorAggregate,
      repeatedPointsAggregate,
      preserveDomains,
      summaryRadius,
      summaryCoverage,
      summaryHeight,
      summaryStyle,
      radiusScale,
      radiusMinPixels,
      filterColumn,
      enableClickedTooltips: clickedTooltipsEnabled
    },
    set
  ] = useControls(
    () => controlsConfig,
    [
      data,
      initialStyle,
      initialColumnToPlot,
      initialAggregate,
      initialRepeatedPointsAggregate,
      initialStickyRange,
      initialSummaryRadius,
      initialSummaryCoverage,
      initialAnimationSpeed,
      initialTheme,
      initialRadiusScale,
      initialRadiusMinPixels,
      initialSummaryStyle,
      initialProjection,
      initialSummaryHeight,
      initialColorScheme,
      initialColorScaleType,
      initialNumDecimals,
      factorLevels,
      controlNames,
      initialFilterColumn,
      draggableMenu,
      factorIcons,
      enableClickedTooltips,
    ]
  );

  // if any input props change (e.g. shiny controlling the ui)
  useEffect(() => {
    set(
      {
        style: initialStyle,
        projection: initialProjection,
        colorScheme: initialColorScheme,
        theme: initialTheme,
        summaryStyle: initialSummaryStyle,
        summaryRadius: initialSummaryRadius,
        summaryCoverage: initialSummaryCoverage,
        summaryHeight: initialSummaryHeight,
        preserveDomains: initialStickyRange,
        aggregate: aggregateOptions.includes(initialAggregate) ? initialAggregate : aggregateOptions[0],
        factorAggregate: factorAggregateOptions.includes(initialAggregate) ? initialAggregate : factorAggregateOptions[0],
        repeatedPointsAggregate: initialRepeatedPointsAggregate,
        colorScaleType: initialColorScaleType,
        numDecimals: initialNumDecimals,
        radiusScale: initialRadiusScale,
        radiusMinPixels: initialRadiusMinPixels,
        animationSpeed: initialAnimationSpeed,
        filterColumn: initialFilterColumn,
        enableClickedTooltips: enableClickedTooltips,
      }
    )
  }, [
    data,
    initialStyle,
    initialAggregate,
    initialRepeatedPointsAggregate,
    initialStickyRange,
    initialSummaryRadius,
    initialSummaryCoverage,
    initialAnimationSpeed,
    initialTheme,
    initialRadiusScale,
    initialRadiusMinPixels,
    initialSummaryStyle,
    initialProjection,
    initialSummaryHeight,
    initialColorScheme,
    initialColorScaleType,
    initialNumDecimals,
    factorLevels,
    visibleControls,
    controlNames,
    initialFilterColumn,
    defaultFilterValue,
    draggableMenu,
    factorIcons,
    enableClickedTooltips,
  ]);

  // Calculate information for the selected filter display
  const selectedFilterDisplayInfo = useMemo(() => {
    if (filterColumn && factorLevels?.[filterColumn] && factorIcons?.[filterColumn] && filterColumnValues?.length > 0) {
      // Limit the number of displayed filters to avoid clutter
      const displayLimit = 3;
      const info = filterColumnValues.slice(0, displayLimit).map(value => {
        const label = factorLevels[filterColumn]?.[value];
        if (!label) return null;
        const iconPath = factorIcons[filterColumn]?.[label];
        // Count occurrences in the *original* transformed data
        const count = transformedData.filter(d => d[filterColumn] === value).length;
        return { label, iconPath, count };
      }).filter(Boolean); // Remove nulls if label wasn't found

      const totalSelectedCount = transformedData.filter(d => filterColumnValues.includes(d[filterColumn])).length;

      return {
         items: info,
         totalSelectedCount: totalSelectedCount,
         hasMore: filterColumnValues.length > displayLimit,
         totalFiltersApplied: filterColumnValues.length
      };
    }
    return null;
  }, [filterColumn, filterColumnValues, factorLevels, factorIcons, transformedData]);

  // Calculate effective column to plot for aggregate logic and legend title
  const effectiveColumnToPlot = columnsToPlotValues.length > 0 ? 
    (columnsToPlotValues.length === 1 ? columnsToPlotValues[0] : 'Combined') :
    (columnNames.length > 0 ? columnNames[0] : 'value');

  const legendTitle = columnsToPlotValues.length > 1 ? 
    `${columnsToPlotValues.join(' + ')}` : effectiveColumnToPlot;

  let aggregateToUse = factorLevels && factorLevels[effectiveColumnToPlot] ? factorAggregate : aggregate;

  if (factorLevels && factorLevels[effectiveColumnToPlot] && !factorAggregateOptions.includes(aggregateToUse)) {
    aggregateToUse = factorAggregateOptions[0]
  }

  useEffect(() => {
    if (factorLevels && factorLevels[effectiveColumnToPlot] && factorColors && factorColors[effectiveColumnToPlot]) {
      console.log('Using custom factor colors for column:', effectiveColumnToPlot);
      const customColors = factorColors[effectiveColumnToPlot];
      const factorLevelNames = factorLevels[effectiveColumnToPlot];
      const numLevels = factorLevelNames.length;
      
      // Convert hex colors to RGB arrays
      let colorRange = [];
      
      // Check if customColors is an object (named colors) or array (indexed colors)
      const isNamedColors = customColors && typeof customColors === 'object' && !Array.isArray(customColors);
      
      for (let i = 0; i < numLevels; i++) {
        let hexColor;
        
        if (isNamedColors) {
          // Use factor level name to look up color
          const levelName = factorLevelNames[i];
          hexColor = customColors[levelName];
          if (!hexColor) {
            console.warn(`No color found for factor level "${levelName}". Available colors:`, Object.keys(customColors));
            hexColor = Object.values(customColors)[0] || '#888888';
          }
        } else {
          const colorsArray = Array.isArray(customColors) ? customColors : Object.values(customColors);
          if (i < colorsArray.length) {
            hexColor = colorsArray[i];
          } else {
            // If not enough colors provided, cycle through the provided ones
            hexColor = colorsArray[i % colorsArray.length];
          }
        }
        
        if (hexColor) {
          const rgb = hexToRgb(hexColor);
          colorRange.push(rgb);
        } else {
          console.warn(`No valid color found for index ${i}, using default gray`);
          colorRange.push([136, 136, 136]); // Default gray
        }
      }
      
      setColorRange(colorRange);
    } else if (colorbrewer[colorScheme] && colorbrewer[colorScheme]['6']) {
      // Fall back to colorbrewer interpolation
      // Convert baseColorRange from arrays to "rgb(r, g, b)" strings for interpolation
      let baseColorRange = colorbrewer[colorScheme]['6']
        .map(hexToRgb)
        .map(rgbArray => `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]})`);

      const numClasses = factorLevels && factorLevels[effectiveColumnToPlot] ? factorLevels[effectiveColumnToPlot].length : baseColorRange.length;

      // Generate interpolated colors between the start and end of baseColorRange
      let interpolatedColorRange = [];
      for (let i = 0; i < numClasses; i++) {
        const t = i / (numClasses - 1);
        const interpolatedColor = interpolateRgb(baseColorRange[0], baseColorRange[baseColorRange.length - 1])(t);
        interpolatedColorRange.push(rgbStringToArray(interpolatedColor));
      }

      setColorRange(interpolatedColorRange);
    } else {
      console.error(`Color scheme ${colorScheme} does not have 6 classes`);
      setColorRange([]);
    }
  }, [colorScheme, factorLevels, effectiveColumnToPlot, factorColors]);

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
    setLevaTheme({
      colors: newLevaThemeColors,
      shadows: {
        level1: '0 0 10px rgba(0, 0, 0, 0.2)',
        level2: '0 0 10px rgba(0, 0, 0, 0.2)',
      },
    });
  }, [theme]);

  useEffect(() => {
    if (filterColumn && factorLevels && factorLevels[filterColumn]) {
      const options = factorLevels[filterColumn].map((value, index) => ({
        value: index, // Use index as the value
        label: String(value), // Use the factor level as the label
      }));
      setFilterOptions(options);
      
      if (defaultFilterValue !== null && Array.isArray(defaultFilterValue)) {
        const defaultIndices = defaultFilterValue
          .map(value => factorLevels[filterColumn].indexOf(value))
          .filter(index => index !== -1); // Only include valid indices
        setFilterColumnValues(defaultIndices);
      } else if (defaultFilterValue !== null) {
        const defaultIndex = factorLevels[filterColumn].indexOf(defaultFilterValue);
        if (defaultIndex !== -1) {
          setFilterColumnValues([defaultIndex]);
        }
      }
    } else {
      setFilterOptions([]);
      setFilterColumnValues([]);
    }
  }, [filterColumn, factorLevels, transformedData, defaultFilterValue]);

  useEffect(() => {
    if (columnNames.length > 0) {
      const options = columnNames.map(column => ({
        value: column,
        label: column
      }));
      setColumnsToPlotOptions(options);
      
      // Set initial value if not already set or if it needs to be updated
      if (columnsToPlotValues.length === 0) {
        if (columnNames.includes(initialColumnToPlot)) {
          setColumnsToPlotValues([initialColumnToPlot]);
        } else if (columnNames.length > 0) {
          setColumnsToPlotValues([columnNames[0]]);
        }
      }
    } else {
      setColumnsToPlotOptions([]);
      setColumnsToPlotValues([]);
    }
  }, [columnNames, initialColumnToPlot]);

  // Parse and log polygon data if available
  useEffect(() => {
    if (polygons) {
      console.log('Polygon data provided to SpaceTimeViewer component:');
      try {
        // Log the raw data first
        console.log('Raw polygon data type:', typeof polygons);
        console.log('Raw polygon data length:', polygons.length);
        
        // Then try to parse it if it's a string
        const parsedPolygons = typeof polygons === 'string' ? JSON.parse(polygons) : polygons;
        console.log('Parsed polygon data:', parsedPolygons);
        
        // Check if it has the expected GeoJSON structure
        if (parsedPolygons.type && parsedPolygons.features) {
          console.log('GeoJSON type:', parsedPolygons.type);
          console.log('Number of features:', parsedPolygons.features.length);
          console.log('First feature:', parsedPolygons.features[0]);
        } else {
          console.warn('Polygon data does not appear to be in GeoJSON format');
        }
      } catch (error) {
        console.error('Error parsing polygon data:', error);
        console.log('Raw polygon data preview:', polygons.substring(0, 500) + '...');
      }
    } else {
      console.log('No polygon data provided to SpaceTimeViewer component');
    }
  }, [polygons]);

  let INITIAL_VIEW_STATE = {
    longitude: transformedData.reduce((sum, d) => sum + d.lng, 0) / transformedData.length,
    latitude: transformedData.reduce((sum, d) => sum + d.lat, 0) / transformedData.length,
    zoom: 3,
    pitch: 0,
    bearing: 0
  };

  const timeRange = useMemo(() => getTimeRange(transformedData), [transformedData]);

  const filteredData = useMemo(() => {
    let dat = transformedData;

    // filter rows based on filterColumn and filterColumnValues
    if (filterColumn && filterColumnValues.length > 0) {
      dat = dat.filter(d => filterColumnValues.includes(d[filterColumn]));
    }

    // Handle multiple columns to plot - if no columns selected, use the first available column
    const effectiveColumnsToPlot = columnsToPlotValues.length > 0 ? columnsToPlotValues : 
      (columnNames.length > 0 ? [columnNames[0]] : []);

    // remove rows where all selected columns are undefined or null
    if (effectiveColumnsToPlot.length > 0) {
      dat = dat.filter(d => effectiveColumnsToPlot.some(col => d[col] !== undefined && d[col] !== null));
    }

    // add 'value' property by summing the values from all selected columns
    dat = dat.map(d => {
      let totalValue = 0;
      let validColumns = 0;
      
      effectiveColumnsToPlot.forEach(col => {
        const colValue = d[col];
        if (colValue !== undefined && colValue !== null && !isNaN(colValue)) {
          totalValue += Number(colValue);
          validColumns++;
        }
      });
      
      // Use the sum if we have multiple columns, otherwise use the single value
      const finalValue = effectiveColumnsToPlot.length > 1 ? totalValue : 
        (validColumns > 0 ? totalValue : undefined);
      
      return {
      ...d,
        value: finalValue
      };
    });

    // Remove rows with undefined values after processing
    dat = dat.filter(d => d.value !== undefined && d.value !== null);

    return dat;
  }, [transformedData, columnsToPlotValues, columnNames, filterColumn, filterColumnValues]);

  const plot = useMemo(() => {
    console.log('replotting plot');
    if (!filteredData || !filteredData.some(d => d.lng && d.lat)) {
      let columnsInData = filteredData.map(d => Object.keys(d));
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
          data={filteredData.sort((a, b) => a.value - b.value)}
          timeRange={timeRange}
          theme={theme}
          mapStyle={MAP_STYLE}
          initialViewState={INITIAL_VIEW_STATE}
          radiusScale={radiusScale}
          radiusMinPixels={radiusMinPixels}
          animationSpeed={animationSpeed}
          projection={projection}
          colorRange={colorRange}
          columnName={legendTitle}
          themeColors={levaTheme.colors}
          factorLevels={factorLevels}
          factorColors={factorColors}
          polygons={polygons}
          factorIcons={factorIcons}
          filterColumn={filterColumn}
          enableClickedTooltips={clickedTooltipsEnabled}
          observable={observable}
        />
      );
    } else if (style === 'Summary') {
      return (
        <SummaryPlot
          data={filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
          colorAggregation={aggregateToUse}
          elevationAggregation={aggregateToUse}
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
          legendTitle={legendTitle}
          colorScaleType={colorScaleType}
          numDecimals={numDecimals}
          themeColors={levaTheme.colors}
          factorLevels={factorLevels}
          factorColors={factorColors}
          filterColumnValues={filterColumnValues}
          polygons={polygons}
          factorIcons={factorIcons}
          filterColumn={filterColumn}
          enableClickedTooltips={clickedTooltipsEnabled}
          observable={observable}
        />
      );
    } else {
      console.error('Unsupported style:', style, 'Supported styles are: Scatter, Summary');
      return null;
    }
  }, [
    style,
    aggregateToUse,
    colorRange,
    colorScaleType,
    repeatedPointsAggregate,
    preserveDomains,
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
    filterColumnValues,
    filteredData,
    polygons,
    factorIcons,
    filterColumn,
    clickedTooltipsEnabled,
    observable,
    legendTitle,
  ]);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  let topOffset = '20px';

  const hasHeader = headerLogo !== '' || headerTitle !== '' || headerWebsiteLink !== '' || Object.keys(socialLinks).length > 0;

  if (hasHeader) {
    topOffset = '80px';
  }

  // Style for the filter display box
  const filterDisplayBoxStyle = {
    position: 'absolute',
    top: hasHeader ? '80px' : '20px', // Position below header or at top
    left: '50%', // Center horizontally
    transform: 'translateX(-50%)',
    zIndex: 500, // Above map, below controls/tooltips maybe
    background: levaTheme.colors.elevation2, // Use theme color
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: levaTheme.colors.highlight2, // Use theme text color
    fontSize: '13px',
    maxWidth: '80%',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  };

  return (
    <div className="space-time-viewer">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      {(hasHeader || tabTitles.length > 0) && (
        <Header
          logo={headerLogo}
          title={headerTitle}
          websiteLink={headerWebsiteLink}
          socialLinks={socialLinks}
          themeColors={levaTheme.colors}
          tabs={tabTitles}
          activeTab={activeTab}
          onTabClick={onTabChange}
        />
      )}
      <ControlsMenu
        dockPosition="floating"
        levaTheme={levaTheme}
        filterColumn={filterColumn}
        filterOptions={filterOptions}
        filterColumnValues={filterColumnValues}
        setFilterColumnValues={setFilterColumnValues}
        columnsToPlotOptions={columnsToPlotOptions}
        columnsToPlotValues={columnsToPlotValues}
        setColumnsToPlotValues={setColumnsToPlotValues}
        draggableMenu={draggableMenu}
        factorIcons={factorIcons}
        visibleControls={visibleControls}
        controlNames={controlNames}
      />

      {/* Display Area for Selected Filter Info */} 
      {selectedFilterDisplayInfo && (
        <div style={filterDisplayBoxStyle}>
          <span style={{ fontWeight: 'bold', flexShrink: 0 }}>Filter:</span>
          {selectedFilterDisplayInfo.items.map((item, index) => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {item.iconPath && (
                <img 
                  src={item.iconPath} 
                  alt="" 
                  style={{ width: '18px', height: '18px', marginRight: '4px', verticalAlign: 'middle' }} 
                />
              )}
              {item.label} ({item.count})
            </span>
          ))}
          {selectedFilterDisplayInfo.hasMore && (
            <span style={{ fontStyle: 'italic', flexShrink: 0 }}>
               (+{selectedFilterDisplayInfo.totalFiltersApplied - selectedFilterDisplayInfo.items.length} more)
            </span>
          )}
           <span style={{ marginLeft: 'auto', paddingLeft: '10px', fontWeight: 'bold', flexShrink: 0 }}>
              Total: {selectedFilterDisplayInfo.totalSelectedCount}
           </span>
        </div>
      )}
      {plot}
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
