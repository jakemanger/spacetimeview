import React, { useEffect, useState, useMemo } from 'react';
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

const durations = {
  All: [0, Infinity],
  Minute: [0, 60 * 1000],
  Hour: [0, 60 * 60 * 1000],
  Day: [0, 1 * 8.64e7],
  Week: [0, 7 * 8.64e7],
  Month: [0, 30 * 8.64e7],
  Year: [0, 365 * 8.64e7],
};

export default function RangeInput({ min, max, value, animationSpeed, onChange, formatLabel, data }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState('All');
  const [showHint, setShowHint] = useState(false);

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

  const availableDurations = useMemo(() => {
    return Object.entries(durations).filter(([key, [_, duration]]) => duration >= minInterval);
  }, [minInterval]);

  useEffect(() => {
    let animation;

    if (isPlaying) {
      animation = requestAnimationFrame(() => {
        let nextStartValue = value[0] + animationSpeed;
        let nextEndValue = value[1] + animationSpeed;

        if (Math.abs(value[0] - value[1]) > ((max - min) * 0.8)) {
          nextStartValue = min;
          nextEndValue = min + ((max - min) * 0.2);
        } else if (nextStartValue > max || nextEndValue > max) {
          nextStartValue = min;
          nextEndValue = min + (value[1] - value[0]);
        }
        onChange([nextStartValue, nextEndValue]);
      });
    }

    return () => animation && cancelAnimationFrame(animation);
  }, [isPlaying, value, animationSpeed, max, min, onChange]);

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
    onChange([min, min + (newMax - newMin)]);
  };

  const handleSliderChange = (event, newValue) => {
    const range = newValue[1] - newValue[0];
    if (range < minInterval) {
      onChange([newValue[0], newValue[0] + minInterval]);
    } else {
      onChange(newValue);
    }
    setDuration('Custom');
    setShowHint(false);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 1,
        bottom: '40px',
        width: '100%',
        display: 'flex',
        color: '#f5f1d8',
        justifyContent: 'center',
        alignItems: 'center',
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
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Slider
        sx={{
          marginLeft: 2,
          width: '40%',
          color: '#f5f1d8',
          '& .MuiSlider-valueLabel': {
            background: 'none',
            color: '#f5f1d8',
            whiteSpace: 'nowrap',
          },
        }}
        min={min}
        max={max}
        value={value}
        onChange={handleSliderChange}
        valueLabelDisplay="on"
        valueLabelFormat={formatLabel}
      />
      <Snackbar open={showHint} autoHideDuration={6000} onClose={() => setShowHint(false)}>
        <Alert onClose={() => setShowHint(false)} severity="info" sx={{ width: '100%' }}>
          Click and drag the sliders to adjust the range.
        </Alert>
      </Snackbar>
    </Box>
  );
}
