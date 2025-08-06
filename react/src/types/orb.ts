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
  moveTimer: number;
  moveState: 'idle' | 'walk' | 'dash';
  size: number;
  shrinking: boolean;
  targetSize: number;
  imgLoaded: boolean;
  imgSrc: string;
}

export interface OrbConfig {
  imgSrc?: string;
  entryType?: 'drop' | 'toss';
  role?: 'none' | 'mod' | 'lurker' | 'passerby';
  label?: string;
  ringColor?: string;
  ringWidth?: number;
  roleIcon?: string;
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
  size: number;
}
