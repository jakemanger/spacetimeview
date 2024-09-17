import React, { useEffect, useMemo } from 'react';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function Colorbar({ colorRange, colorDomain, title }) {
  if (colorDomain == null || colorRange == null) {
    return null;
  }
  console.log('ColorDomain: ', colorDomain);

  // Reverse the color range and round the color domain
  const reversedColorRange = useMemo(() => [...colorRange].reverse(), [colorRange]);
  const roundedColorDomain = useMemo(
    () => [
      Number(colorDomain[0].toPrecision(3)),
      Number(colorDomain[1].toPrecision(3)),
    ],
    [colorDomain]
  );

  const legendItems = reversedColorRange.map((color, index) => {
    const colorString = `rgb(${color.join(',')})`;
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
        <span>
          {index === 0 && roundedColorDomain[1]}
          {index === reversedColorRange.length - 1 && roundedColorDomain[0]}
        </span>
      </div>
    );
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        fontFamily: 'sans-serif',
      }}
    >
      <h4 style={{ marginTop: '0px' }}>{capitalizeFirstLetter(title)}</h4>
      {legendItems}
    </div>
  );
}
