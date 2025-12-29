
import { TileType } from '../../types';
import { GridManager } from '../managers/GridManager';
import { EffectManager } from '../managers/EffectManager';
import { GridUtils } from '../utils/GridUtils';

export const RocketProp = {
    canCreate(maxH: number, maxV: number): boolean {
        return maxH === 4 || maxV === 4;
    },

    getType(maxH: number, maxV: number): TileType {
         return maxH >= maxV ? TileType.ROCKET_H : TileType.ROCKET_V;
    },

    process(tile: any, gridManager: GridManager, effectManager: EffectManager, speed: number): any[] {
        const grid = gridManager.getGridArray();
        const rows = gridManager.rows;
        const cols = gridManager.cols;
        const type = tile.getData('type');
        const r = tile.getData('row');
        const c = tile.getData('col');
        
        let extra: any[] = [];
        if(type === TileType.ROCKET_H) {
            extra = GridUtils.getRow(grid, r, rows);
            effectManager.playRocketEffect(tile, true, extra, speed);
        } else {
            extra = GridUtils.getCol(grid, c, cols);
            effectManager.playRocketEffect(tile, false, extra, speed);
        }
        return extra;
    },

    async combineWithRocket(t1: any, t2: any, centerTile: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const grid = gridManager.getGridArray();
        const r = centerTile.getData('row');
        const c = centerTile.getData('col');
        const rowTiles = GridUtils.getRow(grid, r, gridManager.rows);
        const colTiles = GridUtils.getCol(grid, c, gridManager.cols);
        
        effectManager.playRocketEffect(centerTile, true, rowTiles);
        effectManager.playRocketEffect(centerTile, false, colTiles);
        
        return [t1, t2, ...rowTiles, ...colTiles];
    }
};
