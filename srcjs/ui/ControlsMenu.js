import React from 'react';
import { Leva } from 'leva';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { Provider } from "@radix-ui/react-tooltip";
import Draggable from 'react-draggable';

export default function ControlsMenu({
  dockPosition = 'left',
  levaTheme,
  filterColumn,
  filterOptions,
  filterColumnValues,
  setFilterColumnValues,
}) {
  const dockStyles = {
    left: {
      position: 'fixed',
      left: '20px',
      top: '60px',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      maxWidth: '340px', // Added maxWidth
    },
    right: {
      position: 'fixed',
      right: '20px',
      top: '60px',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      maxWidth: '340px', // Added maxWidth
    },
    bottom: {
      position: 'fixed',
      left: '20px',
      right: '20px',
      bottom: '20px',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      margin: 'auto',
      maxWidth: '500px', // Different maxWidth for bottom
    },
    floating: {
      position: 'absolute',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      maxWidth: '340px', // Added maxWidth
    },
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      fontSize: '12px',
    }),
    menu: (base) => ({
      ...base,
      fontSize: '12px',
    }),
  };

  return dockPosition === 'floating' ? (
    <Draggable handle=".draggable-handle">
      <div style={dockStyles[dockPosition]}>
        <div className="draggable-handle" style={{ cursor: 'move', marginBottom: '10px', background: '#f1f3f5', padding: '5px', borderRadius: '4px', textAlign: 'center', fontSize: '4px', fontWeight: 'bold' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
        <Provider delayDuration={0}>
          <Leva
            fill
            flat
            titleBar={false}
            theme={levaTheme}
            hideCopyButton
          />
        </Provider>
        {filterColumn && (
          <div style={{ marginTop: '10px' }}>
            <Select
              components={makeAnimated()}
              isMulti
              options={filterOptions}
              value={filterOptions.filter(option => filterColumnValues.includes(option.value))}
              onChange={selectedOptions => setFilterColumnValues(selectedOptions ? selectedOptions.map(option => option.value) : [])}
              placeholder={`Filter ${filterColumn}...`}
              styles={selectStyles}
            />
          </div>
        )}
      </div>
    </Draggable>
  ) : (
    <div style={dockStyles[dockPosition]}>
      <Provider delayDuration={0}>
        <Leva
          fill
          titleBar={false}
          theme={levaTheme}
          hideCopyButton
        />
      </Provider>
      {filterColumn && (
        <div style={{ marginTop: '10px' }}>
          <Select
            components={makeAnimated()}
            isMulti
            options={filterOptions}
            value={filterOptions.filter(option => filterColumnValues.includes(option.value))}
            onChange={selectedOptions => setFilterColumnValues(selectedOptions ? selectedOptions.map(option => option.value) : [])}
            placeholder={`Filter ${filterColumn}...`}
            styles={selectStyles}
          />
        </div>
      )}
    </div>
  );
}
