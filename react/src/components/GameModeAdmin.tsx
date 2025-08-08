import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { getGameById, getGameNames } from '../games';
import type { Orb } from '../types/orb';

interface GameModeAdminProps {
  currentGameId: string;
  gameState: any;
  gameConfig: any;
  orbs: Orb[];
  onGameConfigChange: (config: any) => void;
  onRerunOrb: (orbId: string) => void;
  onGameModeChange: (gameId: string) => void;
}

export const GameModeAdmin: React.FC<GameModeAdminProps> = ({
  currentGameId,
  gameConfig,
  onGameConfigChange,
  onRerunOrb,
  onGameModeChange,
  orbs
}) => {
  const currentGame = getGameById(currentGameId);
  const availableGames = getGameNames();

  return (
    <Box>
      {/* Game Mode Selector */}
      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="game-mode-select-label">Game Mode</InputLabel>
          <Select
            labelId="game-mode-select-label"
            value={currentGameId}
            label="Game Mode"
            onChange={(e) => onGameModeChange(e.target.value)}
            sx={{ fontSize: '0.875rem' }}
          >
            {availableGames.map((game) => (
              <MenuItem key={game.id} value={game.id} sx={{ fontSize: '0.875rem' }}>
                {game.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Current Game Indicator - More Compact */}
      <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'primary.light', borderRadius: 1 }}>
        <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>
          🎮 {currentGame?.name || 'Unknown'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
          {currentGame?.description || 'No description available'}
        </Typography>
      </Box>

      {/* Show rerun button for games that support it */}
      {(currentGameId === 'pachinko' || currentGameId === 'duckrace') && orbs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {currentGameId === 'pachinko' ? 'Pachinko Actions' : 'Race Actions'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {orbs.filter(orb => orb.gameParticipant).map((orb, index) => (
              <Button
                key={orb.id}
                variant="outlined"
                size="small"
                onClick={() => onRerunOrb(orb.id)}
                sx={{ 
                  borderColor: orb.ringColor,
                  color: orb.ringColor === '#ffffff' ? 'text.primary' : orb.ringColor
                }}
              >
                Rerun {orb.label || `#${index + 1}`}
              </Button>
            ))}
            {orbs.filter(orb => orb.gameParticipant).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No participants selected. Use the participant toggles in Orb Admin to select orbs for this game.
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Game-specific configuration */}
      {currentGame && currentGame.AdminComponent && (
        <Box>
          <currentGame.AdminComponent 
            config={gameConfig}
            onConfigChange={onGameConfigChange}
          />
        </Box>
      )}
    </Box>
  );
};
