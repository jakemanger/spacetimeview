import React, { useEffect, useState, useMemo, useRef } from 'react';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/IconButton';
import PlayIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';

const durations = {
  All: [0, Infinity],
  Minute: [0, 60 * 1000],
  Hour: [0, 60 * 60 * 1000],
  Day: [0, 1 * 8.64e7],
  Week: [0, 7 * 8.64e7],
  Month: [0, 30 * 8.64e7],
  Year: [0, 365 * 8.64e7],
};

// aggregate data by time period
function aggregateDataByTime(data, duration, columnToPlot, aggregate = 'mean', viewMode = 'historical', normalizedTimeRange = null) {
  if (!data || data.length === 0) return [];

  console.log('AggregateDataByTime - columnToPlot:', columnToPlot, 'Sample data item:', data[0]);

  // can't aggregate by time without timestamps
  if (!data[0] || !data[0].timestamp) {
    console.warn('Data does not have timestamps, cannot aggregate by time');
    return [];
  }

  // calculate time range, with validation for seasonal mode
  let timeRange;
  if (viewMode === 'seasonal' && normalizedTimeRange && normalizedTimeRange[0] !== Infinity && normalizedTimeRange[1] !== -Infinity) {
    timeRange = normalizedTimeRange;
  } else {
    // calculate min/max without spread to avoid stack overflow on large datasets
    const timestamps = data.map(d => new Date(d.timestamp).getTime());
    timeRange = [
      timestamps.reduce((min, val) => val < min ? val : min, timestamps[0]),
      timestamps.reduce((max, val) => val > max ? val : max, timestamps[0])
    ];
  }

  // bail on invalid time ranges
  if (!isFinite(timeRange[0]) || !isFinite(timeRange[1]) || timeRange[0] >= timeRange[1]) {
    console.warn('Invalid time range:', timeRange);
    return [];
  }

  // determine bucket size based on duration
  let bucketSize;
  if (duration === 'All' || duration === 'Custom') {
    // for All/Custom, create ~100 buckets across the range
    bucketSize = (timeRange[1] - timeRange[0]) / 100;
  } else {
    bucketSize = durations[duration][1] - durations[duration][0];
  }

  // create buckets
  const buckets = new Map();

  data.forEach(d => {
    const timestamp = new Date(d.timestamp).getTime();
    const bucketIndex = Math.floor((timestamp - timeRange[0]) / bucketSize);
    const bucketTime = timeRange[0] + bucketIndex * bucketSize + bucketSize / 2; // use bucket midpoint

    if (!buckets.has(bucketIndex)) {
      buckets.set(bucketIndex, {
        time: bucketTime,
        values: []
      });
    }

    // get value from 'value' column (this is what the data has)
    const value = d.value;
    if (value !== null && value !== undefined && !isNaN(value)) {
      buckets.get(bucketIndex).values.push(Number(value));
    }
  });

  // aggregate values in each bucket
  const aggregatedData = [];
  buckets.forEach(bucket => {
    if (bucket.values.length > 0) {
      let aggregatedValue;
      switch (aggregate) {
        case 'mean':
          aggregatedValue = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length;
          break;
        case 'sum':
          aggregatedValue = bucket.values.reduce((a, b) => a + b, 0);
          break;
        case 'min':
          aggregatedValue = Math.min(...bucket.values);
          break;
        case 'max':
          aggregatedValue = Math.max(...bucket.values);
          break;
        case 'median':
          const sorted = [...bucket.values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          aggregatedValue = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          break;
        case 'count':
          aggregatedValue = bucket.values.length;
          break;
        default:
          aggregatedValue = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length;
      }
      aggregatedData.push({
        time: bucket.time,
        value: aggregatedValue
      });
    }
  });

  return aggregatedData.sort((a, b) => a.time - b.time);
}

// create color scale similar to the map
function createColorScale(data, colorRange, colorScaleType = 'quantize') {
  if (!data || data.length === 0 || !colorRange) return null;

  const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
  if (values.length === 0) return null;

  // use reduce instead of spread to avoid stack overflow with large datasets
  const minValue = values.reduce((min, val) => val < min ? val : min, values[0]);
  const maxValue = values.reduce((max, val) => val > max ? val : max, values[0]);

  if (colorScaleType === 'quantile') {
    // quantile scale
    const sortedValues = [...values].sort((a, b) => a - b);
    const quantiles = colorRange.map((_, i) => {
      const index = Math.floor((i / (colorRange.length - 1)) * (sortedValues.length - 1));
      return sortedValues[index];
    });

    return (value) => {
      for (let i = quantiles.length - 1; i >= 0; i--) {
        if (value >= quantiles[i]) {
          return colorRange[i];
        }
      }
      return colorRange[0];
    };
  } else {
    // quantize scale (default)
    const step = (maxValue - minValue) / colorRange.length;

    return (value) => {
      if (value <= minValue) return colorRange[0];
      if (value >= maxValue) return colorRange[colorRange.length - 1];
      const index = Math.min(
        Math.floor((value - minValue) / step),
        colorRange.length - 1
      );
      return colorRange[index];
    };
  }
}

export default function RangeInput({
  min,
  max,
  value,
  animationSpeed,
  onChange,
  formatLabel,
  data,
  onViewModeChange = null,
  viewMode = 'historical',
  columnToPlot = 'value',
  colorRange = null,
  colorScaleType = 'quantize',
  aggregate = 'mean'
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState('All');
  const [showHint, setShowHint] = useState(false);
  const [localViewMode, setLocalViewMode] = useState(viewMode);
  const animationRef = useRef(null);
  const sliderRef = useRef(null);

  // sync localViewMode with prop and reset range when switching modes
  const prevViewModeRef = useRef(viewMode);
  const hasResetRangeRef = useRef(false);

  useEffect(() => {
    if (prevViewModeRef.current !== viewMode) {
      setLocalViewMode(viewMode);
      prevViewModeRef.current = viewMode;
      hasResetRangeRef.current = false; // allow range reset when mode changes
    }
  }, [viewMode]);

  const minInterval = useMemo(() => {
    if (!data || data.length < 2) return Infinity;

    // bail if no timestamps
    if (!data[0] || !data[0].timestamp) return Infinity;

    const sortedTimestamps = data.map(d => new Date(d.timestamp).getTime()).sort((a, b) => a - b);
    let minDiff = Infinity;
    for (let i = 1; i < sortedTimestamps.length; i++) {
      const diff = sortedTimestamps[i] - sortedTimestamps[i - 1];
      if (diff < minDiff && diff > 0) minDiff = diff;
    }
    return minDiff;
  }, [data]);

  // process data for seasonal view (normalize all dates to same year)
  const normalizedData = useMemo(() => {
    if (localViewMode !== 'seasonal' || !data || data.length === 0) return data;

    // return unchanged if no timestamps
    if (!data[0] || !data[0].timestamp) return data;

    // use 2000 as reference year (it's a leap year)
    const referenceYear = 2000;

    return data.map(d => {
      // skip normalization if no timestamp
      if (!d.timestamp) return d;

      const date = new Date(d.timestamp);

      // skip if invalid date
      if (isNaN(date.getTime())) return d;

      // create new date with same month/day but reference year
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
  }, [data, localViewMode]);

  // calculate time range for normalized data
  const normalizedTimeRange = useMemo(() => {
    if (localViewMode !== 'seasonal' || !normalizedData || normalizedData.length === 0) {
      // return null to signal we should use min/max from props
      return null;
    }

    // for seasonal view, use full year range (jan 1 - dec 31 of reference year)
    const referenceYear = 2000;
    const yearStart = new Date(referenceYear, 0, 1, 0, 0, 0).getTime();
    const yearEnd = new Date(referenceYear, 11, 31, 23, 59, 59).getTime();

    return [yearStart, yearEnd];
  }, [normalizedData, localViewMode]);

  // reset range when switching modes
  useEffect(() => {
    if (localViewMode === 'seasonal' && normalizedTimeRange && !hasResetRangeRef.current) {
      onChange([normalizedTimeRange[0], normalizedTimeRange[1]]);
      hasResetRangeRef.current = true;
    } else if (localViewMode === 'historical' && !hasResetRangeRef.current) {
      onChange([-Infinity, Infinity]);
      hasResetRangeRef.current = true;
    }
  }, [localViewMode, normalizedTimeRange]);

  const availableDurations = useMemo(() => {
    // filter duration options based on minimum interval
    const filteredDurations = Object.entries(durations).filter(([key, [_, duration]]) => duration >= minInterval);

    // remove Month option in seasonal view (doesn't make sense in year-normalized context)
    if (localViewMode === 'seasonal') {
      return filteredDurations.filter(([key]) => key !== 'Month');
    }

    return filteredDurations;
  }, [minInterval, localViewMode]);

  const handleSliderChange = (newValue) => {
    const range = newValue[1] - newValue[0];
    if (range < minInterval) {
      onChange([newValue[0], newValue[0] + minInterval]);
    } else {
      onChange(newValue);
    }
    setDuration('Custom');
    setShowHint(false);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setLocalViewMode(newMode);

      // call parent handler if provided
      if (onViewModeChange) {
        onViewModeChange(newMode);
      }

      onChange([-Infinity, Infinity]);
    }
  };

  useEffect(() => {
    const animate = () => {
      const currentMin = localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[0] : min;
      const currentMax = localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[1] : max;

      let nextStartValue = value[0] + animationSpeed;
      let nextEndValue = value[1] + animationSpeed;

      if (Math.abs(value[0] - value[1]) > ((currentMax - currentMin) * 0.8)) {
        nextStartValue = currentMin;
        nextEndValue = currentMin + ((currentMax - currentMin) * 0.2);
      } else if (nextStartValue > currentMax || nextEndValue > currentMax) {
        nextStartValue = currentMin;
        nextEndValue = currentMin + (value[1] - value[0]);
      }
      handleSliderChange([nextStartValue, nextEndValue]);
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => animationRef.current && cancelAnimationFrame(animationRef.current);
  }, [isPlaying, value, animationSpeed, max, min, normalizedTimeRange, localViewMode]);

  const handleDurationChange = (event) => {
    const newDuration = event.target.value;
    setDuration(newDuration);
    if (newDuration === 'Custom') {
      setShowHint(true);
      return;
    }
    const [newMin, newMax] = durations[newDuration];
    if ((newMax - newMin) < minInterval) {
      alert(`The selected duration is too short for the data. Minimum interval between data points is ${(minInterval / 1000).toFixed(2)} seconds.`);
      return;
    }
    const currentMin = localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[0] : min;
    onChange([currentMin, currentMin + (newMax - newMin)]);
  };

  // format label based on view mode
  const formatTimeLabel = (timestamp) => {
    const date = new Date(timestamp);
    if (localViewMode === 'seasonal') {
      // just show month and day for seasonal view
      return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
    } else {
      // use provided formatter for historical view
      return formatLabel(timestamp);
    }
  };

  // calculate aggregated data for timeline visualization
  const timelineData = useMemo(() => {
    if (!data || !colorRange) return [];

    const activeData = localViewMode === 'seasonal' ? normalizedData : data;
    const timeRange = normalizedTimeRange || [min, max];
    const aggregated = aggregateDataByTime(activeData, duration, columnToPlot, aggregate, localViewMode, timeRange);
    console.log('Timeline aggregated data:', aggregated);
    return aggregated;
  }, [data, normalizedData, duration, columnToPlot, aggregate, localViewMode, normalizedTimeRange, colorRange, min, max]);

  // create color scale for timeline
  const timelineColorScale = useMemo(() => {
    if (!timelineData || timelineData.length === 0 || !colorRange) return null;
    const scale = createColorScale(timelineData, colorRange, colorScaleType);
    console.log('Color scale created:', scale ? 'yes' : 'no', 'ColorRange:', colorRange);
    return scale;
  }, [timelineData, colorRange, colorScaleType]);

  // create gradient stops for slider track
  const gradientStops = useMemo(() => {
    if (!timelineData || !timelineColorScale) return [];

    const currentMin = localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[0] : min;
    const currentMax = localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[1] : max;
    const range = currentMax - currentMin;

    const stops = timelineData.map(d => {
      const position = ((d.time - currentMin) / range) * 100;
      const color = timelineColorScale(d.value);
      const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      return { position, color: rgbColor };
    });

    console.log('Gradient stops:', stops);
    return stops;
  }, [timelineData, timelineColorScale, min, max, normalizedTimeRange, localViewMode]);

  // create CSS gradient string
  const gradientString = useMemo(() => {
    if (gradientStops.length === 0) {
      console.log('No gradient stops, using default color');
      return 'linear-gradient(to right, #f5f1d8, #f5f1d8)';
    }

    // make sure we have stops at 0% and 100%
    const stops = [...gradientStops];
    if (stops[0]?.position > 0) {
      stops.unshift({ position: 0, color: stops[0].color });
    }
    if (stops[stops.length - 1]?.position < 100) {
      stops.push({ position: 100, color: stops[stops.length - 1].color });
    }

    const gradientParts = stops.map(stop => `${stop.color} ${stop.position}%`);
    const gradient = `linear-gradient(to right, ${gradientParts.join(', ')})`;
    console.log('Final gradient string:', gradient);
    return gradient;
  }, [gradientStops]);

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 1,
        bottom: '10px',
        right: '10px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        padding: '10px 10px 5px 5px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        height: 'auto',
      }}
    >
      <FormControl variant="outlined" sx={{ m: 1, minWidth: 120 }}>
        <InputLabel id="duration-label" sx={{ color: '#f5f1d8' }}>Duration</InputLabel>
        <Select
          labelId="duration-label"
          value={duration}
          onChange={handleDurationChange}
          label="Duration"
          sx={{
            color: '#f5f1d8',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: '#f5f1d8',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#f5f1d8',
            },
            '.MuiSvgIcon-root': {
              color: '#f5f1d8',
            },
          }}
        >
          {availableDurations.map(([key, _]) => (
            <MenuItem key={key} value={key}>{key}</MenuItem>
          ))}
          <MenuItem value="Custom">Custom</MenuItem>
        </Select>
      </FormControl>

      <Button
        color="inherit"
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? 'Stop' : 'Animate'}
        sx={{
          color: '#f5f1d8',
        }}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>

      <ToggleButtonGroup
        value={localViewMode}
        exclusive
        onChange={handleViewModeChange}
        aria-label="time view mode"
        sx={{
          marginRight: 2,
          '& .MuiToggleButton-root': {
            color: '#f5f1d8',
            borderColor: '#f5f1d8',
            '&.Mui-selected': {
              color: '#f5f1d8',
              backgroundColor: 'rgba(245, 241, 216, 0.15)',
            },
          },
        }}
      >
        <ToggleButton value="historical">
          <Tooltip title="Historical View - Shows actual dates">
            <CalendarMonthIcon />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="seasonal">
          <Tooltip title="Seasonal View - Shows patterns within the year">
            <CalendarViewMonthIcon />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Slider
        ref={sliderRef}
        sx={{
          marginLeft: 2,
          maxWidth: '40%',
          color: '#f5f1d8',
          '& .MuiSlider-rail': {
            opacity: 1,
            background: gradientString,
            height: '6px',
          },
          '& .MuiSlider-track': {
            backgroundColor: 'transparent',
            border: '2px solid #fff',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 0 8px rgba(245, 241, 216, 0.16)',
            },
          },
          '& .MuiSlider-thumb': {
            backgroundColor: '#fff',
            border: '2px solid currentColor',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 0 8px rgba(245, 241, 216, 0.16)',
            },
          },
          '& .MuiSlider-valueLabel': {
            background: 'none',
            color: '#f5f1d8',
            whiteSpace: 'nowrap',
          },
          transition: 'none',
          '& .MuiSlider-thumb, & .MuiSlider-track, & .MuiSlider-rail': {
            transition: 'none',
          }
        }}
        min={localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[0] : min}
        max={localViewMode === 'seasonal' && normalizedTimeRange ? normalizedTimeRange[1] : max}
        value={value}
        onChange={(e, newValue) => handleSliderChange(newValue)}
        valueLabelDisplay="on"
        valueLabelFormat={formatTimeLabel}
      />

      <Snackbar open={showHint} autoHideDuration={6000} onClose={() => setShowHint(false)}>
        <Alert onClose={() => setShowHint(false)} severity="info" sx={{ width: '100%' }}>
          Click and drag the sliders to adjust the range.
        </Alert>
      </Snackbar>
    </Box>
  );
}
