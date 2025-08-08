// @ts-ignore - React needed for JSX in AdminComponent
import React from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button,
  Card,
  CardContent
} from '@mui/material';
import type { GamePlugin, GameConfig, GameState } from './types';
import type { Orb } from '../types/orb';

export interface DuckRaceConfig extends GameConfig {
  raceDistance: number;
  laneCount: number;
  raceSpeed: number;
  enableTurbulence: boolean;
  turbulenceStrength: number;
  laneColors: string[]; // Individual lane colors
}

export interface DuckRaceState extends GameState {
  isRacing: boolean;
  raceProgress: Record<string, number>; // orbId -> progress (0-1)
  finishPositions: string[]; // array of orbIds in finish order
  winner?: string;
  lanes: Record<string, number>; // orbId -> lane number
  config: DuckRaceConfig;
}

const defaultDuckRaceConfig: DuckRaceConfig = {
  raceDistance: 500,
  laneCount: 4,
  raceSpeed: 2,
  enableTurbulence: true,
  turbulenceStrength: 0.5,
  laneColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347', '#98D8C8']
};

let currentDuckRaceConfig: DuckRaceConfig = { ...defaultDuckRaceConfig };

const DuckRaceGame: GamePlugin = {
  id: 'duckrace',
  name: 'Duck Race',
  description: 'Orbs race horizontally across the screen in lanes',

  initialize: (currentOrbs: Orb[]) => {
    const participantOrbs = currentOrbs.filter(orb => orb.gameParticipant);
    const config = defaultDuckRaceConfig;
    
    // Calculate responsive lane spacing based on screen width
    const canvasWidth = 800; // Assuming typical canvas width
    const laneSpacing = Math.min(120, (canvasWidth - 200) / config.laneCount);
    
    const updatedOrbs = currentOrbs.map(orb => {
      if (!orb.gameParticipant) return orb;
      
      const participantIndex = participantOrbs.findIndex(p => p.id === orb.id);
      const laneNumber = participantIndex % config.laneCount;
      
      return {
        ...orb,
        x: 100 + (laneNumber * laneSpacing), // Responsive lane spacing
        y: 50, // Start at top
        vx: 0,
        vy: 0,
      };
    });

    const state: DuckRaceState = {
      isRacing: false,
      raceProgress: participantOrbs.reduce((acc, orb) => {
        acc[orb.id] = 0;
        return acc;
      }, {} as Record<string, number>),
      finishPositions: [],
      lanes: participantOrbs.reduce((acc, orb, index) => {
        acc[orb.id] = index % config.laneCount;
        return acc;
      }, {} as Record<string, number>),
      config: defaultDuckRaceConfig,
    };

    return { orbs: updatedOrbs, state };
  },

  handleAddOrb: (orb: Orb, currentOrbs: Orb[], state: GameState) => {
    const duckState = state as DuckRaceState;
    
    // Only add orbs marked as participants
    if (!orb.gameParticipant) return { orb, state };

    const participantOrbs = currentOrbs.filter(o => o.gameParticipant);
    const laneNumber = participantOrbs.length % (duckState.config?.laneCount || 4);
    
    // Calculate responsive lane spacing
    const canvasWidth = 800;
    const laneSpacing = Math.min(120, (canvasWidth - 200) / (duckState.config?.laneCount || 4));
    
    // Position orb at the start line in their assigned lane
    const updatedOrb = {
      ...orb,
      x: 100 + (laneNumber * laneSpacing), // Responsive lane spacing
      y: 50, // Start at top
      vx: 0,
      vy: 0,
    };

    const updatedState = {
      ...duckState,
      lanes: {
        ...duckState.lanes,
        [orb.id]: laneNumber,
      },
      raceProgress: {
        ...duckState.raceProgress,
        [orb.id]: 0,
      },
    };

    return { orb: updatedOrb, state: updatedState };
  },

  update: (orbs: Orb[], state: GameState) => {
    const duckState = state as DuckRaceState;
    const config = { ...defaultDuckRaceConfig, ...duckState.config, ...currentDuckRaceConfig };
    
    // Handle race start trigger - only if we have the trigger and not already racing
    if (currentDuckRaceConfig.triggerStart && !duckState.isRacing) {
      console.log('Starting Duck Race!', orbs.filter(o => o.gameParticipant).length);
      // Clear the trigger immediately to prevent loops
      currentDuckRaceConfig.triggerStart = false;
      
      const updatedState: DuckRaceState = {
        ...duckState,
        isRacing: true,
        raceProgress: Object.keys(duckState.lanes).reduce((acc, orbId) => {
          acc[orbId] = 0;
          return acc;
        }, {} as Record<string, number>),
        finishPositions: [],
        winner: undefined,
        config: { ...config, triggerStart: false }
      };
      
      // Reset orb positions to start line
      const canvasWidth = 800;
      const laneSpacing = Math.min(120, (canvasWidth - 200) / config.laneCount);
      
      const resetOrbs = orbs.map(orb => {
        if (orb.gameParticipant && duckState.lanes[orb.id] !== undefined) {
          const lane = duckState.lanes[orb.id];
          return {
            ...orb,
            x: 100 + (lane * laneSpacing), // Responsive lane spacing
            y: 50, // Start at top
            vx: 0,
            vy: 0,
          };
        }
        return orb;
      });
      
      return { orbs: resetOrbs, state: updatedState };
    }
    
    // Handle race reset trigger
    if (currentDuckRaceConfig.triggerReset) {
      console.log('Resetting Duck Race!', orbs.filter(o => o.gameParticipant).length);
      // Clear the trigger immediately to prevent loops
      currentDuckRaceConfig.triggerReset = false;
      
      const updatedState: DuckRaceState = {
        ...duckState,
        isRacing: false,
        raceProgress: Object.keys(duckState.lanes).reduce((acc, orbId) => {
          acc[orbId] = 0;
          return acc;
        }, {} as Record<string, number>),
        finishPositions: [],
        winner: undefined,
        config: { ...config, triggerReset: false }
      };
      
      // Reset orb positions to start line
      const canvasWidth = 800;
      const laneSpacing = Math.min(120, (canvasWidth - 200) / config.laneCount);
      
      const resetOrbs = orbs.map(orb => {
        if (orb.gameParticipant && duckState.lanes[orb.id] !== undefined) {
          const lane = duckState.lanes[orb.id];
          return {
            ...orb,
            x: 100 + (lane * laneSpacing), // Responsive lane spacing
            y: 50, // Start at top
            vx: 0,
            vy: 0,
          };
        }
        return orb;
      });
      
      return { orbs: resetOrbs, state: updatedState };
    }
    
    if (!duckState.isRacing) return { orbs, state };

    const updatedOrbs = orbs.map(orb => {
      if (!orb.gameParticipant || duckState.finishPositions.includes(orb.id)) {
        return orb;
      }

      const currentProgress = duckState.raceProgress[orb.id] || 0;
      const lane = duckState.lanes[orb.id] || 0;

      // Base movement
      let speed = config.raceSpeed;
      
      // Add some randomness/turbulence
      if (config.enableTurbulence) {
        speed += (Math.random() - 0.5) * config.turbulenceStrength;
      }

      const deltaTime = 16; // Assume 60fps
      const newProgress = Math.min(1, currentProgress + (speed * deltaTime) / 1000);
      const newY = 50 + (newProgress * config.raceDistance); // Move vertically down

      // Calculate responsive lane spacing
      const canvasWidth = 800;
      const laneSpacing = Math.min(120, (canvasWidth - 200) / config.laneCount);

      return {
        ...orb,
        x: 100 + (lane * laneSpacing) + (config.enableTurbulence ? (Math.sin(Date.now() * 0.01 + orb.id.length) * 20) : 0), // Lane position with turbulence
        y: newY,
      };
    });

    // Update race progress and check for finishers
    const updatedProgress = { ...duckState.raceProgress };
    const newFinishers: string[] = [];

    updatedOrbs.forEach(orb => {
      if (orb.gameParticipant && !duckState.finishPositions.includes(orb.id)) {
        const progress = (orb.y - 50) / config.raceDistance; // Vertical progress
        updatedProgress[orb.id] = progress;
        
        if (progress >= 1 && !duckState.finishPositions.includes(orb.id)) {
          newFinishers.push(orb.id);
        }
      }
    });

    const updatedFinishPositions = [...duckState.finishPositions, ...newFinishers];
    const isRaceComplete = updatedFinishPositions.length >= updatedOrbs.filter(o => o.gameParticipant).length;

    const updatedState: DuckRaceState = {
      ...duckState,
      raceProgress: updatedProgress,
      finishPositions: updatedFinishPositions,
      winner: updatedFinishPositions.length > 0 ? updatedFinishPositions[0] : duckState.winner,
      isRacing: !isRaceComplete,
      config
    };

    return { orbs: updatedOrbs, state: updatedState };
  },

  render: (ctx: CanvasRenderingContext2D, orbs: Orb[], state: GameState) => {
    const duckState = state as DuckRaceState;
    const config = { ...defaultDuckRaceConfig, ...duckState.config, ...currentDuckRaceConfig };
    
    // Calculate responsive lane spacing
    const canvasWidth = ctx.canvas.width || 800;
    const laneSpacing = Math.min(120, (canvasWidth - 200) / config.laneCount);
    
    // Draw race track lanes (vertical)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < config.laneCount; i++) {
      const x = 100 + (i * laneSpacing);
      const laneColor = config.laneColors?.[i] || '#333';
      
      // Draw lane line
      ctx.strokeStyle = laneColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + (laneSpacing/2), 50); // Center line of each lane
      ctx.lineTo(x + (laneSpacing/2), 50 + config.raceDistance);
      ctx.stroke();
      
      // Draw lane background with slight transparency
      ctx.fillStyle = laneColor + '20'; // Add alpha for transparency
      ctx.fillRect(x, 50, laneSpacing, config.raceDistance);
    }

    // Draw start and finish lines (horizontal)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(50 + (config.laneCount * laneSpacing), 50);
    ctx.stroke();

    ctx.strokeStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(50, 50 + config.raceDistance);
    ctx.lineTo(50 + (config.laneCount * laneSpacing), 50 + config.raceDistance);
    ctx.stroke();

    // Draw lane numbers
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    for (let i = 0; i < config.laneCount; i++) {
      const x = 100 + (i * laneSpacing);
      ctx.fillText(`Lane ${i + 1}`, x + (laneSpacing/2) - 20, 40);
    }

    // Show race status
    ctx.fillStyle = '#000';
    ctx.font = '18px Arial';
    if (duckState.isRacing) {
      ctx.fillText('🏁 Racing...', 50, 25);
    } else if (duckState.winner) {
      ctx.fillText(`🏆 Winner: Lane ${(duckState.lanes[duckState.winner] || 0) + 1}`, 50, 25);
    } else {
      ctx.fillText('Duck Race - Click "Start Race" to begin', 50, 25);
    }

    // Show progress bars and orb images for participants
    orbs.filter(o => o.gameParticipant).forEach(orb => {
      const progress = duckState.raceProgress[orb.id] || 0;
      const lane = duckState.lanes[orb.id] || 0;
      const x = 100 + (lane * laneSpacing);
      const laneColor = config.laneColors?.[lane] || '#4CAF50';
      
      // Progress bar background (vertical)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 20, 50, 10, config.raceDistance);
      
      // Progress bar fill (vertical) - use lane color
      ctx.fillStyle = laneColor;
      ctx.fillRect(x + 20, 50, 10, progress * config.raceDistance);
      
      // Draw mini orb image next to progress bar
      const img = new Image();
      img.src = orb.imgSrc;
      if (img.complete) {
        const orbRadius = Math.min(15, laneSpacing / 8);
        const orbX = x + (laneSpacing/2);
        const orbY = 60 + (progress * (config.raceDistance - 20));
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbRadius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, orbX - orbRadius, orbY - orbRadius, orbRadius * 2, orbRadius * 2);
        ctx.restore();
        
        // Draw ring around orb - use lane color
        ctx.strokeStyle = laneColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      // Lane label with finish position if available
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      const finishPos = duckState.finishPositions.indexOf(orb.id);
      if (finishPos >= 0) {
        ctx.fillText(`#${finishPos + 1}`, x + laneSpacing - 30, 65);
      }
    });
  },

  getConfig: () => {
    return currentDuckRaceConfig;
  },

  updateConfig: (updates: Partial<DuckRaceConfig>) => {
    currentDuckRaceConfig = { ...currentDuckRaceConfig, ...updates };
  },

  AdminComponent: ({ config, onConfigChange }) => {
    // Debug current config
    console.log('Duck Race AdminComponent - Current config:', config);
    console.log('Duck Race AdminComponent - Lane colors:', config?.laneColors);
    
    return (
      <Card sx={{ boxShadow: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            🏁 Duck Race Settings
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 2, 
            mb: 2 
          }}>
            {/* Race Distance */}
            <FormControl size="small">
              <InputLabel>Race Distance</InputLabel>
              <Select
                value={config.raceDistance || defaultDuckRaceConfig.raceDistance}
                label="Race Distance"
                onChange={(e) => onConfigChange({ raceDistance: parseInt(e.target.value) })}
              >
                <MenuItem value={300}>Short (300px)</MenuItem>
                <MenuItem value={400}>Medium (400px)</MenuItem>
                <MenuItem value={500}>Normal (500px)</MenuItem>
                <MenuItem value={600}>Long (600px)</MenuItem>
                <MenuItem value={800}>Very Long (800px)</MenuItem>
                <MenuItem value={1000}>Ultra (1000px)</MenuItem>
              </Select>
            </FormControl>

            {/* Lane Count */}
            <FormControl size="small">
              <InputLabel>Number of Lanes</InputLabel>
              <Select
                value={config.laneCount || defaultDuckRaceConfig.laneCount}
                label="Number of Lanes"
                onChange={(e) => {
                  const newCount = parseInt(e.target.value);
                  const currentColors = config.laneColors || defaultDuckRaceConfig.laneColors;
                  const newColors = [...currentColors];
                  
                  // Ensure we have enough colors for the new lane count
                  while (newColors.length < newCount) {
                    const colorIndex = newColors.length % defaultDuckRaceConfig.laneColors.length;
                    newColors.push(defaultDuckRaceConfig.laneColors[colorIndex]);
                  }
                  
                  console.log('Duck Race - Updating lane count:', { newCount, newColors: newColors.slice(0, newCount) });
                  onConfigChange({ 
                    laneCount: newCount,
                    laneColors: newColors.slice(0, newCount)
                  });
                }}
              >
                <MenuItem value={3}>3 Lanes</MenuItem>
                <MenuItem value={4}>4 Lanes</MenuItem>
                <MenuItem value={5}>5 Lanes</MenuItem>
                <MenuItem value={6}>6 Lanes</MenuItem>
                <MenuItem value={8}>8 Lanes</MenuItem>
              </Select>
            </FormControl>

            {/* Race Speed */}
            <FormControl size="small">
              <InputLabel>Race Speed</InputLabel>
              <Select
                value={config.raceSpeed || defaultDuckRaceConfig.raceSpeed}
                label="Race Speed"
                onChange={(e) => onConfigChange({ raceSpeed: parseFloat(e.target.value) })}
              >
                <MenuItem value={0.5}>Very Slow</MenuItem>
                <MenuItem value={1}>Slow</MenuItem>
                <MenuItem value={1.5}>Medium-Slow</MenuItem>
                <MenuItem value={2}>Normal</MenuItem>
                <MenuItem value={2.5}>Medium-Fast</MenuItem>
                <MenuItem value={3}>Fast</MenuItem>
                <MenuItem value={4}>Very Fast</MenuItem>
                <MenuItem value={5}>Ultra Fast</MenuItem>
              </Select>
            </FormControl>

            {/* Turbulence */}
            <FormControl size="small">
              <InputLabel>Turbulence</InputLabel>
              <Select
                value={config.enableTurbulence !== undefined ? (config.enableTurbulence ? 'enabled' : 'disabled') : 'enabled'}
                label="Turbulence"
                onChange={(e) => onConfigChange({ enableTurbulence: e.target.value === 'enabled' })}
              >
                <MenuItem value="disabled">Disabled</MenuItem>
                <MenuItem value="enabled">Enabled</MenuItem>
              </Select>
            </FormControl>

            {/* Turbulence Strength (only if enabled) */}
            {(config.enableTurbulence !== undefined ? config.enableTurbulence : defaultDuckRaceConfig.enableTurbulence) && (
              <FormControl size="small">
                <InputLabel>Turbulence Strength</InputLabel>
                <Select
                  value={config.turbulenceStrength || defaultDuckRaceConfig.turbulenceStrength}
                  label="Turbulence Strength"
                  onChange={(e) => onConfigChange({ turbulenceStrength: parseFloat(e.target.value) })}
                >
                  <MenuItem value={0.1}>Very Light</MenuItem>
                  <MenuItem value={0.3}>Light</MenuItem>
                  <MenuItem value={0.5}>Normal</MenuItem>
                  <MenuItem value={0.8}>Strong</MenuItem>
                  <MenuItem value={1.2}>Very Strong</MenuItem>
                  <MenuItem value={2}>Extreme</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          {/* Lane Colors */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              🎨 Lane Colors
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: 'repeat(3, 1fr)', 
                sm: 'repeat(4, 1fr)', 
                md: 'repeat(6, 1fr)' 
              }, 
              gap: 1 
            }}>
              {Array.from({ length: config.laneCount || defaultDuckRaceConfig.laneCount }).map((_, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                    Lane {index + 1}
                  </Typography>
                  <input
                    type="color"
                    value={(config.laneColors || defaultDuckRaceConfig.laneColors)[index] || defaultDuckRaceConfig.laneColors[index % defaultDuckRaceConfig.laneColors.length]}
                    onChange={(e) => {
                      const currentColors = config.laneColors || [...defaultDuckRaceConfig.laneColors];
                      const newColors = [...currentColors];
                      newColors[index] = e.target.value;
                      console.log('Duck Race - Updating lane colors:', { index, newValue: e.target.value, newColors });
                      onConfigChange({ laneColors: newColors });
                    }}
                    style={{ 
                      width: '100%',
                      height: '36px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                // Set trigger flag to start race
                currentDuckRaceConfig.triggerStart = true;
              }}
              sx={{ fontSize: '12px', fontWeight: 'bold' }}
            >
              🏁 Start Race
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                // Set trigger flag to reset race
                currentDuckRaceConfig.triggerReset = true;
              }}
              sx={{ fontSize: '12px', fontWeight: 'bold' }}
            >
              🔄 Reset Race
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  },
};

export default DuckRaceGame;
