import { useEffect, useRef, useCallback, useState } from 'react';
import type { SoundTrigger, KeyCombo } from '../types/sound';
import { useSoundboardApi } from './useSoundboardApi';

export const useSoundManager = () => {
  const [soundTriggers, setSoundTriggers] = useState<SoundTrigger[]>([]);
  const playingAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  const {
    loading,
    error,
    getSoundTriggers,
    saveSoundTriggers,
    uploadSoundFile,
    uploadGifFile
  } = useSoundboardApi();

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

  const removeSoundTrigger = useCallback(async (triggerId: string) => {
    setSoundTriggers(prev => {
      const newTriggers = prev.filter(t => t.id !== triggerId);
      // Save to backend
      saveSoundTriggers(newTriggers);
      return newTriggers;
    });
  }, [saveSoundTriggers]);

  const updateSoundTrigger = useCallback(async (triggerId: string, updates: Partial<SoundTrigger>) => {
    // Handle file uploads if new files are provided
    let finalUpdates = { ...updates };
    
    if (updates._file) {
      const soundUrl = await uploadSoundFile(updates._file);
      if (soundUrl) {
        finalUpdates.soundUrl = soundUrl;
        delete finalUpdates._file;
      }
    }
    
    if (updates._gifFile) {
      const gifUrl = await uploadGifFile(updates._gifFile);
      if (gifUrl) {
        finalUpdates.gifUrl = gifUrl;
        delete finalUpdates._gifFile;
      }
    }
    
    setSoundTriggers(prev => {
      const newTriggers = prev.map(trigger => 
        trigger.id === triggerId ? { ...trigger, ...finalUpdates } : trigger
      );
      // Save to backend
      saveSoundTriggers(newTriggers);
      return newTriggers;
    });
  }, [uploadSoundFile, uploadGifFile, saveSoundTriggers]);

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

    // Play sound in admin page
    if (trigger.soundUrl) {
      try {
        const audio = new Audio();
        audio.volume = trigger.volume ?? 1;
        audio.preload = 'auto';

        if (isAudioUrlValid(trigger.soundUrl)) {
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

    // Send GIF trigger to OBS page via localStorage
    if (trigger.gifUrl && trigger.gifUrl.trim()) {
      console.log('Admin: Sending GIF trigger to OBS');
      localStorage.setItem('pendingGifTrigger', JSON.stringify(trigger));
    }

    console.log('useSoundManager: Sound played in admin, GIF trigger sent to OBS');
  }, [isAudioUrlValid]);

  // Add keyboard event handler for admin page
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      console.log('Admin: Key pressed:', e.key, 'Shift:', e.shiftKey, 'Alt:', e.altKey, 'Ctrl:', e.ctrlKey);

      let matched = false;
      soundTriggers.forEach((trigger) => {
        if (!trigger.keyCombo) return;

        const parts = trigger.keyCombo.toLowerCase().split('+');
        const hasShift = parts.includes('shift');
        const hasAlt = parts.includes('alt');
        const hasCtrl = parts.includes('ctrl');
        const key = parts.find((p: string) => !['shift', 'alt', 'ctrl'].includes(p));

        console.log('Admin: Checking trigger:', trigger.label, 'keyCombo:', trigger.keyCombo, 'pressed:', e.key);

        if (
          (!hasShift || e.shiftKey) &&
          (!hasAlt || e.altKey) &&
          (!hasCtrl || e.ctrlKey) &&
          e.key.toLowerCase() === key?.toLowerCase()
        ) {
          matched = true;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Admin: ✅ MATCH! Playing sound and sending GIF to OBS for:', trigger.label);
          playSoundAndGif(trigger);
        }
      });
      
      if (!matched) {
        console.log('Admin: No triggers matched for this key combination');
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    console.log('Admin: Keyboard event listener attached');

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      console.log('Admin: Keyboard event listener removed');
    };
  }, [soundTriggers, playSoundAndGif]);

  const stopAllSounds = useCallback(() => {
    playingAudioMapRef.current.forEach(audio => audio.pause());
    playingAudioMapRef.current.clear();
  }, []);

  // Load triggers from API on mount
  useEffect(() => {
    const loadTriggers = async () => {
      const triggers = await getSoundTriggers();
      // Convert SoundTriggerData to SoundTrigger with proper defaults
      const convertedTriggers: SoundTrigger[] = triggers.map(trigger => ({
        id: trigger.id,
        label: trigger.label,
        soundUrl: trigger.soundUrl || '',
        gifUrl: trigger.gifUrl || '',
        keyCombo: trigger.keyCombo,
        volume: trigger.volume,
        gifPosition: (trigger.gifPosition as SoundTrigger['gifPosition']) || 'bottom-left'
      }));
      setSoundTriggers(convertedTriggers);
    };
    loadTriggers();
  }, [getSoundTriggers]);

  return {
    soundTriggers,
    loading,
    error,
    addSoundTrigger,
    removeSoundTrigger,
    updateSoundTrigger,
    playSoundAndGif,
    stopAllSounds,
    parseKeyCombo
  };
};
