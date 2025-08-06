import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import Soundboard from '../components/Soundboard';

const SoundPage: React.FC = () => (
  <Container maxWidth="md" sx={{ mt: 4 }}>
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Soundboard
      </Typography>
      <Box mt={2}>
        <Soundboard />
      </Box>
    </Paper>
  </Container>
);

export default SoundPage;
