
import Phaser from 'phaser';
import { TileType } from '../../types';
import { GridManager } from './GridManager';
import { EffectManager } from './EffectManager';
import { MagicProp } from '../props/MagicProp';
import { BombProp } from '../props/BombProp';
import { RocketProp } from '../props/RocketProp';

// Fallback logic
const PhaserLib = Phaser || window.Phaser;

export class MatchProcessor {
    static analyzeMatchGroups(
        groups: { tiles: any[], width: number, height: number }[], 
        lastSwapTiles: any[] = [],
        createSpecial: boolean = true
    ): { transformations: Map<any, TileType>, tilesToDestroy: Set<any> } {
        const transformations = new Map<any, TileType>();
        const tilesToDestroy = new Set<any>();

        for (const group of groups) {
            let typeToCreate = TileType.NORMAL;

            if (createSpecial) {
                // 1. Analyze Geometry: Calculate max continuous run in H and V directions
                const tiles = group.tiles;
                
                const byRow = new Map<number, number[]>(); // row -> cols[]
                const byCol = new Map<number, number[]>(); // col -> rows[]

                tiles.forEach(t => {
                    const r = t.getData('row');
                    const c = t.getData('col');
                    if (!byRow.has(r)) byRow.set(r, []);
                    if (!byCol.has(c)) byCol.set(c, []);
                    byRow.get(r)!.push(c);
                    byCol.get(c)!.push(r);
                });

                const getMaxConsecutive = (map: Map<number, number[]>) => {
                    let maxLen = 0;
                    for (const indices of map.values()) {
                        indices.sort((a, b) => a - b);
                        if (indices.length === 0) continue;
                        let currentRun = 1;
                        for (let i = 1; i < indices.length; i++) {
                            if (indices[i] === indices[i-1] + 1) {
                                currentRun++;
                            } else {
                                maxLen = Math.max(maxLen, currentRun);
                                currentRun = 1;
                            }
                        }
                        maxLen = Math.max(maxLen, currentRun);
                    }
                    return maxLen;
                };

                const maxH = getMaxConsecutive(byRow);
                const maxV = getMaxConsecutive(byCol);

                // Priority: Magic > Bomb > Rocket
                if (MagicProp.canCreate(maxH, maxV)) {
                    typeToCreate = MagicProp.getType();
                } else if (BombProp.canCreate(maxH, maxV)) {
                    typeToCreate = BombProp.getType();
                } else if (RocketProp.canCreate(maxH, maxV)) {
                    typeToCreate = RocketProp.getType(maxH, maxV);
                }
            }

            if (typeToCreate !== TileType.NORMAL) {
                let spawnCandidate = group.tiles.find(t => lastSwapTiles.includes(t));
                if (!spawnCandidate) spawnCandidate = group.tiles[Math.floor(group.tiles.length / 2)];
                transformations.set(spawnCandidate, typeToCreate);
            }

            group.tiles.forEach(t => {
                if (!transformations.has(t)) {
                    tilesToDestroy.add(t);
                }
            });
        }

        return { transformations, tilesToDestroy };
    }

    static getAffectedTilesForDestruction(
        initialTiles: any[], 
        gridManager: GridManager, 
        effectManager: EffectManager,
        speed: number = 1.0
    ): any[] {
        const grid = gridManager.getGridArray();
        
        let allToDestroy = new Set(initialTiles);
        let addedNew = true;
        
        // Iteratively find all tiles affected by explosions/lines
        while(addedNew) {
            addedNew = false;
            const currentArr = Array.from(allToDestroy);
            for(const t of currentArr) {
                if (!t.scene) continue; 
                
                // If already processed as a source of explosion, skip re-triggering
                if(t.getData('processedForDestruction')) continue;
                
                // Mark as processed so we don't calculate its explosion area again
                t.setData('processedForDestruction', true);

                // Check suppression: if true, tile destroys peacefully without triggering cascades
                if(t.getData('suppressEffect')) continue;

                const type = t.getData('type');
                let extra: any[] = [];
                
                if (type === TileType.MAGIC) {
                     extra = MagicProp.process(t, gridManager, effectManager, speed);
                }
                else if(type === TileType.ROCKET_H || type === TileType.ROCKET_V) {
                     extra = RocketProp.process(t, gridManager, effectManager, speed);
                }
                else if(type === TileType.BOMB) {
                     extra = BombProp.process(t, gridManager, effectManager, speed);
                }
                
                for(const e of extra) {
                    // STONE is indestructible by Specials (unless specified otherwise)
                    if (e.getData('type') === TileType.STONE) continue;

                    // PROTECTION LOGIC:
                    // If a tile is marked as 'processedForDestruction' but IS NOT in the current destruction set,
                    // it means it is a protected newly formed special item (set in MainScene.handleHybridMove).
                    // We must NOT add it to the destruction list.
                    if (e.getData('processedForDestruction')) continue;

                    if(!allToDestroy.has(e)) {
                        allToDestroy.add(e);
                        addedNew = true;
                    }
                }
            }
        }
        
        return Array.from(allToDestroy);
    }

