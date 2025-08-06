import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Tooltip } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: '🎛️ Admin', description: 'Main Control Panel' }
  ];

  const openObsInNewTab = () => {
    window.open('/obs', '_blank');
  };

  return (
    <AppBar position="static" sx={{ mb: 2, backgroundColor: '#1976d2' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#ffffff' }}>
          ✨ Stream Orbs
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              variant={location.pathname === item.path ? "outlined" : "text"}
              onClick={() => navigate(item.path)}
              sx={{ 
                color: '#ffffff',
                borderColor: location.pathname === item.path ? '#ffffff' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {item.label}
            </Button>
          ))}
          
          <Tooltip title="Open OBS View in New Tab (for streaming software)">
            <IconButton
              onClick={openObsInNewTab}
              sx={{ 
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <OpenInNewIcon />
              <Typography variant="body2" sx={{ ml: 0.5, fontSize: '0.75rem', color: '#ffffff' }}>
                📺 OBS
              </Typography>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
