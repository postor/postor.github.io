
import { LevelConfig, CollectionTarget } from '../types';

export const ALL_COLORS = ['🍎', '💎', '🍃', '⭐', '🍇', '🟠'];

interface GeneratorParams {
  startId: number;
  endId: number;
  name: string;
  rows: number;
  cols: number;
  moves: number;
  colorsCount: number;
  iceCount?: number;
  woodChance?: number;
  stoneChance?: number;
  lockChance?: number;
  jellyChance?: number;
  jellyType?: 'A' | 'B';
  targets?: CollectionTarget[];
  scoreMultiplier?: number;
}

export const generateLevels = (params: GeneratorParams): LevelConfig[] => {
  const levels: LevelConfig[] = [];
  
  for (let id = params.startId; id <= params.endId; id++) {
      const targetScore = (params.scoreMultiplier || 1000) + (id * 100);
      
      const generatedGrid: string[][] = [];
      for(let r=0; r<params.rows; r++) {
          const rowArr: string[] = [];
          for(let c=0; c<params.cols; c++) {
              let cell = '-';
              const rand = Math.random();
              
              if (params.woodChance && rand < params.woodChance) {
                  cell = 'W';
              } else if (params.stoneChance && rand < (params.woodChance || 0) + params.stoneChance) {
                  cell = 'S';
              } else if (params.lockChance && rand < 0.15) { // Fixed small chance for locks if enabled
                  cell = Math.floor(Math.random() * params.colorsCount) + 'L';
              } else if (params.jellyChance && rand < 0.15) {
                  cell = Math.floor(Math.random() * params.colorsCount) + (params.jellyType || 'A');
              }
              
              rowArr.push(cell);
          }
          generatedGrid.push(rowArr);
      }

      levels.push({
          id,
          name: `${params.name} ${id}`,
          rows: params.rows,
          cols: params.cols,
          colors: ALL_COLORS.slice(0, params.colorsCount),
          moves: params.moves,
          targetScore,
          iceCount: params.iceCount || 0,
          collectionTargets: params.targets ? [...params.targets] : undefined, // Copy to avoid ref issues
          initialGrid: generatedGrid
      });
  }
  return levels;
};
