import type { Orb } from '../types/orb';
import type { GamePlugin, GameState } from './types';

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;
const SNAKE_SPEED = 0.002;

interface SnakeState extends GameState {
  headProgress: number;
  collectionCounter: number;
  modeStarted: boolean;
}

export const snakeGame: GamePlugin = {
  id: 'snake',
  name: 'Snake',
  description: 'Orbs form a snake that moves around the screen perimeter',
  
  initialize(currentOrbs: Orb[]) {
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
        collectionOrder: index === 0 ? 0 : undefined, // Head has collection order 0
        // Clear other game properties
        waitingToDrop: false,
        dropOrder: undefined,
        pachinkoScore: undefined,
        pachinkoSlot: undefined
      };
      
      // Only the head (first orb) starts on the snake path
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
        
        const position = getSnakePosition(closestProgress, snakeOrb.size);
        snakeOrb.x = position.x - snakeOrb.size / 2;
        snakeOrb.y = position.y - snakeOrb.size / 2;
      }
      
      return snakeOrb;
    });
    
    const state: SnakeState = {
      headProgress: currentOrbs.length > 0 ? (updatedOrbs[0].snakePathProgress || 0) : 0,
      collectionCounter: 1,
      modeStarted: false
    };
    
    return { orbs: updatedOrbs, state };
  },
  
  update(orbs: Orb[], state: GameState) {
    const snakeState = state as SnakeState;
    
    if (!snakeState.modeStarted) {
      console.log('🐍 Snake mode animation started! Orbs count:', orbs.length);
      snakeState.modeStarted = true;
    }
    
    snakeState.headProgress += SNAKE_SPEED;
    if (snakeState.headProgress > 1) {
      snakeState.headProgress -= 1; // Wrap around
    }

    // Check for orb collection - find closest uncollected orb to head
    const head = orbs[0];
    if (head) {
      let closestOrb = null;
      let closestDistance = Infinity;
      let closestIndex = -1;
      
      // Find the closest uncollected orb to the head
      for (let i = 1; i < orbs.length; i++) {
        const orb = orbs[i];
        if (!orb.collectedBySnake) {
          const dx = head.x + head.size/2 - (orb.x + orb.size/2);
          const dy = head.y + head.size/2 - (orb.y + orb.size/2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestOrb = orb;
          }
        }
      }
      
      // Collect the closest orb if it's within range
      if (closestOrb && closestDistance < (head.size + closestOrb.size) / 2 + 30) { // Collection radius
        closestOrb.collectedBySnake = true;
        closestOrb.collectionOrder = snakeState.collectionCounter++;
        
        // Calculate position at the tail of the current snake
        let cumulativeDistance = 0;
        const collectedOrbs = orbs.filter(orb => orb.collectedBySnake && orb !== closestOrb);
        collectedOrbs.sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0));
        
        for (const prevOrb of collectedOrbs) {
          cumulativeDistance += getOrbProgressDistance(prevOrb.size);
        }
        
        // Position this orb at the tail
        closestOrb.snakePathProgress = snakeState.headProgress - cumulativeDistance - getOrbProgressDistance(closestOrb.size);
        
        // Handle wrap-around
        while (closestOrb.snakePathProgress! < 0) {
          closestOrb.snakePathProgress! += 1;
        }
      }
    }

    // Update positions for all collected orbs based on their collection order
    const collectedOrbs = orbs.filter(orb => orb.collectedBySnake);
    
    // Sort by collection order (head = 0, first collected = 1, etc.)
    collectedOrbs.sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0));
    
    // Update positions based on stable collection order
    let cumulativeDistance = 0;
    for (let i = 0; i < collectedOrbs.length; i++) {
      const orb = collectedOrbs[i];
      
      let orbProgress;
      if (i === 0) {
        // Head (collection order 0) follows the main progress
        orbProgress = snakeState.headProgress;
      } else {
        // Each subsequent orb follows at cumulative distance
        orbProgress = snakeState.headProgress - cumulativeDistance;
        
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
    
    // Handle shrinking animation
    for (const orb of orbs) {
      if (orb.shrinking && orb.size > orb.targetSize) {
        orb.size -= (orb.size - orb.targetSize) * 0.1;
        if (Math.abs(orb.size - orb.targetSize) < 0.5) {
          orb.size = orb.targetSize;
          orb.shrinking = false;
        }
      }
    }
    
    return { orbs, state: snakeState };
  },
  
  render(ctx: CanvasRenderingContext2D, orbs: Orb[]) {
    // Draw snake mode indicator even if no orbs
    if (orbs.length === 0) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.fillRect(10, 10, 200, 30);
      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.fillText('🐍 Snake Mode Active (No Orbs)', 15, 30);
    }
  },
  
  handleAddOrb(orb: Orb, currentOrbs: Orb[], state: GameState) {
    const orbIndex = currentOrbs.length;
    orb.snakeIndex = orbIndex;
    
    // New orbs start uncollected and will be picked up by the snake head
    orb.collectedBySnake = false;
    orb.snakePathProgress = undefined;
    
    return { orb, state };
  }
};

// Helper functions
function getSnakePosition(progress: number, size: number = 32) {
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
}

function getOrbProgressDistance(orbSize: number) {
  const margin = orbSize / 2 + 10;
  const width = CANVAS_WIDTH - 2 * margin;
  const height = CANVAS_HEIGHT - 2 * margin;
  const perimeter = 2 * (width + height);
  
  // Distance for orb diameter in progress units (0-1)
  return orbSize / perimeter;
}
