import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { Link } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import GitHubIcon from '@mui/icons-material/GitHub';

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
  }
}) => {
  if (!logo && !title && Object.keys(socialLinks).length === 0) {
    return null;
  }

  return (
    <AppBar position="fixed" sx={{ height: '60px', backgroundColor: themeColors.elevation2, zIndex: 100, boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}>
      <Toolbar sx={{ minHeight: '60px', display: 'flex', justifyContent: 'space-between' }}> {/* Center items vertically and distribute space */}
        {/* Logo with optional website link */}
        {websiteLink ? (
          <Link href={websiteLink} target="_blank" sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'inherit' }}>
            {logo && (
              <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} />
            )}
            {title && (
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', color: themeColors.highlight2 }}> {/* Center title */}
                {title}
              </Typography>
            )}
          </Link>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {logo && (
              <IconButton edge="start" color="inherit" aria-label="menu">
                <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} /> {/* Adjust logo height */}
              </IconButton>
            )}
            {title && (
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', color: themeColors.highlight2 }}> {/* Center title */}
                {title}
              </Typography>
            )}
          </Box>
        )}

        {/* Social Media Links */}
        <Box>
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
