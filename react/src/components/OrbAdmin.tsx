import React from 'react';
import { Box, Typography } from '@mui/material';

interface OrbAdminProps {
  orbs: any[];
  setOrbs: (orbs: any[]) => void;
}

const OrbAdmin: React.FC<OrbAdminProps> = ({ orbs, setOrbs }) => {
  // TODO: Port orb admin UI from /second/orb.js
  return (
    <Box>
      <Typography variant="h6" gutterBottom>✨ Orb Admin (Coming Soon)</Typography>
      {/* Orb management UI goes here */}
    </Box>
  );
};

export default OrbAdmin;
