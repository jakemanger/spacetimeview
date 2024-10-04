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

const Header = ({ logo, title = '', socialLinks = {}, websiteLink = '' }) => {
  if (!logo && !title && Object.keys(socialLinks).length === 0) {
    return null;
  }

  return (
    <AppBar position="static" sx={{ height: '60px', backgroundColor: 'grey' }}> {/* Adjust background color to grey */}
      <Toolbar sx={{ minHeight: '60px', display: 'flex', justifyContent: 'space-between' }}> {/* Center items vertically and distribute space */}
        {/* Logo with optional website link */}
        {websiteLink ? (
          <Link href={websiteLink} target="_blank" sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'inherit' }}>
            {logo && (
              <img src={logo} alt="logo" style={{ height: '40px', marginRight: '10px' }} />
            )}
            {title && (
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}> {/* Center title */}
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
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}> {/* Center title */}
                {title}
              </Typography>
            )}
          </Box>
        )}

        {/* Social Media Links */}
        <Box>
          {socialLinks.facebook && (
            <IconButton color="inherit" href={socialLinks.facebook} target="_blank">
              <FacebookIcon />
            </IconButton>
          )}
          {socialLinks.twitter && (
            <IconButton color="inherit" href={socialLinks.twitter} target="_blank">
              <TwitterIcon />
            </IconButton>
          )}
          {socialLinks.linkedin && (
            <IconButton color="inherit" href={socialLinks.linkedin} target="_blank">
              <LinkedInIcon />
            </IconButton>
          )}
          {socialLinks.instagram && (
            <IconButton color="inherit" href={socialLinks.instagram} target="_blank">
              <InstagramIcon />
            </IconButton>
          )}
          {socialLinks.github && (
            <IconButton color="inherit" href={socialLinks.github} target="_blank">
              <GitHubIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
