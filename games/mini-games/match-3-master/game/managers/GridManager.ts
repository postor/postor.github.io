
import Phaser from 'phaser';
import { LevelConfig, TileType } from '../../types';

// Fallback logic
const PhaserLib = Phaser || window.Phaser;

/**
 * Grid Code Documentation:
 * - '0'-'9': Color Index from config.colors
 * - 'R': Rocket (Horizontal)
 * - 'B': Bomb
 * - 'M': Magic
 * - 'W': Wood (Destructible)
 * - 'S': Stone (Indestructible)
 * 
 * Modifiers (Suffixes):
 * - 'L': Locked (e.g., '0L', 'BL')
 * - 'A': Jelly Type A (e.g., '0A')
 * - 'B': Jelly Type B (Infectious) (e.g., '0B')
 * 
 * Note: 'B' alone or with 'L' ('BL') is parsed as BOMB. 
 * 'B' as a suffix to a number (e.g. '1B') is parsed as Jelly B.
 */

export class GridManager {
  private scene: Phaser.Scene;
  private grid: any[][] = [];
  private tileGroup: Phaser.GameObjects.Group;
  
  public rows: number = 0;
  public cols: number = 0;
  public tileSize: number = 60;
  public offsetX: number = 0;
  public offsetY: number = 0;
  private colors: string[] = [];

