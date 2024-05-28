import HexagonPlot from './plots/HexagonPlot';

export default function SpaceTimeViewer({
  data = [],
	layerType = 'hexagon',
}) {
	console.log('Received data:', data);

	let plot = null;

	if (layerType === 'hexagon') {
		plot = (
			<HexagonPlot 
				data={data} 
			/>
		);
	}	

	if (plot === null) {
		plot = <div>Unsupported layer type: {layerType}</div>;
		console.error('Unsupported layer type:', layerType);
	}

	return (
		<div>
			{plot}
		</div>
	);
}

