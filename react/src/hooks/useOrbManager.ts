import { useState, useRef, useCallback, useEffect } from 'react';
import type { Orb, OrbConfig } from '../types/orb';

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;

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
      moveTimer: 0,
      moveState: 'idle',
      size,
      shrinking: false,
      targetSize: Math.max(size * 0.8, 32), // Minimum 32px, shrink to 80% instead of 60%
      imgLoaded: false,
      imgSrc: config.imgSrc || ''
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
    setOrbs(currentOrbs => currentOrbs.map(orb => 
      orb.id === orbId ? { ...orb, ...updates } : orb
    ));
  }, []);

  const clearAllOrbs = useCallback(() => {
    setOrbs([]);
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
    
    // Draw role icon
    if (orb.roleIcon) {
      ctx.font = `${Math.max(12, orb.size * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(orb.roleIcon, cx, orb.y - 10);
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
        const groundY = CANVAS_HEIGHT - orb.size - 10;

        if (orb.isEntering) {
          orb.dy += 0.5;
          orb.y += orb.dy;

          if (orb.y + orb.size >= groundY) {
            orb.y = groundY;
            orb.dy = -orb.dy * 0.5;
            orb.bounceCount++;

            if ((orb.entryType === 'drop' && orb.bounceCount > 1) || 
                (orb.entryType === 'toss' && orb.bounceCount > 2)) {
              orb.y = groundY;
              orb.dy = 0;
              orb.isEntering = false;
              orb.shrinking = true;
              orb.moveTimer = Math.floor(Math.random() * 90 + 30);
            }
          }

          if (orb.entryType === 'toss') {
            orb.x += orb.dx;
            if (orb.x <= 0 || orb.x + orb.size >= CANVAS_WIDTH) {
              orb.dx *= -1;
            }
          }
        } else {
          updateMovement(orb);
        }

        if (orb.shrinking && orb.size > orb.targetSize) {
          orb.size -= (orb.size - orb.targetSize) * 0.1;
          if (Math.abs(orb.size - orb.targetSize) < 0.5) {
            orb.size = orb.targetSize;
            orb.shrinking = false;
          }
          orb.y = CANVAS_HEIGHT - orb.size - 10 - orb.ringWidth / 2;
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
    startAnimation,
    stopAnimation
  };
};
