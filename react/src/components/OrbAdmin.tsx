import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Card,
  CardContent,
  IconButton,
  Stack
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Save as SaveIcon, FolderOpen as LoadIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useOrbApi } from '../hooks/useOrbApi';
import type { Orb, OrbConfig, SavedOrb } from '../types/orb';

interface OrbAdminProps {
  orbs: Orb[];
  onAddOrb: (config: OrbConfig) => void;
  onUpdateOrb: (orbId: string, updates: Partial<Orb>) => void;
  onRemoveOrb: (orbId: string) => void;
  onClearAllOrbs: () => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
}

const OrbAdmin: React.FC<OrbAdminProps> = ({
  orbs,
  onAddOrb,
  onUpdateOrb,
  onRemoveOrb,
  onClearAllOrbs,
  backgroundColor,
  onBackgroundColorChange
}) => {
  const [newOrbUrl, setNewOrbUrl] = useState('');
  const { 
    saveOrbs: saveOrbsToApi, 
    clearAllOrbs: clearApiOrbs 
  } = useOrbApi();

  // Auto-save orbs to API whenever the orbs array changes
  useEffect(() => {
    if (orbs.length > 0) {
      const saved: SavedOrb[] = orbs.map(orb => ({
        imgSrc: orb.imgSrc,
        entryType: orb.entryType,
        role: orb.role,
        label: orb.label,
        ringColor: orb.ringColor,
        ringWidth: orb.ringWidth,
        roleIcon: orb.roleIcon,
        size: orb.size
      }));
      
      // Save to API (this will also save to localStorage as backup)
      saveOrbsToApi(saved).catch(console.error);
      
      // Keep localStorage sync as backup
      localStorage.setItem('orbData', JSON.stringify(saved));
      console.log('Orbs auto-saved to API and localStorage:', saved.length);
    } else {
      // Clear API when no orbs
      clearApiOrbs().catch(console.error);
      localStorage.setItem('orbData', '[]');
      console.log('Orbs cleared from API and localStorage');
    }
  }, [orbs, saveOrbsToApi, clearApiOrbs]);

  const handleAddOrb = useCallback(() => {
    if (!newOrbUrl.trim()) {
      const url = prompt('Enter orb image URL:');
      if (!url) return;
      onAddOrb({ imgSrc: url });
    } else {
      onAddOrb({ imgSrc: newOrbUrl });
      setNewOrbUrl('');
    }
  }, [newOrbUrl, onAddOrb]);

  const saveOrbs = useCallback(() => {
    const saved: SavedOrb[] = orbs.map(orb => ({
      imgSrc: orb.imgSrc,
      entryType: orb.entryType,
      role: orb.role,
      label: orb.label,
      ringColor: orb.ringColor,
      ringWidth: orb.ringWidth,
      roleIcon: orb.roleIcon,
      size: orb.size
    }));
    localStorage.setItem('orbData', JSON.stringify(saved));
    console.log('Orbs saved successfully');
  }, [orbs]);

  const loadOrbs = useCallback(() => {
    const data = localStorage.getItem('orbData');
    if (data) {
      try {
        const saved: SavedOrb[] = JSON.parse(data);
        onClearAllOrbs();
        saved.forEach(orbData => onAddOrb(orbData));
        console.log('Orbs loaded successfully');
      } catch (e) {
        console.error('Failed to load orbs:', e);
      }
    }
  }, [onAddOrb, onClearAllOrbs]);

  const clearOrbs = useCallback(() => {
    onClearAllOrbs();
    localStorage.setItem('orbData', '[]');
    console.log('Orbs cleared');
  }, [onClearAllOrbs]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#212121' }}>✨ Orb Admin</Typography>
      
      {/* Control Panel */}
      <Card sx={{ mb: 2, backgroundColor: '#ffffff' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small">
              <TextField
                type="color"
                label="BG Color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                size="small"
                sx={{ width: 100 }}
              />
            </FormControl>
            
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />}
              onClick={saveOrbs}
              size="small"
            >
              Save
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<LoadIcon />}
              onClick={loadOrbs}
              size="small"
            >
              Load
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<ClearIcon />}
              onClick={clearOrbs}
              color="error"
              size="small"
            >
              Clear
            </Button>
            
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleAddOrb}
              color="primary"
              size="small"
            >
              Add Orb
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Orb List */}
      <Box>
        {orbs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, color: '#757575' }}>
            No orbs added yet. Click "Add Orb" to get started!
          </Typography>
        ) : (
          <Stack spacing={2}>
            {orbs.map((orb) => (
              <Card key={orb.id} variant="outlined" sx={{ backgroundColor: '#ffffff' }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    {/* Image URL */}
                    <TextField
                      label="Image URL"
                      value={orb.imgSrc}
                      onChange={(e) => {
                        const newSrc = e.target.value;
                        onUpdateOrb(orb.id, { imgSrc: newSrc });
                        orb.img.src = newSrc;
                      }}
                      size="small"
                      sx={{ minWidth: 200 }}
                    />

                    {/* Label */}
                    <TextField
                      label="Label"
                      value={orb.label}
                      onChange={(e) => onUpdateOrb(orb.id, { label: e.target.value })}
                      size="small"
                      sx={{ minWidth: 120 }}
                    />

                    {/* Role */}
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={orb.role}
                        onChange={(e) => onUpdateOrb(orb.id, { role: e.target.value as any })}
                      >
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="mod">Mod</MenuItem>
                        <MenuItem value="lurker">Lurker</MenuItem>
                        <MenuItem value="passerby">Passerby</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Icon */}
                    <TextField
                      label="Icon"
                      value={orb.roleIcon}
                      onChange={(e) => onUpdateOrb(orb.id, { roleIcon: e.target.value })}
                      size="small"
                      sx={{ minWidth: 80 }}
                    />

                    {/* Ring Color */}
                    <TextField
                      type="color"
                      label="Ring Color"
                      value={orb.ringColor}
                      onChange={(e) => onUpdateOrb(orb.id, { ringColor: e.target.value })}
                      size="small"
                      sx={{ width: 80 }}
                    />

                    {/* Ring Width */}
                    <Box sx={{ minWidth: 120 }}>
                      <Typography variant="body2" gutterBottom>
                        Ring Width: {orb.ringWidth}
                      </Typography>
                      <Slider
                        value={orb.ringWidth}
                        onChange={(_, value) => onUpdateOrb(orb.id, { ringWidth: value as number })}
                        min={1}
                        max={10}
                        size="small"
                      />
                    </Box>

                    {/* Size */}
                    <Box sx={{ minWidth: 120 }}>
                      <Typography variant="body2" gutterBottom>
                        Size: {orb.size}
                      </Typography>
                      <Slider
                        value={orb.size}
                        onChange={(_, value) => onUpdateOrb(orb.id, { size: value as number })}
                        min={20}
                        max={200}
                        size="small"
                      />
                    </Box>

                    {/* Remove Button */}
                    <IconButton
                      onClick={() => onRemoveOrb(orb.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
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

export default OrbAdmin;
