import { Box, Slider, Typography, Button } from '@mui/material';
import type { Orb } from '../types/orb';
import type { GamePlugin, GameState, GameConfig } from './types';

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;
const SAND_GRAVITY = 0.6;

interface PachinkoState extends GameState {
  exploding: boolean;
  respawnTimer: number;
  dropCounter: number;
  dropDelay: number;
  modeStarted: boolean;
  pegs: Array<{x: number, y: number}>;
}

interface PachinkoGameConfig extends GameConfig {
  rows: number;
  bounciness: number;
  dragX: number;
  dragY: number;
  bowlCount: number;
  bowlValues: number[];
  bowlColors: string[];
  bowlWidthPattern: number;
}

// Game constants - these will be updated by config
let PACHINKO_PEG_RADIUS = 4;
let PACHINKO_PEG_BOUNCE = 0.8;
let PACHINKO_POINTS = [5, 20, 50, 100, 1000, 2000, 1000, 100, 50, 20, 5];
let PACHINKO_BOWL_SIZES = [0.9, 0.8, 0.7, 0.6, 0.3, 0.2, 0.3, 0.6, 0.7, 0.8, 0.9];
let PACHINKO_BOWL_COLORS = ['#87CEEB', '#32CD32', '#32CD32', '#FF4500', '#FFD700', '#FFD700', '#FFD700', '#FF4500', '#32CD32', '#32CD32', '#87CEEB'];
let PACHINKO_ROWS = 8;
let PACHINKO_DRAG_X = 0.92;
let PACHINKO_DRAG_Y = 0.96;

// Drop spots across the top
const PACHINKO_DROP_SPOTS = [
  CANVAS_WIDTH * 0.1,   // 10% from left
  CANVAS_WIDTH * 0.2,   // 20% from left
  CANVAS_WIDTH * 0.25,  // 25% from left
  CANVAS_WIDTH * 0.35,  // 35% from left
  CANVAS_WIDTH * 0.45,  // 45% from left
  CANVAS_WIDTH * 0.55,  // 55% from left
  CANVAS_WIDTH * 0.65,  // 65% from left
  CANVAS_WIDTH * 0.75,  // 75% from left
  CANVAS_WIDTH * 0.8,   // 80% from left
  CANVAS_WIDTH * 0.9    // 90% from left
];

// Generate bowl sizes based on width pattern
function generateBowlSizes(count: number, widthPattern: number): number[] {
  const sizes: number[] = [];
  const center = Math.floor(count / 2);
  
  for (let i = 0; i < count; i++) {
    const distanceFromCenter = Math.abs(i - center);
    
    if (widthPattern === 5) {
      if (distanceFromCenter === 0) sizes.push(0.15);
      else if (distanceFromCenter === 1) sizes.push(0.4);
      else if (distanceFromCenter === 2) sizes.push(0.7);
      else sizes.push(0.9);
    } else if (widthPattern === 7) {
      if (distanceFromCenter === 0) sizes.push(0.2);
      else if (distanceFromCenter === 1) sizes.push(0.35);
      else if (distanceFromCenter === 2) sizes.push(0.55);
      else if (distanceFromCenter === 3) sizes.push(0.75);
      else sizes.push(0.9);
    } else { // 9
      if (distanceFromCenter === 0) sizes.push(0.25);
      else if (distanceFromCenter === 1) sizes.push(0.35);
      else if (distanceFromCenter === 2) sizes.push(0.45);
      else if (distanceFromCenter === 3) sizes.push(0.6);
      else if (distanceFromCenter === 4) sizes.push(0.8);
      else sizes.push(0.9);
    }
  }
  
  return sizes;
}

// Generate staggered pachinko pegs
function generatePachinkoHeadProgress(): Array<{x: number, y: number}> {
  const pegs: Array<{x: number, y: number}> = [];
  const pegSpacing = 35;
  const rowSpacing = 45;
  const startY = 120;
  const edgeMargin = 15;
  
  for (let row = 0; row < PACHINKO_ROWS; row++) {
    const y = startY + row * rowSpacing;
    const isEvenRow = row % 2 === 0;
    
    const availableWidth = CANVAS_WIDTH - (2 * edgeMargin);
    const pegCount = Math.floor(availableWidth / pegSpacing) + 1;
    const actualSpacing = availableWidth / (pegCount - 1);
    
    for (let i = 0; i < pegCount; i++) {
      let x = edgeMargin + i * actualSpacing;
      
      if (!isEvenRow) {
        x += actualSpacing / 2;
        if (x > CANVAS_WIDTH - edgeMargin) {
          continue;
        }
      }
      
      if (x >= edgeMargin && x <= CANVAS_WIDTH - edgeMargin) {
        pegs.push({ x, y });
      }
    }
  }
  
  return pegs;
}

