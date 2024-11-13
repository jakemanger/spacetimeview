import React, { useMemo } from 'react';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function Colorbar({
  colorRange,
  colorDomain,
  title,
  numDecimals = 3,
  factorLevels = null,
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
  },
}) {

  if (
    colorDomain == null ||
    colorRange == null
  ) {
    return null;
  }

  // Reverse the color range
  const reversedColorRange = useMemo(
    () => [...colorRange].reverse(),
    [colorRange]
  );

  const colorDomainLength = factorLevels && factorLevels[title] ? colorDomain.length : 6;

  // Sample x + 1 values from the colorDomain and create x ranges
  const sampledDomain = useMemo(() => {
    if (colorDomain.length === 2) {
      // If there are only two values, sample x + 1 evenly spaced values between min and max
      const [min, max] = colorDomain;
      const step = (max - min) / colorDomainLength;
      return Array.from({ length: colorDomainLength + 1 }, (_, i) =>
        (min + i * step).toFixed(numDecimals)
      ).reverse(); // Format to numDecimals and reverse
    } else {
      // If more than two values, sample based on index
      const step = (colorDomain.length - 1) / colorDomainLength;
      const sampled = Array.from({ length: colorDomainLength + 1 }, (_, i) => {
        const index = Math.round(i * step);
        return colorDomain[index].toFixed(numDecimals); // Format to numDecimals
      });
      return sampled.reverse(); // Reverse to show from max to min
    }
  }, [colorDomain, numDecimals]);

  // Generate labels
  const labels = useMemo(() => {
    if (factorLevels && factorLevels[title]) {
      // Use factorLevels for labels, reversing to match the reversedColorRange
      return [...factorLevels[title]].reverse();
    } else {
      // Generate labels from sampledDomain
      return reversedColorRange.map((_, index) => {
        if (sampledDomain.length === colorDomainLength + 1 && index < colorDomainLength) {
          return `${sampledDomain[index + 1]} - ${sampledDomain[index]}`;
        }
        return '';
      });
    }
  }, [factorLevels, title, sampledDomain, reversedColorRange]);

  const legendItems = reversedColorRange.map((color, index) => {
    const colorString = `rgb(${color.join(',')})`;
    const label = labels[index];

    return (
      <div
        key={index}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <div
          style={{
            backgroundColor: colorString,
            width: '20px',
            height: '20px',
            marginRight: '5px',
          }}
        />
        <span style={{ color: themeColors.highlight2 }}>{label}</span>
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
      <h4
        style={{
          marginTop: '0px',
          color: themeColors.highlight2,
        }}
      >
        {capitalizeFirstLetter(title)}
      </h4>
      {legendItems}
    </div>
  );
}
