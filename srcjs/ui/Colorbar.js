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
  factorColors = null,
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
  factorIcons = null,
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
    // If it's factor levels, map directly without reversing labels
    if (factorLevels && factorLevels[title]) {
      const levels = factorLevels[title];
      // Use reversedColorRange for colors, but original levels for labels/icons
      return levels.map((levelLabel, index) => {
        // Index might go out of bounds if colorRange length != levels length
        // Use modulo or clamp index if necessary, or ensure lengths match
        const colorIndex = reversedColorRange.length - 1 - index;
        if (colorIndex < 0) return null; // Or handle appropriately
        const color = reversedColorRange[colorIndex];
        const colorString = `rgb(${color.join(',')})`;
        const iconPath = factorIcons && factorIcons[title] && factorIcons[title][levelLabel];

        return (
          <div
            key={levelLabel} // Use label as key
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
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: themeColors.highlight2,
                fontSize: '12px',
                display: 'flex', // Use flex to align icon and text
                alignItems: 'center',
              }}
            >
              {iconPath && (
                <img 
                  src={iconPath} 
                  alt="" 
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '4px',
                    verticalAlign: 'middle',
                  }} 
                />
              )}
              {levelLabel}
            </span>
          </div>
        );
      }).filter(item => item !== null); // Filter out nulls if any
    } else {
      // Original logic for numeric data
      return reversedColorRange.map((color, index) => {
        const colorString = `rgb(${color.join(',')})`;
        const label = labels[index]; // labels are already reversed here
        // Icons are not applicable for numeric data
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
                flexShrink: 0,
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
    }
  }, [factorLevels, title, reversedColorRange, factorIcons, themeColors.highlight2, labels]);

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
        maxHeight: '40vh',
      }}
    >
      <h4
        style={{
          marginTop: '0',
          marginBottom: '10px',
          color: themeColors.highlight2,
          fontSize: '1rem',
          position: 'sticky', // Make title stick to top when scrolling
          top: '0',
          backgroundColor: themeColors.elevation2,
        }}
      >
        {capitalizeFirstLetter(title)}
      </h4>
      <div
        style={{
          maxHeight: '30vh', // Account for actual header and padding
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
        }}
      >
        {legendItems}
      </div>
    </div>
  );
}
