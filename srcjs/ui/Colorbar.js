import React, { useState, useEffect } from 'react';
import { useMobileDetection } from '../utils/mobileDetection.js';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatTitleForDisplay(title, newLineEveryWord) {
  if (!title) return '';
  
  const capitalizedTitle = capitalizeFirstLetter(title);
  
  if (newLineEveryWord) {
    // Split by spaces and join with line breaks
    const words = capitalizedTitle.split(' ');
    return words.map((word, index) => (
      <React.Fragment key={index}>
        {word}
        {index < words.length - 1 && <br />}
      </React.Fragment>
    ));
  }
  
  return capitalizedTitle;
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
  legendOrder = null, // Array of indices to customize legend item order
  legendLabels = null, // Custom labels for legend items
  legendDirectionText = null, // Text to show with direction arrow
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract theme colors to stable variables
  const { elevation2, highlight2 } = themeColors;

  // Use reliable mobile detection
  const { isSmall: isSmallScreen } = useMobileDetection();

  // Auto-collapse/expand based on screen size
  useEffect(() => {
    if (isSmallScreen) {
      setIsCollapsed(true); // Default to collapsed on small screens
    } else {
      setIsCollapsed(false); // Always expanded on larger screens
    }
  }, [isSmallScreen]);

  // Early return if essential props are missing
  if (!colorDomain || !colorRange || !Array.isArray(colorRange) || !Array.isArray(colorDomain)) {
    return null;
  }

  // Compute values directly without useMemo
  const reversedColorRange = Array.isArray(colorRange) ? [...colorRange].reverse() : [];
  
  const colorDomainLength = (factorLevels && factorLevels[title] && Array.isArray(factorLevels[title])) 
    ? factorLevels[title].length 
    : 6;

  // Sampled domain calculation
  let sampledDomain = [];
  if (Array.isArray(colorDomain)) {
    // Handle factor levels case
    if (factorLevels && factorLevels[title] && Array.isArray(factorLevels[title])) {
      sampledDomain = Array.from({ length: colorDomainLength }, (_, i) => i);
    }
    // Handle numeric domain
    else if (colorDomain.length === 2) {
      const [min, max] = colorDomain;
      if (typeof min === 'number' && typeof max === 'number') {
        const step = (max - min) / colorDomainLength;
        sampledDomain = Array.from({ length: colorDomainLength + 1 }, (_, i) =>
          (min + i * step).toFixed(numDecimals)
        ).reverse();
      }
    }
    // Handle multi-value domain
    else if (colorDomain.length > 0) {
      const step = (colorDomain.length - 1) / colorDomainLength;
      sampledDomain = Array.from({ length: colorDomainLength + 1 }, (_, i) => {
        const index = Math.round(i * step);
        const value = colorDomain[index];
        return typeof value === 'number' ? value.toFixed(numDecimals) : String(value);
      }).reverse();
    }
  }

  // Labels generation
  let labels = [];
  if (factorLevels && factorLevels[title] && Array.isArray(factorLevels[title])) {
    // Use custom labels if provided, otherwise use factor levels
    if (legendLabels && legendLabels[title]) {
      if (Array.isArray(legendLabels[title])) {
        // Array format: direct index mapping
        labels = [...legendLabels[title]].reverse();
      } else if (typeof legendLabels[title] === 'object') {
        // Object format: name-based mapping (including empty strings)
        labels = factorLevels[title].map(level => 
          legendLabels[title].hasOwnProperty(level) ? legendLabels[title][level] : level
        ).reverse();
      } else {
        labels = [...factorLevels[title]].reverse();
      }
    } else {
      labels = [...factorLevels[title]].reverse();
    }
  } else if (Array.isArray(reversedColorRange) && Array.isArray(sampledDomain)) {
    // Generate labels from sampled domain for numeric data
    labels = reversedColorRange.map((_, index) => {
      if (sampledDomain.length === colorDomainLength + 1 && index < colorDomainLength) {
        return `${sampledDomain[index + 1]} - ${sampledDomain[index]}`;
      }
      return '';
    });
  }

  // Legend items generation
  let legendItems = [];
  if (Array.isArray(colorRange)) {
    // If it's factor levels, map directly without reversing
    if (factorLevels && factorLevels[title] && Array.isArray(factorLevels[title])) {
      const levels = factorLevels[title];
      
      // Use original colorRange for factor levels, display in provided order
      legendItems = levels.map((levelLabel, index) => {
        // Use direct index mapping to maintain order
        if (index >= colorRange.length) return null; // Handle bounds
        const color = colorRange[index];
        if (!Array.isArray(color)) return null;
        
        const colorString = `rgb(${color.join(',')})`;
        const iconPath = factorIcons && factorIcons[title] && factorIcons[title][levelLabel];
        
        // Determine display label based on legendLabels format
        let displayLabel = levelLabel; // default to original
        if (legendLabels && legendLabels[title]) {
          if (Array.isArray(legendLabels[title])) {
            // Array format: use index-based mapping
            displayLabel = legendLabels[title][index] !== undefined ? legendLabels[title][index] : levelLabel;
          } else if (typeof legendLabels[title] === 'object') {
            // Object format: use name-based mapping (including empty strings)
            displayLabel = legendLabels[title].hasOwnProperty(levelLabel) ? legendLabels[title][levelLabel] : levelLabel;
          }
        }

        return (
          <div
            key={levelLabel} // Use original label as key for consistency
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
                color: highlight2,
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
              {displayLabel}
            </span>
          </div>
        );
      }).filter(item => item !== null); // Filter out nulls if any
    } else if (Array.isArray(reversedColorRange) && Array.isArray(labels)) {
      // Original logic for numeric data (still uses reversed colors)
      legendItems = reversedColorRange.map((color, index) => {
        if (!Array.isArray(color)) return null;
        
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
                color: highlight2,
                fontSize: '12px',
              }}
            >
              {label}
            </span>
          </div>
        );
      }).filter(item => item !== null);
    }

    // Apply custom ordering if legendOrder is provided
    if (legendOrder && Array.isArray(legendOrder)) {
      const orderedItems = [];
      legendOrder.forEach(index => {
        if (index >= 0 && index < legendItems.length) {
          orderedItems.push(legendItems[index]);
        }
      });
      legendItems = orderedItems;
    }
  }

  // Generate color squares for collapsed view
  let colorSquares = [];
  if (Array.isArray(colorRange)) {
    if (factorLevels && factorLevels[title] && Array.isArray(factorLevels[title])) {
      // For factor levels, use original colorRange order
      colorSquares = colorRange.map((color, index) => {
        if (index >= factorLevels[title].length || !Array.isArray(color)) return null;
        const colorString = `rgb(${color.join(',')})`;
        return (
          <div
            key={index}
            style={{
              backgroundColor: colorString,
              width: '16px',
              height: '16px',
              margin: '1px',
              flexShrink: 0,
              borderRadius: '2px',
            }}
          />
        );
      }).filter(item => item !== null);
    } else if (Array.isArray(reversedColorRange)) {
      // For numeric data, use reversed colors (consistent with expanded view)
      colorSquares = reversedColorRange.map((color, index) => {
        if (!Array.isArray(color)) return null;
        const colorString = `rgb(${color.join(',')})`;
        return (
          <div
            key={index}
            style={{
              backgroundColor: colorString,
              width: '16px',
              height: '16px',
              margin: '1px',
              flexShrink: 0,
              borderRadius: '2px',
            }}
          />
        );
      }).filter(item => item !== null);
    }
  }

  const handleToggle = () => {
    if (isSmallScreen) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div
      className='colorbar'
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: elevation2,
        padding: isCollapsed ? '8px' : '10px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        maxHeight: isCollapsed ? 'auto' : '40vh',
        cursor: isSmallScreen ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
      }}
      onClick={handleToggle}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <h4
          style={{
            margin: '0',
            color: highlight2,
            fontSize: isCollapsed ? '0.875rem' : '1rem',
            position: isCollapsed ? 'static' : 'sticky',
            top: '0',
            backgroundColor: elevation2,
          }}
        >
          {formatTitleForDisplay(title, isSmallScreen && isCollapsed)}
        </h4>
        {isSmallScreen && (
          <span
            style={{
              color: highlight2,
              fontSize: '12px',
              marginLeft: '8px',
            }}
          >
            {isCollapsed ? '▶' : '▼'}
          </span>
        )}
      </div>
      
      {isCollapsed ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'wrap',
            gap: '2px',
            maxHeight: '110px',
            alignContent: 'flex-start',
          }}
        >
          {colorSquares}
        </div>
      ) : (
        <div>
          {/* Direction indicator */}
          {legendDirectionText && (
            <div
              style={{
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                color: highlight2,
                opacity: 0.8,
              }}
            >
              <span style={{ marginRight: '4px' }}>{legendDirectionText}</span>
              <span style={{ fontSize: '10px', transform: 'rotate(-90deg)', transformOrigin: 'center' }}>→</span>
            </div>
          )}
          <div
            style={{
              maxHeight: '30vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'start',
            }}
          >
            {legendItems}
          </div>
        </div>
      )}
    </div>
  );
}
