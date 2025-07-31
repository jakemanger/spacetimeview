import React from 'react';

// Utility for reliable mobile device detection
export const isMobileDevice = () => {
  // Method 1: Check for touch capability and coarse pointer
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const cantHover = window.matchMedia('(hover: none)').matches;
  
  // Method 2: Check viewport width with multiple media queries
  const isNarrowViewport = window.matchMedia('(max-width: 768px)').matches;
  const isNarrowDevice = window.matchMedia('(max-device-width: 768px)').matches;
  
  // Method 3: User agent fallback (less reliable but covers edge cases)
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Method 4: Check actual innerWidth as backup
  const isNarrowWindow = window.innerWidth <= 768;
  
  // Combine methods - if any touch-based method is true OR multiple width methods agree
  const isTouchDevice = hasTouch && (hasCoarsePointer || cantHover);
  const isNarrowScreen = (isNarrowViewport || isNarrowDevice) && isNarrowWindow;
  
  return isTouchDevice || isNarrowScreen || isMobileUA;
};

// Check if screen is small regardless of touch capability
export const isSmallScreen = () => {
  const isNarrowViewport = window.matchMedia('(max-width: 768px)').matches;
  const isNarrowDevice = window.matchMedia('(max-device-width: 768px)').matches;
  const isNarrowWindow = window.innerWidth < 768;
  
  // Return true if at least 2 of 3 methods agree it's narrow
  const narrowCount = [isNarrowViewport, isNarrowDevice, isNarrowWindow].filter(Boolean).length;
  return narrowCount >= 2;
};

// Hook for using mobile detection in React components
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = React.useState(true);
  const [isSmall, setIsSmall] = React.useState(true);
  
  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(isMobileDevice());
      setIsSmall(isSmallScreen());
    };
    
    // Initial check when component mounts
    checkDevice();
    
    // Check on resize
    window.addEventListener('resize', checkDevice);
    
    // Check on orientation change (mobile specific)
    window.addEventListener('orientationchange', () => {
      // Small delay to let viewport settle after orientation change
      setTimeout(checkDevice, 150);
    });
    
    // Also check after a small delay to ensure DOM is fully loaded
    const timeoutId = setTimeout(checkDevice, 100);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
      clearTimeout(timeoutId);
    };
  }, []);
  
  return { isMobile, isSmall };
}; 