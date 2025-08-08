import { useState, useRef, useCallback, useEffect } from 'react';
import type { Orb, OrbConfig, AnimationMode, PachinkoConfig } from '../types/orb';

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;
const GRAVITY = 0.6; // Gravity acceleration
const GROUND_FRICTION = 0.8; // Ground friction when bouncing
const AIR_RESISTANCE = 0.99; // Air resistance
const BOUNCE_DAMPING = 0.7; // How much energy is lost on bounce

// Snake mode constants
const SNAKE_SPEED = 0.002; // Much slower speed for better visibility
const SNAKE_SPACING = 0.02; // Very close spacing - orbs touching each other

// Sand mode constants
const SAND_GRAVITY = 0.6; // Normal gravity but with more drag
const SAND_FRICTION = 0.95; // High friction for sand settling
const SAND_BOUNCE_DAMPING = 0.3; // Low bounce for sand particles
const SAND_COLLISION_DISTANCE = 1.2; // How close particles need to be to collide
const SAND_SPAWN_RATE = 3; // How many frames between spawning new sand particles

// Pachinko game constants - made configurable
let PACHINKO_PEG_RADIUS = 4; // Smaller pegs
let PACHINKO_PEG_BOUNCE = 0.8; // Configurable bounciness
let PACHINKO_POINTS = [5, 20, 50, 100, 1000, 2000, 1000, 100, 50, 20, 5]; // Configurable bowl values
let PACHINKO_BOWL_SIZES = [0.9, 0.8, 0.7, 0.6, 0.3, 0.2, 0.3, 0.6, 0.7, 0.8, 0.9]; // Configurable bowl size multipliers
let PACHINKO_BOWL_COLORS = ['#87CEEB', '#32CD32', '#32CD32', '#FF4500', '#FFD700', '#FFD700', '#FFD700', '#FF4500', '#32CD32', '#32CD32', '#87CEEB']; // Configurable bowl colors
let PACHINKO_ROWS = 8; // Configurable number of peg rows
let PACHINKO_DRAG_X = 0.92; // Configurable horizontal drag
let PACHINKO_DRAG_Y = 0.96; // Configurable vertical drag

// Generate bowl sizes based on width pattern (5, 7, or 9)
const generateBowlSizes = (count: number, widthPattern: number) => {
  const sizes: number[] = [];
  const center = Math.floor(count / 2);
  
  for (let i = 0; i < count; i++) {
    const distanceFromCenter = Math.abs(i - center);
    
    if (widthPattern === 5) {
      // Very small center, progressively larger
      if (distanceFromCenter === 0) sizes.push(0.15); // Tiny center
      else if (distanceFromCenter === 1) sizes.push(0.4);
      else if (distanceFromCenter === 2) sizes.push(0.7);
      else sizes.push(0.9);
    } else if (widthPattern === 7) {
      // Small center, more gradual progression
      if (distanceFromCenter === 0) sizes.push(0.2); // Small center
      else if (distanceFromCenter === 1) sizes.push(0.35);
      else if (distanceFromCenter === 2) sizes.push(0.55);
      else if (distanceFromCenter === 3) sizes.push(0.75);
      else sizes.push(0.9);
    } else { // 9
      // More bowls, even more gradual
      if (distanceFromCenter === 0) sizes.push(0.25); // Small center
      else if (distanceFromCenter === 1) sizes.push(0.35);
      else if (distanceFromCenter === 2) sizes.push(0.45);
      else if (distanceFromCenter === 3) sizes.push(0.6);
      else if (distanceFromCenter === 4) sizes.push(0.8);
      else sizes.push(0.9);
    }
  }
  
  return sizes;
};

// Define 10 specific drop spots across the top
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

