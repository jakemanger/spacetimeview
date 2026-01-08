import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import GitHubIcon from '@mui/icons-material/GitHub';

// Font family constant for consistent usage
const fontFamily = "'DM Sans', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const AboutModal = ({
  open,
  onClose,
  aboutText,
  themeColors = {
    elevation2: '#181C20',
    highlight2: '#8C92A4',
    highlight3: '#FEFEFE',
    accent2: '#007BFF'
  },
  socialLinks = {},
  isMobile = false
}) => {
  if (!aboutText) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: themeColors.elevation2,
          color: themeColors.highlight3,
          fontFamily
        }
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: themeColors.elevation2,
          color: themeColors.highlight3,
          fontFamily,
          fontSize: '28px',
          fontWeight: 500,
          padding: '24px 24px 16px 24px'
        }}
      >
        About
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: themeColors.highlight2,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: themeColors.highlight3
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          backgroundColor: themeColors.elevation2,
          color: themeColors.highlight3,
          fontFamily,
          padding: '0 24px 24px 24px',
          fontSize: '16px',
          '& p': {
            margin: '16px 0',
            lineHeight: 1.7,
            fontSize: '16px'
          },
          '& h1, h2, h3, h4, h5, h6': {
            color: themeColors.highlight3,
            fontFamily,
            margin: '24px 0 16px 0'
          },
          '& h2': {
            fontSize: '22px'
          },
          '& h3': {
            fontSize: '20px'
          },
          '& h4': {
            fontSize: '18px'
          },
          '& a': {
            color: themeColors.accent2,
            textDecoration: 'none',
            fontSize: '16px',
            '&:hover': {
              textDecoration: 'underline'
            }
          },
          '& ul, ol': {
            paddingLeft: '20px',
            fontSize: '16px',
            '& li': {
              margin: '10px 0',
              lineHeight: 1.7
            }
          },
          '& code': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontFamily: 'Monaco, monospace',
            fontSize: '14px'
          },
          '& pre': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '14px',
            '& code': {
              backgroundColor: 'transparent',
              padding: 0
            }
          }
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: aboutText }} />

        {/* Social Media Links - Only shown on mobile */}
        {isMobile && Object.keys(socialLinks).length > 0 && (
          <div style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: `1px solid ${themeColors.highlight1 || 'rgba(255, 255, 255, 0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            {Object.entries(socialLinks).map(([key, value]) => {
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
        )}
      </DialogContent>
      <DialogActions
        sx={{
          backgroundColor: themeColors.elevation2,
          padding: '16px 24px'
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: themeColors.accent2,
            fontFamily,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AboutModal;