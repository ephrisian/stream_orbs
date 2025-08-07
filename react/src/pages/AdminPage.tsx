import React, { useState, useCallback, useEffect } from 'react';
import { Box, Stack } from '@mui/material';
import { Canvas } from '../components/Canvas';
import Soundboard from '../components/Soundboard';
import OrbAdminClean from '../components/OrbAdminClean';
import { useOrbManager } from '../hooks/useOrbManager';
import { useSoundManager } from '../hooks/useSoundManager';

export const AdminPage: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false); // Start with preview hidden
  
  const {
    orbs,
    addOrb,
    removeOrb,
    updateOrb,
    clearAllOrbs,
    startAnimation
  } = useOrbManager();

  console.log('Admin Page - Current orbs count:', orbs.length);
  console.log('Admin Page - Orbs array:', orbs);

  const {
    soundTriggers,
    loading,
    error,
    addSoundTrigger,
    removeSoundTrigger,
    updateSoundTrigger,
    playSoundAndGif,
    stopAllSounds
  } = useSoundManager();

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    startAnimation(canvas);
  }, [startAnimation]);

  const handleTogglePreview = useCallback(() => {
    const newShowPreview = !showPreview;
    setShowPreview(newShowPreview);
    localStorage.setItem('showPreview', JSON.stringify(newShowPreview));
  }, [showPreview]);

  // Load saved preview state on mount
  useEffect(() => {
    const savedShowPreview = localStorage.getItem('showPreview');
    if (savedShowPreview !== null) {
      setShowPreview(JSON.parse(savedShowPreview));
    }
  }, []);

  return (
    <Box sx={{ p: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="flex-start">
        {/* Left: Canvas (conditionally rendered) */}
        {showPreview && (
          <Box sx={{ 
            background: '#ffffff', 
            borderRadius: 2, 
            boxShadow: 2, 
            p: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: 720,
            width: { xs: '100%', md: '405px' },
            flexShrink: 0
          }}>
            <Canvas 
              onAnimationStart={handleCanvasReady}
              backgroundColor="#00ff00"
              showBorder={true}
            />
          </Box>
        )}
        
        {/* Right: Soundboard (top), Orb Admin (bottom) */}
        <Box sx={{ flex: 1, width: '100%' }}>
          <Box sx={{ mb: 4 }}>
            <Soundboard 
              soundTriggers={soundTriggers}
              onAddSoundTrigger={addSoundTrigger}
              onRemoveSoundTrigger={removeSoundTrigger}
              onUpdateSoundTrigger={updateSoundTrigger}
              onPlaySoundAndGif={playSoundAndGif}
              onStopAllSounds={stopAllSounds}
            />
          </Box>
          <Box>
            <OrbAdminClean 
              orbs={orbs}
              onAddOrb={addOrb}
              onUpdateOrb={updateOrb}
              onRemoveOrb={removeOrb}
              onClearAllOrbs={clearAllOrbs}
              showPreview={showPreview}
              onTogglePreview={handleTogglePreview}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};
