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

export default function RangeInput({ 
  min, 
  max, 
  value, 
  animationSpeed, 
  onChange, 
  formatLabel, 
  data, 
  onViewModeChange = null, 
  viewMode = 'historical' 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState('All');
  const [showHint, setShowHint] = useState(false);
  const [localViewMode, setLocalViewMode] = useState(viewMode);
  const animationRef = useRef(null);

  // Sync localViewMode with prop
  useEffect(() => {
    setLocalViewMode(viewMode);
    onChange([-Infinity, Infinity]);
  }, [viewMode]);

  const minInterval = useMemo(() => {
    if (!data || data.length < 2) return Infinity;
    const sortedTimestamps = data.map(d => new Date(d.timestamp).getTime()).sort((a, b) => a - b);
    let minDiff = Infinity;
    for (let i = 1; i < sortedTimestamps.length; i++) {
      const diff = sortedTimestamps[i] - sortedTimestamps[i - 1];
      if (diff < minDiff && diff > 0) minDiff = diff;
    }
    return minDiff;
  }, [data]);

  // Process data for seasonal view (normalize all dates to the same year)
  const normalizedData = useMemo(() => {
    if (localViewMode !== 'seasonal' || !data || data.length === 0) return data;
    
    // Use a reference year (2000 as it's a leap year)
    const referenceYear = 2000;
    
    return data.map(d => {
      const date = new Date(d.timestamp);
      // Create a new date with the same month/day but reference year
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
  
  // Calculate time range for the normalized data
  const normalizedTimeRange = useMemo(() => {
    if (localViewMode !== 'seasonal' || !normalizedData || normalizedData.length === 0) {
      return [min, max];
    }
    
    return normalizedData.reduce(
      (range, d) => {
        const t = new Date(d.timestamp).getTime();
        range[0] = Math.min(range[0], t);
        range[1] = Math.max(range[1], t);
        return range;
      },
      [Infinity, -Infinity]
    );
  }, [normalizedData, min, max, localViewMode]);

  const availableDurations = useMemo(() => {
    // Filter duration options based on minimum interval
    const filteredDurations = Object.entries(durations).filter(([key, [_, duration]]) => duration >= minInterval);
    
    // If in seasonal view, remove the Month option as it doesn't make sense in a year-normalized context
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
      
      // If parent provided a handler, call it
      if (onViewModeChange) {
        onViewModeChange(newMode);
      }
      
        onChange([-Infinity, Infinity]);
    }
  };

  useEffect(() => {
    const animate = () => {
      const currentMin = localViewMode === 'seasonal' ? normalizedTimeRange[0] : min;
      const currentMax = localViewMode === 'seasonal' ? normalizedTimeRange[1] : max;
      
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
    const currentMin = localViewMode === 'seasonal' ? normalizedTimeRange[0] : min;
    onChange([currentMin, currentMin + (newMax - newMin)]);
  };

  // Format the label based on the view mode
  const formatTimeLabel = (timestamp) => {
    const date = new Date(timestamp);
    if (localViewMode === 'seasonal') {
      // For seasonal view, just show month and day
      return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
    } else {
      // Use the provided formatter for historical view
      return formatLabel(timestamp);
    }
  };

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
        sx={{
          marginLeft: 2,
          maxWidth: '40%',
          color: '#f5f1d8',
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
        min={localViewMode === 'seasonal' ? normalizedTimeRange[0] : min}
        max={localViewMode === 'seasonal' ? normalizedTimeRange[1] : max}
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
