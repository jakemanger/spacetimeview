import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import { Menu, MenuItem } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';

// Font family constant for consistent usage
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
  isMobile = false
}) => {
  const [tabMenuAnchor, setTabMenuAnchor] = useState(null);
  
  if (!logo && !title && Object.keys(socialLinks).length === 0) {
    return null;
  }

  const handleTabMenuOpen = (event) => {
    setTabMenuAnchor(event.currentTarget);
  };
  
  const handleTabMenuClose = () => {
    setTabMenuAnchor(null);
  };
  
  const handleTabMenuClick = (index) => {
    onTabClick(index);
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
        {tabs.length > 0 && !isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '32px' }}>
            {tabs.map((tabTitle, index) => (
              <div 
                key={index}
                onClick={() => onTabClick(index)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: activeTab === index ? themeColors.accent2 : themeColors.highlight2,
                  borderBottom: activeTab === index ? `2px solid ${themeColors.accent2}` : 'none',
                  fontWeight: activeTab === index ? 500 : 400,
                  fontFamily,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {tabTitle}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social Media Links and Mobile Menu */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Mobile hamburger menu for tabs */}
        {tabs.length > 0 && isMobile && (
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
              {tabs.map((tabTitle, index) => (
                <MenuItem
                  key={index}
                  onClick={() => handleTabMenuClick(index)}
                  sx={{
                    color: activeTab === index ? themeColors.accent2 : themeColors.highlight2,
                    fontWeight: activeTab === index ? 500 : 400,
                    fontFamily,
                    backgroundColor: activeTab === index ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  {tabTitle}
                </MenuItem>
              ))}
            </Menu>
          </div>
        )}

        {/* Social Media Icons */}
        {socialLinks.facebook && (
          <IconButton sx={{ color: themeColors.highlight2 }} href={socialLinks.facebook} target="_blank">
            <FacebookIcon />
          </IconButton>
        )}
        {socialLinks.twitter && (
          <IconButton sx={{ color: themeColors.highlight2 }} href={socialLinks.twitter} target="_blank">
            <TwitterIcon />
          </IconButton>
        )}
        {socialLinks.linkedin && (
          <IconButton sx={{ color: themeColors.highlight2 }} href={socialLinks.linkedin} target="_blank">
            <LinkedInIcon />
          </IconButton>
        )}
        {socialLinks.instagram && (
          <IconButton sx={{ color: themeColors.highlight2 }} href={socialLinks.instagram} target="_blank">
            <InstagramIcon />
          </IconButton>
        )}
        {socialLinks.github && (
          <IconButton sx={{ color: themeColors.highlight2 }} href={socialLinks.github} target="_blank">
            <GitHubIcon />
          </IconButton>
        )}
      </div>
    </header>
  );
};

export default Header;
