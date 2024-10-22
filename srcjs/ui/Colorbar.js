import React, { useMemo } from 'react';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function Colorbar({
  colorRange,
  colorDomain,
  title,
  numDecimals = 3,
  themeColors = {
    elevation1: '#292d39',
    elevation2: '#181C20',
    elevation3: '#373C4B',
    accent1: '#0066DC',
    accent2: '#007BFF',
    accent3: '#3C93FF',
    highlight1: '#535760',
    highlight2: '#8C92A4',
    highlight3: '#FEFEFE',
  }
}) {
  if (colorDomain == null || colorRange == null || colorRange.length !== 6) {
    return null;
  }

  // Reverse the color range
  const reversedColorRange = useMemo(() => [...colorRange].reverse(), [colorRange]);

  // Sample 7 values from the colorDomain and create 6 ranges
  const sampledDomain = useMemo(() => {
    if (colorDomain.length === 2) {
      // If there are only two values, sample 7 evenly spaced values between min and max
      const [min, max] = colorDomain;
      const step = (max - min) / 6; // 6 intervals, 7 values
      return Array.from({ length: 7 }, (_, i) => (min + i * step).toFixed(numDecimals)).reverse(); // Format to 3 decimals and reverse
    } else {
      // If more than two values, sample based on index
      const step = (colorDomain.length - 1) / 6; // 6 intervals, so 7 values
      const sampled = Array.from({ length: 7 }, (_, i) => {
        const index = Math.round(i * step);
        return colorDomain[index].toFixed(numDecimals); // Format to 3 decimals
      });
      return sampled.reverse(); // Reverse to show from max to min
    }
  }, [colorDomain]);

  const legendItems = reversedColorRange.map((color, index) => {
    const colorString = `rgb(${color.join(',')})`;

    // Show ranges between consecutive values
    let rangeText;
    if (sampledDomain.length === 7 && index < 6) {
      rangeText = `${sampledDomain[index + 1]} - ${sampledDomain[index]}`;
    }

    return (
      <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            backgroundColor: colorString,
            width: '20px',
            height: '20px',
            marginRight: '5px',
          }}
        />
        <span style={{ color: themeColors.highlight2 }}>{rangeText}</span>
      </div>
    );
  });

  return (
    <div
      className='colorbar'
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: themeColors.elevation2,
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
      }}
    >
      <h4 style={{ marginTop: '0px', color: themeColors.highlight2 }}>{capitalizeFirstLetter(title)}</h4>
      {legendItems}
    </div>
  );
}
