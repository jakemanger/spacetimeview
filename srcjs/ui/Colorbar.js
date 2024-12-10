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
  // Early return if essential props are missing
  if (!colorDomain || !colorRange) {
    return null;
  }

  // Reverse the color range
  const reversedColorRange = React.useMemo(
    () => [...colorRange].reverse(),
    [colorRange]
  );

  // Determine color domain length dynamically
  const colorDomainLength = React.useMemo(() => {
    return (factorLevels && factorLevels[title])
      ? factorLevels[title].length
      : 6;
  }, [factorLevels, title]);

  // Sampled domain calculation with improved handling
  const sampledDomain = React.useMemo(() => {
    // Handle factor levels case
    if (factorLevels && factorLevels[title]) {
      return Array.from({ length: colorDomainLength }, (_, i) => i);
    }
    // Handle numeric domain
    if (colorDomain.length === 2) {
      const [min, max] = colorDomain;
      const step = (max - min) / colorDomainLength;
      return Array.from({ length: colorDomainLength + 1 }, (_, i) =>
        (min + i * step).toFixed(numDecimals)
      ).reverse();
    }
    // Handle multi-value domain
    const step = (colorDomain.length - 1) / colorDomainLength;
    return Array.from({ length: colorDomainLength + 1 }, (_, i) => {
      const index = Math.round(i * step);
      return colorDomain[index].toFixed(numDecimals);
    }).reverse();
  }, [colorDomain, numDecimals, factorLevels, title, colorDomainLength]);

  // Labels generation with improved handling
  const labels = React.useMemo(() => {
    if (factorLevels && factorLevels[title]) {
      // Use factor levels, reversing to match color range
      return [...factorLevels[title]].reverse();
    }
    // Generate labels from sampled domain for numeric data
    return reversedColorRange.map((_, index) => {
      if (sampledDomain.length === colorDomainLength + 1 && index < colorDomainLength) {
        return `${sampledDomain[index + 1]} - ${sampledDomain[index]}`;
      }
      return '';
    });
  }, [factorLevels, title, sampledDomain, reversedColorRange, colorDomainLength]);

  // Legend items generation
  const legendItems = React.useMemo(() => {
    return reversedColorRange.map((color, index) => {
      const colorString = `rgb(${color.join(',')})`;
      const label = labels[index];
      return (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0px',
          }}
        >
          <div
            style={{
              backgroundColor: colorString,
              width: '20px',
              height: '20px',
              marginRight: '5px',
            }}
          />
          <span
            style={{
              color: themeColors.highlight2,
              fontSize: '12px',
            }}
          >
            {label}
          </span>
        </div>
      );
    });
  }, [reversedColorRange, labels, themeColors]);

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
        maxHeight: '30vh', // Limit to 50% of viewport height
      }}
    >
      <h4
        style={{
          marginTop: '0px',
          color: themeColors.highlight2,
          fontSize: '1rem',
          position: 'sticky', // Make title stick to top when scrolling
          top: '0',
          backgroundColor: themeColors.elevation2,
          zIndex: 1, // Ensure title is above scrollable content
          paddingBottom: '5px',
        }}
      >
        {capitalizeFirstLetter(title)}
      </h4>
      <div
        style={{
          maxHeight: 'calc(50vh - 40px)', // Subtract title and padding height
          overflowY: 'auto',
        }}
      >
        {legendItems}
      </div>
    </div>
  );
}
