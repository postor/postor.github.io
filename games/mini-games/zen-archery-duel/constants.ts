import { Difficulty, DifficultyConfig } from './types';

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 600;

export const GRAVITY = 800;
export const ARROW_SPEED = 900;
export const MAX_HP = 100;
export const DAMAGE_BODY = 20;
export const DAMAGE_HEAD = 50;

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.BEGINNER]: {
    windMax: 0,
    breathingIntensity: 0.02, // Very slight sway
    aiAccuracyError: 0.3, // Large error margin (~17 degrees)
    aiThinkTime: 2000,
  },
  [Difficulty.INTERMEDIATE]: {
    windMax: 150, // Moderate wind
    breathingIntensity: 0.08, // Noticeable sway
    aiAccuracyError: 0.1, // Small error
    aiThinkTime: 1500,
  },
  [Difficulty.ADVANCED]: {
    windMax: 400, // Strong wind
    breathingIntensity: 0.15, // Hard to hold steady
    aiAccuracyError: 0.02, // Deadly accurate
    aiThinkTime: 1000,
  },
};

export const COLORS = {
  background: 0x87CEEB, // Sky blue
  ground: 0x2d5a27, // Forest green
  player: 0x003366, // Dark Blue (High contrast)
  ai: 0xCC0000, // Strong Red
  arrow: 0x1f2937, // Dark Gray
  trajectory: 0xffffff,
};