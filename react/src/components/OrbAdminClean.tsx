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
  Stack,
  Paper
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

const OrbAdminClean: React.FC<OrbAdminProps> = ({
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
    console.log('Orbs saved:', saved.length);
  }, [orbs]);

  const loadOrbs = useCallback(() => {
    const data = localStorage.getItem('orbData');
    if (data) {
      const saved: SavedOrb[] = JSON.parse(data);
      console.log('Loading orbs:', saved);
      onClearAllOrbs();
      saved.forEach(orbData => {
        onAddOrb(orbData);
      });
    }
  }, [onAddOrb, onClearAllOrbs]);

  const clearOrbs = useCallback(() => {
    onClearAllOrbs();
    localStorage.setItem('orbData', '[]');
    console.log('Orbs cleared');
  }, [onClearAllOrbs]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 'bold',
          color: '#1976d2',
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}
      >
        ✨ Orb Admin
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left Column - Settings & Controls */}
        <Box sx={{ flex: '0 0 350px' }}>
          {/* Background Settings */}
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 'medium' }}>
                🎨 Background Settings
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  type="color"
                  label="Background Color"
                  value={backgroundColor}
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  size="small"
                  sx={{ width: 120 }}
                />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Color
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {backgroundColor}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 'medium' }}>
                🎮 Actions
              </Typography>
              <Stack spacing={2}>
                <Button 
                  variant="contained" 
                  startIcon={<SaveIcon />}
                  onClick={saveOrbs}
                  fullWidth
                  size="large"
                >
                  Save All Orbs
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<LoadIcon />}
                  onClick={loadOrbs}
                  fullWidth
                  size="large"
                >
                  Load Orbs
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<ClearIcon />}
                  onClick={clearOrbs}
                  color="error"
                  fullWidth
                  size="large"
                >
                  Clear All
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Add New Orb */}
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 'medium' }}>
                ➕ Add New Orb
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Image URL"
                  value={newOrbUrl}
                  onChange={(e) => setNewOrbUrl(e.target.value)}
                  placeholder="https://images.whatnot.com/..."
                  fullWidth
                  variant="outlined"
                />
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleAddOrb}
                  color="success"
                  fullWidth
                  size="large"
                  disabled={!newOrbUrl.trim()}
                >
                  Add Orb
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Right Column - Orbs List */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ boxShadow: 3, minHeight: 600 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, color: '#333', fontWeight: 'medium' }}>
                🔮 Current Orbs ({orbs.length})
              </Typography>
              
              {orbs.length === 0 ? (
                <Paper 
                  sx={{ 
                    p: 6, 
                    textAlign: 'center', 
                    backgroundColor: '#f8f9fa',
                    border: '2px dashed #ddd'
                  }}
                >
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No orbs added yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add your first orb using the form on the left!
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={3}>
                  {orbs.map((orb, index) => (
                    <Paper key={orb.id} sx={{ p: 3, backgroundColor: '#fafafa', border: '1px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Orb Preview */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                          <Box
                            component="img"
                            src={orb.imgSrc}
                            alt={orb.label}
                            sx={{
                              width: 60,
                              height: 60,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: `4px solid ${orb.ringColor}`,
                              boxShadow: 2
                            }}
                          />
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                              #{index + 1}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {orb.label || 'Unnamed Orb'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Controls */}
                        <Box sx={{ flex: 1, minWidth: 300 }}>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              <TextField
                                label="Label"
                                value={orb.label}
                                onChange={(e) => onUpdateOrb(orb.id, { label: e.target.value })}
                                size="small"
                                sx={{ flex: 1, minWidth: 150 }}
                              />
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Role</InputLabel>
                                <Select
                                  value={orb.role}
                                  onChange={(e) => onUpdateOrb(orb.id, { role: e.target.value as any })}
                                  label="Role"
                                >
                                  <MenuItem value="none">None</MenuItem>
                                  <MenuItem value="mod">Moderator</MenuItem>
                                  <MenuItem value="lurker">Lurker</MenuItem>
                                  <MenuItem value="passerby">Passerby</MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              <TextField
                                label="Icon"
                                value={orb.roleIcon}
                                onChange={(e) => onUpdateOrb(orb.id, { roleIcon: e.target.value })}
                                size="small"
                                sx={{ width: 80 }}
                              />
                              <TextField
                                type="color"
                                label="Ring Color"
                                value={orb.ringColor}
                                onChange={(e) => onUpdateOrb(orb.id, { ringColor: e.target.value })}
                                size="small"
                                sx={{ width: 100 }}
                              />
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              <Box sx={{ flex: 1, minWidth: 150 }}>
                                <Typography variant="body2" gutterBottom>
                                  Ring Width: {orb.ringWidth}px
                                </Typography>
                                <Slider
                                  value={orb.ringWidth}
                                  onChange={(_, value) => onUpdateOrb(orb.id, { ringWidth: value as number })}
                                  min={0}
                                  max={20}
                                  size="small"
                                  valueLabelDisplay="auto"
                                />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 150 }}>
                                <Typography variant="body2" gutterBottom>
                                  Size: {orb.size}px
                                </Typography>
                                <Slider
                                  value={orb.size}
                                  onChange={(_, value) => onUpdateOrb(orb.id, { size: value as number })}
                                  min={20}
                                  max={150}
                                  size="small"
                                  valueLabelDisplay="auto"
                                />
                              </Box>
                            </Box>
                          </Stack>
                        </Box>

                        {/* Delete Button */}
                        <Box sx={{ alignSelf: 'center' }}>
                          <IconButton
                            onClick={() => onRemoveOrb(orb.id)}
                            color="error"
                            size="large"
                            sx={{ 
                              border: '2px solid #ff5252', 
                              '&:hover': { backgroundColor: '#ffebee' }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default OrbAdminClean;