    // Helper: Find adjacent Jelly tiles (neighbors of destruction)
    static getAdjacentJellies(
        tilesToDestroy: any[], 
        gridManager: GridManager
    ): any[] {
        const affected = new Set<any>();
        const grid = gridManager.getGridArray();
        const rows = gridManager.rows;
        const cols = gridManager.cols;

        tilesToDestroy.forEach(t => {
            if (!t.scene) return;
            const r = t.getData('row');
            const c = t.getData('col');
            const dirs = [{r:r+1, c}, {r:r-1, c}, {r, c:c+1}, {r, c:c-1}];
            
            dirs.forEach(d => {
                if (d.r >= 0 && d.r < rows && d.c >= 0 && d.c < cols) {
                    const neighbor = grid[d.r][d.c];
                    // If neighbor has jelly AND not already destroyed
                    if (neighbor && neighbor.active && neighbor.getData('jelly')) {
                        affected.add(neighbor);
                    }
                }
            });
        });
        return Array.from(affected);
    }

    // Helper: Find adjacent Wood tiles (destructible obstacles)
    static getAdjacentBreakables(
        tilesToDestroy: any[],
        gridManager: GridManager
    ): any[] {
        const affected = new Set<any>();
        const grid = gridManager.getGridArray();
        const rows = gridManager.rows;
        const cols = gridManager.cols;

        tilesToDestroy.forEach(t => {
            if (!t.scene) return;
            const r = t.getData('row');
            const c = t.getData('col');
            const dirs = [{r:r+1, c}, {r:r-1, c}, {r, c:c+1}, {r, c:c-1}];
            
            dirs.forEach(d => {
                if (d.r >= 0 && d.r < rows && d.c >= 0 && d.c < cols) {
                    const neighbor = grid[d.r][d.c];
                    // WOOD is breakable by adjacent match/destruction
                    if (neighbor && neighbor.active && neighbor.getData('type') === TileType.WOOD) {
                        affected.add(neighbor);
                    }
                }
            });
        });
        return Array.from(affected);
    }

    static async processCombo(
        t1: any, 
        t2: any, 
        comboType: string, 
        gridManager: GridManager, 
        effectManager: EffectManager
    ): Promise<any[]> {
        const type1 = t1.getData('type');
        const type2 = t2.getData('type');
        
        const isRocket = (t: string) => t === TileType.ROCKET_H || t === TileType.ROCKET_V;

        if (type1 === TileType.MAGIC && type2 === TileType.MAGIC) {
            return MagicProp.combineWithMagic(t1, t2, gridManager, effectManager);
        }
        else if (comboType === 'MAGIC_NORMAL') {
             const magic = type1 === TileType.MAGIC ? t1 : t2;
             const normal = type1 === TileType.MAGIC ? t2 : t1;
             return MagicProp.combineWithNormal(magic, normal, gridManager, effectManager);
        }
        else if ((type1 === TileType.MAGIC && type2 === TileType.BOMB) || (type2 === TileType.MAGIC && type1 === TileType.BOMB)) {
            const magic = type1 === TileType.MAGIC ? t1 : t2;
            const bomb = type1 === TileType.MAGIC ? t2 : t1;
            return MagicProp.combineWithBomb(magic, bomb, gridManager, effectManager);
        }
        else if ((type1 === TileType.MAGIC && isRocket(type2)) || (type2 === TileType.MAGIC && isRocket(type1))) {
            const magic = type1 === TileType.MAGIC ? t1 : t2;
            const rocket = type1 === TileType.MAGIC ? t2 : t1;
            return MagicProp.combineWithRocket(magic, rocket, gridManager, effectManager);
        }
        else if ((type1 === TileType.BOMB && isRocket(type2)) || (type2 === TileType.BOMB && isRocket(type1))) {
            const bomb = type1 === TileType.BOMB ? t1 : t2;
            const rocket = type1 === TileType.BOMB ? t2 : t1;
            // Uses t1 as center of effect
            return BombProp.combineWithRocket(bomb, rocket, t1, gridManager, effectManager);
        }
        else if (type1 === TileType.BOMB && type2 === TileType.BOMB) {
            // Uses t1 as center of effect
            return BombProp.combineWithBomb(t1, t2, t1, gridManager, effectManager);
        }
        else if (isRocket(type1) && isRocket(type2)) {
            // Uses t1 as center of effect
            return RocketProp.combineWithRocket(t1, t2, t1, gridManager, effectManager);
        }
        
        return [t1, t2];
    }
}
