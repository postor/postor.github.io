export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum TurnState {
  PLAYER_AIMING = 'PLAYER_AIMING',
  PLAYER_PROJECTILE_AIRBORNE = 'PLAYER_PROJECTILE_AIRBORNE',
  AI_AIMING = 'AI_AIMING',
  AI_PROJECTILE_AIRBORNE = 'AI_PROJECTILE_AIRBORNE',
  RESOLVING = 'RESOLVING',
}

export interface DifficultyConfig {
  windMax: number;
  breathingIntensity: number; // How much the aim wavers
  aiAccuracyError: number; // Random deviation in AI aim (radians)
  aiThinkTime: number; // How long AI waits
}

export interface GameStats {
  playerHp: number;
  aiHp: number;
  currentWind: number; // Positive = Right, Negative = Left
  isPlayerTurn: boolean;
  winner: 'Player' | 'AI' | null;
}