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
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import LoadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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

const OrbAdmin: React.FC<OrbAdminProps> = ({
  orbs,
  onAddOrb,
  onUpdateOrb,
  onRemoveOrb,
  onClearAllOrbs,
  showPreview,
  onTogglePreview
}) => {
  // Form state for new orb
  const [newOrbConfig, setNewOrbConfig] = useState<OrbConfig>({
    imgSrc: '',
    entryType: 'drop',
    role: 'none',
    label: '',
    ringColor: '#ffffff',
    ringWidth: 4,
    roleIcon: '',
    roleIconPosition: 'bottom-right',
    size: 64
  });

  // Saved orbs
  const [savedOrbs, setSavedOrbs] = useState<SavedOrb[]>(() => {
    const saved = localStorage.getItem('savedOrbs');
    return saved ? JSON.parse(saved) : [];
  });

  // Export/Import state
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');

  // Selected orbs for batch operations
  const [selectedOrbs, setSelectedOrbs] = useState<Set<string>>(new Set());

  const handleAddOrb = useCallback(() => {
    onAddOrb(newOrbConfig);
  }, [newOrbConfig, onAddOrb]);

  const handleSaveOrb = useCallback(() => {
    const orbToSave: SavedOrb = {
      imgSrc: newOrbConfig.imgSrc || '',
      entryType: newOrbConfig.entryType || 'drop',
      role: newOrbConfig.role || 'none',
      label: newOrbConfig.label || '',
      ringColor: newOrbConfig.ringColor || '#ffffff',
      ringWidth: newOrbConfig.ringWidth || 4,
      roleIcon: newOrbConfig.roleIcon || '',
      roleIconPosition: newOrbConfig.roleIconPosition || 'bottom-right',
      size: newOrbConfig.size || 64
    };
    
    const newSavedOrbs = [...savedOrbs, orbToSave];
    setSavedOrbs(newSavedOrbs);
    localStorage.setItem('savedOrbs', JSON.stringify(newSavedOrbs));
  }, [newOrbConfig, savedOrbs]);

  const handleLoadSavedOrb = useCallback((savedOrb: SavedOrb) => {
    setNewOrbConfig(savedOrb);
  }, []);

  const handleDeleteSavedOrb = useCallback((index: number) => {
    const newSavedOrbs = savedOrbs.filter((_, i) => i !== index);
    setSavedOrbs(newSavedOrbs);
    localStorage.setItem('savedOrbs', JSON.stringify(newSavedOrbs));
  }, [savedOrbs]);

  const handleExportOrbs = useCallback(() => {
    const orbsToExport = orbs.map(orb => ({
      imgSrc: orb.imgSrc,
      entryType: orb.entryType,
      role: orb.role,
      label: orb.label,
      ringColor: orb.ringColor,
      ringWidth: orb.ringWidth,
      roleIcon: orb.roleIcon,
      roleIconPosition: orb.roleIconPosition,
      size: orb.size
    }));
    setExportData(JSON.stringify(orbsToExport, null, 2));
  }, [orbs]);

  const handleImportOrbs = useCallback(() => {
    try {
      const importedOrbs = JSON.parse(importData);
      if (Array.isArray(importedOrbs)) {
        onClearAllOrbs();
        importedOrbs.forEach((orbConfig: any) => {
          onAddOrb(orbConfig);
        });
        setImportData('');
      }
    } catch (error) {
      console.error('Error importing orbs:', error);
    }
  }, [importData, onAddOrb, onClearAllOrbs]);

  const handleAddMultipleOrbs = useCallback((count: number) => {
    for (let i = 0; i < count; i++) {
      onAddOrb({
        ...newOrbConfig,
        label: newOrbConfig.label ? `${newOrbConfig.label} ${i + 1}` : `Orb ${i + 1}`
      });
    }
  }, [newOrbConfig, onAddOrb]);

  const handleSelectOrb = useCallback((orbId: string, selected: boolean) => {
    const newSelected = new Set(selectedOrbs);
    if (selected) {
      newSelected.add(orbId);
    } else {
      newSelected.delete(orbId);
    }
    setSelectedOrbs(newSelected);
  }, [selectedOrbs]);

  const handleSelectAllOrbs = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedOrbs(new Set(orbs.map(orb => orb.id)));
    } else {
      setSelectedOrbs(new Set());
    }
  }, [orbs]);

  const handleBatchUpdate = useCallback((updates: Partial<Orb>) => {
    selectedOrbs.forEach(orbId => {
      onUpdateOrb(orbId, updates);
    });
  }, [selectedOrbs, onUpdateOrb]);

  const handleBatchDelete = useCallback(() => {
    selectedOrbs.forEach(orbId => {
      onRemoveOrb(orbId);
    });
    setSelectedOrbs(new Set());
  }, [selectedOrbs, onRemoveOrb]);

  const toggleOrbParticipation = useCallback((orbId: string) => {
    const orb = orbs.find(o => o.id === orbId);
    if (orb) {
      onUpdateOrb(orbId, { gameParticipant: !orb.gameParticipant });
    }
  }, [orbs, onUpdateOrb]);

  const selectedCount = selectedOrbs.size;
  const allSelected = selectedCount === orbs.length && orbs.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < orbs.length;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Orb Management
        </Typography>
        <Button
          variant="outlined"
          onClick={onTogglePreview}
          startIcon={showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </Stack>

      {/* Add New Orb */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add New Orb
          </Typography>
          
          <Stack spacing={2}>
            <TextField
              label="Image URL"
              value={newOrbConfig.imgSrc || ''}
              onChange={(e) => setNewOrbConfig({ ...newOrbConfig, imgSrc: e.target.value })}
              fullWidth
              helperText="URL to the image for this orb"
            />
            
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Entry Type</InputLabel>
                <Select
                  value={newOrbConfig.entryType || 'drop'}
                  label="Entry Type"
                  onChange={(e) => setNewOrbConfig({ ...newOrbConfig, entryType: e.target.value as 'drop' | 'toss' })}
                >
                  <MenuItem value="drop">Drop</MenuItem>
                  <MenuItem value="toss">Toss</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newOrbConfig.role || 'none'}
                  label="Role"
                  onChange={(e) => setNewOrbConfig({ ...newOrbConfig, role: e.target.value as any })}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="mod">Mod</MenuItem>
                  <MenuItem value="lurker">Lurker</MenuItem>
                  <MenuItem value="passerby">Passerby</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            
            <TextField
              label="Label"
              value={newOrbConfig.label || ''}
              onChange={(e) => setNewOrbConfig({ ...newOrbConfig, label: e.target.value })}
              fullWidth
            />
            
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Ring Color"
                type="color"
                value={newOrbConfig.ringColor || '#ffffff'}
                onChange={(e) => setNewOrbConfig({ ...newOrbConfig, ringColor: e.target.value })}
                sx={{ width: 100 }}
              />
              
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>Ring Width: {newOrbConfig.ringWidth}</Typography>
                <Slider
                  value={newOrbConfig.ringWidth || 4}
                  onChange={(_, value) => setNewOrbConfig({ ...newOrbConfig, ringWidth: value as number })}
                  min={0}
                  max={20}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={2}>
              <TextField
                label="Role Icon"
                value={newOrbConfig.roleIcon || ''}
                onChange={(e) => setNewOrbConfig({ ...newOrbConfig, roleIcon: e.target.value })}
                helperText="Emoji or text to display"
              />
              
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Icon Position</InputLabel>
                <Select
                  value={newOrbConfig.roleIconPosition || 'bottom-right'}
                  label="Icon Position"
                  onChange={(e) => setNewOrbConfig({ ...newOrbConfig, roleIconPosition: e.target.value as any })}
                >
                  <MenuItem value="top">Top</MenuItem>
                  <MenuItem value="bottom">Bottom</MenuItem>
                  <MenuItem value="left">Left</MenuItem>
                  <MenuItem value="right">Right</MenuItem>
                  <MenuItem value="center">Center</MenuItem>
                  <MenuItem value="top-left">Top Left</MenuItem>
                  <MenuItem value="top-right">Top Right</MenuItem>
                  <MenuItem value="bottom-left">Bottom Left</MenuItem>
                  <MenuItem value="bottom-right">Bottom Right</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            
            <Box>
              <Typography gutterBottom>Size: {newOrbConfig.size}px</Typography>
              <Slider
                value={newOrbConfig.size || 64}
                onChange={(_, value) => setNewOrbConfig({ ...newOrbConfig, size: value as number })}
                min={16}
                max={128}
                step={1}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleAddOrb}
                startIcon={<AddIcon />}
              >
                Add Orb
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleSaveOrb}
                startIcon={<SaveIcon />}
              >
                Save Template
              </Button>
              
              <ButtonGroup>
                <Button onClick={() => handleAddMultipleOrbs(5)}>Add 5</Button>
                <Button onClick={() => handleAddMultipleOrbs(10)}>Add 10</Button>
                <Button onClick={() => handleAddMultipleOrbs(20)}>Add 20</Button>
              </ButtonGroup>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Saved Orb Templates */}
      {savedOrbs.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Saved Orb Templates
            </Typography>
            
            <Stack spacing={1}>
              {savedOrbs.map((savedOrb, index) => (
                <Paper key={index} sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">
                        {savedOrb.label || 'Unnamed Orb'} • {savedOrb.role} • {savedOrb.size}px
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {savedOrb.entryType} • Ring: {savedOrb.ringColor}
                      </Typography>
                    </Box>
                    
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        onClick={() => handleLoadSavedOrb(savedOrb)}
                        startIcon={<LoadIcon />}
                      >
                        Load
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSavedOrb(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Export/Import */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export/Import Orbs
          </Typography>
          
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={handleExportOrbs}
                disabled={orbs.length === 0}
              >
                Export Current Orbs
              </Button>
            </Stack>
            
            {exportData && (
              <TextField
                label="Exported Orb Data"
                multiline
                rows={4}
                value={exportData}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            )}
            
            <TextField
              label="Import Orb Data"
              multiline
              rows={4}
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              fullWidth
              placeholder="Paste exported orb JSON data here"
            />
            
            <Button
              variant="contained"
              onClick={handleImportOrbs}
              disabled={!importData.trim()}
            >
              Import Orbs
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Batch Operations */}
      {orbs.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Batch Operations
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleSelectAllOrbs(e.target.checked)}
                  />
                }
                label={`Select All (${selectedCount} selected)`}
              />
              
              {selectedCount > 0 && (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2">Batch Ring Color:</Typography>
                    <TextField
                      type="color"
                      size="small"
                      onChange={(e) => handleBatchUpdate({ ringColor: e.target.value })}
                      sx={{ width: 80 }}
                    />
                    
                    <Typography variant="body2">Ring Width:</Typography>
                    <Slider
                      value={4}
                      onChange={(_, value) => handleBatchUpdate({ ringWidth: value as number })}
                      min={0}
                      max={20}
                      step={1}
                      sx={{ width: 100 }}
                    />
                  </Stack>
                  
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleBatchDelete}
                    >
                      Delete Selected ({selectedCount})
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => handleBatchUpdate({ gameParticipant: true })}
                    >
                      Set as Participants
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => handleBatchUpdate({ gameParticipant: false })}
                    >
                      Set as Audience
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Current Orbs */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Current Orbs ({orbs.length})
            </Typography>
            
            <Button
              variant="outlined"
              color="error"
              onClick={onClearAllOrbs}
              startIcon={<ClearIcon />}
              disabled={orbs.length === 0}
            >
              Clear All
            </Button>
          </Stack>
          
          {orbs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No orbs currently active. Add some orbs to get started!
            </Typography>
          ) : (
            <Stack spacing={1}>
              {orbs.map((orb, index) => (
                <Paper key={orb.id} sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Checkbox
                        checked={selectedOrbs.has(orb.id)}
                        onChange={(e) => handleSelectOrb(orb.id, e.target.checked)}
                      />
                      
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            #{index + 1} • {orb.label || 'Unnamed'} • {orb.role} • {orb.size}px
                          </Typography>
                          
                          <Chip
                            label={orb.gameParticipant ? 'Participant' : 'Audience'}
                            size="small"
                            color={orb.gameParticipant ? 'primary' : 'default'}
                            onClick={() => toggleOrbParticipation(orb.id)}
                            clickable
                          />
                        </Stack>
                        
                        <Typography variant="caption" color="text.secondary">
                          Position: ({Math.round(orb.x)}, {Math.round(orb.y)}) • 
                          Velocity: ({orb.velocityX.toFixed(1)}, {orb.velocityY.toFixed(1)}) • 
                          State: {orb.onGround ? 'Ground' : 'Air'}
                          {orb.pachinkoScore && ` • Score: ${orb.pachinkoScore}`}
                        </Typography>
                      </Box>
                    </Stack>
                    
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 100 }}>
                        <Typography variant="caption">Size</Typography>
                        <Slider
                          value={orb.size}
                          onChange={(_, value) => onUpdateOrb(orb.id, { size: value as number })}
                          min={16}
                          max={128}
                          step={1}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ width: 80 }}>
                        <Typography variant="caption">Ring Width</Typography>
                        <Slider
                          value={orb.ringWidth}
                          onChange={(_, value) => onUpdateOrb(orb.id, { ringWidth: value as number })}
                          min={0}
                          max={20}
                          step={1}
                          size="small"
                        />
                      </Box>
                      
                      <TextField
                        type="color"
                        value={orb.ringColor}
                        onChange={(e) => onUpdateOrb(orb.id, { ringColor: e.target.value })}
                        size="small"
                        sx={{ width: 50 }}
                      />
                      
                      <IconButton
                        size="small"
                        onClick={() => onRemoveOrb(orb.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrbAdmin;