export const useOrbManager = () => {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [animationMode, setAnimationMode] = useState<AnimationMode>('physics');
  const orbsRef = useRef<Orb[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const snakeHeadProgress = useRef<number>(0);
  const animationModeRef = useRef<AnimationMode>('physics');
  const snakeModeStarted = useRef<boolean>(false);
  const sandModeStarted = useRef<boolean>(false);
  const sandSpawnCounter = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const collectionCounter = useRef<number>(1); // Start at 1 since head is 0
  const sandExploding = useRef<boolean>(false);
  const sandRespawnTimer = useRef<number>(0);
  const sandDropCounter = useRef<number>(0);
  const sandDropDelay = useRef<number>(30); // Frames between each orb drop
  
  // Generate staggered pachinko pegs like real pachinko
  const generatePachinkoHeadProgress = useCallback(() => {
    const pegs: Array<{x: number, y: number}> = [];
    const pegSpacing = 35; // Slightly tighter spacing to fit more pegs
    const rowSpacing = 45; // Vertical spacing between rows
    const startY = 120; // First row Y position
    const edgeMargin = 15; // Small margin from screen edges
    
    // Generate configurable number of rows of staggered pegs
    for (let row = 0; row < PACHINKO_ROWS; row++) {
      const y = startY + row * rowSpacing;
      const isEvenRow = row % 2 === 0;
      
      // Calculate how many pegs can fit across the full width
      const availableWidth = CANVAS_WIDTH - (2 * edgeMargin);
      const pegCount = Math.floor(availableWidth / pegSpacing) + 1; // +1 to ensure we reach the edges
      
      // Calculate actual spacing to span the full width
      const actualSpacing = availableWidth / (pegCount - 1);
      
      for (let i = 0; i < pegCount; i++) {
        let x = edgeMargin + i * actualSpacing;
        
        // Offset every other row for staggered pattern
        if (!isEvenRow) {
          x += actualSpacing / 2;
          // Skip this peg if it would go outside the screen
          if (x > CANVAS_WIDTH - edgeMargin) {
            continue;
          }
        }
        
        // Ensure peg is within screen bounds
        if (x >= edgeMargin && x <= CANVAS_WIDTH - edgeMargin) {
          pegs.push({ x, y });
        }
      }
    }
    
    console.log(`Generated ${pegs.length} staggered pachinko pegs with ${PACHINKO_ROWS} rows`);
    return pegs;
  }, []);
  
  // Pachinko pegs - will be regenerated randomly each time
  const pachinkoHeadProgress = useRef<Array<{x: number, y: number}>>(generatePachinkoHeadProgress());

  // Keep orbsRef in sync with orbs state for animation loop
  useEffect(() => {
    orbsRef.current = orbs;
  }, [orbs]);

  // Calculate position along the edge path (clockwise around canvas)
  const getSnakePosition = useCallback((progress: number, size: number = 32) => {
    // Normalize progress to 0-1
    const normalizedProgress = ((progress % 1) + 1) % 1;
    
    const margin = size / 2 + 10; // Keep orbs away from very edge
    const width = CANVAS_WIDTH - 2 * margin;
    const height = CANVAS_HEIGHT - 2 * margin;
    const perimeter = 2 * (width + height);
    
    const distance = normalizedProgress * perimeter;
    
    if (distance <= width) {
      // Top edge: left to right
      return { x: margin + distance, y: margin };
    } else if (distance <= width + height) {
      // Right edge: top to bottom  
      return { x: CANVAS_WIDTH - margin, y: margin + (distance - width) };
    } else if (distance <= 2 * width + height) {
      // Bottom edge: right to left
      return { x: CANVAS_WIDTH - margin - (distance - width - height), y: CANVAS_HEIGHT - margin };
    } else {
      // Left edge: bottom to top
      return { x: margin, y: CANVAS_HEIGHT - margin - (distance - 2 * width - height) };
    }
  }, []);

  // Calculate how much progress distance is needed for one orb diameter
  const getOrbProgressDistance = useCallback((orbSize: number) => {
    const margin = orbSize / 2 + 10;
    const width = CANVAS_WIDTH - 2 * margin;
    const height = CANVAS_HEIGHT - 2 * margin;
    const perimeter = 2 * (width + height);
    
    // Distance for orb diameter in progress units (0-1)
    return orbSize / perimeter;
  }, []);

  // Check collision with pachinko pegs
  const checkPachinkoCollision = useCallback((orb: Orb) => {
    for (const peg of pachinkoHeadProgress.current) {
      const dx = (orb.x + orb.size/2) - peg.x;
      const dy = (orb.y + orb.size/2) - peg.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < orb.size/2 + PACHINKO_PEG_RADIUS) {
        // Collision with peg - much more chaotic bouncing to prevent staircase effect
        const angle = Math.atan2(dy, dx);
        const force = PACHINKO_PEG_BOUNCE;
        
        // Much stronger bouncing with heavy randomization
        orb.velocityX = Math.cos(angle) * force * 12; // Higher bounce force
        orb.velocityY = Math.sin(angle) * force * 10; // Much higher bounce force
        
        // Add heavy randomness for very chaotic bouncing - prevent predictable paths
        orb.velocityX += (Math.random() - 0.5) * 8; // Double the randomness
        orb.velocityY += (Math.random() - 0.5) * 6; // More vertical randomness
        
        // Add extra upward boost to prevent downward staircasing
        orb.velocityY -= Math.random() * 3; // Random upward boost
        
        // Higher minimum bounce energy to ensure chaos
        const minBounce = 4; // Doubled minimum bounce
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
  }, []);

  // Calculate which scoring slot an orb landed in
  const getScoreSlot = useCallback((orbX: number) => {
    const slotIndex = Math.floor((orbX / CANVAS_WIDTH) * PACHINKO_POINTS.length);
    return Math.max(0, Math.min(slotIndex, PACHINKO_POINTS.length - 1));
  }, []);

  // Check collision with bowl walls
  const checkWallCollision = useCallback((orb: Orb) => {
    const slotWidth = CANVAS_WIDTH / PACHINKO_POINTS.length;
    const wallHeight = 60;
    const wallWidth = 6;
    const groundY = CANVAS_HEIGHT - wallHeight;
    
    // Check collision with each wall
    for (let i = 1; i < PACHINKO_POINTS.length; i++) {
      const wallX = i * slotWidth;
      const wallLeft = wallX - wallWidth/2;
      const wallRight = wallX + wallWidth/2;
      
      // Check if orb is overlapping with wall area (full height and width coverage)
      if (orb.y + orb.size >= groundY && orb.y <= CANVAS_HEIGHT) {
        // Check horizontal overlap with wall
        const orbLeft = orb.x;
        const orbRight = orb.x + orb.size;
        
        // Left side collision - orb moving right into wall
        if (orbRight >= wallLeft && orbLeft < wallLeft && orb.velocityX > 0) {
          orb.x = wallLeft - orb.size;
          orb.velocityX = -Math.abs(orb.velocityX) * 1.0; // Bouncy wall collision
          orb.velocityY += (Math.random() - 0.5) * 2; // Add vertical bounce
          console.log(`Orb bounced off left side of wall ${i}`);
          return true;
        }
        
        // Right side collision - orb moving left into wall
        if (orbLeft <= wallRight && orbRight > wallRight && orb.velocityX < 0) {
          orb.x = wallRight;
          orb.velocityX = Math.abs(orb.velocityX) * 1.0; // Bouncy wall collision
          orb.velocityY += (Math.random() - 0.5) * 2; // Add vertical bounce
          console.log(`Orb bounced off right side of wall ${i}`);
          return true;
        }
      }
    }
    return false;
  }, []);

  // Initialize snake positions for existing orbs
  const initializeSnakeMode = useCallback(() => {
    console.log('Initializing snake mode for existing orbs');
    setOrbs(currentOrbs => {
      console.log('Current orbs before snake init:', currentOrbs.length);
      
      const updatedOrbs = currentOrbs.map((orb, index) => {
        const snakeOrb = {
          ...orb,
          snakeIndex: index,
          snakePathProgress: index === 0 ? 0 : undefined, // Head will get actual value, others wait
          isEntering: false,
          onGround: true,
          velocityX: 0,
          velocityY: 0,
          // Add snake collection state
          collectedBySnake: index === 0, // Head is immediately part of snake
          collectionOrder: index === 0 ? 0 : undefined // Head has collection order 0
        };
        
        // Only the head (first orb) starts on the snake path - find closest point on path to current position
        if (index === 0) {
          // Find the closest point on the snake path to the orb's current position
          let closestProgress = 0;
          let closestDistance = Infinity;
          
          // Sample the path to find the closest point
          for (let progress = 0; progress < 1; progress += 0.01) {
            const pathPos = getSnakePosition(progress, snakeOrb.size);
            const dx = (orb.x + orb.size/2) - pathPos.x;
            const dy = (orb.y + orb.size/2) - pathPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestProgress = progress;
            }
          }
          
          snakeOrb.snakePathProgress = closestProgress;
          snakeHeadProgress.current = closestProgress; // Update the head progress reference
          
          const position = getSnakePosition(closestProgress, snakeOrb.size);
          snakeOrb.x = position.x - snakeOrb.size / 2;
          snakeOrb.y = position.y - snakeOrb.size / 2;
          console.log(`Snake head positioned at closest path point (${Math.round(snakeOrb.x)}, ${Math.round(snakeOrb.y)}) with progress ${closestProgress.toFixed(3)}`);
        } else {
          // Other orbs stay in their current positions until collected
          console.log(`Orb ${index} waiting to be collected at (${Math.round(orb.x)}, ${Math.round(orb.y)})`);
        }
        
        return snakeOrb;
      });
      
      console.log('Updated orbs after snake init:', updatedOrbs.length);
      return updatedOrbs;
    });
  }, [getSnakePosition]);

  // Initialize sand mode - explode orbs and then respawn them at top for pachinko
  const initializeSandMode = useCallback(() => {
    console.log('Initializing sand pachinko mode for existing orbs');
    
    // Generate new random pachinko pegs
    pachinkoHeadProgress.current = generatePachinkoHeadProgress();
    console.log('Generated new random pachinko pegs:', pachinkoHeadProgress.current.length);
    
    // First, explode all current orbs outward from center
    setOrbs(currentOrbs => {
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
          // Clear snake properties
          collectedBySnake: false,
          collectionOrder: undefined,
          snakeIndex: undefined,
          snakePathProgress: undefined,
          // Mark orb as waiting to drop
          waitingToDrop: true,
          dropOrder: index
        };
      });
      
      console.log(`Exploded ${explodedOrbs.length} orbs for pachinko mode`);
      return explodedOrbs;
    });
    
    // Set timer to respawn orbs at top after explosion
    sandExploding.current = true;
    sandRespawnTimer.current = 120; // 2 seconds at 60fps
    sandDropCounter.current = 0;
    sandSpawnCounter.current = 0;
  }, [generatePachinkoHeadProgress]);

  // Switch animation mode
  const switchAnimationMode = useCallback((mode: AnimationMode) => {
    console.log('Switching animation mode to:', mode);
    setAnimationMode(mode);
    animationModeRef.current = mode; // Keep ref in sync
    snakeModeStarted.current = false; // Reset flag
    sandModeStarted.current = false; // Reset flag
    
    if (mode === 'snake') {
      console.log('Initializing snake mode for', orbs.length, 'orbs');
      collectionCounter.current = 1; // Reset collection counter
      initializeSnakeMode();
      console.log('Snake mode initialized, animationModeRef.current =', animationModeRef.current);
    } else if (mode === 'sand') {
      console.log('Initializing sand pachinko mode for', orbs.length, 'orbs');
      sandExploding.current = false; // Reset explosion state
      sandRespawnTimer.current = 0;
      initializeSandMode();
      console.log('Sand pachinko mode initialized, animationModeRef.current =', animationModeRef.current);
    } else if (mode === 'physics') {
      // Reset orbs to physics mode - make them fall from their current positions
      console.log('Switching to physics mode, resetting orb physics properties');
      setOrbs(currentOrbs => {
        return currentOrbs.map(orb => ({
          ...orb,
          // Reset physics properties to make them fall
          velocityX: (Math.random() - 0.5) * 4, // Some random horizontal velocity
          velocityY: 0, // Start with no vertical velocity (will fall due to gravity)
          onGround: false, // Not on ground so physics will apply
          isEntering: false, // Not entering anymore
          exploding: false, // Not exploding
          // Clear snake properties
          snakeIndex: undefined,
          snakePathProgress: undefined
        }));
      });
    }
  }, [initializeSnakeMode, initializeSandMode, orbs.length]);

  const createOrb = useCallback((config: OrbConfig): Orb => {
    const size = config.size || 32;
    const img = new Image();
    
    const orb: Orb = {
      id: Math.random().toString(36).substr(2, 9),
      img,
      x: Math.random() * (CANVAS_WIDTH - size),
      y: -size,
      dx: config.entryType === 'toss' ? (Math.random() < 0.5 ? -2 : 2) : 0,
      dy: 0,
      vx: 2 + Math.random() * 2,
      dir: Math.random() < 0.5 ? -1 : 1,
      isEntering: true,
      entryType: config.entryType || 'drop',
      bounceCount: 0,
      role: config.role || 'none',
      label: config.label || '',
      ringColor: config.ringColor || '#ffffff',
      ringWidth: config.ringWidth || 4,
      roleIcon: config.roleIcon || '',
      roleIconPosition: config.roleIconPosition || 'bottom-right',
      moveTimer: 0,
      moveState: 'idle',
      size,
      shrinking: false,
      targetSize: Math.max(size * 0.8, 32), // Minimum 32px, shrink to 80% instead of 60%
      imgLoaded: false,
      imgSrc: config.imgSrc || '',
      // Physics properties
      velocityX: config.entryType === 'toss' ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 2,
      velocityY: 0,
      onGround: false,
      exploding: false,
      explosionForce: 0,
      explosionAngle: 0,
      mass: size / 50, // Mass based on size
      // Snake mode properties (will be initialized when added to array)
      snakeIndex: undefined,
      snakePathProgress: undefined
    };

    if (config.imgSrc) {
      img.src = config.imgSrc;
      img.onload = () => {
        orb.imgLoaded = true;
      };
    }

    return orb;
  }, []);

  const addOrb = useCallback((config: OrbConfig) => {
    const orb = createOrb(config);
    setOrbs(currentOrbs => {
      const newOrbs = [...currentOrbs, orb];
      
      // If in snake mode, initialize snake properties for the new orb
      if (animationModeRef.current === 'snake') {
        const orbIndex = newOrbs.length - 1;
        orb.snakeIndex = orbIndex;
        
        // New orbs start uncollected and will be picked up by the snake head
        orb.collectedBySnake = false;
        orb.snakePathProgress = undefined;
        
        // Keep the orb in its current spawn position until collected
        console.log(`Added new orb ${orbIndex} waiting to be collected at (${Math.round(orb.x)}, ${Math.round(orb.y)})`);
      } else if (animationModeRef.current === 'sand') {
        // If in sand/pachinko mode, make the orb spawn at one of the drop spots
        orb.size = 16; // Force XS size for pachinko
        
        // Choose a random drop spot
        const randomDropSpotIndex = Math.floor(Math.random() * PACHINKO_DROP_SPOTS.length);
        const dropX = PACHINKO_DROP_SPOTS[randomDropSpotIndex];
        
        orb.x = dropX - orb.size / 2; // Center orb on drop spot
        orb.y = -20;
        orb.velocityX = (Math.random() - 0.5) * 0.5; // Small random horizontal velocity
        orb.velocityY = 0; // Start with no downward velocity
        orb.onGround = false;
        orb.isEntering = true;
        orb.exploding = false;
        orb.mass = 0.3; // Light for pachinko physics
        
        console.log(`New orb spawned at drop spot ${randomDropSpotIndex} (x: ${dropX.toFixed(1)})`);
      }
      
      return newOrbs;
    });
    return orb;
  }, [createOrb, getSnakePosition]);

  const removeOrb = useCallback((orbId: string) => {
    setOrbs(currentOrbs => currentOrbs.filter(orb => orb.id !== orbId));
  }, []);

  const updateOrb = useCallback((orbId: string, updates: Partial<Orb>) => {
    setOrbs(currentOrbs => currentOrbs.map(orb => {
      if (orb.id === orbId) {
        const updatedOrb = { ...orb, ...updates };
        
        // If size or ring width changed, make the orb jump!
        const sizeChanged = updates.size && updates.size !== orb.size;
        const ringChanged = updates.ringWidth && updates.ringWidth !== orb.ringWidth;
        
        if (sizeChanged || ringChanged) {
          const changeType = sizeChanged && ringChanged ? 'size and ring' : 
                           sizeChanged ? 'size' : 'ring';
          console.log(`Orb ${orbId} ${changeType} changed - triggering jump!`);
          
          updatedOrb.velocityY = -8 - (Math.random() * 4); // Upward velocity for jump
          updatedOrb.velocityX = (Math.random() - 0.5) * 6; // Random horizontal movement
          updatedOrb.onGround = false;
          updatedOrb.exploding = false;
          updatedOrb.shrinking = false;
          
          // Update target size for the shrinking animation after jump
          if (updates.size) {
            updatedOrb.targetSize = Math.max(updates.size * 0.8, 32);
          }
        }
        
        return updatedOrb;
      }
      return orb;
    }));
  }, []);

  const clearAllOrbs = useCallback(() => {
    setOrbs([]);
  }, []);

  // Explosion effect - applies force to all orbs from a center point
  const explodeOrbs = useCallback((centerX: number, centerY: number, force: number = 15) => {
    setOrbs(currentOrbs => currentOrbs.map(orb => {
      const dx = orb.x + orb.size / 2 - centerX;
      const dy = orb.y + orb.size / 2 - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 200) { // Only affect orbs within 200px of explosion
        const angle = Math.atan2(dy, dx);
        const explosionForce = force * (1 - distance / 200); // Force decreases with distance
        
        return {
          ...orb,
          exploding: true,
          explosionForce,
          explosionAngle: angle,
          velocityX: Math.cos(angle) * explosionForce,
          velocityY: Math.sin(angle) * explosionForce,
          onGround: false,
          isEntering: false
        };
      }
      return orb;
    }));
  }, []);

  // Re-run a specific orb through pachinko to get a new color
  const rerunOrbThroughPachinko = useCallback((orbId: string) => {
    if (animationModeRef.current !== 'sand') {
      console.log('Pachinko re-run only available in sand mode');
      return;
    }
    
    setOrbs(currentOrbs => currentOrbs.map(orb => {
      if (orb.id === orbId) {
        console.log(`Re-running orb ${orbId} through pachinko`);
        
        // Choose a random drop spot for re-runs
        const randomDropSpotIndex = Math.floor(Math.random() * PACHINKO_DROP_SPOTS.length);
        const dropX = PACHINKO_DROP_SPOTS[randomDropSpotIndex];
        
        return {
          ...orb,
          // Reset to starting position at chosen drop spot
          x: dropX - orb.size / 2,
          y: -20,
          velocityX: (Math.random() - 0.5) * 0.5,
          velocityY: 0,
          onGround: false,
          isEntering: true,
          exploding: false,
          // Clear previous score
          pachinkoScore: undefined,
          pachinkoSlot: undefined,
          // Reset ring color to default
          ringColor: '#ffffff'
        };
      }
      return orb;
    }));
  }, []);

  const drawRoundedImage = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) => {
    if (!img.complete || !img.naturalWidth) return;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  }, []);

  const drawEffect = useCallback((ctx: CanvasRenderingContext2D, orb: Orb) => {
    const cx = orb.x + orb.size / 2;
    const cy = orb.y + orb.size / 2;
    
    ctx.save();
    
    // Draw ring
    if (orb.ringColor && orb.ringWidth > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, orb.size / 2 + orb.ringWidth / 2, 0, Math.PI * 2);
      ctx.strokeStyle = orb.ringColor;
      ctx.lineWidth = orb.ringWidth;
      ctx.stroke();
    }
    
    // Draw role icon with positioning
    if (orb.roleIcon) {
      ctx.font = `${Math.max(12, orb.size * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      
      let iconX = cx;
      let iconY = cy;
      const offset = orb.size / 2 + orb.ringWidth + 8; // Distance from orb edge
      
      switch (orb.roleIconPosition) {
        case 'top':
          iconY = orb.y - 10;
          break;
        case 'bottom':
          iconY = orb.y + orb.size + 20;
          break;
        case 'left':
          iconX = orb.x - 15;
          iconY = cy + 4; // Slight vertical adjustment for better centering
          break;
        case 'right':
          iconX = orb.x + orb.size + 15;
          iconY = cy + 4;
          break;
        case 'center':
          iconX = cx;
          iconY = cy + 4; // Center of the orb
          break;
        case 'top-left':
          iconX = cx - offset * 0.7;
          iconY = cy - offset * 0.7;
          break;
        case 'top-right':
          iconX = cx + offset * 0.7;
          iconY = cy - offset * 0.7;
          break;
        case 'bottom-left':
          iconX = cx - offset * 0.7;
          iconY = cy + offset * 0.7;
          break;
        case 'bottom-right':
          iconX = cx + offset * 0.7;
          iconY = cy + offset * 0.7;
          break;
      }
      
      ctx.fillText(orb.roleIcon, iconX, iconY);
    }
    
    // Draw label
    if (orb.label) {
      ctx.font = `${Math.max(12, orb.size * 0.4)}px sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(orb.label, cx, orb.y - 30);
      ctx.fillText(orb.label, cx, orb.y - 30);
    }
    
    ctx.restore();
  }, []);

  const animate = useCallback((canvas: HTMLCanvasElement, useSetInterval = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (animationModeRef.current === 'snake') {
        // Snake mode animation
        if (!snakeModeStarted.current) {
          console.log('🐍 Snake mode animation started! Orbs count:', orbsRef.current.length);
          snakeModeStarted.current = true;
        }
        
        // Draw snake mode indicator even if no orbs
        if (orbsRef.current.length === 0) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
          ctx.fillRect(10, 10, 200, 30);
          ctx.fillStyle = 'black';
          ctx.font = '16px sans-serif';
          ctx.fillText('🐍 Snake Mode Active (No Orbs)', 15, 30);
        }
        
        snakeHeadProgress.current += SNAKE_SPEED;
        if (snakeHeadProgress.current > 1) {
          snakeHeadProgress.current -= 1; // Wrap around
        }

        // Check for orb collection - find closest uncollected orb to head
        const head = orbsRef.current[0];
        if (head) {
          let closestOrb = null;
          let closestDistance = Infinity;
          let closestIndex = -1;
          
          // Find the closest uncollected orb to the head
          for (let i = 1; i < orbsRef.current.length; i++) {
            const orb = orbsRef.current[i];
            if (!orb.collectedBySnake) {
              const dx = head.x + head.size/2 - (orb.x + orb.size/2);
              const dy = head.y + head.size/2 - (orb.y + orb.size/2);
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < closestDistance) {
                closestDistance = distance;
                closestOrb = orb;
                closestIndex = i;
              }
            }
          }
          
          // Collect the closest orb if it's within range
          if (closestOrb && closestDistance < (head.size + closestOrb.size) / 2 + 30) { // Collection radius
            console.log(`Head collected closest orb ${closestIndex} at distance ${closestDistance.toFixed(1)}!`);
            closestOrb.collectedBySnake = true;
            closestOrb.collectionOrder = collectionCounter.current++;
            
            // Calculate position at the tail of the current snake
            let cumulativeDistance = 0;
            const collectedOrbs = orbsRef.current.filter(orb => orb.collectedBySnake && orb !== closestOrb);
            collectedOrbs.sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0));
            
            for (const prevOrb of collectedOrbs) {
              cumulativeDistance += getOrbProgressDistance(prevOrb.size);
            }
            
            // Position this orb at the tail
            closestOrb.snakePathProgress = snakeHeadProgress.current - cumulativeDistance - getOrbProgressDistance(closestOrb.size);
            
            // Handle wrap-around
            while (closestOrb.snakePathProgress < 0) {
              closestOrb.snakePathProgress += 1;
            }
            
            console.log(`Orb collected with order ${closestOrb.collectionOrder}, positioned at progress ${closestOrb.snakePathProgress.toFixed(3)}`);
          }
        }

        // Update positions for all collected orbs based on their collection order
        const collectedOrbs = orbsRef.current.filter(orb => orb.collectedBySnake);
        
        // Sort by collection order (head = 0, first collected = 1, etc.)
        collectedOrbs.sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0));
        
        // Update positions based on stable collection order
        let cumulativeDistance = 0;
        for (let i = 0; i < collectedOrbs.length; i++) {
          const orb = collectedOrbs[i];
          
          let orbProgress;
          if (i === 0) {
            // Head (collection order 0) follows the main progress
            orbProgress = snakeHeadProgress.current;
          } else {
            // Each subsequent orb follows at cumulative distance
            orbProgress = snakeHeadProgress.current - cumulativeDistance;
            
            // Handle wrap-around
            while (orbProgress < 0) {
              orbProgress += 1;
            }
            while (orbProgress > 1) {
              orbProgress -= 1;
            }
          }
          
          // Update orb's snake properties
          orb.snakePathProgress = orbProgress;
          
          // Get position along the path
          const position = getSnakePosition(orbProgress, orb.size);
          orb.x = position.x - orb.size / 2;
          orb.y = position.y - orb.size / 2;
          
          // Add this orb's size to cumulative distance for next orb
          cumulativeDistance += getOrbProgressDistance(orb.size);
        }
        
        // Draw all orbs (collected ones are positioned above, uncollected stay in place)
        for (let i = 0; i < orbsRef.current.length; i++) {
          const orb = orbsRef.current[i];
          if (orb.shrinking && orb.size > orb.targetSize) {
            orb.size -= (orb.size - orb.targetSize) * 0.1;
            if (Math.abs(orb.size - orb.targetSize) < 0.5) {
              orb.size = orb.targetSize;
              orb.shrinking = false;
            }
          }

          drawRoundedImage(ctx, orb.img, orb.x, orb.y, orb.size);
          drawEffect(ctx, orb);
        }
      } else if (animationModeRef.current === 'sand') {
        // Sand pachinko mode animation
        if (!sandModeStarted.current) {
          console.log('� Pachinko mode animation started! Orbs count:', orbsRef.current.length);
          sandModeStarted.current = true;
        }
        
        // Draw mode indicator
        if (orbsRef.current.length === 0) {
          ctx.fillStyle = 'rgba(255, 193, 7, 0.5)';
          ctx.fillRect(10, 10, 200, 30);
          ctx.fillStyle = 'black';
          ctx.font = '16px sans-serif';
          ctx.fillText('� Pachinko Mode Active (No Orbs)', 15, 30);
        }

        // Handle respawning after explosion
        if (sandExploding.current) {
          sandRespawnTimer.current--;
          if (sandRespawnTimer.current <= 0) {
            console.log('Starting one-by-one orb drops for pachinko');
            sandExploding.current = false;
            
            // Reset all orbs to waiting state at top
            setOrbs(currentOrbs => {
              return currentOrbs.map((orb, index) => ({
                ...orb,
                x: CANVAS_WIDTH / 2 - 8, // Start at center
                y: -50, // Above screen
                velocityX: 0,
                velocityY: 0,
                exploding: false,
                onGround: false,
                isEntering: false,
                waitingToDrop: true,
                dropOrder: index
              }));
            });
          }
        }

        // Handle one-by-one dropping
        if (!sandExploding.current) {
          sandDropCounter.current++;
          if (sandDropCounter.current >= sandDropDelay.current) {
            sandDropCounter.current = 0;
            
            // Find next orb to drop
            const waitingOrbs = orbsRef.current.filter(orb => orb.waitingToDrop);
            if (waitingOrbs.length > 0) {
              const nextOrb = waitingOrbs.sort((a, b) => (a.dropOrder || 0) - (b.dropOrder || 0))[0];
              console.log(`Dropping orb ${nextOrb.dropOrder}`);
              
              // Choose a specific drop spot based on orb's drop order
              const dropSpotIndex = (nextOrb.dropOrder || 0) % PACHINKO_DROP_SPOTS.length;
              const dropX = PACHINKO_DROP_SPOTS[dropSpotIndex];
              
              // Release this orb at the chosen drop spot
              nextOrb.waitingToDrop = false;
              nextOrb.x = dropX - nextOrb.size / 2; // Center orb on drop spot
              nextOrb.y = -20;
              nextOrb.velocityX = (Math.random() - 0.5) * 0.5; // Very small random velocity
              nextOrb.velocityY = 0;
              nextOrb.isEntering = true;
              
              console.log(`Orb ${nextOrb.dropOrder} dropped at spot ${dropSpotIndex} (x: ${dropX.toFixed(1)})`);
            }
          }
        }

        // Draw pachinko pegs (staggered pattern)
        ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.strokeStyle = 'rgba(200, 50, 50, 1)';
        ctx.lineWidth = 1;
        for (const peg of pachinkoHeadProgress.current) {
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
          const y = 20; // Top of screen
          
          // Draw drop spot indicator
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw spot number
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText((i + 1).toString(), x, y + 3);
          ctx.fillStyle = 'rgba(100, 255, 100, 0.6)'; // Reset fill color
        }

        // Draw scoring slots at bottom as half-circle cradles
        const slotWidth = CANVAS_WIDTH / PACHINKO_POINTS.length;
        for (let i = 0; i < PACHINKO_POINTS.length; i++) {
          const x = i * slotWidth;
          const centerX = x + slotWidth / 2;
          const baseCradleRadius = slotWidth / 2 - 5;
          const cradleRadius = baseCradleRadius * PACHINKO_BOWL_SIZES[i]; // Apply size multiplier
          const cradleY = CANVAS_HEIGHT - 10; // Bottom of screen
          
          // Draw cradle as a thick arc
          ctx.strokeStyle = PACHINKO_BOWL_COLORS[i] || '#87CEEB';
          ctx.lineWidth = 8; // Thick line for the cradle
          ctx.beginPath();
          ctx.arc(centerX, cradleY, cradleRadius, 0, Math.PI); // Bottom half circle
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
          const wallHeight = 60; // Tall walls
          const wallWidth = 6;
          
          // Draw wall
          ctx.fillRect(wallX - wallWidth/2, CANVAS_HEIGHT - wallHeight, wallWidth, wallHeight);
          ctx.strokeRect(wallX - wallWidth/2, CANVAS_HEIGHT - wallHeight, wallWidth, wallHeight);
        }

        // Animate orbs with pachinko physics
        for (let i = 0; i < orbsRef.current.length; i++) {
          const orb = orbsRef.current[i];
          
          // Skip physics for orbs waiting to drop
          if (orb.waitingToDrop) {
            continue;
          }

          // Apply pachinko physics
          if (!orb.onGround || orb.exploding) {
            // Apply gravity
            orb.velocityY += SAND_GRAVITY;
            
            // Check collision with pachinko pegs
            checkPachinkoCollision(orb);
            
            // Check collision with bowl walls
            checkWallCollision(orb);
            
            // Heavy water-like drag to slow everything down
            orb.velocityX *= PACHINKO_DRAG_X; // Configurable horizontal drag
            orb.velocityY *= PACHINKO_DRAG_Y; // Configurable vertical drag
            
            // Update position
            orb.x += orb.velocityX;
            orb.y += orb.velocityY;
            
            // Check ground collision (landing in cradles)
            const cradleGroundY = CANVAS_HEIGHT - orb.size/2 - 8; // Orbs rest in cradles
            if (orb.y >= cradleGroundY - 20) { // Start cradle physics earlier
              // Calculate which cradle we're in
              const slotIndex = getScoreSlot(orb.x + orb.size/2);
              const slotWidth = CANVAS_WIDTH / PACHINKO_POINTS.length;
              const cradleCenterX = (slotIndex + 0.5) * slotWidth;
              const baseCradleRadius = slotWidth / 2 - 5;
              const cradleRadius = baseCradleRadius * PACHINKO_BOWL_SIZES[slotIndex]; // Use variable size
              
              // Check if orb is within the cradle area
              const distanceFromCenter = Math.abs((orb.x + orb.size/2) - cradleCenterX);
              
              if (distanceFromCenter <= cradleRadius) {
                // Orb is in cradle - apply cradle physics
                if (orb.y >= cradleGroundY) {
                  // Calculate the cradle curve - orbs settle into the arc
                  const normalizedDistance = distanceFromCenter / cradleRadius;
                  const cradleDepth = Math.sqrt(1 - normalizedDistance * normalizedDistance) * 15; // Arc depth
                  const cradleY = CANVAS_HEIGHT - 8 - cradleDepth;
                  
                  orb.y = cradleY - orb.size;
                  orb.onGround = true;
                  
                  // Bouncy collision with cradle
                  if (orb.velocityY > 1) {
                    orb.velocityY = -orb.velocityY * 0.3; // Some bounce on cradle
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
                    orb.velocityX *= 0.9; // Some friction
                  } else {
                    orb.velocityX *= 0.8; // More friction at center
                  }
                  
                  orb.exploding = false;
                  orb.isEntering = false;
                  
                  // Change ring color based on score - use configured colors
                  if (slotIndex < PACHINKO_BOWL_COLORS.length) {
                    orb.ringColor = PACHINKO_BOWL_COLORS[slotIndex];
                  } else {
                    // Fallback to original logic if no configured color
                    if (points >= 500) orb.ringColor = '#FFD700'; // Gold for high scores
                    else if (points >= 100) orb.ringColor = '#FF4500'; // Orange-red for good scores
                    else if (points >= 50) orb.ringColor = '#32CD32';  // Lime green for medium scores
                    else orb.ringColor = '#87CEEB'; // Sky blue for low scores
                  }
                  
                  console.log(`Orb scored ${points} points in cradle ${slotIndex}! Ring color changed to ${orb.ringColor}`);
                }
              }
            }
            
            // Wall collisions (bouncy but slowed by water drag)
            if (orb.x <= 0) {
              orb.x = 0;
              orb.velocityX = Math.abs(orb.velocityX) * 0.8; // Good bounce
            } else if (orb.x + orb.size >= CANVAS_WIDTH) {
              orb.x = CANVAS_WIDTH - orb.size;
              orb.velocityX = -Math.abs(orb.velocityX) * 0.8; // Good bounce
            }
          }

          // Only draw orbs that are not waiting to drop
          if (!orb.waitingToDrop) {
            drawRoundedImage(ctx, orb.img, orb.x, orb.y, orb.size);
            drawEffect(ctx, orb);
          }
        }
      } else {
        // Physics mode animation (original logic)
        for (let orb of orbsRef.current) {
          const groundY = CANVAS_HEIGHT - orb.size - 5; // Ground level

          // Apply physics
          if (!orb.onGround || orb.exploding) {
            // Apply gravity
            orb.velocityY += GRAVITY;
            
            // Apply air resistance
            orb.velocityX *= AIR_RESISTANCE;
            orb.velocityY *= AIR_RESISTANCE;
            
            // Update position
            orb.x += orb.velocityX;
            orb.y += orb.velocityY;
            
            // Check ground collision
            if (orb.y >= groundY) {
              orb.y = groundY;
              orb.onGround = true;
              
              // Bounce if hitting ground with enough force
              if (Math.abs(orb.velocityY) > 1) {
                orb.velocityY = -orb.velocityY * BOUNCE_DAMPING;
                orb.velocityX *= GROUND_FRICTION;
                orb.onGround = false; // Will bounce back up
                orb.bounceCount++;
              } else {
                // Settle on ground
                orb.velocityY = 0;
                orb.velocityX *= GROUND_FRICTION;
                orb.exploding = false; // Stop explosion state when settled
                
                // If this orb just landed after a size change, start shrinking animation
                if (orb.size > orb.targetSize && !orb.shrinking) {
                  orb.shrinking = true;
                  orb.moveTimer = Math.floor(Math.random() * 60 + 30);
                  console.log(`Orb landed after size change - starting shrink animation from ${orb.size} to ${orb.targetSize}`);
                }
              }
            }
            
            // Wall collisions
            if (orb.x <= 0) {
              orb.x = 0;
              orb.velocityX = -orb.velocityX * 0.7;
            } else if (orb.x + orb.size >= CANVAS_WIDTH) {
              orb.x = CANVAS_WIDTH - orb.size;
              orb.velocityX = -orb.velocityX * 0.7;
            }
          } else {
            // Ground movement when not exploding
            if (!orb.exploding) {
              orb.moveTimer--;
              if (orb.moveTimer <= 0) {
                const rand = Math.random();
                if (rand < 0.4) {
                  orb.moveState = 'idle';
                  orb.velocityX = 0;
                } else if (rand < 0.7) {
                  orb.moveState = 'walk';
                  orb.velocityX = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);
                } else {
                  orb.moveState = 'dash';
                  orb.velocityX = (Math.random() * 6 + 4) * (Math.random() < 0.5 ? -1 : 1);
                }
                orb.moveTimer = Math.floor(Math.random() * 120 + 60);
              }

              orb.x += orb.velocityX;
              
              // Keep on screen
              if (orb.x <= 0 || orb.x + orb.size >= CANVAS_WIDTH) {
                orb.x = Math.max(0, Math.min(orb.x, CANVAS_WIDTH - orb.size));
                orb.velocityX *= -1;
              }
            }
          }

          // Handle shrinking animation
          if (orb.shrinking && orb.size > orb.targetSize) {
            orb.size -= (orb.size - orb.targetSize) * 0.1;
            if (Math.abs(orb.size - orb.targetSize) < 0.5) {
              orb.size = orb.targetSize;
              orb.shrinking = false;
            }
            // Adjust position to keep orb on ground
            if (orb.onGround) {
              orb.y = CANVAS_HEIGHT - orb.size - 5;
            }
          }

          drawRoundedImage(ctx, orb.img, orb.x, orb.y, orb.size);
          drawEffect(ctx, orb);
        }
      }

      if (useSetInterval) {
        // Don't schedule next frame, setInterval will handle it
        return;
      }

      animationFrameRef.current = requestAnimationFrame(() => frame());
    };

    if (useSetInterval) {
      // Fallback for OBS compatibility
      console.log('Using setInterval animation for OBS compatibility');
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current as any);
      }
      animationFrameRef.current = setInterval(frame, 16) as any; // ~60fps
    } else {
      frame();
    }
  }, [drawRoundedImage, drawEffect, getSnakePosition]);

  const startAnimation = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas; // Store canvas reference
    
    if (animationFrameRef.current) {
      if (typeof animationFrameRef.current === 'number') {
        cancelAnimationFrame(animationFrameRef.current);
      } else {
        clearInterval(animationFrameRef.current as any);
      }
    }
    
    // Check if we're in OBS by looking for OBS-specific properties
    const isOBS = !!(window as any).obsstudio || 
                 navigator.userAgent.includes('OBS') || 
                 window.name === 'OBSBrowserSource';
    
    console.log('Animation environment:', isOBS ? 'OBS detected' : 'Normal browser');
    animate(canvas, isOBS);
  }, [animate]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      if (typeof animationFrameRef.current === 'number') {
        cancelAnimationFrame(animationFrameRef.current);
      } else {
        clearInterval(animationFrameRef.current as any);
      }
    }
  }, []);

  // Update pachinko configuration
  const updatePachinkoConfig = useCallback((config: Partial<PachinkoConfig>) => {
    if (config.rows !== undefined) {
      PACHINKO_ROWS = config.rows;
      // Regenerate pegs when rows change
      pachinkoHeadProgress.current = generatePachinkoHeadProgress();
      console.log(`Updated pachinko rows to ${PACHINKO_ROWS}, regenerated pegs`);
    }
    if (config.bounciness !== undefined) {
      PACHINKO_PEG_BOUNCE = config.bounciness;
      console.log(`Updated pachinko bounciness to ${PACHINKO_PEG_BOUNCE}`);
    }
    if (config.dragX !== undefined) {
      PACHINKO_DRAG_X = config.dragX;
      console.log(`Updated pachinko horizontal drag to ${PACHINKO_DRAG_X}`);
    }
    if (config.dragY !== undefined) {
      PACHINKO_DRAG_Y = config.dragY;
      console.log(`Updated pachinko vertical drag to ${PACHINKO_DRAG_Y}`);
    }
    if (config.bowlCount !== undefined || config.bowlValues !== undefined) {
      if (config.bowlValues) {
        PACHINKO_POINTS = [...config.bowlValues];
      } else if (config.bowlCount !== undefined) {
        // Generate default values for new bowl count
        PACHINKO_POINTS = Array(config.bowlCount).fill(0).map((_, i) => {
          const center = Math.floor(config.bowlCount! / 2);
          const distance = Math.abs(i - center);
          if (distance === 0) return 1000; // Center high value
          else if (distance === 1) return 500;
          else if (distance === 2) return 100;
          else return 10;
        });
      }
      console.log(`Updated pachinko bowl values:`, PACHINKO_POINTS);
    }
    if (config.bowlColors !== undefined) {
      PACHINKO_BOWL_COLORS = [...config.bowlColors];
      console.log(`Updated pachinko bowl colors:`, PACHINKO_BOWL_COLORS);
    }
    if (config.bowlWidthPattern !== undefined) {
      PACHINKO_BOWL_SIZES = generateBowlSizes(PACHINKO_POINTS.length, config.bowlWidthPattern);
      console.log(`Updated pachinko bowl sizes for pattern ${config.bowlWidthPattern}:`, PACHINKO_BOWL_SIZES);
    }
  }, [generatePachinkoHeadProgress]);

  // Get current pachinko configuration
  const getPachinkoConfig = useCallback((): PachinkoConfig => ({
    rows: PACHINKO_ROWS,
    bounciness: PACHINKO_PEG_BOUNCE,
    dragX: PACHINKO_DRAG_X,
    dragY: PACHINKO_DRAG_Y,
    bowlCount: PACHINKO_POINTS.length,
    bowlValues: [...PACHINKO_POINTS],
    bowlColors: [...PACHINKO_BOWL_COLORS],
    bowlWidthPattern: 5 // Default to 5 for now
  }), []);

  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    orbs,
    animationMode,
    addOrb,
    removeOrb,
    updateOrb,
    clearAllOrbs,
    explodeOrbs,
    rerunOrbThroughPachinko,
    startAnimation,
    stopAnimation,
    switchAnimationMode,
    updatePachinkoConfig,
    getPachinkoConfig
  };
};
