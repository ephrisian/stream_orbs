export interface SoundTrigger {
  id: string;
  label: string;
  soundUrl: string;
  gifUrl: string;
  keyCombo: string;
  volume: number;
  gifPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  _file?: File;
  _objectUrl?: string;
  _gifFile?: File;
  _gifObjectUrl?: string;
  _lastPlayed?: number;
}

export interface SavedSoundTrigger {
  label: string;
  soundUrl: string;
  gifUrl: string;
  keyCombo: string;
  volume: number;
  gifPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface KeyCombo {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  key?: string;
}
