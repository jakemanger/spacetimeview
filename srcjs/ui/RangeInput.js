import React, { useEffect, useState } from 'react';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/IconButton';
import PlayIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Box from '@mui/material/Box';

export default function RangeInput({ min, max, value, animationSpeed, onChange, formatLabel }) {
  const [isPlaying, setIsPlaying] = useState(false);

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
        onChange={(event, newValue) => onChange(newValue)}
        valueLabelDisplay="on"
        valueLabelFormat={formatLabel}
      />
    </Box>
  );
}
