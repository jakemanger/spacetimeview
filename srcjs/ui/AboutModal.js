import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
  }
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