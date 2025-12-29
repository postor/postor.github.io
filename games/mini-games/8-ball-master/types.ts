export enum GameMode {
  MENU = 'MENU',
  PVP = 'PVP',
  PVE = 'PVE'
}

export enum PlayerTurn {
  PLAYER_1 = 'Player 1',
  PLAYER_2 = 'Player 2',
  AI = 'Gemini AI'
}

export type GameRule = '8_BALL' | '9_BALL' | 'SNOOKER';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type BallGroup = 'solids' | 'stripes' | null;

export interface BallPosition {
  id: number;
  x: number;
  y: number;
  color: string;
  isCue: boolean;
}

export interface HolePosition {
  x: number;
  y: number;
}

export interface ShotDecision {
  angle: number; // in radians
  force: number; // 0 to 1
  rationale: string;
  targetBallId?: number;
}

export interface GameStateData {
  cueBall: BallPosition;
  targetBalls: BallPosition[];
  holes: HolePosition[];
}