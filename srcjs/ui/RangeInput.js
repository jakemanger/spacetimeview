import React, { useEffect, useState } from 'react';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/IconButton';
import PlayIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

const durations = {
  All: [0, Infinity],
  Day: [0, 1 * 8.64e7],
  Week: [0, 7 * 8.64e7],
  Month: [0, 30 * 8.64e7],
  Year: [0, 365 * 8.64e7],
};

export default function RangeInput({ min, max, value, animationSpeed, onChange, formatLabel }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState('All');

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
    if (newDuration === 'Custom') return;
    const [newMin, newMax] = durations[newDuration];
    onChange([min, min + (newMax - newMin)]);
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
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Custom">Custom</MenuItem>
          <MenuItem value="Day">Day</MenuItem>
          <MenuItem value="Week">Week</MenuItem>
          <MenuItem value="Month">Month</MenuItem>
          <MenuItem value="Year">Year</MenuItem>
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
        onChange={(event, newValue) => {
          setDuration('Custom');
          onChange(newValue);
        }}
        valueLabelDisplay="on"
        valueLabelFormat={formatLabel}
      />
    </Box>
  );
}
