
import { TileType } from '../../types';
import { GridUtils } from './GridUtils';

export class MoveFinder {
  /**
   * Scans the grid to find the first available valid move.
   * Returns the two tiles that form a valid move, or null if deadlocked.
   */
  static findPotentialMove(grid: any[][], rows: number, cols: number): { t1: any, t2: any } | null {
    // Helper to check if a tile is movable
    const isMovable = (t: any) => {
        if (!t || !t.active) return false;
        const type = t.getData('type');
        const locked = t.getData('locked');
        // Wood and Stone cannot be swapped. Locked cannot be swapped.
        if (locked || type === TileType.WOOD || type === TileType.STONE) return false;
        // Jelly prevents swapping? Usually in Candy Crush jelly tiles CAN move unless config says otherwise.
        // In this codebase's logic (InputManager), Jelly prevents drag. So we count it as immovable.
        if (t.getData('jelly')) return false; 
        return true;
    };

    // Helper to check if a specific swap results in a valid state
    const isValidSwap = (r1: number, c1: number, r2: number, c2: number) => {
        const t1 = grid[r1][c1];
        const t2 = grid[r2][c2];

        if (!isMovable(t1) || !isMovable(t2)) return false;

        // 1. Check Special Combos (e.g. Magic+Bomb, Rocket+Rocket)
        const combo = GridUtils.checkCombo(t1, t2);
        if (combo) return true;

        // 2. Check Match-3 Logic
        // Temporarily swap data in the grid array to check for matches
        // Note: We don't move the visual objects, just the grid references for calculation
        grid[r1][c1] = t2;
        grid[r2][c2] = t1;
        
        // Update internal data coordinates for the check (GridUtils relies on row/col data or grid index)
        // GridUtils.checkMatchAt uses grid indices, but relies on tile.getData('color')
        // We don't need to update tile.data if we just rely on the grid[][] positions, 
        // BUT GridUtils.checkMatchAt checks the grid.
        
        const hasMatch = GridUtils.checkMatchAt(grid, r1, c1, rows, cols) || 
                         GridUtils.checkMatchAt(grid, r2, c2, rows, cols);

        // Revert swap
        grid[r1][c1] = t1;
        grid[r2][c2] = t2;

        return hasMatch;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Check Right
        if (c < cols - 1) {
            if (isValidSwap(r, c, r, c + 1)) {
                return { t1: grid[r][c], t2: grid[r][c+1] };
            }
        }
        // Check Down
        if (r < rows - 1) {
            if (isValidSwap(r, c, r + 1, c)) {
                return { t1: grid[r][c], t2: grid[r+1][c] };
            }
        }
      }
    }

    return null;
  }
}
