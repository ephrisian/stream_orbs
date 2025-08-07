import { useState, useRef, useCallback, useEffect } from 'react';
import type { Orb, OrbConfig } from '../types/orb';

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;
const GRAVITY = 0.6; // Gravity acceleration
const GROUND_FRICTION = 0.8; // Ground friction when bouncing
const AIR_RESISTANCE = 0.99; // Air resistance
const BOUNCE_DAMPING = 0.7; // How much energy is lost on bounce

export const useOrbManager = () => {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Keep orbsRef in sync with orbs state for animation loop
  useEffect(() => {
    orbsRef.current = orbs;
  }, [orbs]);

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
      mass: size / 50 // Mass based on size
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
    setOrbs(currentOrbs => [...currentOrbs, orb]);
    return orb;
  }, [createOrb]);

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

  const updateMovement = useCallback((orb: Orb) => {
    orb.moveTimer--;
    if (orb.moveTimer <= 0) {
      const rand = Math.random();
      if (rand < 0.3) {
        orb.moveState = 'idle';
        orb.vx = 0;
      } else if (rand < 0.6) {
        orb.moveState = 'walk';
        orb.vx = (Math.random() * 1.5 + 1) * (Math.random() < 0.5 ? -1 : 1);
      } else {
        orb.moveState = 'dash';
        orb.vx = (Math.random() * 4 + 4) * (Math.random() < 0.5 ? -1 : 1);
      }
      orb.moveTimer = Math.floor(Math.random() * 90 + 30);
    }

    orb.x += orb.vx;
    if (orb.x <= 0 || orb.x + orb.size >= CANVAS_WIDTH) {
      orb.x = Math.max(0, Math.min(orb.x, CANVAS_WIDTH - orb.size));
      orb.vx *= -1;
    }
  }, []);

  const animate = useCallback((canvas: HTMLCanvasElement, useSetInterval = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
  }, [drawRoundedImage, drawEffect, updateMovement]);

  const startAnimation = useCallback((canvas: HTMLCanvasElement) => {
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

  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    orbs,
    addOrb,
    removeOrb,
    updateOrb,
    clearAllOrbs,
    explodeOrbs,
    startAnimation,
    stopAnimation
  };
};
