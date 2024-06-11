import React, { useEffect, useState, useMemo } from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls } from 'leva';

function getTimeRange(data) {
  if (!data || data.length === 0) {
    return null;
  }
  return data.reduce(
    (range, d) => {
      const t = new Date(d.timestamp).getTime();
      range[0] = Math.min(range[0], t);
      range[1] = Math.max(range[1], t);
      return range;
    },
    [Infinity, -Infinity]
  );
}

export default function SpaceTimeViewer({
  data = [],
  initialStyle = 'summary',
  initialAggregate = 'SUM',
  initialPreserveDomains = true,
}) {
  console.log('Received data:', data);

  // Initialize Leva controls with props as default values
  const { style, aggregate, preserveDomains } = useControls({
    style: { value: initialStyle, options: ['independent', 'summary'] },
    aggregate: { value: initialAggregate, options: ['SUM', 'MEAN', 'COUNT', 'MIN', 'MAX'] },
    preserveDomains: { value: initialPreserveDomains, label: 'Preserve Domains' },
  });

  const timeRange = useMemo(() => getTimeRange(data), [data]);

  // Determine the plot component based on the selected style
  const plot = useMemo(() => {
    if (!data || !data.some(d => d.lng && d.lat)) {
      let columnsInData = data.map(d => Object.keys(d));
      console.error(
        'Unsupported data type: ',
        columnsInData,
        'Supported data types are: lng, lat, timestamp, value'
      );
      return <div>Unsupported data type: {columnsInData}</div>;
    }

    if (style === 'independent') {
      return (
        <ScatterTimePlot
          data={data}
          timeRange={timeRange}
        />
      );
    } else if (style === 'summary') {
      return (
        <HexagonPlot
          data={data}
          colorAggregation={aggregate}
          elevationAggregation={aggregate}
          preserveDomains={preserveDomains}
          timeRange={timeRange}
        />
      );
    } else {
      console.error('Unsupported style:', style, 'Supported styles are: independent, summary');
      return null;
    }
  }, [style, aggregate, preserveDomains, data, timeRange]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {plot}
    </div>
  );
}
