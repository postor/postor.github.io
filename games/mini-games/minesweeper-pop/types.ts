export enum CellState {
  HIDDEN,
  REVEALED,
  FLAGGED,
  EXPLODED // Specific state when a mine is hit
}

export interface CellData {
  id: number;
  row: number;
  col: number;
  isMine: boolean;
  neighborMines: number;
  state: CellState;
}

export enum GameStatus {
  IDLE,
  PLAYING,
  WON,
  LOST
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface DifficultyConfig {
  name: string;
  rows: number;
  cols: number;
  mines: number;
  color: string; // Tailwind color class snippet (e.g., 'green')
}

export interface ScoreRecord {
  time: number;
  date: string;
}

export enum ControlMode {
  DIG,
  FLAG
}

// Config prefix for local storage
export const STORAGE_PREFIX = 'mine_sweeper_';