import React, { useEffect, useState } from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';
import { useControls } from 'leva';

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

  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [style, aggregate, preserveDomains, data]);

  let plot = null;

  if (style === 'independent') {
    plot = <ScatterTimePlot key={key} data={data} />;
  } else if (style === 'summary') {
    plot = (
      <HexagonPlot
        key={key}
        data={data}
        colorAggregation={aggregate}
        elevationAggregation={aggregate}
        preserveDomains={preserveDomains}
      />
    );
  } else {
    console.error('Unsupported style:', style, 'Supported styles are: independent, summary');
  }

  if (!data || !data.some(d => d.lng && d.lat)) {
    let columnsInData = data.map(d => Object.keys(d));
    plot = <div>Unsupported data type: {columnsInData}</div>;
    console.error(
      'Unsupported data type: ',
      columnsInData,
      'Supported data types are: lng, lat, timestamp, value'
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {plot}
    </div>
  );
}
