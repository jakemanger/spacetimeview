import { HexagonLayer } from '@deck.gl/aggregation-layers';

function calculateDomains(data, radius, elevationAggregation, colorAggregation) {
  return new Promise((resolve, reject) => {
    const layer = new HexagonLayer({
      id: 'temp-layer',
      data,
      radius,
      getPosition: d => [d.lng, d.lat],
      getElevationValue: points => {
        const values = points.map(point => point.value !== undefined ? point.value : 0);
        if (elevationAggregation === 'SUM') {
          return values.reduce((sum, val) => sum + val, 0);
        } else if (elevationAggregation === 'MEAN') {
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        } else if (elevationAggregation === 'COUNT') {
          return values.length;
        } else if (elevationAggregation === 'MIN') {
          return Math.min(...values);
        } else if (elevationAggregation === 'MAX') {
          return Math.max(...values);
        }
        return 0;
      },
      getColorValue: points => {
        const values = points.map(point => point.value !== undefined ? point.value : 0);
        if (colorAggregation === 'SUM') {
          return values.reduce((sum, val) => sum + val, 0);
        } else if (colorAggregation === 'MEAN') {
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        } else if (colorAggregation === 'COUNT') {
          return values.length;
        } else if (colorAggregation === 'MIN') {
          return Math.min(...values);
        } else if (colorAggregation === 'MAX') {
          return Math.max(...values);
        }
        return 0;
      },
    });

    const deck = new DeckGL({
      initialViewState: {
        longitude: 0,
        latitude: 0,
        zoom: 0
      },
      layers: [layer],
      onLoad: () => {
        const { colorDomain, elevationDomain } = layer.state;
        resolve({ colorDomain, elevationDomain });
        deck.finalize();
      }
    });
  });
}

export default calculateDomains;
