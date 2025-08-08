export interface Orb {
  id: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  dx: number;
  dy: number;
  vx: number;
  dir: number;
  isEntering: boolean;
  entryType: 'drop' | 'toss';
  bounceCount: number;
  role: 'none' | 'mod' | 'lurker' | 'passerby';
  label: string;
  ringColor: string;
  ringWidth: number;
  roleIcon: string;
  roleIconPosition: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  moveTimer: number;
  moveState: 'idle' | 'walk' | 'dash';
  size: number;
  shrinking: boolean;
  targetSize: number;
  imgLoaded: boolean;
  imgSrc: string;
  // Physics properties
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  exploding: boolean;
  explosionForce: number;
  explosionAngle: number;
  mass: number; // For realistic physics
  // Snake mode properties
  snakeIndex?: number; // Position in snake chain (0 = head)
  snakePathProgress?: number; // Progress along the edge path (0-1)
  collectedBySnake?: boolean; // Whether this orb has been collected by the snake head
  collectionOrder?: number; // Order in which this orb was collected (for stable snake positioning)
  // Pachinko mode properties
  waitingToDrop?: boolean; // Whether this orb is waiting to be dropped in pachinko mode
  dropOrder?: number; // Order in which this orb should drop
  pachinkoScore?: number; // Points scored in pachinko mode
  pachinkoSlot?: number; // Which slot the orb landed in
  // Game participation
  gameParticipant?: boolean; // Whether this orb participates in games (vs being audience)
}

export interface OrbConfig {
  imgSrc?: string;
  entryType?: 'drop' | 'toss';
  role?: 'none' | 'mod' | 'lurker' | 'passerby';
  label?: string;
  ringColor?: string;
  ringWidth?: number;
  roleIcon?: string;
  roleIconPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: number;
}

export type AnimationMode = 'physics' | 'snake' | 'sand';

export interface SavedOrb {
  imgSrc: string;
  entryType: 'drop' | 'toss';
  role: 'none' | 'mod' | 'lurker' | 'passerby';
  label: string;
  ringColor: string;
  ringWidth: number;
  roleIcon: string;
  roleIconPosition: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
  gameParticipant?: boolean;
}

export interface PachinkoConfig {
  rows: number;
  bounciness: number;
  dragX: number;
  dragY: number;
  bowlCount: number;
  bowlValues: number[];
  bowlColors: string[];
  bowlWidthPattern: number; // 5, 7, or 9 - must be odd
}
