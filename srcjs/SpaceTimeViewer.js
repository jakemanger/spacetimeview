import React from 'react';
import HexagonPlot from './plots/HexagonPlot';
import ScatterTimePlot from './plots/ScatterTimePlot';

export default function SpaceTimeViewer({
  data = [],
	style = 'summary',
	aggregate = 'SUM',
}) {
  console.log('Received data:', data);

  let plot = null;

	if (style === 'independent') {
    plot = <ScatterTimePlot data={data} />;
  } else if (style === 'summary') {
    plot = <HexagonPlot
			data={data} 
			colorAggregation={aggregate} 
			elevationAggregation={aggregate}
		/>;
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
