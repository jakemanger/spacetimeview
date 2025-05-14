import { CompositeLayer } from '@deck.gl/core';
import { GeoJsonLayer } from '@deck.gl/layers';
import { isPointInPolygon } from '../utils/geometryUtils';

class PolygonAggregationLayer extends CompositeLayer {
  initializeState() {
    super.initializeState();
    this.state = {
      polygonData: [],
      aggregatedData: {}
    };
  }

  // Processes and aggregates data per polygon
  updateState({ props, oldProps, changeFlags }) {
    super.updateState({ props, oldProps, changeFlags });
    
    if (changeFlags.dataChanged || props.filter !== oldProps.filter) {
      this._processData();
    }
  }

  // Process points and assign to polygons
  _processData() {
    const { data, allData, filter = [0, Infinity] } = this.props;
    
    if (!data || !data.features || !allData || !Array.isArray(allData)) {
      this.setState({ aggregatedData: {} });
      return;
    }

    // Filter data by time if filter is provided
    const filteredData = filter ? 
      allData.filter(d => {
        const timestamp = new Date(d.timestamp).getTime();
        return timestamp >= filter[0] && timestamp <= filter[1];
      }) : 
      allData;

    // Create mapping from polygon to contained points
    const aggregatedData = {};
    
    // For each polygon, find points inside it
    data.features.forEach(feature => {
      const id = feature.properties?.id || feature.id || 
                 feature.properties?.name?.replace(/\s+/g, '-').toLowerCase() || 
                 Math.random().toString(36).substring(2);
      
      // Find points inside this polygon
      const pointsInPolygon = filteredData.filter(point => 
        isPointInPolygon([point.lng, point.lat], feature)
      );
      
      // Calculate aggregate statistics
      aggregatedData[id] = {
        polygon: feature,
        points: pointsInPolygon,
        count: pointsInPolygon.length,
        avg: pointsInPolygon.length > 0 
          ? pointsInPolygon.reduce((sum, p) => sum + (p.value || 0), 0) / pointsInPolygon.length 
          : 0,
        sum: pointsInPolygon.reduce((sum, p) => sum + (p.value || 0), 0),
        min: pointsInPolygon.length > 0 
          ? Math.min(...pointsInPolygon.map(p => p.value || 0)) 
          : 0,
        max: pointsInPolygon.length > 0 
          ? Math.max(...pointsInPolygon.map(p => p.value || 0)) 
          : 0
      };
    });

    this.setState({ aggregatedData });
  }

  // Customize the picking info for tooltips
  getPickingInfo({ info, sourceLayer }) {
    if (!info.object) return info;
    
    // Get the polygon ID
    const polygonId = info.object.properties?.id || 
                      info.object.id || 
                      info.object.properties?.name?.replace(/\s+/g, '-').toLowerCase();
    
    // If we have aggregated data for this polygon, add it to the info
    const polygonData = this.state.aggregatedData[polygonId];
    
    if (polygonData) {
      return {
        ...info,
        object: {
          ...info.object,
          points: polygonData.points,
          count: polygonData.count,
          avg: polygonData.avg,
          sum: polygonData.sum,
          min: polygonData.min,
          max: polygonData.max
        }
      };
    }
    
    return info;
  }

  renderLayers() {
    const { 
      pickable = true,
      visible = true,
      stroked = true,
      filled = true,
      extruded = false,
      wireframe = true,
      lineWidthMinPixels = 2,
      lineWidthScale = 2,
      getLineColor = [0, 0, 0, 240],
      getFillColor = [200, 200, 200, 40],
      getLineWidth = 1
    } = this.props;

    // Use the aggregated data to determine fill color if needed
    const getFillColorFromAggregation = d => {
      const id = d.properties?.id || d.id || d.properties?.name?.replace(/\s+/g, '-').toLowerCase();
      const aggregatedInfo = this.state.aggregatedData[id];
      
      // Use the provided getFillColor or default
      if (typeof getFillColor === 'function') {
        return getFillColor(d, aggregatedInfo);
      }
      
      // Default color
      return getFillColor;
    };

    return [
      new GeoJsonLayer(this.getSubLayerProps({
        id: 'polygon-geojson',
        data: this.props.data,
        pickable,
        visible, 
        stroked,
        filled,
        extruded,
        wireframe,
        lineWidthMinPixels,
        lineWidthScale,
        getLineColor,
        getFillColor: getFillColorFromAggregation,
        getLineWidth,
        parameters: {
          depthTest: false
        },
        updateTriggers: {
          getFillColor: [this.state.aggregatedData, getFillColor]
        }
      }))
    ];
  }
}

PolygonAggregationLayer.layerName = 'PolygonAggregationLayer';
PolygonAggregationLayer.defaultProps = {
  ...CompositeLayer.defaultProps,
  pickable: true,
  data: null,
  allData: [],
  filter: null
};

export default PolygonAggregationLayer; 