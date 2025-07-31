import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { Link, Menu, MenuItem } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';

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

  const bottomPadding = '1px';
  
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
    <AppBar position="sticky" sx={{ top: 0, height: '60px', backgroundColor: themeColors.elevation2, zIndex: 100, boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}>
      <Toolbar sx={{ minHeight: '60px', display: 'flex', justifyContent: 'space-between' }}>
        {/* Logo and Title section */}
        <Box sx={{ display: 'flex', alignItems: 'center', paddingBottom: bottomPadding }}>
          {websiteLink ? (
            <Link href={websiteLink} target="_blank" sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'inherit' }}>
              {logo && (
                <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} />
              )}
              {title && (
                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', color: themeColors.highlight2 }}>
                  {title}
                </Typography>
              )}
            </Link>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', paddingBottom: bottomPadding }}>
              {logo && (
                <IconButton edge="start" color="inherit" aria-label="menu">
                  <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} />
                </IconButton>
              )}
              {title && (
                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', color: themeColors.highlight2 }}>
                  {title}
                </Typography>
              )}
            </Box>
          )}

          {/* Desktop tabs section */}
          {tabs.length > 0 && !isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 8, paddingBottom: bottomPadding }}>
              {tabs.map((tabTitle, index) => (
                <Box 
                  key={index}
                  onClick={() => onTabClick(index)}
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    color: activeTab === index ? themeColors.accent2 : themeColors.highlight2,
                    borderBottom: activeTab === index ? `2px solid ${themeColors.accent2}` : 'none',
                    fontWeight: activeTab === index ? 500 : 400,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  {tabTitle}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Social Media Links and Mobile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', paddingBottom: bottomPadding }}>
          {/* Mobile hamburger menu for tabs */}
          {tabs.length > 0 && isMobile && (
            <Box sx={{ mr: 1 }}>
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
            </Box>
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
