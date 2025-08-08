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
  Paper,
  Stack,
  Slider,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import LoadIcon from '@mui/icons-material/Download';
import type { Orb, SavedOrb, OrbConfig, PachinkoConfig } from '../types/orb';

interface OrbAdminProps {
  orbs: Orb[];
  onAddOrb: (config: OrbConfig) => void;
  onUpdateOrb: (id: string, updates: Partial<Orb>) => void;
  onRemoveOrb: (id: string) => void;
  onClearAllOrbs?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  animationMode?: string;
  pachinkoConfig?: any;
  onGetPachinkoConfig?: () => any;
  onUpdatePachinkoConfig?: (updates: any) => void;
  onRerunOrbThroughPachinko?: (orbId: string) => void;
}

const OrbAdminSimple: React.FC<OrbAdminProps> = ({
  orbs,
  onAddOrb,
  onUpdateOrb,
  onRemoveOrb,
  onClearAllOrbs,
  showPreview,
  onTogglePreview,
  animationMode,
  onGetPachinkoConfig,
  onUpdatePachinkoConfig,
  onRerunOrbThroughPachinko
}) => {
  const [newOrbUrl, setNewOrbUrl] = useState('');
  
  // Pachinko configuration state
  const [pachinkoConfig, setPachinkoConfig] = useState<PachinkoConfig>(() => 
    onGetPachinkoConfig ? onGetPachinkoConfig() : { 
      rows: 8, 
      bounciness: 0.8, 
      dragX: 0.92, 
      dragY: 0.96,
      bowlCount: 11,
      bowlValues: [5, 20, 50, 100, 1000, 2000, 1000, 100, 50, 20, 5],
      bowlColors: ['#87CEEB', '#32CD32', '#32CD32', '#FF4500', '#FFD700', '#FFD700', '#FFD700', '#FF4500', '#32CD32', '#32CD32', '#87CEEB'],
      bowlWidthPattern: 5
    }
  );

  // Handler for updating pachinko config
  const handlePachinkoConfigChange = useCallback((field: keyof PachinkoConfig, value: number) => {
    const newConfig = { ...pachinkoConfig, [field]: value };
    setPachinkoConfig(newConfig);
    if (onUpdatePachinkoConfig) {
      onUpdatePachinkoConfig({ [field]: value });
    }
  }, [pachinkoConfig, onUpdatePachinkoConfig]);
  
  // Size mappings
  const getSizeFromLabel = (label: 'XS' | 'S' | 'M' | 'L'): number => {
    switch (label) {
      case 'XS': return 16;
      case 'S': return 48;
      case 'M': return 80;
      case 'L': return 120;
      default: return 80;
    }
  };
  
  const getSizeLabelFromValue = (size: number): 'XS' | 'S' | 'M' | 'L' => {
    if (size <= 24) return 'XS';
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
      size: orb.size,
      gameParticipant: orb.gameParticipant || false
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
      onAddOrb({ imgSrc: url, ringWidth: getRingWidthFromLabel('M') });
      // Auto-save after adding
      setTimeout(() => autoSave([...orbs, { imgSrc: url, entryType: 'drop', role: 'none', label: '', ringColor: '#ffffff', ringWidth: getRingWidthFromLabel('M'), roleIcon: '', roleIconPosition: 'top', size: getSizeFromLabel('M'), gameParticipant: false }]), 10);
    } else {
      onAddOrb({ imgSrc: newOrbUrl, ringWidth: getRingWidthFromLabel('M') });
      setNewOrbUrl('');
      // Auto-save after adding
      setTimeout(() => autoSave([...orbs, { imgSrc: newOrbUrl, entryType: 'drop', role: 'none', label: '', ringColor: '#ffffff', ringWidth: getRingWidthFromLabel('M'), roleIcon: '', roleIconPosition: 'top', size: getSizeFromLabel('M'), gameParticipant: false }]), 10);
    }
  }, [newOrbUrl, onAddOrb, orbs, autoSave, getSizeFromLabel, getRingWidthFromLabel]);

  const loadOrbs = useCallback(() => {
    const data = localStorage.getItem('orbData');
    if (data) {
      const saved: SavedOrb[] = JSON.parse(data);
      console.log('Loading orbs:', saved);
      if (onClearAllOrbs) {
        onClearAllOrbs();
      }
      saved.forEach(orbData => {
        onAddOrb(orbData);
      });
    }
  }, [onAddOrb, onClearAllOrbs]);

  const clearOrbs = useCallback(() => {
    if (onClearAllOrbs) {
      onClearAllOrbs();
    }
    // Auto-save empty array
    autoSave([]);
    console.log('Orbs cleared and auto-saved');
  }, [onClearAllOrbs, autoSave]);

  // Export orbs to JSON file
  const exportOrbs = useCallback(() => {
    const exportData = {
      orbs: orbs.map(orb => ({
        imgSrc: orb.imgSrc,
        entryType: orb.entryType,
        role: orb.role,
        label: orb.label,
        ringColor: orb.ringColor,
        ringWidth: orb.ringWidth,
        roleIcon: orb.roleIcon,
        roleIconPosition: orb.roleIconPosition,
        size: orb.size,
        gameParticipant: orb.gameParticipant || false
      })),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `orbs-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Orbs exported to file:', exportData.orbs.length, 'orbs');
  }, [orbs]);

  // Import orbs from JSON file
  const importOrbs = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          if (!importData.orbs || !Array.isArray(importData.orbs)) {
            alert('Invalid orb backup file format');
            return;
          }
          
          console.log('Importing orbs:', importData.orbs.length);
          
          // Clear existing orbs and add imported ones
          if (onClearAllOrbs) {
            onClearAllOrbs();
          }
          importData.orbs.forEach((orbData: any) => {
            onAddOrb(orbData);
          });
          
          // Auto-save the imported data
          setTimeout(() => autoSave(importData.orbs), 100);
          
          alert(`Successfully imported ${importData.orbs.length} orbs!`);
        } catch (error) {
          console.error('Import failed:', error);
          alert('Failed to import orbs. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onClearAllOrbs, onAddOrb, autoSave]);

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
              
              <Button 
                variant="outlined"
                onClick={exportOrbs}
                color="primary"
              >
                Export Orbs
              </Button>
              
              <Button 
                variant="outlined"
                onClick={importOrbs}
                color="secondary"
              >
                Import Orbs
              </Button>
              
              {/* Batch Game Participant Actions */}
              <Button 
                variant="outlined"
                onClick={() => {
                  orbs.forEach(orb => {
                    if (!orb.gameParticipant) {
                      handleUpdateOrb(orb.id, { gameParticipant: true });
                    }
                  });
                }}
                color="success"
                size="small"
              >
                All Participate
              </Button>
              
              <Button 
                variant="outlined"
                onClick={() => {
                  orbs.forEach(orb => {
                    if (orb.gameParticipant) {
                      handleUpdateOrb(orb.id, { gameParticipant: false });
                    }
                  });
                }}
                color="warning"
                size="small"
              >
                None Participate
              </Button>
              
              {/* Re-run all participants for applicable games */}
              {(animationMode === 'pachinko' || animationMode === 'duckrace') && onRerunOrbThroughPachinko && (
                <Button 
                  variant="contained"
                  onClick={() => {
                    orbs.filter(orb => orb.gameParticipant).forEach(orb => {
                      if (onRerunOrbThroughPachinko) {
                        onRerunOrbThroughPachinko(orb.id);
                      }
                    });
                  }}
                  color="primary"
                  size="small"
                >
                  🎯 Re-run All Participants
                </Button>
              )}
              
              {/* Make All XS - useful for all game modes */}
              <Button 
                variant="outlined" 
                onClick={() => {
                  // Set all orbs to XS size
                  orbs.forEach(orb => {
                    if (orb.size > 16) {
                      handleUpdateOrb(orb.id, { size: 16 });
                    }
                  });
                }}
                size="small"
                color="warning"
              >
                🔽 All XS
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

      {/* Pachinko Controls - Only shown in pachinko mode */}
      {animationMode === 'pachinko' && (
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#e67e22', fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
              🎯 Pachinko Settings
            </Typography>
            
            {/* Basic Physics Controls */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>Physics</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
              {/* Rows */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Peg Rows: {pachinkoConfig.rows}
                </Typography>
                <Slider
                  value={pachinkoConfig.rows}
                  onChange={(_, value) => handlePachinkoConfigChange('rows', value as number)}
                  min={3}
                  max={15}
                  step={1}
                  marks={[
                    { value: 3, label: '3' },
                    { value: 8, label: '8' },
                    { value: 15, label: '15' }
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ color: '#e67e22' }}
                />
              </Box>

              {/* Bounciness */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Bounciness: {pachinkoConfig.bounciness.toFixed(2)}
                </Typography>
                <Slider
                  value={pachinkoConfig.bounciness}
                  onChange={(_, value) => handlePachinkoConfigChange('bounciness', value as number)}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  marks={[
                    { value: 0.1, label: 'Low' },
                    { value: 0.8, label: 'Normal' },
                    { value: 2.0, label: 'High' }
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ color: '#e74c3c' }}
                />
              </Box>

              {/* Horizontal Drag */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  H-Drag: {pachinkoConfig.dragX.toFixed(3)}
                </Typography>
                <Slider
                  value={pachinkoConfig.dragX}
                  onChange={(_, value) => handlePachinkoConfigChange('dragX', value as number)}
                  min={0.8}
                  max={0.99}
                  step={0.01}
                  marks={[
                    { value: 0.8, label: 'Heavy' },
                    { value: 0.92, label: 'Normal' },
                    { value: 0.99, label: 'Light' }
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ color: '#3498db' }}
                />
              </Box>

              {/* Vertical Drag */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  V-Drag: {pachinkoConfig.dragY.toFixed(3)}
                </Typography>
                <Slider
                  value={pachinkoConfig.dragY}
                  onChange={(_, value) => handlePachinkoConfigChange('dragY', value as number)}
                  min={0.8}
                  max={0.99}
                  step={0.01}
                  marks={[
                    { value: 0.8, label: 'Heavy' },
                    { value: 0.96, label: 'Normal' },
                    { value: 0.99, label: 'Light' }
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ color: '#9b59b6' }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Bowl Configuration */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>Bowl Configuration</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
              {/* Bowl Count */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Bowl Count: {pachinkoConfig.bowlCount}
                </Typography>
                <Slider
                  value={pachinkoConfig.bowlCount}
                  onChange={(_, value) => {
                    const newCount = value as number;
                    // Generate new values and colors for new count
                    const center = Math.floor(newCount / 2);
                    const newValues = Array(newCount).fill(0).map((_, i) => {
                      const distance = Math.abs(i - center);
                      if (distance === 0) return 1000;
                      else if (distance === 1) return 500;
                      else if (distance === 2) return 100;
                      else return 10;
                    });
                    const newColors = Array(newCount).fill(0).map((_, i) => {
                      const distance = Math.abs(i - center);
                      if (distance === 0) return '#FFD700'; // Gold center
                      else if (distance === 1) return '#FF4500'; // Orange
                      else if (distance === 2) return '#32CD32'; // Green
                      else return '#87CEEB'; // Blue
                    });
                    
                    const newConfig = { 
                      ...pachinkoConfig, 
                      bowlCount: newCount,
                      bowlValues: newValues,
                      bowlColors: newColors
                    };
                    setPachinkoConfig(newConfig);
                    if (onUpdatePachinkoConfig) {
                      onUpdatePachinkoConfig({ 
                        bowlCount: newCount,
                        bowlValues: newValues,
                        bowlColors: newColors,
                        bowlWidthPattern: pachinkoConfig.bowlWidthPattern
                      });
                    }
                  }}
                  min={5}
                  max={15}
                  step={2} // Force odd numbers
                  marks={[
                    { value: 5, label: '5' },
                    { value: 7, label: '7' },
                    { value: 9, label: '9' },
                    { value: 11, label: '11' },
                    { value: 13, label: '13' },
                    { value: 15, label: '15' }
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ color: '#e67e22' }}
                />
              </Box>

              {/* Bowl Width Pattern */}
              <Box>
                <FormControl fullWidth size="small">
                  <InputLabel>Bowl Width Pattern</InputLabel>
                  <Select
                    value={pachinkoConfig.bowlWidthPattern}
                    label="Bowl Width Pattern"
                    onChange={(e) => {
                      const newPattern = e.target.value as number;
                      const newConfig = { ...pachinkoConfig, bowlWidthPattern: newPattern };
                      setPachinkoConfig(newConfig);
                      if (onUpdatePachinkoConfig) {
                        onUpdatePachinkoConfig({ bowlWidthPattern: newPattern });
                      }
                    }}
                  >
                    <MenuItem value={5}>Tiny Center (5-step)</MenuItem>
                    <MenuItem value={7}>Small Center (7-step)</MenuItem>
                    <MenuItem value={9}>Medium Center (9-step)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Bowl Values */}
            <Typography variant="subtitle2" gutterBottom>
              Bowl Values (0 = no score):
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {pachinkoConfig.bowlValues.map((value, index) => (
                <TextField
                  key={index}
                  size="small"
                  type="number"
                  value={value}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const newValues = [...pachinkoConfig.bowlValues];
                    newValues[index] = newValue;
                    const newConfig = { ...pachinkoConfig, bowlValues: newValues };
                    setPachinkoConfig(newConfig);
                    if (onUpdatePachinkoConfig) {
                      onUpdatePachinkoConfig({ bowlValues: newValues });
                    }
                  }}
                  sx={{ width: 80 }}
                  inputProps={{ min: 0, max: 9999 }}
                />
              ))}
            </Box>

            {/* Bowl Colors */}
            <Typography variant="subtitle2" gutterBottom>
              Bowl Ring Colors:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {pachinkoConfig.bowlColors.map((color, index) => (
                <TextField
                  key={index}
                  size="small"
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    const newColors = [...pachinkoConfig.bowlColors];
                    newColors[index] = newColor;
                    const newConfig = { ...pachinkoConfig, bowlColors: newColors };
                    setPachinkoConfig(newConfig);
                    if (onUpdatePachinkoConfig) {
                      onUpdatePachinkoConfig({ bowlColors: newColors });
                    }
                  }}
                  sx={{ 
                    width: 60,
                    '& .MuiInputBase-input': { 
                      padding: '4px',
                      height: '32px',
                      cursor: 'pointer'
                    }
                  }}
                />
              ))}
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              💡 <strong>Tip:</strong> More rows = longer play time, Higher bounciness = more chaos, Less drag = faster movement. Set bowl value to 0 for no scoring.
            </Typography>
          </CardContent>
        </Card>
      )}

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
                        {(['XS', 'S', 'M', 'L'] as const).map((size) => (
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

                    {/* Game Participant Toggle */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                        Participant
                      </Typography>
                      <Button
                        variant={orb.gameParticipant ? 'contained' : 'outlined'}
                        color={orb.gameParticipant ? 'success' : 'secondary'}
                        size="small"
                        onClick={() => handleUpdateOrb(orb.id, { gameParticipant: !orb.gameParticipant })}
                        sx={{ minWidth: 70, px: 1 }}
                      >
                        {orb.gameParticipant ? '✓ Yes' : '✗ No'}
                      </Button>
                    </Box>

                    {/* Spacer to push action buttons to the right */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Pachinko re-run button (only in pachinko mode) */}
                    {animationMode === 'pachinko' && onRerunOrbThroughPachinko && (
                      <Button
                        onClick={() => onRerunOrbThroughPachinko(orb.id)}
                        variant="outlined"
                        size="small"
                        sx={{ 
                          minWidth: 'auto',
                          px: 1,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': { backgroundColor: '#fff3e0' }
                        }}
                      >
                        🎯
                      </Button>
                    )}

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

export default OrbAdminSimple;
