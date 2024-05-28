import React from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';

export default function SpaceTimeViewer({
  data = [],
}) {
  console.log('Received data:', data);

  let plot = null;

	if (data.some(d => d.timestamp && d.lng && d.lat)) {
    plot = <ScatterTimePlot data={data} />;
  } else if (data.some(d => d.lng && d.lat)) {
    plot = <HexagonPlot data={data} />;
  } else {
		let columnsInData = data.map(d => Object.keys(d));
    plot = <div>Unsupported layer type: {layerType} or data type: {columnsInData}</div>;
    console.error(
			'Unsupported layer type or data type. Layer type:', 
			layerType, 
			'Columns in data:', 
			columnsInData
		);
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {plot}
    </div>
  );
}
