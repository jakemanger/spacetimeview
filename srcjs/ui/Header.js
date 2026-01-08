import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import { Menu, MenuItem, CircularProgress } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';
import AboutModal from './AboutModal';

// font family constant for consistent usage
const fontFamily = "'DM Sans', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const Header = ({
  logo,
  title = '',
  socialLinks = {},
  websiteLink = '',
  themeColors = {
    elevation1: '#292d39',
    elevation2: '#181C20',
    elevation3: '#373C4B',
    accent1: '#0066DC',
    accent2: '#007BFF',
    accent3: '#3C93FF',
    highlight1: '#535760',
    highlight2: '#8C92A4',
    highlight3: '#FEFEFE',
  },
  tabs = [],
  activeTab = 0,
  onTabClick = () => {},
  aboutText = null,
  isMobile = false,
  loadingTab = null
}) => {
  const [tabMenuAnchor, setTabMenuAnchor] = useState(null);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  
  if (!logo && !title && Object.keys(socialLinks).length === 0 && !aboutText) {
    return null;
  }

  // Create enhanced tabs array that includes About tab when aboutText is provided
  const enhancedTabs = aboutText ? [...tabs, 'About'] : tabs;
  const isAboutTab = (index) => aboutText && index === enhancedTabs.length - 1;

  const handleTabMenuOpen = (event) => {
    setTabMenuAnchor(event.currentTarget);
  };
  
  const handleTabMenuClose = () => {
    setTabMenuAnchor(null);
  };
  
  const handleTabClick = (index) => {
    if (isAboutTab(index)) {
      setAboutModalOpen(true);
    } else {
      onTabClick(index);
    }
  };
  
  const handleTabMenuClick = (index) => {
    handleTabClick(index);
    handleTabMenuClose();
  };
  return (
    <header 
      style={{
        position: 'sticky',
        top: 0,
        height: '60px',
        backgroundColor: themeColors.elevation2,
        zIndex: 100,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily
      }}
    >
      {/* Logo and Title section */}
      <div style={{ paddingLeft: '8px', display: 'flex', alignItems: 'center' }}>
        {websiteLink ? (
          <a 
            href={websiteLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              textDecoration: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              color: 'inherit' 
            }}
          >
            {logo && (
              <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} />
            )}
            {title && (
              <h1 style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: 500, 
                color: themeColors.highlight2, 
                fontFamily 
              }}>
                {title}
              </h1>
            )}
          </a>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {logo && (
              <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} />
            )}
            {title && (
              <h1 style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: 500, 
                color: themeColors.highlight2, 
                fontFamily 
              }}>
                {title}
              </h1>
            )}
          </div>
        )}

        {/* Desktop tabs section */}
        {enhancedTabs.length > 0 && !isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '32px' }}>
            {enhancedTabs.map((tabTitle, index) => {
              const isActive = isAboutTab(index) ? false : activeTab === index;
              const isLoading = loadingTab === index;
              return (
                <div
                  key={index}
                  onClick={() => handleTabClick(index)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    color: (isActive || isLoading) ? themeColors.accent2 : themeColors.highlight2,
                    borderBottom: (isActive || isLoading) ? `2px solid ${themeColors.accent2}` : 'none',
                    fontWeight: (isActive || isLoading) ? 500 : 400,
                    fontFamily,
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {tabTitle}
                  {isLoading && (
                    <CircularProgress
                      size={14}
                      sx={{ color: themeColors.accent2 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Social Media Links and Mobile Menu */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Mobile hamburger menu for tabs */}
        {enhancedTabs.length > 0 && isMobile && (
          <div style={{ marginRight: '8px' }}>
            <IconButton
              onClick={handleTabMenuOpen}
              sx={{ color: themeColors.highlight2 }}
              aria-label="open tabs menu"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={tabMenuAnchor}
              open={Boolean(tabMenuAnchor)}
              onClose={handleTabMenuClose}
              PaperProps={{
                style: {
                  backgroundColor: themeColors.elevation2,
                  color: themeColors.highlight2,
                },
              }}
            >
              {enhancedTabs.map((tabTitle, index) => {
                const isActive = isAboutTab(index) ? false : activeTab === index;
                const isLoading = loadingTab === index;
                return (
                  <MenuItem
                    key={index}
                    onClick={() => handleTabMenuClick(index)}
                    sx={{
                      color: (isActive || isLoading) ? themeColors.accent2 : themeColors.highlight2,
                      fontWeight: (isActive || isLoading) ? 500 : 400,
                      fontFamily,
                      backgroundColor: (isActive || isLoading) ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      },
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {tabTitle}
                    {isLoading && (
                      <CircularProgress
                        size={14}
                        sx={{ color: themeColors.accent2 }}
                      />
                    )}
                  </MenuItem>
                );
              })}
            </Menu>
          </div>
        )}

        {/* Social Media Icons - Hidden on mobile, shown in About modal instead */}
        {!isMobile && Object.entries(socialLinks).map(([key, value]) => {
          // Handle standard icon-based social links (string URLs)
          if (typeof value === 'string') {
            const iconMap = {
              facebook: <FacebookIcon />,
              twitter: <TwitterIcon />,
              linkedin: <LinkedInIcon />,
              instagram: <InstagramIcon />,
              github: <GitHubIcon />
            };

            const icon = iconMap[key.toLowerCase()];
            if (icon) {
              return (
                <IconButton
                  key={key}
                  sx={{ color: themeColors.highlight2 }}
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {icon}
                </IconButton>
              );
            }
          }

          // Handle custom image-based social links (object with url and image)
          if (typeof value === 'object' && value.url && value.image) {
            return (
              <IconButton
                key={key}
                sx={{
                  color: themeColors.highlight2,
                  padding: '8px'
                }}
                href={value.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={value.image}
                  alt={key}
                  style={{
                    height: '24px',
                    width: 'auto',
                    display: 'block'
                  }}
                />
              </IconButton>
            );
          }

          return null;
        })}
      </div>
      
      {/* About Modal */}
      <AboutModal
        open={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        aboutText={aboutText}
        themeColors={themeColors}
        socialLinks={socialLinks}
        isMobile={isMobile}
      />
    </header>
  );
};

export default Header;
