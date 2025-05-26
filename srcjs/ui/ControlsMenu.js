import React, { useState, useEffect, useRef } from 'react';
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
  factorIcons,
}) {
  // initialize position to match the default position in dockStyles
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const controlsRef = useRef(null);
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (dockPosition === 'floating' && controlsRef.current) {
      const initialX = 20;
      const initialY = 20;
      setPosition({ x: initialX, y: initialY });
    }
  }, [dockPosition]);

  // update bounds when window is resized or collapsed state changes
  useEffect(() => {
    const updateBounds = () => {
      if (controlsRef.current) {
        const { width, height } = controlsRef.current.getBoundingClientRect();
        const newBounds = {
          left: 0,
          top: 0,
          right: window.innerWidth - width,
          bottom: window.innerHeight - height
        };
        setBounds(newBounds);
        
        setPosition(prevPosition => ({
          x: Math.min(Math.max(prevPosition.x, newBounds.left), newBounds.right),
          y: Math.min(Math.max(prevPosition.y, newBounds.top), newBounds.bottom)
        }));
      }
    };

    updateBounds();

    window.addEventListener('resize', updateBounds);

    return () => window.removeEventListener('resize', updateBounds);
  }, [collapsed]);

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const dockStyles = {
    left: {
      position: 'fixed',
      left: '20px',
      top: '20px',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      maxWidth: '340px',
    },
    right: {
      position: 'fixed',
      right: '20px',
      top: '20px',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      maxWidth: '340px',
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
      maxWidth: '500px',
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
      maxWidth: '340px',
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

  const formatOptionLabel = (factorIcons, filterColumn) => ({ label, value }, { context }) => {
    // context is 'menu' or 'value' (selected)
    const iconPath = factorIcons && factorIcons[filterColumn] && factorIcons[filterColumn][label];
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {iconPath && <img src={iconPath} alt="" style={{ width: 16, height: 16, marginRight: 5 }} />} 
        {label}
      </div>
    );
  };

  return dockPosition === 'floating' ? (
    <Draggable 
      handle=".draggable-handle" 
      onStop={handleDragStop}
      position={position}
      bounds={bounds}
    >
      <div style={dockStyles[dockPosition]} ref={controlsRef}>
        <div className="draggable-handle" style={{ 
          cursor: 'move', 
          marginBottom: collapsed ? '0' : '10px', 
          background: '#f1f3f5', 
          padding: '15px', 
          borderRadius: '4px', 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          minWidth: '270px'
        }}>
          <div style={{ position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // prevent dragging when clicking the button
              setCollapsed(!collapsed);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              position: 'absolute',
              right: '5px'
            }}
          >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </button>
        </div>
        {!collapsed && (
          <>
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
                  formatOptionLabel={formatOptionLabel(factorIcons, filterColumn)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Draggable>
  ) : (
    <div style={dockStyles[dockPosition]}>
      <div style={{ 
        marginBottom: collapsed ? '0' : '10px', 
        background: '#f1f3f5', 
        padding: '5px', 
        borderRadius: '4px', 
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        minWidth: '300px'
      }}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          )}
        </button>
      </div>
      {!collapsed && (
        <>
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
                formatOptionLabel={formatOptionLabel(factorIcons, filterColumn)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