export const pachinkoGame: GamePlugin = {
  id: 'sand',
  name: 'Pachinko',
  description: 'Pachinko game with pegs, cradles, and scoring',
  
  initialize(currentOrbs: Orb[]) {
    // Generate new random pachinko pegs
    const pegs = generatePachinkoHeadProgress();
    
    // First, explode all current orbs outward from center
    const explodedOrbs = currentOrbs.map((orb, index) => {
      // Calculate explosion direction
      const angle = (index / currentOrbs.length) * Math.PI * 2 + Math.random() * 0.5;
      const force = 15 + Math.random() * 10;
      
      return {
        ...orb,
        size: 16, // Force XS size for pachinko
        exploding: true,
        velocityX: Math.cos(angle) * force,
        velocityY: Math.sin(angle) * force - 5, // Extra upward force
        onGround: false,
        isEntering: false,
        mass: 0.3,
        // Clear other game properties
        collectedBySnake: false,
        collectionOrder: undefined,
        snakeIndex: undefined,
        snakePathProgress: undefined,
        // Mark orb as waiting to drop
        waitingToDrop: true,
        dropOrder: index
      };
    });
    
    const state: PachinkoState = {
      exploding: true,
      respawnTimer: 120, // 2 seconds at 60fps
      dropCounter: 0,
      dropDelay: 30,
      modeStarted: false,
      pegs
    };
    
    return { orbs: explodedOrbs, state };
  },
  
  update(orbs: Orb[], state: GameState) {
    const pachinkoState = state as PachinkoState;
    
    if (!pachinkoState.modeStarted) {
      console.log('🎯 Pachinko mode animation started! Orbs count:', orbs.length);
      pachinkoState.modeStarted = true;
    }

    // Handle respawning after explosion
    if (pachinkoState.exploding) {
      pachinkoState.respawnTimer--;
      if (pachinkoState.respawnTimer <= 0) {
        pachinkoState.exploding = false;
        
        // Reset all orbs to waiting state at top
        orbs.forEach((orb, index) => {
          orb.x = CANVAS_WIDTH / 2 - 8;
          orb.y = -50;
          orb.velocityX = 0;
          orb.velocityY = 0;
          orb.exploding = false;
          orb.onGround = false;
          orb.isEntering = false;
          orb.waitingToDrop = true;
          orb.dropOrder = index;
        });
      }
    }

    // Handle one-by-one dropping
    if (!pachinkoState.exploding) {
      pachinkoState.dropCounter++;
      if (pachinkoState.dropCounter >= pachinkoState.dropDelay) {
        pachinkoState.dropCounter = 0;
        
        // Find next orb to drop
        const waitingOrbs = orbs.filter(orb => orb.waitingToDrop);
        if (waitingOrbs.length > 0) {
          const nextOrb = waitingOrbs.sort((a, b) => (a.dropOrder || 0) - (b.dropOrder || 0))[0];
          
          // Choose a specific drop spot based on orb's drop order
          const dropSpotIndex = (nextOrb.dropOrder || 0) % PACHINKO_DROP_SPOTS.length;
          const dropX = PACHINKO_DROP_SPOTS[dropSpotIndex];
          
          // Release this orb at the chosen drop spot
          nextOrb.waitingToDrop = false;
          nextOrb.x = dropX - nextOrb.size / 2;
          nextOrb.y = -20;
          nextOrb.velocityX = (Math.random() - 0.5) * 0.5;
          nextOrb.velocityY = 0;
          nextOrb.isEntering = true;
        }
      }
    }

    // Animate orbs with pachinko physics
    for (const orb of orbs) {
      // Skip physics for orbs waiting to drop
      if (orb.waitingToDrop) {
        continue;
      }

      // Apply pachinko physics
      if (!orb.onGround || orb.exploding) {
        // Apply gravity
        orb.velocityY += SAND_GRAVITY;
        
        // Check collision with pachinko pegs
        checkPachinkoCollision(orb, pachinkoState.pegs);
        
        // Check collision with bowl walls
        checkWallCollision(orb);
        
        // Heavy water-like drag to slow everything down
        orb.velocityX *= PACHINKO_DRAG_X;
        orb.velocityY *= PACHINKO_DRAG_Y;
        
        // Update position
        orb.x += orb.velocityX;
        orb.y += orb.velocityY;
        
        // Check ground collision (landing in cradles)
        const cradleGroundY = CANVAS_HEIGHT - orb.size/2 - 8;
        if (orb.y >= cradleGroundY - 20) {
          // Calculate which cradle we're in
          const slotIndex = getScoreSlot(orb.x + orb.size/2);
          const slotWidth = CANVAS_WIDTH / PACHINKO_POINTS.length;
          const cradleCenterX = (slotIndex + 0.5) * slotWidth;
          const baseCradleRadius = slotWidth / 2 - 5;
          const cradleRadius = baseCradleRadius * PACHINKO_BOWL_SIZES[slotIndex];
          
          // Check if orb is within the cradle area
          const distanceFromCenter = Math.abs((orb.x + orb.size/2) - cradleCenterX);
          
          if (distanceFromCenter <= cradleRadius) {
            // Orb is in cradle - apply cradle physics
            if (orb.y >= cradleGroundY) {
              // Calculate the cradle curve - orbs settle into the arc
              const normalizedDistance = distanceFromCenter / cradleRadius;
              const cradleDepth = Math.sqrt(1 - normalizedDistance * normalizedDistance) * 15;
              const cradleY = CANVAS_HEIGHT - 8 - cradleDepth;
              
              orb.y = cradleY - orb.size;
              orb.onGround = true;
              
              // Bouncy collision with cradle
              if (orb.velocityY > 1) {
                orb.velocityY = -orb.velocityY * 0.3;
              } else {
                orb.velocityY = 0;
              }
              
              // Calculate score and update orb appearance
              const points = PACHINKO_POINTS[slotIndex];
              orb.pachinkoScore = points;
              orb.pachinkoSlot = slotIndex;
              
              // Cradle physics - pull toward center with gravity effect
              const orbCenterX = orb.x + orb.size / 2;
              const distanceFromCradleCenter = orbCenterX - cradleCenterX;
              
              if (Math.abs(distanceFromCradleCenter) > 3) {
                // Create a slope effect - orbs roll toward center
                const slopeForce = -distanceFromCradleCenter * 0.02;
                orb.velocityX += slopeForce;
                orb.velocityX *= 0.9;
              } else {
                orb.velocityX *= 0.8;
              }
              
              orb.exploding = false;
              orb.isEntering = false;
              
              // Change ring color based on score - use configured colors
              if (slotIndex < PACHINKO_BOWL_COLORS.length) {
                orb.ringColor = PACHINKO_BOWL_COLORS[slotIndex];
              } else {
                // Fallback colors
                if (points >= 500) orb.ringColor = '#FFD700';
                else if (points >= 100) orb.ringColor = '#FF4500';
                else if (points >= 50) orb.ringColor = '#32CD32';
                else orb.ringColor = '#87CEEB';
              }
            }
          }
        }
        
        // Wall collisions
        if (orb.x <= 0) {
          orb.x = 0;
          orb.velocityX = Math.abs(orb.velocityX) * 0.8;
        } else if (orb.x + orb.size >= CANVAS_WIDTH) {
          orb.x = CANVAS_WIDTH - orb.size;
          orb.velocityX = -Math.abs(orb.velocityX) * 0.8;
        }
      }
    }
    
    return { orbs, state: pachinkoState };
  },
  
  render(ctx: CanvasRenderingContext2D, orbs: Orb[], state: GameState) {
    const pachinkoState = state as PachinkoState;
    
    // Draw mode indicator
    if (orbs.length === 0) {
      ctx.fillStyle = 'rgba(255, 193, 7, 0.5)';
      ctx.fillRect(10, 10, 200, 30);
      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.fillText('🎯 Pachinko Mode Active (No Orbs)', 15, 30);
    }

    // Draw pachinko pegs
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.strokeStyle = 'rgba(200, 50, 50, 1)';
    ctx.lineWidth = 1;
    for (const peg of pachinkoState.pegs) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PACHINKO_PEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    
    // Draw drop spots at the top
    ctx.fillStyle = 'rgba(100, 255, 100, 0.6)';
    ctx.strokeStyle = 'rgba(50, 200, 50, 1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < PACHINKO_DROP_SPOTS.length; i++) {
      const x = PACHINKO_DROP_SPOTS[i];
      const y = 20;
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((i + 1).toString(), x, y + 3);
      ctx.fillStyle = 'rgba(100, 255, 100, 0.6)';
    }

    // Draw scoring slots at bottom as half-circle cradles
    const slotWidth = CANVAS_WIDTH / PACHINKO_POINTS.length;
    for (let i = 0; i < PACHINKO_POINTS.length; i++) {
      const centerX = (i + 0.5) * slotWidth;
      const baseCradleRadius = slotWidth / 2 - 5;
      const cradleRadius = baseCradleRadius * PACHINKO_BOWL_SIZES[i];
      const cradleY = CANVAS_HEIGHT - 10;
      
      // Draw cradle as a thick arc
      ctx.strokeStyle = PACHINKO_BOWL_COLORS[i] || '#87CEEB';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX, cradleY, cradleRadius, 0, Math.PI);
      ctx.stroke();
      
      // Draw point values
      ctx.fillStyle = 'white';
      const fontSize = PACHINKO_POINTS[i] >= 1000 ? 16 : 14;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      const pointText = PACHINKO_POINTS[i] >= 1000 ? `${PACHINKO_POINTS[i]}!` : PACHINKO_POINTS[i].toString();
      ctx.strokeText(pointText, centerX, cradleY - cradleRadius - 10);
      ctx.fillText(pointText, centerX, cradleY - cradleRadius - 10);
    }
    
    // Draw tall walls between bowls
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.strokeStyle = 'rgba(150, 150, 150, 1)';
    ctx.lineWidth = 2;
    for (let i = 1; i < PACHINKO_POINTS.length; i++) {
      const wallX = i * slotWidth;
      const wallHeight = 60;
      const wallWidth = 6;
      
      ctx.fillRect(wallX - wallWidth/2, CANVAS_HEIGHT - wallHeight, wallWidth, wallHeight);
      ctx.strokeRect(wallX - wallWidth/2, CANVAS_HEIGHT - wallHeight, wallWidth, wallHeight);
    }
  },
  
  handleAddOrb(orb: Orb, currentOrbs: Orb[], state: GameState) {
    // If in pachinko mode, make the orb spawn at one of the drop spots
    orb.size = 16; // Force XS size for pachinko
    
    // Choose a random drop spot
    const randomDropSpotIndex = Math.floor(Math.random() * PACHINKO_DROP_SPOTS.length);
    const dropX = PACHINKO_DROP_SPOTS[randomDropSpotIndex];
    
    orb.x = dropX - orb.size / 2;
    orb.y = -20;
    orb.velocityX = (Math.random() - 0.5) * 0.5;
    orb.velocityY = 0;
    orb.onGround = false;
    orb.isEntering = true;
    orb.exploding = false;
    orb.mass = 0.3;
    
    return { orb, state };
  },
  
  getConfig(): PachinkoGameConfig {
    return {
      rows: PACHINKO_ROWS,
      bounciness: PACHINKO_PEG_BOUNCE,
      dragX: PACHINKO_DRAG_X,
      dragY: PACHINKO_DRAG_Y,
      bowlCount: PACHINKO_POINTS.length,
      bowlValues: [...PACHINKO_POINTS],
      bowlColors: [...PACHINKO_BOWL_COLORS],
      bowlWidthPattern: 5
    };
  },
  
  updateConfig(config: Partial<PachinkoGameConfig>) {
    if (config.rows !== undefined) {
      PACHINKO_ROWS = config.rows;
    }
    if (config.bounciness !== undefined) {
      PACHINKO_PEG_BOUNCE = config.bounciness;
    }
    if (config.dragX !== undefined) {
      PACHINKO_DRAG_X = config.dragX;
    }
    if (config.dragY !== undefined) {
      PACHINKO_DRAG_Y = config.dragY;
    }
    if (config.bowlValues) {
      PACHINKO_POINTS = [...config.bowlValues];
    }
    if (config.bowlColors) {
      PACHINKO_BOWL_COLORS = [...config.bowlColors];
    }
    if (config.bowlWidthPattern !== undefined) {
      PACHINKO_BOWL_SIZES = generateBowlSizes(PACHINKO_POINTS.length, config.bowlWidthPattern);
    }
  },
  
  AdminComponent: ({ config, onConfigChange }) => {
    const pachinkoConfig = config as PachinkoGameConfig;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Pachinko Configuration
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>Rows: {pachinkoConfig.rows}</Typography>
          <Slider
            value={pachinkoConfig.rows}
            onChange={(_, value) => onConfigChange({ rows: value as number })}
            min={3}
            max={15}
            step={1}
            valueLabelDisplay="auto"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>Bounciness: {pachinkoConfig.bounciness.toFixed(2)}</Typography>
          <Slider
            value={pachinkoConfig.bounciness}
            onChange={(_, value) => onConfigChange({ bounciness: value as number })}
            min={0.1}
            max={2.0}
            step={0.1}
            valueLabelDisplay="auto"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>Horizontal Drag: {pachinkoConfig.dragX.toFixed(2)}</Typography>
          <Slider
            value={pachinkoConfig.dragX}
            onChange={(_, value) => onConfigChange({ dragX: value as number })}
            min={0.8}
            max={0.99}
            step={0.01}
            valueLabelDisplay="auto"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>Vertical Drag: {pachinkoConfig.dragY.toFixed(2)}</Typography>
          <Slider
            value={pachinkoConfig.dragY}
            onChange={(_, value) => onConfigChange({ dragY: value as number })}
            min={0.8}
            max={0.99}
            step={0.01}
            valueLabelDisplay="auto"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>Bowl Count: {pachinkoConfig.bowlCount}</Typography>
          <Slider
            value={pachinkoConfig.bowlCount}
            onChange={(_, value) => {
              const count = value as number;
              const newValues = Array(count).fill(0).map((_, i) => {
                const center = Math.floor(count / 2);
                const distance = Math.abs(i - center);
                if (distance === 0) return 1000;
                else if (distance === 1) return 500;
                else if (distance === 2) return 100;
                else return 10;
              });
              const newColors = Array(count).fill('#87CEEB');
              onConfigChange({ 
                bowlCount: count, 
                bowlValues: newValues,
                bowlColors: newColors
              });
            }}
            min={3}
            max={15}
            step={1}
            valueLabelDisplay="auto"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>Width Pattern</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[5, 7, 9].map(pattern => (
              <Button
                key={pattern}
                variant={pachinkoConfig.bowlWidthPattern === pattern ? 'contained' : 'outlined'}
                onClick={() => onConfigChange({ bowlWidthPattern: pattern })}
              >
                {pattern}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }
};

// Helper functions
function checkPachinkoCollision(orb: Orb, pegs: Array<{x: number, y: number}>) {
  for (const peg of pegs) {
    const dx = (orb.x + orb.size/2) - peg.x;
    const dy = (orb.y + orb.size/2) - peg.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < orb.size/2 + PACHINKO_PEG_RADIUS) {
      const angle = Math.atan2(dy, dx);
      const force = PACHINKO_PEG_BOUNCE;
      
      orb.velocityX = Math.cos(angle) * force * 12;
      orb.velocityY = Math.sin(angle) * force * 10;
      
      orb.velocityX += (Math.random() - 0.5) * 8;
      orb.velocityY += (Math.random() - 0.5) * 6;
      orb.velocityY -= Math.random() * 3;
      
      const minBounce = 4;
      if (Math.abs(orb.velocityX) < minBounce) {
        orb.velocityX = orb.velocityX >= 0 ? minBounce : -minBounce;
      }
      if (Math.abs(orb.velocityY) < minBounce) {
        orb.velocityY = orb.velocityY >= 0 ? minBounce : -minBounce;
      }
      
      return true;
    }
  }
  return false;
}

