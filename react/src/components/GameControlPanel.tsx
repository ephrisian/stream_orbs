import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  Chip,
  Divider 
} from '@mui/material';
import { useOrbManager } from '../hooks/useOrbManager';
import { getGameById } from '../games';

interface GameControlPanelProps {
  className?: string;
}

export const GameControlPanel: React.FC<GameControlPanelProps> = ({ className = '' }) => {
  const { currentGameId, gameState, updateGameConfig, getGameConfig } = useOrbManager();
  
  const currentGame = getGameById(currentGameId);
  const gameConfig = getGameConfig();

  if (!currentGame) {
    return (
      <Card className={className} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
            🎮 Game Control Panel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No game selected
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleQuickStart = () => {
    if (currentGame.id === 'duckrace') {
      updateGameConfig({ triggerStart: true });
    }
  };

  const handleQuickReset = () => {
    if (currentGame.id === 'duckrace') {
      updateGameConfig({ triggerReset: true });
    }
  };

  const isDuckRace = currentGame.id === 'duckrace';
  const duckState = gameState as any;

  return (
    <Card className={className} sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          🎮 {currentGame.name} Control Panel
        </Typography>
        
        {isDuckRace && (
          <Box>
            {/* Status Section */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: duckState?.isRacing ? 'success.light' : 'grey.100',
                borderRadius: 1,
                mb: 2
              }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Status: 
                  <Chip 
                    label={duckState?.isRacing ? '🏁 Racing in Progress' : '⏸️ Ready to Start'}
                    color={duckState?.isRacing ? 'success' : 'default'}
                    sx={{ ml: 1 }}
                  />
                </Typography>
                {duckState?.winner && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'warning.main', fontWeight: 'bold' }}>
                    🏆 Winner: Lane {((duckState.lanes?.[duckState.winner] || 0) + 1)}
                  </Typography>
                )}
              </Box>

              {/* Control Buttons */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleQuickStart}
                  disabled={duckState?.isRacing}
                  startIcon={<span>🏁</span>}
                  size="large"
                >
                  Start Race
                </Button>

                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleQuickReset}
                  startIcon={<span>🔄</span>}
                  size="large"
                >
                  Reset Race
                </Button>
              </Box>

              {/* Race Results */}
              {duckState?.finishPositions && duckState.finishPositions.length > 0 && (
                <Box sx={{ 
                  p: 2,
                  backgroundColor: 'warning.light',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'warning.main',
                  mb: 2
                }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                    🏆 Race Results
                  </Typography>
                  <Box>
                    {duckState.finishPositions.slice(0, 3).map((orbId: string, index: number) => (
                      <Typography key={orbId} variant="body2" sx={{ 
                        mb: 0.5,
                        color: index === 0 ? 'warning.dark' : 'text.primary',
                        fontWeight: index === 0 ? 'bold' : 'normal'
                      }}>
                        <strong>#{index + 1}</strong> - Lane {((duckState.lanes?.[orbId] || 0) + 1)}
                        {index === 0 && ' 🥇'}
                        {index === 1 && ' 🥈'}
                        {index === 2 && ' 🥉'}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Quick Stats */}
            <Box sx={{ 
              p: 2,
              backgroundColor: 'primary.light',
              borderRadius: 1,
              border: 1,
              borderColor: 'primary.main'
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                📊 Quick Stats
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <Typography variant="body2">Lanes: {gameConfig?.laneCount || 4}</Typography>
                <Typography variant="body2">Distance: {gameConfig?.raceDistance || 500}px</Typography>
                <Typography variant="body2">Speed: {gameConfig?.raceSpeed || 2}</Typography>
                <Typography variant="body2">Participants: {Object.keys(duckState?.lanes || {}).length}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {!isDuckRace && (
          <Box sx={{ 
            p: 2,
            backgroundColor: 'grey.100',
            borderRadius: 1,
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="text.secondary">
              Game-specific controls will appear here when available.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GameControlPanel;
