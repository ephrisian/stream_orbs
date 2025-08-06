import { useEffect, useRef, useCallback, useState } from 'react';
import type { SoundTrigger, KeyCombo, SavedSoundTrigger } from '../types/sound';

export const useSoundManager = () => {
  const [soundTriggers, setSoundTriggers] = useState<SoundTrigger[]>([]);
  const playingAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const activeGIFsRef = useRef<HTMLImageElement[]>([]);

  const createSoundTrigger = useCallback((): SoundTrigger => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      soundUrl: '',
      gifUrl: '',
      keyCombo: '',
      volume: 1,
      gifPosition: 'bottom-left'
    };
  }, []);

  const addSoundTrigger = useCallback(() => {
    const newTrigger = createSoundTrigger();
    setSoundTriggers(prev => [...prev, newTrigger]);
    return newTrigger;
  }, [createSoundTrigger]);

  const removeSoundTrigger = useCallback((triggerId: string) => {
    setSoundTriggers(prev => {
      const trigger = prev.find(t => t.id === triggerId);
      if (trigger) {
        if (trigger._gifObjectUrl) URL.revokeObjectURL(trigger._gifObjectUrl);
        if (trigger._objectUrl) URL.revokeObjectURL(trigger._objectUrl);
      }
      return prev.filter(t => t.id !== triggerId);
    });
  }, []);

  const updateSoundTrigger = useCallback((triggerId: string, updates: Partial<SoundTrigger>) => {
    setSoundTriggers(prev => 
      prev.map(trigger => 
        trigger.id === triggerId ? { ...trigger, ...updates } : trigger
      )
    );
  }, []);

  const parseKeyCombo = useCallback((comboStr: string): KeyCombo => {
    if (!comboStr) return { shift: false, alt: false, ctrl: false };
    const parts = comboStr.toLowerCase().split('+');
    return {
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      ctrl: parts.includes('ctrl'),
      key: parts.find(p => !['shift', 'alt', 'ctrl'].includes(p))
    };
  }, []);

  const isAudioUrlValid = useCallback((url: string): boolean => {
    return /\.(mp3|wav|ogg|aac|m4a|webm)(\?.*)?$/.test(url);
  }, []);

  const applyGifPosition = useCallback((img: HTMLImageElement, position: string) => {
    const pos = position || 'bottom-left';
    img.style.position = 'absolute';
    img.style.zIndex = '1000';
    img.style.maxHeight = '200px';
    img.style.pointerEvents = 'none';

    switch (pos) {
      case 'top-left':
        img.style.top = '10px';
        img.style.left = '10px';
        break;
      case 'top-right':
        img.style.top = '10px';
        img.style.right = '10px';
        break;
      case 'bottom-right':
        img.style.bottom = '10px';
        img.style.right = '10px';
        break;
      case 'center':
        img.style.top = '50%';
        img.style.left = '50%';
        img.style.transform = 'translate(-50%, -50%)';
        break;
      default:
        img.style.bottom = '10px';
        img.style.left = '10px';
    }
  }, []);

  const playSoundAndGif = useCallback(async (trigger: SoundTrigger): Promise<void> => {
    trigger._lastPlayed = trigger._lastPlayed || 0;
    const now = Date.now();
    if (now - trigger._lastPlayed < 500) return;
    trigger._lastPlayed = now;

    const existing = playingAudioMapRef.current.get(trigger.id);
    if (existing && !existing.ended && !existing.paused && !existing.seeking) {
      if (!existing.dataset.startTime || now - parseInt(existing.dataset.startTime) < 10000) {
        console.warn('Sound already playing');
        return;
      }
    }

    // Play sound
    if (trigger._objectUrl || trigger.soundUrl) {
      try {
        const audio = new Audio();
        audio.volume = trigger.volume ?? 1;
        audio.preload = 'auto';

        if (trigger._objectUrl) {
          audio.src = trigger._objectUrl;
        } else if (isAudioUrlValid(trigger.soundUrl)) {
          audio.src = trigger.soundUrl;
        } else {
          console.error('Invalid audio URL');
          return;
        }

        playingAudioMapRef.current.set(trigger.id, audio);
        audio.dataset.startTime = Date.now().toString();

        await audio.play();
        
        audio.onended = () => playingAudioMapRef.current.delete(trigger.id);
        audio.onerror = () => {
          playingAudioMapRef.current.delete(trigger.id);
          console.error('Audio playback error');
        };

        setTimeout(() => {
          if (playingAudioMapRef.current.get(trigger.id) === audio) {
            playingAudioMapRef.current.delete(trigger.id);
          }
        }, 10000);

      } catch (e) {
        console.error('Audio error:', e);
      }
    }

    // Show GIF
    const gifSrc = trigger._gifObjectUrl || trigger.gifUrl;
    if (gifSrc && gifSrc.trim()) {
      if (activeGIFsRef.current.length > 0) {
        console.warn('GIF already active');
        return;
      }

      const stage = document.body; // or a specific container
      if (!stage) {
        console.error('Cannot find stage element');
        return;
      }

      const img = document.createElement('img');
      img.src = gifSrc;
      img.style.opacity = '1';
      img.style.transition = 'opacity 0.5s ease';

      applyGifPosition(img, trigger.gifPosition);

      stage.appendChild(img);
      activeGIFsRef.current.push(img);

      setTimeout(() => {
        img.style.opacity = '0';
        setTimeout(() => {
          img.remove();
          const index = activeGIFsRef.current.indexOf(img);
          if (index !== -1) activeGIFsRef.current.splice(index, 1);
        }, 500);
      }, 3500);
    }
  }, [isAudioUrlValid, applyGifPosition]);

  const stopAllSounds = useCallback(() => {
    playingAudioMapRef.current.forEach(audio => audio.pause());
    playingAudioMapRef.current.clear();
  }, []);

  const saveTriggers = useCallback(() => {
    const saved: SavedSoundTrigger[] = soundTriggers.map(trigger => ({
      label: trigger.label,
      soundUrl: trigger.soundUrl,
      gifUrl: trigger.gifUrl,
      keyCombo: trigger.keyCombo,
      volume: trigger.volume,
      gifPosition: trigger.gifPosition
    }));
    localStorage.setItem('soundTriggers', JSON.stringify(saved));
  }, [soundTriggers]);

  const loadTriggers = useCallback(() => {
    const saved = localStorage.getItem('soundTriggers');
    if (saved) {
      try {
        const parsed: SavedSoundTrigger[] = JSON.parse(saved);
        const triggers: SoundTrigger[] = parsed.map(saved => ({
          ...saved,
          id: Math.random().toString(36).substr(2, 9)
        }));
        setSoundTriggers(triggers);
      } catch (e) {
        console.warn('Failed to load saved triggers:', e);
      }
    }
  }, []);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or listening for key combo
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' ||
          (document.activeElement as any)?.textContent?.includes('Listening')) {
        return;
      }

      soundTriggers.forEach(trigger => {
        const combo = parseKeyCombo(trigger.keyCombo);
        if (
          (!combo.shift || e.shiftKey) &&
          (!combo.alt || e.altKey) &&
          (!combo.ctrl || e.ctrlKey) &&
          e.key.toLowerCase() === combo.key?.toLowerCase()
        ) {
          e.preventDefault();
          playSoundAndGif(trigger);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [soundTriggers, parseKeyCombo, playSoundAndGif]);

  // Auto-save triggers when they change
  useEffect(() => {
    saveTriggers();
  }, [saveTriggers]);

  // Load triggers on mount
  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  return {
    soundTriggers,
    addSoundTrigger,
    removeSoundTrigger,
    updateSoundTrigger,
    playSoundAndGif,
    stopAllSounds,
    parseKeyCombo
  };
};
