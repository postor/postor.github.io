
// Define Phaser on window for fallback if import fails in some envs
declare global {
  interface Window {
    Phaser: any;
  }
}

export enum TileType {
  NORMAL = 'NORMAL',
  ROCKET_H = 'ROCKET_H', // Clears Row
  ROCKET_V = 'ROCKET_V', // Clears Column
  BOMB = 'BOMB',         // Area Blast
  MAGIC = 'MAGIC',       // Color clear
  WOOD = 'WOOD',         // Destructible Obstacle
  STONE = 'STONE',       // Indestructible Obstacle
}

export interface TileData {
  id: number;
  row: number;
  col: number;
  color: string;
  type: TileType;
  locked?: boolean;
  jelly?: 'A' | 'B'; // A = Normal Jelly, B = Infectious Jelly
}

export interface CollectionTarget {
  type: string; // Emoji color OR TileType (e.g. 'ROCKET_H') OR 'ICE' OR 'LOCK' OR 'JELLY' OR 'WOOD'
  count: number;
}

export interface TutorialStep {
  text: string;
  // Which tiles are allowed to be interacted with (swapped)
  highlight: { r: number, c: number }[]; 
}

export interface LevelConfig {
  id?: number;
  name?: string;
  rows: number;
  cols: number;
  colors: string[]; // Emojis like 🍎, 💎
  moves: number;
  targetScore: number;
  iceCount: number; // Randomly place this many ice blocks (Generation only)
  collectionTargets?: CollectionTarget[]; // Optional specific targets
  
  initialGrid?: string[][]; // Fixed layout codes
  tutorialSteps?: TutorialStep[];
}

export interface GameState {
  score: number;
  movesLeft: number;
  levelConfig: LevelConfig;
  status: 'playing' | 'won' | 'lost';
  targetsLeft?: { [key: string]: number }; // Current progress
}

// LocalStorage Configuration
export const STORAGE_PREFIX = 'match3_';
export const STORAGE_KEYS = {
  MAX_LEVEL: `${STORAGE_PREFIX}max_level`,
  STARS: `${STORAGE_PREFIX}stars`,
  LIVES: `${STORAGE_PREFIX}lives`,
  NEXT_HEART: `${STORAGE_PREFIX}next_heart_time`,
  HIGH_SCORES: `${STORAGE_PREFIX}high_scores`,
};

export const DEFAULT_CONFIG: LevelConfig = {
  rows: 8,
  cols: 8,
  colors: ['🍎', '💎', '🍃', '⭐', '🍇'],
  moves: 20,
  targetScore: 2000,
  iceCount: 0
};