  // Speed configuration
  private animationSpeedMultiplier: number = 4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tileGroup = scene.add.group();
  }

  init(config: LevelConfig, width: number, height: number) {
    this.rows = config.rows;
    this.cols = config.cols;
    this.colors = config.colors;
    
    const maxTileWidth = (width - 20) / this.cols;
    const maxTileHeight = (height - 40) / this.rows;
    this.tileSize = Math.min(maxTileWidth, maxTileHeight);
    
    this.offsetX = (width - this.tileSize * this.cols) / 2 + this.tileSize / 2;
    this.offsetY = (height - this.tileSize * this.rows) / 2 + this.tileSize / 2;

    // Initialize Grid Array
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = null;
      }
    }
    
    // Create Background
    this.createBackgroundGrid();
  }

  private createBackgroundGrid() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.offsetX + c * this.tileSize;
        const y = this.offsetY + r * this.tileSize;
        this.scene.add.rectangle(x, y, this.tileSize - 4, this.tileSize - 4, 0x1e293b, 0.8)
          .setStrokeStyle(1, 0x334155)
          .setDepth(-2);
      }
    }
  }

  generateIce(iceCount: number) {
      let placed = 0;
      let attempts = 0;
      while (placed < iceCount && attempts < 1000) {
        attempts++;
        const r = PhaserLib.Math.Between(0, this.rows - 1);
        const c = PhaserLib.Math.Between(0, this.cols - 1);
        const iceKey = `ice_${r}_${c}`;
        // Don't place ice where there is already a tile (if pre-filled)
        if (!this.grid[r][c] && !this.scene.children.getByName(iceKey)) {
          const x = this.offsetX + c * this.tileSize;
          const y = this.offsetY + r * this.tileSize;
          this.scene.add.text(x, y, '🧊', { fontSize: `${this.tileSize * 0.8}px` })
            .setOrigin(0.5).setName(iceKey).setDepth(-1);
          placed++;
        }
      }
  }

  fillGrid(initialGrid?: string[][]) {
    const hasFixedGrid = initialGrid && initialGrid.length === this.rows;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
            let color = '';
            let type = TileType.NORMAL;
            let locked = false;
            let jelly: 'A' | 'B' | undefined = undefined;

            if (hasFixedGrid) {
                let val = initialGrid![r][c];
                
                // 1. Strip Lock Modifier
                if (val.includes('L')) {
                    locked = true;
                    val = val.replace('L', '');
                }
                
                // 2. Identify Special Types (Exact Match)
                // We check these BEFORE Jelly suffixes to ensure 'B' (Bomb) isn't eaten by 'B' (Jelly)
                if (val === 'R') {
                    color = this.colors[0]; // Rockets take a color usually, default to 0
                    type = TileType.ROCKET_H;
                } else if (val === 'B') {
                    color = this.colors[0]; // Bombs take a color usually, default to 0
                    type = TileType.BOMB;
                } else if (val === 'M') {
                    color = 'rainbow';
                    type = TileType.MAGIC;
                } else if (val === 'W') {
                    color = 'wood';
                    type = TileType.WOOD;
                } else if (val === 'S') {
                    color = 'stone';
                    type = TileType.STONE;
                } else {
                    // 3. Identify Jelly Suffixes on Normal/Color tiles
                    if (val.includes('A')) {
                        jelly = 'A';
                        val = val.replace('A', '');
                    } else if (val.includes('B')) {
                        jelly = 'B';
                        val = val.replace('B', '');
                    }

                    // 4. Parse Color Index
                    if (val.match(/^[0-9]+$/)) {
                        const idx = parseInt(val, 10);
                        color = this.colors[idx % this.colors.length];
                    } else {
                        // Fallback/Random
                        color = PhaserLib.Utils.Array.GetRandom(this.colors);
                    }
                }
            } else {
                // Random Generation
                color = PhaserLib.Utils.Array.GetRandom(this.colors);
            }
            this.spawnTile(r, c, color, type, locked, jelly, true);
        }
      }
    }
  }

  /**
   * Spawns a tile.
   */
  spawnTile(r: number, c: number, color?: string, type: TileType = TileType.NORMAL, locked: boolean = false, jelly?: 'A' | 'B', isInitial: boolean = false, isRefill: boolean = false) {
    const finalColor = color || PhaserLib.Utils.Array.GetRandom(this.colors);
    if (!finalColor) return null;

    const x = this.offsetX + c * this.tileSize;
    const y = this.offsetY + r * this.tileSize; 
    
    const spawnY = isInitial ? y : (isRefill ? y - this.tileSize : this.offsetY - (this.tileSize * 2));

    const container = this.scene.add.container(x, spawnY);
    
    // Determine visuals based on type
    let textStr = finalColor;
    if (type === TileType.WOOD) textStr = '📦';
    else if (type === TileType.STONE) textStr = '🪨';

    // Main Emoji Text
    const textObj = this.scene.add.text(0, 0, textStr, {
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
      fontSize: `${this.tileSize * 0.65}px`
    }).setOrigin(0.5);
    textObj.setShadow(0, 3, '#000000', 3, false, true);
    textObj.setName('main');

    container.add(textObj);

    // Lock Overlay
    if (locked) {
        const lockObj = this.scene.add.text(10, 10, '🔒', {
            fontSize: `${this.tileSize * 0.35}px`
        }).setOrigin(0.5);
        lockObj.setName('lock');
        container.add(lockObj);
    }
    
    // Jelly Overlay (Initial Create)
    // Note: Jelly usually doesn't apply to Wood/Stone, but if configured via 'WA', we allow it visually
    if (jelly) {
        const jellyColor = jelly === 'A' ? 0x4ade80 : 0xa855f7;
        const jellyObj = this.scene.add.rectangle(0, 0, this.tileSize - 6, this.tileSize - 6, jellyColor, 0.6);
        jellyObj.setStrokeStyle(3, 0xffffff, 0.8);
        jellyObj.setName('jelly');
        
        const jellyIcon = this.scene.add.text(this.tileSize*0.2, -this.tileSize*0.2, jelly === 'A' ? '🦠' : '👾', { fontSize: '18px' }).setOrigin(0.5);
        jellyIcon.setName('jellyIcon');
        
        container.add([jellyObj, jellyIcon]);
    }

    // Set Data on Container
    container.setData('row', r);
    container.setData('col', c);
    container.setData('color', finalColor);
    container.setData('type', type); 
    container.setData('locked', locked);
    container.setData('jelly', jelly);
    
    // Size for interactivity
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    this.updateTileVisuals(container, false);
    this.grid[r][c] = container;
    this.tileGroup.add(container);

    if (isRefill) {
        this.scene.tweens.add({
            targets: container, y: y, duration: 100 / this.animationSpeedMultiplier, ease: 'Linear' 
        });
    } else if (!isInitial) {
        this.scene.tweens.add({
            targets: container, y: y, duration: (400 + (r * 50)) / this.animationSpeedMultiplier, ease: 'Bounce.easeOut'
        });
    }
    return container;
  }

  updateTileVisuals(t: any, isCreation: boolean = false) {
      if (!t.scene) return;
      const type = t.getData('type');
      const locked = t.getData('locked');
      const jelly = t.getData('jelly');
      
      const mainText = t.getByName('main') as Phaser.GameObjects.Text;
      const lockText = t.getByName('lock') as Phaser.GameObjects.Text;
      const jellyObj = t.getByName('jelly') as Phaser.GameObjects.Rectangle;
      const jellyIcon = t.getByName('jellyIcon') as Phaser.GameObjects.Text;

      if (!mainText) return;

      // Reset any running effects on the text to ensure clean state
      this.scene.tweens.killTweensOf(mainText);
      mainText.setScale(1);
      mainText.setAlpha(1);

      // Update Type Visuals
      if (type === TileType.MAGIC) { 
          mainText.setText('🌈'); 
          t.setData('color', 'rainbow'); 
          // Pulse effect for Magic
          this.scene.tweens.add({
              targets: mainText,
              scale: 1.2,
              duration: 600,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
          });
      }
      else if (type === TileType.BOMB) mainText.setText('💣');
      else if (type === TileType.ROCKET_H) { mainText.setText('🚀'); mainText.setAngle(90); }
      else if (type === TileType.ROCKET_V) { mainText.setText('🚀'); mainText.setAngle(0); }
      else if (type === TileType.WOOD) { mainText.setText('📦'); mainText.setAngle(0); }
      else if (type === TileType.STONE) { mainText.setText('🪨'); mainText.setAngle(0); }
      else if (type === TileType.NORMAL) {
          mainText.setAngle(0);
      }
      
      // Update Lock Visuals
      if (locked) {
          if (!lockText) {
             const newLock = this.scene.add.text(10, 10, '🔒', { fontSize: `${this.tileSize * 0.35}px` }).setOrigin(0.5);
             newLock.setName('lock');
             t.add(newLock);
          }
      } else {
          if (lockText) { lockText.destroy(); }
      }
      
      // Update Jelly Visuals
      if (jelly) {
           if (!jellyObj) {
                const jellyColor = jelly === 'A' ? 0x4ade80 : 0xa855f7;
                const newJelly = this.scene.add.rectangle(0, 0, this.tileSize - 6, this.tileSize - 6, jellyColor, 0.6);
                newJelly.setStrokeStyle(3, 0xffffff, 0.8);
                newJelly.setName('jelly');
                const newIcon = this.scene.add.text(this.tileSize*0.2, -this.tileSize*0.2, jelly === 'A' ? '🦠' : '👾', { fontSize: '18px' }).setOrigin(0.5);
                newIcon.setName('jellyIcon');
                t.add([newJelly, newIcon]);
                
                if (!isCreation) {
                    this.scene.tweens.add({ targets: [newJelly, newIcon], scale: {from: 0, to: 1}, duration: 300, ease: 'Back.out' });
                }
           }
      } else {
           if (jellyObj) {
               this.scene.tweens.add({
                   targets: [jellyObj, jellyIcon],
                   scale: 0,
                   alpha: 0,
                   duration: 200,
                   onComplete: () => {
                       if (jellyObj.scene) jellyObj.destroy();
                       if (jellyIcon && jellyIcon.scene) jellyIcon.destroy();
                   }
               });
           }
      }

      if (isCreation) {
          t.setScale(0); t.setAlpha(0); t.setRotation(-Math.PI); 
          this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, rotation: 0, duration: 600, ease: 'Back.out' });
      } else if (type !== TileType.NORMAL) {
          // Pulse the container for transformation, but be careful not to conflict with the Magic pulse on the text
          this.scene.tweens.add({ targets: t, scale: { from: 1.5, to: 1 }, duration: 400, ease: 'Back' });
      }
  }

  getTileAt(r: number, c: number) {
      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          return this.grid[r][c];
      }
      return null;
  }

  setTileAt(r: number, c: number, tile: any) {
      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.grid[r][c] = tile;
          if (tile) {
            tile.setData('row', r);
            tile.setData('col', c);
          }
      }
  }

  swapTilesInGrid(t1: any, t2: any) {
    const r1 = t1.getData('row'); const c1 = t1.getData('col');
    const r2 = t2.getData('row'); const c2 = t2.getData('col');
    this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
    t1.setData('row', r2); t1.setData('col', c2);
    t2.setData('row', r1); t2.setData('col', c1);
  }

  animateSwap(t1: any, t2: any): Promise<void> {
    const t1TargetX = this.offsetX + t1.getData('col') * this.tileSize;
    const t1TargetY = this.offsetY + t1.getData('row') * this.tileSize;
    const t2TargetX = this.offsetX + t2.getData('col') * this.tileSize;
    const t2TargetY = this.offsetY + t2.getData('row') * this.tileSize;

    return new Promise<void>((resolve) => {
        if (!t1.scene || !t2.scene) { resolve(); return; }
        
        this.scene.tweens.add({
            targets: t1, x: t1TargetX, y: t1TargetY, duration: 250, ease: 'Power2'
        });
        this.scene.tweens.add({
            targets: t2, x: t2TargetX, y: t2TargetY, duration: 250, ease: 'Power2',
            onComplete: () => resolve()
        });
    });
  }

  async animateDestroy(tiles: any[], speed: number = 1.0): Promise<void> {
      const anims = tiles.map(t => {
          return new Promise<void>(resolve => {
            if (!t || !t.scene) { resolve(); return; }
            this.scene.tweens.add({
              targets: t, scale: 1.4, alpha: 0, duration: 150 / speed, ease: 'Power1', 
              onComplete: () => { 
                  if (t && t.scene) t.destroy(); 
                  resolve(); 
              }
            });
          });
        });
      await Promise.all(anims);
  }

  removeTileFromGrid(tile: any) {
      const r = tile.getData('row');
      const c = tile.getData('col');
      if (this.grid[r][c] === tile) {
          this.grid[r][c] = null;
      }
  }

  /**
   * Refill Board with specific Gravity Logic:
   * Updated: WOOD and STONE are static obstacles (like LOCKED).
   */
  async refillBoard(speed: number = 1.0) {
    const tickDuration = 100 / (this.animationSpeedMultiplier * speed);
    let stable = false;
    
    while (!stable) {
        stable = true;
        const moves: {tile: any, fromR: number, fromC: number, toR: number, toC: number, isSpawn: boolean}[] = [];
        const usedSources = new Set<string>(); // Tracks tiles moving OUT
        const filledDestinations = new Set<string>(); // Tracks tiles moving IN (to prevent multi-jump in one tick)
        
        // 1. Identify Empty Slots
        const emptySlots: {r: number, c: number}[] = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === null) {
                    emptySlots.push({r, c});
                }
            }
        }

        if (emptySlots.length === 0) break;

        // 2. Sort Top-Left to Right (Row asc, Col asc)
        emptySlots.sort((a, b) => (a.r - b.r) || (a.c - b.c));

        // 3. Process each slot
        for (const slot of emptySlots) {
            const {r, c} = slot;
            
            // --- Priority 1: Direct Top ---
            const topR = r - 1;
            const topC = c;
            let tryDiagonals = false;

            if (topR < 0) {
                // Spawn from Top
                moves.push({
                    tile: null, // Create new
                    fromR: topR, fromC: topC,
                    toR: r, toC: c,
                    isSpawn: true
                });
                usedSources.add(`${topR},${topC}`);
                filledDestinations.add(`${r},${c}`);
                continue; 
            } else {
                const topTile = this.grid[topR][topC];
                const topKey = `${topR},${topC}`;

                if (topTile) {
                    const tType = topTile.getData('type');
                    // Blocked if Locked OR Wood OR Stone
                    if (topTile.getData('locked') || tType === TileType.WOOD || tType === TileType.STONE) {
                        tryDiagonals = true; 
                    } else {
                        // Movable Tile Candidate
                        if (!usedSources.has(topKey) && !filledDestinations.has(topKey)) {
                            this.grid[r][c] = topTile;
                            this.grid[topR][topC] = null;
                            topTile.setData('row', r);
                            topTile.setData('col', c);

                            moves.push({
                                tile: topTile,
                                fromR: topR, fromC: topC,
                                toR: r, toC: c,
                                isSpawn: false
                            });
                            usedSources.add(topKey);
                            filledDestinations.add(`${r},${c}`);
                            continue; // Move successful
                        }
                        // If top tile exists but is used/moving, we wait (do not diagonal fill, usually)
                        continue; 
                    }
                } else {
                    // Top is Empty -> Try Diagonals
                    // Allows flow to happen under empty spots that are themselves blocked
                    tryDiagonals = true;
                }
            }

            // --- Priority 2: Diagonals (If Top is Blocked OR Empty) ---
            if (tryDiagonals) {
                const diagDirs = [
                    {dr: -1, dc: -1}, // Top-Left
                    {dr: -1, dc: 1}   // Top-Right
                ];
                
                for (const d of diagDirs) {
                    const sr = r + d.dr;
                    const sc = c + d.dc;

                    // Bounds check
                    if (sc < 0 || sc >= this.cols) continue;
                    
                    const sKey = `${sr},${sc}`;
                    const sTile = this.grid[sr][sc];
                    
                    // Move if it exists, is not locked, and not Wood/Stone
                    if (sTile) {
                         const sType = sTile.getData('type');
                         if (!sTile.getData('locked') && sType !== TileType.WOOD && sType !== TileType.STONE) {
                             if (!usedSources.has(sKey) && !filledDestinations.has(sKey)) {
                                // Move
                                this.grid[r][c] = sTile;
                                this.grid[sr][sc] = null;
                                sTile.setData('row', r);
                                sTile.setData('col', c);

                                moves.push({
                                    tile: sTile,
                                    fromR: sr, fromC: sc,
                                    toR: r, toC: c,
                                    isSpawn: false
                                });
                                usedSources.add(sKey);
                                filledDestinations.add(`${r},${c}`);
                                break; // Filled
                             }
                        }
                    }
                }
            }
        }

        // 4. Animate
        if (moves.length > 0) {
            stable = false;
            const anims: Promise<void>[] = [];
            
            for (const m of moves) {
                const targetX = this.offsetX + m.toC * this.tileSize;
                const targetY = this.offsetY + m.toR * this.tileSize;

                if (m.isSpawn) {
                    const startY = this.offsetY + m.fromR * this.tileSize;
                    const startX = this.offsetX + m.fromC * this.tileSize;
                    
                    const tile = this.spawnTile(m.toR, m.toC, undefined, TileType.NORMAL, false, undefined, true, false);
                    if (tile) {
                        tile.setPosition(startX, startY);
                        anims.push(new Promise(resolve => {
                            this.scene.tweens.add({
                                targets: tile,
                                x: targetX,
                                y: targetY,
                                duration: tickDuration,
                                ease: 'Linear',
                                onComplete: () => resolve()
                            });
                        }));
                    }
                } else {
                     anims.push(new Promise(resolve => {
                        this.scene.tweens.add({
                            targets: m.tile,
                            x: targetX,
                            y: targetY,
                            duration: tickDuration,
                            ease: 'Linear',
                            onComplete: () => resolve()
                        });
                    }));
                }
            }
            
            await Promise.all(anims);
        }
    }
  }

  getGridArray() {
      return this.grid;
  }
  
  getTileGroup() {
      return this.tileGroup;
  }
}
