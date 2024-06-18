import React, { useEffect, useState, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import RangeInput from '../ui/RangeInput';

const MAP_VIEW = new MapView({
  repeat: true,
  farZMultiplier: 100
});

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';

const MS_PER_DAY = 8.64e7;

const dataFilter = new DataFilterExtension({ filterSize: 1, fp64: false });

function formatLabel(timestamp) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
}

function getTimeRange(data) {
  if (!data) {
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

function getMinMaxValues(data, key) {
  return data.reduce(
    (range, d) => {
      const value = d[key];
      range[0] = Math.min(range[0], value);
      range[1] = Math.max(range[1], value);
      return range;
    },
    [Infinity, -Infinity]
  );
}

function getTooltip({ object }) {
  if (!object) {
    return;
  }
  if (object.value) {
    return `\
      Time: ${new Date(object.timestamp).toUTCString()}
      Value: ${object.value.toFixed(2)}
    `;
  } else {
    return `\
    Time: ${new Date(object.timestamp).toUTCString()}
    `;
  }
}

export default function ScatterTimePlot(
	{ 
		data = [], 
		mapStyle = MAP_STYLE, 
		timeRange=[Infinity, -Infinity],
		animationSpeed = 1,
		initialViewState = {
			longitude: 0,
			latitude: 0,
			zoom: 3,
			pitch: 0,
			bearing: 0
		}
	}
) {
  const [filter, setFilter] = useState(timeRange);

	const [minValue, maxValue] = useMemo(() => getMinMaxValues(data, 'value'), [data]);

  const layers = [
    filter &&
      new ScatterplotLayer({
        id: 'scatterplot',
        data,
        opacity: 0.8,
        radiusScale: 100,
        radiusMinPixels: 1,
        wrapLongitude: true,
        getPosition: d => [d.lng, d.lat],
        getFillColor: d => {
          if (d.value != null) {
            const normalizedValue = (d.value - minValue) / (maxValue - minValue);
            return [normalizedValue * 255, 140, 0];
          }
          return [0, 0, 0];
        },
        getFilterValue: d => new Date(d.timestamp).getTime(),
        filterRange: [filter[0], filter[1]],
        filterSoftRange: [
          filter[0] * 0.9 + filter[1] * 0.1,
          filter[0] * 0.1 + filter[1] * 0.9
        ],
        extensions: [dataFilter],
        pickable: true
      })
  ];

  return (
    <>
      <DeckGL
        views={MAP_VIEW}
        layers={layers}
        initialViewState={initialViewState}
        controller={true}
        getTooltip={getTooltip}
      >
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>
      {timeRange && (
        <RangeInput
          min={timeRange[0]}
          max={timeRange[1]}
          value={filter}
          animationSpeed={MS_PER_DAY * animationSpeed}
          formatLabel={formatLabel}
          onChange={setFilter}
					data={data}
        />
      )}
    </>
  );
}
