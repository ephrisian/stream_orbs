import React, { useState } from 'react';
import { Box, Button, Grid, TextField, Typography, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';

interface Sound {
  label: string;
  url: string;
}

const initialSounds: Sound[] = [];

const Soundboard: React.FC = () => {
  const [sounds, setSounds] = useState<Sound[]>(initialSounds);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const addSound = () => {
    if (!label.trim() || !url.trim()) return;
    setSounds([...sounds, { label, url }]);
    setLabel('');
    setUrl('');
  };

  const removeSound = (idx: number) => {
    setSounds(sounds.filter((_, i) => i !== idx));
  };

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>🎧 Soundboard</Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={4}>
          <TextField label="Label" value={label} onChange={e => setLabel(e.target.value)} size="small" fullWidth />
        </Grid>
        <Grid item xs={6}>
          <TextField label="Sound URL" value={url} onChange={e => setUrl(e.target.value)} size="small" fullWidth />
        </Grid>
        <Grid item xs={2}>
          <Button variant="contained" color="primary" onClick={addSound} fullWidth>➕ Add</Button>
        </Grid>
      </Grid>
      <List>
        {sounds.map((sound, idx) => (
          <ListItem key={idx} onClick={() => playSound(sound.url)} style={{ cursor: 'pointer' }}>
            <ListItemText primary={sound.label} secondary={sound.url} />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="delete" onClick={() => removeSound(idx)}>
                <span role="img" aria-label="delete">🗑️</span>
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Soundboard;
