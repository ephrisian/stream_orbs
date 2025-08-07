import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Card,
  CardContent,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Add as AddIcon, 
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  VolumeUp as VolumeIcon,
  Keyboard as KeyboardIcon
} from '@mui/icons-material';
import type { SoundTrigger } from '../types/sound';

interface SoundboardProps {
  soundTriggers: SoundTrigger[];
  onAddSoundTrigger: () => void;
  onRemoveSoundTrigger: (triggerId: string) => void;
  onUpdateSoundTrigger: (triggerId: string, updates: Partial<SoundTrigger>) => void;
  onPlaySoundAndGif: (trigger: SoundTrigger) => void;
  onStopAllSounds: () => void;
}

const Soundboard: React.FC<SoundboardProps> = ({
  soundTriggers,
  onAddSoundTrigger,
  onRemoveSoundTrigger,
  onUpdateSoundTrigger,
  onPlaySoundAndGif,
  onStopAllSounds
}) => {
  const [listeningForKeyCombo, setListeningForKeyCombo] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (triggerId: string, file: File, type: 'audio' | 'gif') => {
    if (type === 'audio') {
      onUpdateSoundTrigger(triggerId, {
        _file: file
      });
    } else {
      onUpdateSoundTrigger(triggerId, {
        _gifFile: file
      });
    }
  }, [onUpdateSoundTrigger]);

  const handleKeyComboCapture = useCallback((triggerId: string) => {
    setListeningForKeyCombo(triggerId);

    const keyListener = (e: KeyboardEvent) => {
      e.preventDefault();

      if (['Shift', 'Control', 'Alt'].includes(e.key)) return;

      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

      const lastPart = parts[parts.length - 1];
      if (!lastPart || ['Shift', 'Ctrl', 'Alt'].includes(lastPart)) {
        console.warn("Invalid key combo. Try again.");
        setListeningForKeyCombo(null);
        document.removeEventListener('keydown', keyListener, true);
        return;
      }

      const combo = parts.join('+');
      const conflict = soundTriggers.find(t => t.id !== triggerId && t.keyCombo === combo);
      if (conflict) {
        console.warn(`Key combo already used by "${conflict.label || 'unnamed'}"`);
      }

      onUpdateSoundTrigger(triggerId, { keyCombo: combo });
      setListeningForKeyCombo(null);
      document.removeEventListener('keydown', keyListener, true);
    };

    document.addEventListener('keydown', keyListener, true);
  }, [soundTriggers, onUpdateSoundTrigger]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#212121' }}>🎧 Soundboard</Typography>
      
      {/* Control Panel */}
      <Card sx={{ mb: 2, backgroundColor: '#ffffff' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={onAddSoundTrigger}
              size="small"
            >
              Add Sound Trigger
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<StopIcon />}
              onClick={onStopAllSounds}
              color="error"
              size="small"
            >
              Stop All
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Sound Triggers List */}
      <Box>
        {soundTriggers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, color: '#757575' }}>
            No sound triggers added yet. Click "Add Sound Trigger" to get started!
          </Typography>
        ) : (
          <Stack spacing={2}>
            {soundTriggers.map((trigger) => (
              <Card key={trigger.id} variant="outlined" sx={{ backgroundColor: '#ffffff' }}>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Top Row - Label and Key Combo */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        label="Label"
                        value={trigger.label}
                        onChange={(e) => onUpdateSoundTrigger(trigger.id, { label: e.target.value })}
                        size="small"
                        sx={{ minWidth: 150 }}
                      />
                      
                      <Button
                        variant={listeningForKeyCombo === trigger.id ? "contained" : "outlined"}
                        startIcon={<KeyboardIcon />}
                        onClick={() => handleKeyComboCapture(trigger.id)}
                        size="small"
                        color={listeningForKeyCombo === trigger.id ? "secondary" : "primary"}
                      >
                        {listeningForKeyCombo === trigger.id 
                          ? 'Listening...' 
                          : trigger.keyCombo || 'Set Key Combo'
                        }
                      </Button>

                      {trigger.keyCombo && (
                        <Chip label={trigger.keyCombo} size="small" variant="outlined" />
                      )}
                    </Stack>

                    {/* Second Row - File Uploads */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                      >
                        Upload Audio
                        <input
                          type="file"
                          accept="audio/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(trigger.id, file, 'audio');
                              e.target.value = ''; // Allow re-upload of same file
                            }
                          }}
                        />
                      </Button>

                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                      >
                        Upload GIF
                        <input
                          type="file"
                          accept="image/gif"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(trigger.id, file, 'gif');
                              e.target.value = ''; // Allow re-upload of same file
                            }
                          }}
                        />
                      </Button>

                      {trigger.soundUrl && (
                        <Chip 
                          label={`🔊 ${trigger.soundUrl}`} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      )}

                      {trigger.gifUrl && (
                        <Chip 
                          label={`🎬 ${trigger.gifUrl}`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                        />
                      )}
                    </Stack>

                    {/* Third Row - Volume and GIF Position */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="body2" gutterBottom>
                          <VolumeIcon fontSize="small" sx={{ mr: 1 }} />
                          Volume: {Math.round(trigger.volume * 100)}%
                        </Typography>
                        <Slider
                          value={trigger.volume}
                          onChange={(_, value) => onUpdateSoundTrigger(trigger.id, { volume: value as number })}
                          min={0}
                          max={1}
                          step={0.01}
                          size="small"
                        />
                      </Box>

                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>GIF Position</InputLabel>
                        <Select
                          value={trigger.gifPosition}
                          onChange={(e) => onUpdateSoundTrigger(trigger.id, { gifPosition: e.target.value as any })}
                        >
                          <MenuItem value="top-left">Top Left</MenuItem>
                          <MenuItem value="top-right">Top Right</MenuItem>
                          <MenuItem value="bottom-left">Bottom Left</MenuItem>
                          <MenuItem value="bottom-right">Bottom Right</MenuItem>
                          <MenuItem value="center">Center</MenuItem>
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        startIcon={<PlayIcon />}
                        onClick={() => onPlaySoundAndGif(trigger)}
                        size="small"
                        color="success"
                      >
                        Preview
                      </Button>

                      <IconButton
                        onClick={() => onRemoveSoundTrigger(trigger.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default Soundboard;
