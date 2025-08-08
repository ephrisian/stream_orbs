import type { Orb } from '../types/orb';
import type { GamePlugin, GameState } from './types';

const GRAVITY = 0.6;
const GROUND_FRICTION = 0.8;
const AIR_RESISTANCE = 0.99;
const BOUNCE_DAMPING = 0.7;
const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;

export const physicsGame: GamePlugin = {
  id: 'physics',
  name: 'Physics',
  description: 'Standard physics simulation with gravity and bouncing',
  
  initialize(currentOrbs: Orb[]) {
    // Reset orbs to physics mode - make them fall from their current positions
    const orbs = currentOrbs.map(orb => ({
      ...orb,
      // Reset physics properties to make them fall
      velocityX: (Math.random() - 0.5) * 4, // Some random horizontal velocity
      velocityY: 0, // Start with no vertical velocity (will fall due to gravity)
      onGround: false, // Not on ground so physics will apply
      isEntering: false, // Not entering anymore
      exploding: false, // Not exploding
      // Clear game-specific properties
      snakeIndex: undefined,
      snakePathProgress: undefined,
      collectedBySnake: false,
      collectionOrder: undefined,
      waitingToDrop: false,
      dropOrder: undefined,
      pachinkoScore: undefined,
      pachinkoSlot: undefined
    }));
    
    return {
      orbs,
      state: {}
    };
  },
  
  update(orbs: Orb[], state: GameState) {
    // Physics animation logic
    for (let orb of orbs) {
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
    }
    
    return { orbs, state };
  },
  
  render(ctx: CanvasRenderingContext2D, orbs: Orb[]) {
    // No special rendering needed for physics mode
    if (orbs.length === 0) {
      ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
      ctx.fillRect(10, 10, 200, 30);
      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.fillText('⚡ Physics Mode Active (No Orbs)', 15, 30);
    }
  },
  
  handleAddOrb(orb: Orb, currentOrbs: Orb[], state: GameState) {
    // No special handling needed for physics mode
    return { orb, state };
  }
};
