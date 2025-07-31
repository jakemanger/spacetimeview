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
  columnsToPlotOptions,
  columnsToPlotValues,
  setColumnsToPlotValues,
  factorIcons,
  visibleControls = [],
  controlNames = {},
  draggableMenu = false,
  menuText = null,
  isMobile = false,
}) {
  // initialize position to match the default position in dockStyles
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const controlsRef = useRef(null);
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const [collapsed, setCollapsed] = useState(false); // Start expanded by default
  const [startY, setStartY] = useState(null);
  const [currentTranslateY, setCurrentTranslateY] = useState(0); // Start shown

  useEffect(() => {
    if (dockPosition === 'floating' && controlsRef.current) {
      const { width } = controlsRef.current.getBoundingClientRect();
      const initialX = window.innerWidth - width - 20; // 20px from the right
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

  // Sync collapsed state with translateY position for mobile bottom drawer
  useEffect(() => {
    if (isMobile && dockPosition === 'bottom') {
      if (collapsed) {
        setCurrentTranslateY(75); // Better handle visibility for easier grabbing
      } else {
        setCurrentTranslateY(0);
      }
    }
  }, [collapsed, isMobile, dockPosition]);

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  // Touch gesture handlers for mobile bottom drawer
  const handleTouchStart = (e) => {
    if (!isMobile || dockPosition !== 'bottom') return;
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || dockPosition !== 'bottom' || startY === null) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    const percentChange = (deltaY / window.innerHeight) * 100;
    
    const newTranslateY = Math.max(0, Math.min(75, currentTranslateY + percentChange));
    setCurrentTranslateY(newTranslateY);
  };

  const handleTouchEnd = (e) => {
    if (!isMobile || dockPosition !== 'bottom' || startY === null) return;
    
    // Determine if should snap to open or closed based on position and velocity
    const threshold = 35; // Lower threshold to match new collapsed position
    if (currentTranslateY < threshold) {
      setCurrentTranslateY(0); // Snap to open
      setCollapsed(false);
    } else {
      setCurrentTranslateY(75); // Snap with better handle visibility
      setCollapsed(true);
    }
    
    setStartY(null);
  };

  const dockStyles = {
    left: {
      position: 'fixed',
      left: '20px',
      top: '20px',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '4px',
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
      borderRadius: '4px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: 'fit-content',
      height: 'fit-content',
      maxWidth: '340px',
    },
    bottom: {
      position: 'fixed',
      left: isMobile ? '10px' : '20px',
      right: isMobile ? '10px' : '20px',
      bottom: '0px',
      zIndex: 1000,
      background: levaTheme?.colors?.elevation2 || 'white',
      padding: '0px',
      borderRadius: isMobile ? '16px 16px 0 0' : '4px',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
      width: isMobile ? 'auto' : 'fit-content',
      height: 'fit-content',
      margin: isMobile ? '0' : 'auto',
      maxWidth: isMobile ? 'none' : '500px',
      maxHeight: isMobile ? '70vh' : 'auto',
      overflowY: isMobile ? 'auto' : 'visible',
      transform: isMobile ? `translateY(${currentTranslateY}%)` : 'none',
      transition: isMobile ? 'transform 0.3s ease-out' : 'none',
    },
    floating: {
      position: 'absolute',
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      borderRadius: '4px',
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
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
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

  const formatColumnsToPlotOptionLabel = (factorIcons) => ({ label, value }, { context }) => {
    // context is 'menu' or 'value' (selected)
    // For columns to plot, use the column name directly as the icon key
    // This matches how filter columns work: factorIcons[columnName][iconKey]
    // But for column selection, we want: factorIcons[columnName] = iconPath
    const iconPath = factorIcons && factorIcons[value];
    
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
            {menuText && (
              <div style={{ 
                padding: '4px 10px 14px 10px', 
                fontSize: '13px', 
                lineHeight: '1.4',
                color: levaTheme?.colors?.highlight2 || '#323F4B',
                whiteSpace: 'pre-wrap',
                textAlign: 'center'
              }}>
                {menuText}
              </div>
            )}
            <Provider delayDuration={0}>
              <Leva
                fill
                flat
                titleBar={false}
                theme={levaTheme}
                hideCopyButton
              />
            </Provider>
            {visibleControls.includes('column_to_plot') && (
              <div style={{ marginTop: '2px', paddingLeft: '10px', paddingRight: '10px' }}>
                <Select
                  components={makeAnimated()}
                  isMulti={false}
                  options={columnsToPlotOptions}
                  value={columnsToPlotOptions.find(option => columnsToPlotValues.includes(option.value)) || null}
                  onChange={selectedOption => setColumnsToPlotValues(selectedOption ? [selectedOption.value] : [])}
                  placeholder={controlNames['column_to_plot'] || 'Select columns to plot...'}
                  styles={selectStyles}
                  formatOptionLabel={formatColumnsToPlotOptionLabel(factorIcons)}
                  menuPlacement={dockPosition === 'bottom' ? 'top' : 'auto'}
                  menuPortalTarget={document.body}
                />
              </div>
            )}
            {filterColumn && (
              <div style={{ marginTop: '2px', paddingLeft: '10px', paddingRight: '10px' }}>
                <Select
                  components={makeAnimated()}
                  isMulti
                  options={filterOptions}
                  value={filterOptions.filter(option => filterColumnValues.includes(option.value))}
                  onChange={selectedOptions => setFilterColumnValues(selectedOptions ? selectedOptions.map(option => option.value) : [])}
                  placeholder={`Filter ${filterColumn}...`}
                  styles={selectStyles}
                  formatOptionLabel={formatOptionLabel(factorIcons, filterColumn)}
                  menuPlacement={dockPosition === 'bottom' ? 'top' : 'auto'}
                  menuPortalTarget={document.body}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Draggable>
  ) : (
    <div 
      style={dockStyles[dockPosition]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile bottom drawer handle or regular header */}
      {isMobile && dockPosition === 'bottom' ? (
        <div 
          style={{ 
            padding: '10px 20px 8px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'grab',
            minHeight: 12
          }}
          onClick={() => {
            console.log('Handle clicked, current collapsed:', collapsed, 'translateY:', currentTranslateY);
            if (collapsed) {
              setCurrentTranslateY(0);
              setCollapsed(false);
            } else {
              setCurrentTranslateY(75);
              setCollapsed(true);
            }
          }}
        >
          <div style={{
            width: '50px',
            height: '5px',
            backgroundColor: levaTheme?.colors?.highlight1 || '#535760',
            borderRadius: '3px',
            opacity: 0.6
          }} />
        </div>
      ) : (
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
      )}
        <div style={{
          padding: isMobile && dockPosition === 'bottom' ? '0 20px 20px 20px' : '0'
        }}>
          {menuText && (
            <div style={{ 
              padding: isMobile && dockPosition === 'bottom' ? '10px 0' : '10px', 
              marginBottom: '10px', 
              fontSize: '13px', 
              lineHeight: '1.4',
              color: levaTheme?.colors?.highlight2 || '#323F4B',
              whiteSpace: 'pre-wrap'
            }}>
              {menuText}
            </div>
          )}
          <Provider delayDuration={0}>
            <Leva
              fill
              titleBar={false}
              theme={levaTheme}
              hideCopyButton
            />
          </Provider>
          {visibleControls.includes('column_to_plot') && (
            <div style={{ 
              marginTop: '2px', 
              paddingLeft: isMobile && dockPosition === 'bottom' ? '0' : '10px', 
              paddingRight: isMobile && dockPosition === 'bottom' ? '0' : '10px' 
            }}>
              <Select
                components={makeAnimated()}
                isMulti={false}
                options={columnsToPlotOptions}
                value={columnsToPlotOptions.find(option => columnsToPlotValues.includes(option.value)) || null}
                onChange={selectedOption => setColumnsToPlotValues(selectedOption ? [selectedOption.value] : [])}
                placeholder={controlNames['column_to_plot'] || 'Select columns to plot...'}
                styles={selectStyles}
                formatOptionLabel={formatColumnsToPlotOptionLabel(factorIcons)}
                menuPlacement={dockPosition === 'bottom' ? 'top' : 'auto'}
                menuPortalTarget={document.body}
              />
            </div>
          )}
          {filterColumn && (
            <div style={{ 
              marginTop: '2px', 
              paddingLeft: isMobile && dockPosition === 'bottom' ? '0' : '10px', 
              paddingRight: isMobile && dockPosition === 'bottom' ? '0' : '10px' 
            }}>
              <Select
                components={makeAnimated()}
                isMulti
                options={filterOptions}
                value={filterOptions.filter(option => filterColumnValues.includes(option.value))}
                onChange={selectedOptions => setFilterColumnValues(selectedOptions ? selectedOptions.map(option => option.value) : [])}
                placeholder={`Filter ${filterColumn}...`}
                styles={selectStyles}
                formatOptionLabel={formatOptionLabel(factorIcons, filterColumn)}
                menuPlacement={dockPosition === 'bottom' ? 'top' : 'auto'}
                menuPortalTarget={document.body}
              />
            </div>
          )}
        </div>
    </div>
  );
}
