import React, { useState, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { Canvas } from '../components/Canvas';
import Soundboard from '../components/Soundboard';
import OrbAdminSimple from '../components/OrbAdminSimple';
import { GameModeAdmin } from '../components/GameModeAdmin';
import { useOrbManager } from '../hooks/useOrbManager';
import { useSoundManager } from '../hooks/useSoundManager';

export const AdminPage: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false); // Start with preview hidden
  
  const {
    orbs,
    currentGameId,
    gameState,
    addOrb,
    removeOrb,
    updateOrb,
    clearAllOrbs,
    rerunOrb,
    startAnimation,
    updateGameConfig,
    getGameConfig,
    switchGameMode
  } = useOrbManager();

  const {
    soundTriggers,
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
    <Box sx={{ 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      position: 'relative',
      p: { xs: 2, md: 2 }
    }}>
      {/* Fixed Canvas - Always locked to left side */}
      {showPreview && (
        <Box sx={{ 
          position: 'fixed',
          left: 16,
          top: 80,
          zIndex: 1000,
          background: '#ffffff', 
          borderRadius: 2, 
          boxShadow: 3, 
          p: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 720,
          width: 405,
          border: '2px solid #e0e0e0'
        }}>
          <Canvas 
            onAnimationStart={handleCanvasReady}
            backgroundColor="#00ff00"
            showBorder={true}
          />
        </Box>
      )}
      
      {/* Admin Content - with margin when canvas is shown */}
      <Box sx={{ 
        ml: showPreview ? '440px' : 0, // 405px canvas + 35px spacing
        minWidth: '1000px', // Increased to ensure participant toggle and delete stay in same row
        maxWidth: 'calc(100vw - 460px)', // Prevent overflow when canvas is shown
        transition: 'margin 0.3s ease'
      }}>
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
        
        <Box sx={{ mb: 2 }}>
          <GameModeAdmin 
            currentGameId={currentGameId}
            gameState={gameState}
            gameConfig={getGameConfig()}
            orbs={orbs}
            onGameConfigChange={updateGameConfig}
            onRerunOrb={rerunOrb}
            onGameModeChange={switchGameMode}
          />
        </Box>
        
        <Box>
          <OrbAdminSimple 
            orbs={orbs}
            onAddOrb={addOrb}
            onUpdateOrb={updateOrb}
            onRemoveOrb={removeOrb}
            onClearAllOrbs={clearAllOrbs}
            showPreview={showPreview}
            onTogglePreview={handleTogglePreview}
            animationMode={currentGameId || 'physics'}
            onRerunOrbThroughPachinko={rerunOrb}
          />
        </Box>
      </Box>
    </Box>
  );
};
