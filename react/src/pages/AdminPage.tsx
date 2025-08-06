import React, { useState } from 'react';
import { Box, Grid } from '@mui/material';
import { Canvas } from '../components/Canvas';
import Soundboard from '../components/Soundboard';
import OrbAdmin from '../components/OrbAdmin';

export const AdminPage: React.FC = () => {
  const [orbs, setOrbs] = useState<any[]>([]); // TODO: Replace with real orb state logic

  return (
    <Box sx={{ p: 4 }}>
      <Grid container spacing={4} alignItems="flex-start">
        {/* Left: Canvas */}
        <Grid item xs={12} md={5}>
          <Box sx={{ background: '#fff', borderRadius: 2, boxShadow: 2, p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 720 }}>
            <Canvas orbs={orbs} />
          </Box>
        </Grid>
        {/* Right: Soundboard (top), Orb Admin (bottom) */}
        <Grid item xs={12} md={7}>
          <Box sx={{ mb: 4 }}>
            <Soundboard />
          </Box>
          <Box>
            <OrbAdmin orbs={orbs} setOrbs={setOrbs} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