function checkWallCollision(orb: Orb) {
  const slotWidth = CANVAS_WIDTH / PACHINKO_POINTS.length;
  const wallHeight = 60;
  const wallWidth = 6;
  const groundY = CANVAS_HEIGHT - wallHeight;
  
  for (let i = 1; i < PACHINKO_POINTS.length; i++) {
    const wallX = i * slotWidth;
    const wallLeft = wallX - wallWidth/2;
    const wallRight = wallX + wallWidth/2;
    
    if (orb.y + orb.size >= groundY && orb.y <= CANVAS_HEIGHT) {
      const orbLeft = orb.x;
      const orbRight = orb.x + orb.size;
      
      if (orbRight >= wallLeft && orbLeft < wallLeft && orb.velocityX > 0) {
        orb.x = wallLeft - orb.size;
        orb.velocityX = -Math.abs(orb.velocityX) * 1.0;
        orb.velocityY += (Math.random() - 0.5) * 2;
        return true;
      }
      
      if (orbLeft <= wallRight && orbRight > wallRight && orb.velocityX < 0) {
        orb.x = wallRight;
        orb.velocityX = Math.abs(orb.velocityX) * 1.0;
        orb.velocityY += (Math.random() - 0.5) * 2;
        return true;
      }
    }
  }
  return false;
}

function getScoreSlot(orbX: number) {
  const slotIndex = Math.floor((orbX / CANVAS_WIDTH) * PACHINKO_POINTS.length);
  return Math.max(0, Math.min(slotIndex, PACHINKO_POINTS.length - 1));
}
