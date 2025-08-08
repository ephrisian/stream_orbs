import type { GamePlugin } from './types';
import { physicsGame } from './physics';
import { snakeGame } from './snake';
import { pachinkoGame } from './pachinko';
import DuckRaceGame from './duckrace';

// Game registry - add new games here
const gameRegistry: GamePlugin[] = [
  physicsGame,
  snakeGame,
  pachinkoGame,
  DuckRaceGame
];

export function getAvailableGames(): GamePlugin[] {
  return [...gameRegistry];
}

export function getGameById(id: string): GamePlugin | undefined {
  return gameRegistry.find(game => game.id === id);
}

export function getGameNames(): { id: string; name: string; description: string }[] {
  return gameRegistry.map(game => ({
    id: game.id,
    name: game.name,
    description: game.description
  }));
}
