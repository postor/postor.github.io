
import { TileType } from '../../types';
import { GridManager } from '../managers/GridManager';
import { EffectManager } from '../managers/EffectManager';
import { GridUtils } from '../utils/GridUtils';

export const BombProp = {
    canCreate(maxH: number, maxV: number): boolean {
        return maxH >= 3 && maxV >= 3;
    },

    getType(): TileType {
        return TileType.BOMB;
    },

    process(tile: any, gridManager: GridManager, effectManager: EffectManager, speed: number): any[] {
        const grid = gridManager.getGridArray();
        const rows = gridManager.rows;
        const cols = gridManager.cols;
        const r = tile.getData('row');
        const c = tile.getData('col');
        
        const extra = GridUtils.getArea(grid, r, c, 1, rows, cols);
        effectManager.playExplosion(tile.x, tile.y, extra, speed);
        return extra;
    },

    async combineWithBomb(t1: any, t2: any, centerTile: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const grid = gridManager.getGridArray();
        const r = centerTile.getData('row'); 
        const c = centerTile.getData('col');
        const area = GridUtils.getArea(grid, r, c, 2, gridManager.rows, gridManager.cols);
        effectManager.playExplosion(centerTile.x, centerTile.y, area);
        return [t1, t2, ...area];
    },

    async combineWithRocket(bomb: any, rocket: any, centerTile: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const grid = gridManager.getGridArray();
        const centerR = centerTile.getData('row');
        const centerC = centerTile.getData('col');
        
        bomb.setData('processedForDestruction', false);
        rocket.setData('processedForDestruction', false);
        
        let areaTiles: any[] = [];
        for(let r = centerR - 1; r <= centerR + 1; r++) areaTiles = areaTiles.concat(GridUtils.getRow(grid, r, gridManager.rows));
        for(let c = centerC - 1; c <= centerC + 1; c++) areaTiles = areaTiles.concat(GridUtils.getCol(grid, c, gridManager.cols));
        
        effectManager.highlightArea(areaTiles, 0xffaa00, 0.5);
        return [bomb, rocket, ...areaTiles];
    }
};
