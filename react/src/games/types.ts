import type { Orb } from '../types/orb';

export interface GameConfig {
  [key: string]: any;
}

export interface GameState {
  [key: string]: any;
}

export interface GamePlugin {
  id: string;
  name: string;
  description: string;
  
  // Initialize game state when switching to this mode
  initialize(currentOrbs: Orb[]): {
    orbs: Orb[];
    state: GameState;
  };
  
  // Update game state each frame
  update(orbs: Orb[], state: GameState, canvas: HTMLCanvasElement): {
    orbs: Orb[];
    state: GameState;
  };
  
  // Render game-specific elements
  render(ctx: CanvasRenderingContext2D, orbs: Orb[], state: GameState): void;
  
  // Handle adding new orbs
  handleAddOrb(orb: Orb, currentOrbs: Orb[], state: GameState): {
    orb: Orb;
    state: GameState;
  };
  
  // Get/set configuration
  getConfig?(): GameConfig;
  updateConfig?(config: Partial<GameConfig>): void;
  
  // Admin UI component (optional)
  AdminComponent?: React.ComponentType<{
    config: GameConfig;
    onConfigChange: (config: Partial<GameConfig>) => void;
  }>;
}
