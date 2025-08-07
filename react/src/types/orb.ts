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
}
