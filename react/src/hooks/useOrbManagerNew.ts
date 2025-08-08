import { useState, useRef, useCallback, useEffect } from 'react';
import type { Orb, OrbConfig } from '../types/orb';
import { getGameById } from '../games';
import type { GamePlugin, GameState } from '../games/types';

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;

export const useOrbManager = () => {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string>('physics');
  const [gameState, setGameState] = useState<GameState>({});
  
  const orbsRef = useRef<Orb[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentGameRef = useRef<GamePlugin | null>(null);
  const gameStateRef = useRef<GameState>({});

  // Keep refs in sync with state for animation loop
  useEffect(() => {
    orbsRef.current = orbs;
  }, [orbs]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    currentGameRef.current = getGameById(currentGameId) || null;
  }, [currentGameId]);

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
      targetSize: Math.max(size * 0.8, 32),
      imgLoaded: false,
      imgSrc: config.imgSrc || '',
      // Physics properties
      velocityX: config.entryType === 'toss' ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 2,
      velocityY: 0,
      onGround: false,
      exploding: false,
      explosionForce: 0,
      explosionAngle: 0,
      mass: size / 50,
      // Game-specific properties (will be set by games as needed)
      snakeIndex: undefined,
      snakePathProgress: undefined,
      collectedBySnake: false,
      collectionOrder: undefined,
      waitingToDrop: false,
      dropOrder: undefined,
      pachinkoScore: undefined,
      pachinkoSlot: undefined
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
      const game = getGameById(currentGameId);
      if (game && game.handleAddOrb) {
        const result = game.handleAddOrb(orb, currentOrbs, gameStateRef.current);
        setGameState(result.state);
        return [...currentOrbs, result.orb];
      }
      return [...currentOrbs, orb];
    });
    
    return orb;
  }, [createOrb, currentGameId]);

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
          updatedOrb.velocityY = -8 - (Math.random() * 4);
          updatedOrb.velocityX = (Math.random() - 0.5) * 6;
          updatedOrb.onGround = false;
          updatedOrb.exploding = false;
          updatedOrb.shrinking = false;
          
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
      
      if (distance < 200) {
        const angle = Math.atan2(dy, dx);
        const explosionForce = force * (1 - distance / 200);
        
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

  // Re-run a specific orb through the current game (if supported)
  const rerunOrb = useCallback((orbId: string) => {
    const game = getGameById(currentGameId);
    if (game?.id === 'sand') { // Only pachinko supports rerun for now
      setOrbs(currentOrbs => currentOrbs.map(orb => {
        if (orb.id === orbId) {
          // Reset orb for pachinko rerun
          return {
            ...orb,
            x: CANVAS_WIDTH / 2 - orb.size / 2,
            y: -20,
            velocityX: (Math.random() - 0.5) * 0.5,
            velocityY: 0,
            onGround: false,
            isEntering: true,
            exploding: false,
            pachinkoScore: undefined,
            pachinkoSlot: undefined,
            ringColor: '#ffffff'
          };
        }
        return orb;
      }));
    }
  }, [currentGameId]);

  // Switch to a different game mode
  const switchGameMode = useCallback((gameId: string) => {
    const game = getGameById(gameId);
    if (!game) {
      console.error(`Game with id "${gameId}" not found`);
      return;
    }

    console.log('Switching to game mode:', game.name);
    setCurrentGameId(gameId);
    
    // Initialize the new game with current orbs
    const result = game.initialize(orbsRef.current);
    setOrbs(result.orbs);
    setGameState(result.state);
  }, []);

  // Update game configuration
  const updateGameConfig = useCallback((config: any) => {
    const game = getGameById(currentGameId);
    if (game && game.updateConfig) {
      game.updateConfig(config);
    }
  }, [currentGameId]);

  // Get game configuration
  const getGameConfig = useCallback(() => {
    const game = getGameById(currentGameId);
    if (game && game.getConfig) {
      return game.getConfig();
    }
    return {};
  }, [currentGameId]);

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
      const offset = orb.size / 2 + orb.ringWidth + 8;
      
      switch (orb.roleIconPosition) {
        case 'top':
          iconY = orb.y - 10;
          break;
        case 'bottom':
          iconY = orb.y + orb.size + 20;
          break;
        case 'left':
          iconX = orb.x - 15;
          iconY = cy + 4;
          break;
        case 'right':
          iconX = orb.x + orb.size + 15;
          iconY = cy + 4;
          break;
        case 'center':
          iconX = cx;
          iconY = cy + 4;
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

      const game = currentGameRef.current;
      if (game) {
        // Let the current game handle the update logic
        const result = game.update(orbsRef.current, gameStateRef.current, canvas);
        
        // Update orbs and state if they changed
        if (result.orbs !== orbsRef.current) {
          setOrbs(result.orbs);
        }
        if (result.state !== gameStateRef.current) {
          setGameState(result.state);
        }
        
        // Let the game render any special elements
        game.render(ctx, orbsRef.current, gameStateRef.current);
        
        // Draw all orbs (only non-waiting ones for pachinko)
        for (const orb of orbsRef.current) {
          if (!orb.waitingToDrop) {
            drawRoundedImage(ctx, orb.img, orb.x, orb.y, orb.size);
            drawEffect(ctx, orb);
          }
        }
      }

      if (useSetInterval) {
        return;
      }

      animationFrameRef.current = requestAnimationFrame(() => frame());
    };

    if (useSetInterval) {
      console.log('Using setInterval animation for OBS compatibility');
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current as any);
      }
      animationFrameRef.current = setInterval(frame, 16) as any; // ~60fps
    } else {
      frame();
    }
  }, [drawRoundedImage, drawEffect]);

  const startAnimation = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
    
    if (animationFrameRef.current) {
      if (typeof animationFrameRef.current === 'number') {
        cancelAnimationFrame(animationFrameRef.current);
      } else {
        clearInterval(animationFrameRef.current as any);
      }
    }
    
    // Check if we're in OBS
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
    currentGameId,
    gameState,
    addOrb,
    removeOrb,
    updateOrb,
    clearAllOrbs,
    explodeOrbs,
    rerunOrb,
    startAnimation,
    stopAnimation,
    switchGameMode,
    updateGameConfig,
    getGameConfig
  };
};
