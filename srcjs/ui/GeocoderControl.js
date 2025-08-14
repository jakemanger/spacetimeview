/* global fetch */
import React, { useState } from 'react';
import { useControl, Marker } from 'react-map-gl/maplibre';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';

const noop = () => {};

export default function GeocoderControl({
  marker = true,
  position = 'top-left',
  countryCodes = null, // e.g., 'AU' for Australia, 'US' for United States, or 'AU,NZ' for multiple countries
  zoom = 10,
  flyTo = { maxZoom: 12 },
  onLoading = noop,
  onResults = noop,
  onResult = noop,
  onError = noop,
  ...props
}) {
  const [markerComponent, setMarkerComponent] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Helper function to parse coordinate input
  const parseCoordinates = (query) => {
    // Remove extra whitespace and normalize
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    
    // Try various coordinate formats:
    // 1. "lat, lng" or "lat,lng"
    // 2. "lat lng" (space separated)
    // 3. "lng, lat" (if longitude comes first, detect by range)
    
    const patterns = [
      // Decimal degrees with comma: "40.7128, -74.0060"
      /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
      // Decimal degrees with space: "40.7128 -74.0060"
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
      // With degree symbols: "40.7128° -74.0060°"
      /^(-?\d+\.?\d*)°?\s*,?\s*(-?\d+\.?\d*)°?$/
    ];
    
    for (const pattern of patterns) {
      const match = cleanQuery.match(pattern);
      if (match) {
        const num1 = parseFloat(match[1]);
        const num2 = parseFloat(match[2]);
        
        // Validate ranges
        if (isNaN(num1) || isNaN(num2)) continue;
        
        // Determine if it's lat,lng or lng,lat based on ranges
        // Latitude: -90 to 90, Longitude: -180 to 180
        let lat, lng;
        
        if (Math.abs(num1) <= 90 && Math.abs(num2) <= 180) {
          // First number could be latitude
          lat = num1;
          lng = num2;
        } else if (Math.abs(num2) <= 90 && Math.abs(num1) <= 180) {
          // Second number is latitude (lng,lat format)
          lat = num2;
          lng = num1;
        } else {
          continue; // Invalid coordinate ranges
        }
        
        // Final validation
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }
    }
    
    return null;
  };

  const geocoderApi = {
    forwardGeocode: async config => {
      const features = [];
      
      try {
        // first try to parse as coordinates
        const coords = parseCoordinates(config.query);
        
        if (coords) {
          // create a coordinate-based feature
          const point = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [coords.lng, coords.lat]
            },
            place_name: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            properties: {
              coordinate_search: true
            },
            text: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            place_type: ['coordinate'],
            center: [coords.lng, coords.lat]
          };
          features.push(point);
          
          return { features };
        }
        
        // if not coordinates, proceed with normal geocoding
        // build the request URL with optional country filtering
        let request = `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1`;
        
        // add country filtering if specified
        if (countryCodes) {
          request += `&countrycodes=${countryCodes}`;
        }
        
        const response = await fetch(request);
        const geojson = await response.json();
        for (const feature of geojson.features) {
          const center = [
            feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
            feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
          ];
          const point = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: center
            },
            place_name: feature.properties.display_name,
            properties: feature.properties,
            text: feature.properties.display_name,
            place_type: ['place'],
            center
          };
          features.push(point);
        }
      } catch (e) {
        console.error(`Failed to forwardGeocode with error: ${e}`);
      }

      return {
        features
      };
    }
  };

  const geocoder = useControl(
    ({ mapLib }) => {
      const ctrl = new MaplibreGeocoder(geocoderApi, {
        ...props,
        marker: false,
        maplibregl: mapLib,
        placeholder: 'Search places or gps...',
        minLength: 2,
        zoom: zoom,
        flyTo: flyTo
      });
      
      ctrl.on('loading', onLoading);
      ctrl.on('results', onResults);
      ctrl.on('result', evt => {
        onResult(evt);

        const { result } = evt;
        const location =
          result &&
          (result.center || (result.geometry?.type === 'Point' && result.geometry.coordinates));
        if (location && marker) {
          const markerProps = typeof marker === 'object' ? marker : {};
          setMarkerComponent(<Marker {...markerProps} longitude={location[0]} latitude={location[1]} />);
        } else {
          setMarkerComponent(null);
        }
      });
      ctrl.on('error', onError);

      // Add tooltip functionality when user stops typing
      let tooltipTimeout;
      setTimeout(() => {
        if (ctrl._inputEl) {
          // Add event listeners for tooltip
          const handleInput = (e) => {
            const query = e.target.value.trim();
            
            // Clear existing timeout
            if (tooltipTimeout) {
              clearTimeout(tooltipTimeout);
            }
            
            // Hide tooltip while typing
            setShowTooltip(false);
            
            // Show tooltip after user stops typing (if there's text)
            if (query.length >= 2) {
              tooltipTimeout = setTimeout(() => {
                setShowTooltip(true);
              }, 800); // Show tooltip after 800ms of no typing
            }
          };

          const handleKeyDown = (e) => {
            // Hide tooltip when user presses Enter (they're searching)
            if (e.key === 'Enter') {
              setShowTooltip(false);
            }
          };

          const handleFocus = () => {
            setShowTooltip(false);
          };

          const handleBlur = () => {
            setShowTooltip(false);
            if (tooltipTimeout) {
              clearTimeout(tooltipTimeout);
            }
          };

          ctrl._inputEl.addEventListener('input', handleInput);
          ctrl._inputEl.addEventListener('keydown', handleKeyDown);
          ctrl._inputEl.addEventListener('focus', handleFocus);
          ctrl._inputEl.addEventListener('blur', handleBlur);

          // Add tooltip styling
          const tooltipElement = document.createElement('div');
          tooltipElement.id = 'geocoder-tooltip';
          tooltipElement.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
            z-index: 1000;
            margin-top: 4px;
            display: none;
            pointer-events: none;
          `;
          tooltipElement.textContent = 'Press Enter to search places or coordinates (lat, lng)';
          
          // Insert tooltip after the geocoder container
          const geocoderContainer = ctrl._inputEl.parentElement;
          if (geocoderContainer) {
            geocoderContainer.style.position = 'relative';
            geocoderContainer.appendChild(tooltipElement);
          }
        }
      }, 100);

      return ctrl;
    },
    {
      position: position
    }
  );

  // Show/hide tooltip based on state
  React.useEffect(() => {
    const tooltipElement = document.getElementById('geocoder-tooltip');
    if (tooltipElement) {
      tooltipElement.style.display = showTooltip ? 'block' : 'none';
    }
  }, [showTooltip]);

  // Update geocoder properties if they change
  if (geocoder._map) {
    if (geocoder.getProximity() !== props.proximity && props.proximity !== undefined) {
      geocoder.setProximity(props.proximity);
    }
    if (geocoder.getRenderFunction() !== props.render && props.render !== undefined) {
      geocoder.setRenderFunction(props.render);
    }
    if (geocoder.getLanguage() !== props.language && props.language !== undefined) {
      geocoder.setLanguage(props.language);
    }
    if (geocoder.getZoom() !== props.zoom && props.zoom !== undefined) {
      geocoder.setZoom(props.zoom);
    }
    if (geocoder.getFlyTo() !== props.flyTo && props.flyTo !== undefined) {
      geocoder.setFlyTo(props.flyTo);
    }
    if (geocoder.getPlaceholder() !== props.placeholder && props.placeholder !== undefined) {
      geocoder.setPlaceholder(props.placeholder);
    }
    if (geocoder.getCountries() !== props.countries && props.countries !== undefined) {
      geocoder.setCountries(props.countries);
    }
    if (geocoder.getTypes() !== props.types && props.types !== undefined) {
      geocoder.setTypes(props.types);
    }
    if (geocoder.getMinLength() !== props.minLength && props.minLength !== undefined) {
      geocoder.setMinLength(props.minLength);
    }
    if (geocoder.getLimit() !== props.limit && props.limit !== undefined) {
      geocoder.setLimit(props.limit);
    }
    if (geocoder.getFilter() !== props.filter && props.filter !== undefined) {
      geocoder.setFilter(props.filter);
    }
  }
  
  return markerComponent;
} 