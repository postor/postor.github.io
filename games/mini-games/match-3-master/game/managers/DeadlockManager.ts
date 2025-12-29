
import Phaser from 'phaser';
import { TileType } from '../../types';
import { GridManager } from './GridManager';
import { EffectManager } from './EffectManager';
import { MoveFinder } from '../utils/MoveFinder';
import { GridUtils } from '../utils/GridUtils';

// Fallback logic
const PhaserLib = Phaser || window.Phaser;

export class DeadlockManager {
    private scene: Phaser.Scene;
    private gridManager: GridManager;
    private effectManager: EffectManager;

    constructor(scene: Phaser.Scene, gridManager: GridManager, effectManager: EffectManager) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.effectManager = effectManager;
    }

    /**
     * Checks if the board has moves. If not, shuffles and grants a bonus.
     * Returns true if the board was modified (shuffled/bonus added).
     */
    async ensureSolvable(rows: number, cols: number): Promise<boolean> {
        const grid = this.gridManager.getGridArray();
        const hasMove = MoveFinder.findPotentialMove(grid, rows, cols);
        
        if (hasMove) return false; // Board is good, no changes

        // Deadlock detected
        // 1. Shuffle
        await this.shuffleBoard(rows, cols);
        
        // 2. Grant Bonus immediately (as per user request: "每次随机后都奖励")
        await this.grantRandomBonus(rows, cols);

        return true; // Changes made
    }

    private async grantRandomBonus(rows: number, cols: number) {
        const grid = this.gridManager.getGridArray();
        const emptySpots: {r:number, c:number}[] = [];
        const movableSpots: {r:number, c:number, tile:any}[] = [];

        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                const t = grid[r][c];
                if (!t) {
                    emptySpots.push({r, c});
                } else {
                    // Movable: Not Locked, Not Wood, Not Stone, Not Jelly
                    const locked = t.getData('locked');
                    const type = t.getData('type');
                    const jelly = t.getData('jelly');
                    if (!locked && !jelly && type !== TileType.WOOD && type !== TileType.STONE) {
                        movableSpots.push({r, c, tile: t});
                    }
                }
            }
        }
        
        // Preference: Empty -> Movable
        let target: any = null;
        let isReplace = false;

        if (emptySpots.length > 0) {
            target = PhaserLib.Utils.Array.GetRandom(emptySpots);
        } else if (movableSpots.length > 0) {
            target = PhaserLib.Utils.Array.GetRandom(movableSpots);
            isReplace = true;
        }
        
        if (!target) return; // No valid spot

        // Bonus Type
        const bonusType = PhaserLib.Utils.Array.GetRandom([
            TileType.BOMB, 
            TileType.ROCKET_H, 
            TileType.ROCKET_V, 
            TileType.MAGIC
        ]);

        this.effectManager.showFloatingText(
            this.gridManager.offsetX + target.c * this.gridManager.tileSize,
            this.gridManager.offsetY + target.r * this.gridManager.tileSize,
            "No Moves! Gift! 🎁",
            "#00ff00"
        );
        
        // Visual delay
        await new Promise(r => setTimeout(r, 300));

        if (isReplace) {
            const t = target.tile;
            t.setData('type', bonusType);
            if (bonusType === TileType.MAGIC) t.setData('color', 'rainbow');
            this.gridManager.updateTileVisuals(t, true); 
        } else {
            // Spawn new in empty
            this.gridManager.spawnTile(target.r, target.c, undefined, bonusType, false, undefined, false, true);
        }
    }

    private async shuffleBoard(rows: number, cols: number) {
        const allTiles: any[] = [];
        const grid = this.gridManager.getGridArray();
        
        // 1. Collect movable tiles
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                const t = grid[r][c];
                if (t && !t.getData('locked') && !t.getData('jelly') && t.getData('type') !== TileType.WOOD && t.getData('type') !== TileType.STONE) {
                    allTiles.push(t);
                }
            }
        }

        if (allTiles.length < 2) return; // Can't shuffle 0 or 1 tile

        // Visual Feedback
        const text = this.scene.add.text(this.scene.scale.width/2, this.scene.scale.height/2, "No Moves! Shuffling...", {
            fontSize: '32px', color: '#fff', backgroundColor: '#0008', padding: {x:10, y:10}
        }).setOrigin(0.5).setDepth(200);
        
        await new Promise(r => setTimeout(r, 500));
        
        // 2. Shuffle Logic
        PhaserLib.Utils.Array.Shuffle(allTiles);
        
        let i = 0;
        const anims: Promise<void>[] = [];
        
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                const existing = grid[r][c];
                // Must check criteria again to put tiles back into valid slots
                if (existing && !existing.getData('locked') && !existing.getData('jelly') && existing.getData('type') !== TileType.WOOD && existing.getData('type') !== TileType.STONE) {
                    if (i < allTiles.length) {
                        const tile = allTiles[i];
                        
                        // Update Logic
                        this.gridManager.setTileAt(r, c, tile);
                        
                        // Visual Animation
                        const targetX = this.gridManager.offsetX + c * this.gridManager.tileSize;
                        const targetY = this.gridManager.offsetY + r * this.gridManager.tileSize;
                        
                        anims.push(new Promise(resolve => {
                            this.scene.tweens.add({ targets: tile, x: targetX, y: targetY, duration: 400, ease: 'Power2', onComplete: () => resolve() });
                        }));
                        i++;
                    }
                }
            }
        }
        
        await Promise.all(anims);
        text.destroy();
    }
}
