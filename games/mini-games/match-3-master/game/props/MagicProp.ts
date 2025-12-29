
import Phaser from 'phaser';
import { TileType } from '../../types';
import { GridManager } from '../managers/GridManager';
import { EffectManager } from '../managers/EffectManager';
import { GridUtils } from '../utils/GridUtils';

// Fallback logic
const PhaserLib = Phaser || window.Phaser;

export const MagicProp = {
    canCreate(maxH: number, maxV: number): boolean {
        return maxH >= 5 || maxV >= 5;
    },

    getType(): TileType {
        return TileType.MAGIC;
    },

    process(tile: any, gridManager: GridManager, effectManager: EffectManager, speed: number): any[] {
        const grid = gridManager.getGridArray();
        const color = GridUtils.getMostFrequentColorOnBoard(grid, { colors: [] });
        const extra = GridUtils.getAllTilesOfColor(grid, gridManager.getTileGroup(), color);
        effectManager.playMagicZap(tile, extra, speed);
        return extra;
    },

    async combineWithMagic(t1: any, t2: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const tilesToDestroy = gridManager.getTileGroup().getChildren() as any[];
        effectManager.playMagicZap(t1, tilesToDestroy.filter(t => t !== t1 && t !== t2));
        return tilesToDestroy;
    },

    async combineWithNormal(magic: any, normal: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const grid = gridManager.getGridArray();
        const color = normal.getData('color');
        const targets = GridUtils.getAllTilesOfColor(grid, gridManager.getTileGroup(), color);
        
        // Suppress Magic's own random-color zap logic
        magic.setData('suppressEffect', true);

        // Suppress explosion of matching props (e.g., if a Bomb shares the color, it should be collected, not exploded)
        targets.forEach(t => {
             if (t.getData('type') !== TileType.NORMAL) {
                 t.setData('suppressEffect', true);
             }
        });

        effectManager.playMagicZap(magic, targets);
        return [magic, normal, ...targets];
    },

    async combineWithBomb(magic: any, bomb: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const grid = gridManager.getGridArray();
        // Correct logic: Use the bomb's color if it has one (created from a color), otherwise fallback.
        // In this game, Bombs are usually created from a color (e.g., Apple Bomb), or assigned a color in initialGrid.
        const color = bomb.getData('color') || GridUtils.getMostFrequentColorOnBoard(grid, { colors: [] });
        const targets = GridUtils.getAllTilesOfColor(grid, gridManager.getTileGroup(), color);
        
        effectManager.playMagicZap(magic, targets); 
        
        for (const t of targets) {
             if (t.getData('type') === TileType.WOOD || t.getData('type') === TileType.STONE) continue;
             t.setData('transformTo', TileType.BOMB); 
             gridManager.updateTileVisuals(t, true);
             t.setData('type', TileType.BOMB); 
        }
        
        await new Promise(r => setTimeout(r, 600)); 
        return [magic, bomb, ...targets];
    },

    async combineWithRocket(magic: any, rocket: any, gridManager: GridManager, effectManager: EffectManager): Promise<any[]> {
        const grid = gridManager.getGridArray();
        const color = rocket.getData('color') || GridUtils.getMostFrequentColorOnBoard(grid, { colors: [] });
        const targets = GridUtils.getAllTilesOfColor(grid, gridManager.getTileGroup(), color);

        effectManager.playMagicZap(magic, targets);

        for (const t of targets) {
            if (t.getData('type') === TileType.WOOD || t.getData('type') === TileType.STONE) continue;
            
            const rType = PhaserLib.Math.RND.pick([TileType.ROCKET_H, TileType.ROCKET_V]);
            t.setData('transformTo', rType);
            gridManager.updateTileVisuals(t, true);
            t.setData('type', rType);
        }
        
        await new Promise(r => setTimeout(r, 600));
        return [magic, rocket, ...targets];
    }
};
