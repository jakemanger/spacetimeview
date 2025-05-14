/**
 * Checks if a point is inside a ring using ray casting algorithm
 * @param {Array} point - [x, y] coordinates
 * @param {Array} ring - Array of [x, y] coordinates forming a ring
 * @returns {boolean} True if point is inside the ring
 */
function isPointInRing(point, ring) {
  const x = point[0], y = point[1];
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Checks if a point is inside a polygon using ray casting algorithm
 * @param {Array} point - [x, y] coordinates
 * @param {Object} polygon - GeoJSON polygon feature
 * @returns {boolean} True if point is inside the polygon
 */
function isPointInPolygon(point, polygon) {
  // Internal helper function to avoid external dependency
  function checkPointInRing(pt, rng) {
    const x = pt[0], y = pt[1];
    let inside = false;
    
    for (let i = 0, j = rng.length - 1; i < rng.length; j = i++) {
      const xi = rng[i][0], yi = rng[i][1];
      const xj = rng[j][0], yj = rng[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  // for MultiPolygon, check each polygon
  if (polygon.geometry.type === 'MultiPolygon') {
    return polygon.geometry.coordinates.some(coords => {
      return coords.some(ring => {
        return checkPointInRing(point, ring);
      });
    });
  }
  
  // for simple Polygon
  if (polygon.geometry.type === 'Polygon') {
    return checkPointInRing(point, polygon.geometry.coordinates[0]);
  }
  
  return false;
}

export { isPointInRing, isPointInPolygon }; 