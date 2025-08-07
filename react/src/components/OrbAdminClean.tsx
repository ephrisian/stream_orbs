import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Paper,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import LoadIcon from '@mui/icons-material/Download';
import type { Orb, SavedOrb, OrbConfig } from '../types/orb';

interface OrbAdminProps {
  orbs: Orb[];
  onAddOrb: (config: OrbConfig) => void;
  onUpdateOrb: (orbId: string, updates: Partial<Orb>) => void;
  onRemoveOrb: (orbId: string) => void;
  onClearAllOrbs: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}

const OrbAdminClean: React.FC<OrbAdminProps> = ({
  orbs,
  onAddOrb,
  onUpdateOrb,
  onRemoveOrb,
  onClearAllOrbs,
  showPreview,
  onTogglePreview
}) => {
  const [newOrbUrl, setNewOrbUrl] = useState('');
  
  // Size mappings
  const getSizeFromLabel = (label: 'S' | 'M' | 'L'): number => {
    switch (label) {
      case 'S': return 48;
      case 'M': return 80;
      case 'L': return 120;
      default: return 80;
    }
  };
  
  const getSizeLabelFromValue = (size: number): 'S' | 'M' | 'L' => {
    if (size <= 64) return 'S';
    if (size <= 100) return 'M';
    return 'L';
  };
  
  const getRingWidthFromLabel = (label: 'S' | 'M' | 'L'): number => {
    switch (label) {
      case 'S': return 3;
      case 'M': return 6;
      case 'L': return 10;
      default: return 6;
    }
  };
  
  const getRingLabelFromValue = (width: number): 'S' | 'M' | 'L' => {
    if (width <= 4) return 'S';
    if (width <= 8) return 'M';
    return 'L';
  };
  
  // Auto-save helper function
  const autoSave = useCallback((updatedOrbs: any[]) => {
    const saved: SavedOrb[] = updatedOrbs.map(orb => ({
      imgSrc: orb.imgSrc,
      entryType: orb.entryType,
      role: orb.role,
      label: orb.label,
      ringColor: orb.ringColor,
      ringWidth: orb.ringWidth,
      roleIcon: orb.roleIcon,
      roleIconPosition: orb.roleIconPosition || 'top',
      size: orb.size
    }));
    
    // Save to localStorage and API immediately
    localStorage.setItem('orbData', JSON.stringify(saved));
    
    // Save to API via fetch
    fetch('http://192.168.68.68:3001/api/orbs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved)
    }).catch(console.error);
    
    console.log('Orbs auto-saved:', saved.length);
  }, []);

  // Manual save only - removed auto-save to prevent animation polling
  const saveOrbs = useCallback(() => {
    autoSave(orbs);
    console.log('Orbs saved manually:', orbs.length);
  }, [orbs, autoSave]);

  const handleAddOrb = useCallback(() => {
    if (!newOrbUrl.trim()) {
      const url = prompt('Enter orb image URL:');
      if (!url) return;
      onAddOrb({ imgSrc: url, size: getSizeFromLabel('M'), ringWidth: getRingWidthFromLabel('M') });
      // Auto-save after adding
      setTimeout(() => autoSave([...orbs, { imgSrc: url, entryType: 'drop', role: 'none', label: '', ringColor: '#ffffff', ringWidth: getRingWidthFromLabel('M'), roleIcon: '', roleIconPosition: 'top', size: getSizeFromLabel('M') }]), 10);
    } else {
      onAddOrb({ imgSrc: newOrbUrl, size: getSizeFromLabel('M'), ringWidth: getRingWidthFromLabel('M') });
      setNewOrbUrl('');
      // Auto-save after adding
      setTimeout(() => autoSave([...orbs, { imgSrc: newOrbUrl, entryType: 'drop', role: 'none', label: '', ringColor: '#ffffff', ringWidth: getRingWidthFromLabel('M'), roleIcon: '', roleIconPosition: 'top', size: getSizeFromLabel('M') }]), 10);
    }
  }, [newOrbUrl, onAddOrb, orbs, autoSave, getSizeFromLabel, getRingWidthFromLabel]);

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
    // Auto-save empty array
    autoSave([]);
    console.log('Orbs cleared and auto-saved');
  }, [onClearAllOrbs, autoSave]);

  // Wrapper for update orb with auto-save
  const handleUpdateOrb = useCallback((orbId: string, updates: Partial<Orb>) => {
    onUpdateOrb(orbId, updates);
    // Auto-save after update
    setTimeout(() => {
      const updatedOrbs = orbs.map(orb => 
        orb.id === orbId ? { ...orb, ...updates } : orb
      );
      autoSave(updatedOrbs);
    }, 10);
  }, [onUpdateOrb, orbs, autoSave]);

  // Wrapper for remove orb with auto-save
  const handleRemoveOrb = useCallback((orbId: string) => {
    onRemoveOrb(orbId);
    // Auto-save after removal (need to filter out the removed orb)
    setTimeout(() => {
      const updatedOrbs = orbs.filter(orb => orb.id !== orbId);
      autoSave(updatedOrbs);
    }, 10);
  }, [onRemoveOrb, orbs, autoSave]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 3, 
          fontWeight: 'bold',
          color: '#1976d2',
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}
      >
        ✨ Orb Admin
      </Typography>
      
      {/* Actions - Horizontal line at the top */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Left side - Main actions */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button 
                variant={showPreview ? "contained" : "outlined"}
                startIcon={showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
                onClick={onTogglePreview}
                color={showPreview ? "secondary" : "primary"}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />}
                onClick={saveOrbs}
              >
                Save All
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<LoadIcon />}
                onClick={loadOrbs}
              >
                Load
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<ClearIcon />}
                onClick={clearOrbs}
                color="error"
              >
                Clear All
              </Button>
            </Box>

            {/* Right side - Add new orb */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 300 }}>
              <TextField
                label="New Orb URL"
                value={newOrbUrl}
                onChange={(e) => setNewOrbUrl(e.target.value)}
                placeholder="https://images.whatnot.com/..."
                size="small"
                sx={{ flex: 1 }}
              />
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleAddOrb}
                color="success"
                disabled={!newOrbUrl.trim()}
              >
                Add
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Current Orbs - Compact Grid Layout */}
      <Card sx={{ boxShadow: 3 }}>
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
                Add your first orb using the controls above!
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {orbs.map((orb, index) => (
                <Paper key={orb.id} sx={{ 
                  p: 2, 
                  backgroundColor: '#fafafa', 
                  border: '1px solid #e0e0e0',
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    flexWrap: 'wrap'
                  }}>
                    {/* Orb preview */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                      <Box
                        component="img"
                        src={orb.imgSrc}
                        alt={orb.label}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `2px solid ${orb.ringColor}`,
                          boxShadow: 1
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', minWidth: 30 }}>
                        #{index + 1}
                      </Typography>
                    </Box>

                    {/* Icon input */}
                    <TextField
                      label="Icon"
                      value={orb.roleIcon}
                      onChange={(e) => handleUpdateOrb(orb.id, { roleIcon: e.target.value })}
                      size="small"
                      sx={{ width: 80 }}
                    />

                    {/* Icon position grid selector */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                        Icon Pos
                      </Typography>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '2px',
                        width: '36px',
                        height: '36px'
                      }}>
                        {[
                          'top-left', 'top', 'top-right',
                          'left', 'center', 'right', 
                          'bottom-left', 'bottom', 'bottom-right'
                        ].map((position) => (
                          <Box
                            key={position}
                            onClick={() => handleUpdateOrb(orb.id, { roleIconPosition: position as any })}
                            sx={{
                              width: '10px',
                              height: '10px',
                              backgroundColor: orb.roleIconPosition === position ? '#1976d2' : '#e0e0e0',
                              cursor: 'pointer',
                              border: '1px solid #ccc',
                              '&:hover': {
                                backgroundColor: orb.roleIconPosition === position ? '#1565c0' : '#d0d0d0'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Ring color - smaller */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                        Ring Color
                      </Typography>
                      <TextField
                        type="color"
                        value={orb.ringColor}
                        onChange={(e) => handleUpdateOrb(orb.id, { ringColor: e.target.value })}
                        size="small"
                        sx={{ 
                          width: 50,
                          '& .MuiInputBase-input': { 
                            padding: '4px',
                            height: '24px',
                            cursor: 'pointer'
                          }
                        }}
                      />
                    </Box>

                    {/* Ring size buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                        Ring Size
                      </Typography>
                      <ButtonGroup size="small" variant="outlined">
                        {(['S', 'M', 'L'] as const).map((size) => (
                          <Button
                            key={size}
                            variant={getRingLabelFromValue(orb.ringWidth) === size ? 'contained' : 'outlined'}
                            onClick={() => handleUpdateOrb(orb.id, { ringWidth: getRingWidthFromLabel(size) })}
                            sx={{ minWidth: 32, px: 1 }}
                          >
                            {size}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </Box>

                    {/* Orb size buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                        Orb Size
                      </Typography>
                      <ButtonGroup size="small" variant="outlined">
                        {(['S', 'M', 'L'] as const).map((size) => (
                          <Button
                            key={size}
                            variant={getSizeLabelFromValue(orb.size) === size ? 'contained' : 'outlined'}
                            onClick={() => handleUpdateOrb(orb.id, { size: getSizeFromLabel(size) })}
                            sx={{ minWidth: 32, px: 1 }}
                          >
                            {size}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </Box>

                    {/* Spacer to push delete button to the right */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Delete button */}
                    <IconButton
                      onClick={() => handleRemoveOrb(orb.id)}
                      color="error"
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': { backgroundColor: '#ffebee' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrbAdminClean;
