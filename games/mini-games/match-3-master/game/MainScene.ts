
import Phaser from 'phaser';
import { LevelConfig, TileType, DEFAULT_CONFIG } from '../types';
import { GridManager } from './managers/GridManager';
import { InputManager } from './managers/InputManager';
import { EffectManager } from './managers/EffectManager';
import { TutorialManager } from './managers/TutorialManager';
import { MatchProcessor } from './managers/MatchProcessor';
import { HintManager } from './managers/HintManager';
import { DeadlockManager } from './managers/DeadlockManager';
import { MoveFinder } from './utils/MoveFinder';
import { GridUtils } from './utils/GridUtils';

// Fallback if imported Phaser is empty
const PhaserLib = Phaser || window.Phaser;

export class MainScene extends PhaserLib.Scene {
  private config: LevelConfig;
  private onStateChange: (state: any) => void;
  
  // Managers
  private gridManager!: GridManager;
  private inputManager!: InputManager;
  private effectManager!: EffectManager;
  private tutorialManager!: TutorialManager;
  private hintManager!: HintManager;
  private deadlockManager!: DeadlockManager;

  // Game State
  private isProcessing: boolean = false;
  private isBonusPhase: boolean = false;
  private score: number = 0;
  private moves: number = 0;
  private iceRemaining: number = 0;
  private targetsRemaining: { [key: string]: number } = {};
  private comboChain: number = 0;
  private levelCompleteTriggered: boolean = false;
  private isGameEnded: boolean = false;
  
  private lastSwapTiles: any[] = []; 
  private jellyClearedThisTurn: boolean = false;

  constructor() {
    super({ key: 'MainScene' });
    this.config = DEFAULT_CONFIG;
    this.onStateChange = () => {};
  }

  init(data: any) {
    const safeData = data || {};
    this.config = safeData.config || DEFAULT_CONFIG;
    this.onStateChange = safeData.onStateChange || (() => {});
    
    // Reset State
    this.score = 0;
    this.moves = this.config.moves || 0;
    this.iceRemaining = this.config.iceCount || 0;
    this.isProcessing = false;
    this.isBonusPhase = false;
    this.comboChain = 0;
    this.levelCompleteTriggered = false;
    this.isGameEnded = false;
    this.lastSwapTiles = [];
    this.jellyClearedThisTurn = false;

    // Initialize Targets
    this.targetsRemaining = {};
    if (this.config.collectionTargets) {
      this.config.collectionTargets.forEach(t => {
        this.targetsRemaining[t.type] = t.count;
      });
    }
  }

  create() {
    const { width, height } = this.scale;
    
    // 1. Initialize Managers
    const sceneAsPhaser = this as unknown as Phaser.Scene;

    this.gridManager = new GridManager(sceneAsPhaser);
    this.gridManager.init(this.config, width, height);

    this.effectManager = new EffectManager(sceneAsPhaser);
    
    this.tutorialManager = new TutorialManager(sceneAsPhaser, this.config, this.gridManager.getGridArray());
    
    this.hintManager = new HintManager(sceneAsPhaser, this.gridManager);

    this.deadlockManager = new DeadlockManager(sceneAsPhaser, this.gridManager, this.effectManager);

    this.inputManager = new InputManager(
        sceneAsPhaser, 
        this.gridManager, 
        this.tutorialManager,
        (t1, t2) => this.handleSwap(t1, t2),
        () => this.hintManager.stopTimer() // Stop hint on interact
    );

    // 2. Build World
    this.gridManager.generateIce(this.config.iceCount);
    this.gridManager.fillGrid(this.config.initialGrid);
    
    const grid = this.gridManager.getGridArray();

    // Auto-sync JELLY target to actual board count
    if (this.targetsRemaining['JELLY'] !== undefined) {
        let currentJellyCount = 0;
        for(let r=0; r<this.config.rows; r++) {
            for(let c=0; c<this.config.cols; c++) {
                if (grid[r][c] && grid[r][c].active && grid[r][c].getData('jelly')) {
                    currentJellyCount++;
                }
            }
        }
        this.targetsRemaining['JELLY'] = currentJellyCount;
    }

    // Auto-sync LOCK target to actual board count
    if (this.targetsRemaining['LOCK'] !== undefined) {
        let currentLockCount = 0;
        for(let r=0; r<this.config.rows; r++) {
            for(let c=0; c<this.config.cols; c++) {
                if (grid[r][c] && grid[r][c].active && grid[r][c].getData('locked')) {
                    currentLockCount++;
                }
            }
        }
        this.targetsRemaining['LOCK'] = currentLockCount;
    }

    this.inputManager.enable();

    // 3. Start Game Loop Checks
    this.time.delayedCall(500, async () => {
       if (this.sys.isActive()) {
          if (!this.config.initialGrid) {
              await this.checkMatchesAndRefill();
          } else {
              // Even for fixed grids, start hint timer if no immediate matches
              this.hintManager.startTimer();
          }

          if (!this.isGameEnded) {
             this.updateReactState();
             this.tutorialManager.start();
          }
       }
    });

    this.updateReactState();
  }

  async handleSwap(t1: any, t2: any) {
      if (this.isProcessing || this.moves <= 0 || this.levelCompleteTriggered) return;
      
      this.hintManager.stopTimer(); // Ensure hint stops on swap logic start
      this.isProcessing = true;
      this.jellyClearedThisTurn = false; // Reset for new turn
      
      if (this.tutorialManager.isActive()) this.tutorialManager.advance();

      this.gridManager.swapTilesInGrid(t1, t2);
      this.lastSwapTiles = [t1, t2];

      await this.gridManager.animateSwap(t1, t2);

      const combo = GridUtils.checkCombo(t1, t2);
      
      if (combo) {
          this.moves--;
          this.updateReactState();
          const tilesToDestroy = await MatchProcessor.processCombo(t1, t2, combo.type, this.gridManager, this.effectManager);
          await this.processDestruction(tilesToDestroy, 2.0); 
          await this.checkMatchesAndRefill({ isUserMove: true }); 
      } else {
          // Check for Matches AND Special Triggers simultaneously
          const matches = GridUtils.findMatches(this.gridManager.getGridArray(), this.config.rows, this.config.cols);
          const hasMatches = matches.length > 0;
          
          const isTriggerable = (t: any) => {
              const type = t.getData('type');
              return type === TileType.BOMB || type === TileType.ROCKET_H || type === TileType.ROCKET_V;
          };
          const t1Special = isTriggerable(t1);
          const t2Special = isTriggerable(t2);
          const hasSpecial = t1Special || t2Special;

          if (hasSpecial && hasMatches) {
               await this.handleHybridMove(t1, t2, matches, t1Special, t2Special);
          } else if (hasMatches) {
              // Standard Match
              this.moves--; 
              this.updateReactState();
              await this.checkMatchesAndRefill({ isUserMove: true });
          } else if (hasSpecial) {
              // Just Special Trigger (No Match)
              this.moves--;
              this.updateReactState();
              const specials = [];
              if (t1Special) specials.push(t1);
              if (t2Special) specials.push(t2);
              await this.processDestruction(specials, 1.0);
              await this.checkMatchesAndRefill({ isUserMove: true });
          } else {
              // Invalid Move
              this.gridManager.swapTilesInGrid(t1, t2);
              await this.gridManager.animateSwap(t1, t2);
              this.lastSwapTiles = [];
              this.isProcessing = false;
              // Reactivate hint timer since move failed
              this.hintManager.startTimer();
          }
      }
  }

  // Optimized Logic for Hybrid Moves (Normal Match + Special Trigger)
  async handleHybridMove(t1: any, t2: any, matches: any[], t1Special: boolean, t2Special: boolean) {
       this.moves--;
       this.updateReactState();

       const specialsToTrigger = [];
       if (t1Special) specialsToTrigger.push(t1);
       if (t2Special) specialsToTrigger.push(t2);

       // 1. Analyze matches to find synthesis (Prop 2)
       const { transformations, tilesToDestroy: matchDestroySet } = MatchProcessor.analyzeMatchGroups(matches, this.lastSwapTiles);

       // 2. Apply Transformations IMMEDIATELY (Prioritize Synthesis)
       // We mark them as 'processedForDestruction' temporarily so the Prop 1 explosion ignores them.
       transformations.forEach((type, tile) => {
           if (tile.scene) {
               // Update Target if the transforming tile was locked
               if (tile.getData('locked')) {
                   tile.setData('locked', false);
                   if (this.targetsRemaining['LOCK'] > 0) this.targetsRemaining['LOCK']--;
               }

               tile.setData('type', type);
               tile.setData('transformTo', null);
               this.gridManager.updateTileVisuals(tile, true);
               
               // CRITICAL: Protect new Prop 2 from Prop 1's blast
               tile.setData('processedForDestruction', true);
           }
       });

       // 3. Calculate Prop 1 Destruction (excluding protected Prop 2 tiles)
       // The destruction logic checks 'processedForDestruction', so Prop 2 tiles are safe.
       // We combine the Triggered Specials + The remaining Normal Match tiles.
       const combinedTriggers = [...specialsToTrigger, ...Array.from(matchDestroySet)];
       
       // 4. Execute Destruction
       await this.processDestruction(combinedTriggers, 1.0);

       // 5. Cleanup Protection Flag
       transformations.forEach((_, tile) => {
           if (tile.scene) tile.setData('processedForDestruction', false);
       });

       await this.checkMatchesAndRefill({ isUserMove: true });
  }

  async checkMatchesAndRefill(options: { isUserMove?: boolean } = {}): Promise<boolean> {
      let grandMatchesFound = false; // Tracks if any matches occurred during the entire process (including after shuffle)
      
      while(true) {
          if (!this.sys.isActive()) break;

          // 1. Refill and Match Processing
          await this.gridManager.refillBoard();

          let matchesFoundLoop = false;
          let iterations = 0;
          this.comboChain = 0; 
          
          while (true) {
              if (!this.sys.isActive()) break;
              const matchGroups = GridUtils.findMatches(this.gridManager.getGridArray(), this.config.rows, this.config.cols);
              if (matchGroups.length === 0) break;
              
              matchesFoundLoop = true;
              this.isProcessing = true;

              // Use MatchProcessor helper
              const { transformations, tilesToDestroy } = MatchProcessor.analyzeMatchGroups(
                  matchGroups, 
                  this.lastSwapTiles, 
                  !this.isBonusPhase
              );

              // Apply transforms
              transformations.forEach((type, t) => {
                 // If tile was locked, transformation unlocks it.
                 // CRITICAL FIX: Decrement LOCK target when transforming a locked tile
                 if (t.getData('locked')) {
                     t.setData('locked', false);
                     if (this.targetsRemaining['LOCK'] > 0) this.targetsRemaining['LOCK']--;
                 }

                 t.setData('type', type);
                 t.setData('transformTo', null);
                 this.gridManager.updateTileVisuals(t, true); 
              });

              const multiplier = 1 + (this.comboChain * 0.1);
              await this.processDestruction(Array.from(tilesToDestroy), multiplier);
              
              if (tilesToDestroy.size > 0) this.comboChain++; 

              await this.gridManager.refillBoard();
              iterations++;
              if (iterations > 10) break;
          }

          if (matchesFoundLoop) grandMatchesFound = true;
          this.lastSwapTiles = [];
          this.isProcessing = false;

          // 2. Deadlock Check
          // Only check if playing. If DeadlockManager changes the board (shuffle/bonus),
          // we must loop back to Step 1 to check if that created new matches.
          let deadlockFixed = false;
          if (!this.tutorialManager.isActive() && !this.checkWinCondition() && this.moves > 0 && !this.isBonusPhase) {
              this.isProcessing = true;
              this.hintManager.stopTimer();
              
              // Returns TRUE if board was modified (shuffled or bonus added)
              deadlockFixed = await this.deadlockManager.ensureSolvable(this.config.rows, this.config.cols);
              
              this.isProcessing = false;
          }

          if (deadlockFixed) {
              // If board changed, loop back to start to check for "accidental" matches from shuffle
              continue;
          } else {
              // If no changes needed (board is solvable or game over conditions), we are stable.
              break;
          }
      }

      // --- Spread Logic for Jelly B ---
      // If this was a user turn cycle (passed from handleSwap) AND no jelly was cleared
      if (options.isUserMove && !this.jellyClearedThisTurn && !this.isBonusPhase) {
          await this.spreadJellyInfection();
      }

      // Check Level End
      if (this.checkWinCondition() && !this.levelCompleteTriggered) {
          this.hintManager.stopTimer(); // No hints in bonus phase
          this.levelCompleteTriggered = true;
          this.isBonusPhase = true; 
          
          await this.effectManager.showGoalReachedText();

          await this.playClearBoardSequence(); 
          await this.playBonusSequence();
          this.isGameEnded = true; 
          this.updateReactState(true); 
      } else {
          this.updateReactState();
          // Game is stable and playing, start hint timer
          if (!this.isBonusPhase && this.moves > 0) {
              this.hintManager.startTimer();
          }
      }

      return grandMatchesFound;
  }
  
  async spreadJellyInfection() {
      // Find all tiles with Jelly B
      const grid = this.gridManager.getGridArray();
      const jellyBs = [];
      for(let r=0; r<this.config.rows; r++) {
          for(let c=0; c<this.config.cols; c++) {
              const t = grid[r][c];
              if (t && t.active && t.getData('jelly') === 'B') {
                  jellyBs.push(t);
              }
          }
      }
      
      if (jellyBs.length === 0) return;

      // Find all valid candidates for infection (Normal tiles next to Jelly B, not locked, not jelly)
      const candidates = new Set<any>();
      for (const t of jellyBs) {
          const r = t.getData('row');
          const c = t.getData('col');
          const dirs = [{r:r+1,c}, {r:r-1,c}, {r,c:c+1}, {r,c:c-1}];
          for(const d of dirs) {
               if(d.r >= 0 && d.r < this.config.rows && d.c >= 0 && d.c < this.config.cols) {
                   const neighbor = grid[d.r][d.c];
                   if (neighbor && !neighbor.getData('locked') && !neighbor.getData('jelly') && neighbor.getData('type') === TileType.NORMAL) {
                       candidates.add(neighbor);
                   }
               }
          }
      }

      // Pick ONE random candidate
      const candArray = Array.from(candidates);
      if (candArray.length > 0) {
           const target = PhaserLib.Utils.Array.GetRandom(candArray);
           target.setData('jelly', 'B');
           this.gridManager.updateTileVisuals(target, false);
           
           // Floating text warning
           this.effectManager.showFloatingText(target.x, target.y, "Infected!", "#a855f7");
           
           // Increment Target dynamically
           if (this.targetsRemaining['JELLY'] !== undefined) {
               this.targetsRemaining['JELLY']++;
               this.updateReactState();
           }

           await new Promise(r => setTimeout(r, 300));
      }
  }

  async processDestruction(tiles: any[], multiplier: number) {
      // 1. Calculate main destruction set (Matches + Explosions)
      // This will respect 'processedForDestruction' flag, effectively ignoring protected tiles
      let finalSet = MatchProcessor.getAffectedTilesForDestruction(tiles, this.gridManager, this.effectManager);
      
      // Cleanup flags immediately
      finalSet.forEach(t => {
          t.setData('processedForDestruction', false);
          t.setData('suppressEffect', false); 
      });
      
      // 2. Filter Triggering Tiles: Only tiles that are NOT locked and NOT jelly trigger adjacent effects.
      // Tiles that are locked or have jelly only change their own state (Unlock/Strip), absorbing the effect.
      const triggeringTiles = finalSet.filter(t => !t.getData('locked') && !t.getData('jelly'));

      // 3. Calculate Neighbors: Jelly, Wood using the filtered list
      const neighborsToStripJelly = MatchProcessor.getAdjacentJellies(triggeringTiles, this.gridManager);
      const woodToBreak = MatchProcessor.getAdjacentBreakables(triggeringTiles, this.gridManager);

      // Add broken wood to final set consideration (they will be filtered into respective lists below)
      woodToBreak.forEach(w => { if (!finalSet.includes(w)) finalSet.push(w); });

      // 4. Separate tiles: Destroy vs Strip Jelly vs Unlock
      const tilesToDestroy: any[] = [];
      const tilesToStripJellyOnly: any[] = [];
      const tilesToUnlockOnly: any[] = [];

      finalSet.forEach(t => {
          if (t.getData('locked')) {
              tilesToUnlockOnly.push(t);
          } else if (t.getData('jelly')) {
              tilesToStripJellyOnly.push(t);
          } else {
              tilesToDestroy.push(t);
          }
      });
      
      // Process neighbors explicitly (in case they weren't in finalSet)
      neighborsToStripJelly.forEach(t => {
         if(!tilesToDestroy.includes(t) && !tilesToUnlockOnly.includes(t) && !tilesToStripJellyOnly.includes(t)) {
             tilesToStripJellyOnly.push(t);
         } 
      });

      // Helper for processing targets
      const processTileForTargets = (t: any, destroying: boolean, strippingJelly: boolean, unlocking: boolean) => {
         if (!t.scene) return;
         const color = t.getData('color');
         const type = t.getData('type');
         const isLocked = t.getData('locked');
         
         if (strippingJelly) {
             if (this.targetsRemaining['JELLY'] > 0) this.targetsRemaining['JELLY']--;
             this.jellyClearedThisTurn = true;
         }

         if (unlocking) {
             if (this.targetsRemaining['LOCK'] > 0) this.targetsRemaining['LOCK']--;
         }

         if (destroying) {
             // Basic Colors
             if (this.targetsRemaining[color] > 0) this.targetsRemaining[color]--;
             // Special Types (Including WOOD)
             if (type !== TileType.NORMAL && this.targetsRemaining[type] > 0) this.targetsRemaining[type]--;
             // Locked
             if (isLocked && this.targetsRemaining['LOCK'] > 0) this.targetsRemaining['LOCK']--;
             
             // Ice check
             const r = t.getData('row');
             const c = t.getData('col');
             const iceKey = `ice_${r}_${c}`;
             const ice = this.children.getByName(iceKey);
             if(ice) {
                this.tweens.add({targets: ice, scale: 0, duration: 200});
                ice.destroy();
                this.iceRemaining--;
                if (this.targetsRemaining['ICE'] > 0) this.targetsRemaining['ICE']--;
            }
         }
      };

      if (tilesToDestroy.length > 0 || tilesToStripJellyOnly.length > 0 || tilesToUnlockOnly.length > 0) {
          // Score logic
          let points = Math.floor(tilesToDestroy.length * 10 * multiplier);
          points += Math.floor(tilesToStripJellyOnly.length * 5 * multiplier);
          points += Math.floor(tilesToUnlockOnly.length * 5 * multiplier);
          
          this.score += points;

          if (multiplier >= 1 && points > 0) {
              let sx = 0, sy = 0, c = 0;
              const all = [...tilesToDestroy, ...tilesToStripJellyOnly, ...tilesToUnlockOnly];
              all.forEach(t => { if(t.scene){ sx+=t.x; sy+=t.y; c++; } });
              if (c > 0) {
                 this.effectManager.showFloatingText(sx/c, sy/c, `${points}`, multiplier > 1.5 ? '#ff0000' : '#ffff00');
              }
          }

          // Execute Unlock Only
          tilesToUnlockOnly.forEach(t => {
              processTileForTargets(t, false, false, true);
              t.setData('locked', false);
              this.gridManager.updateTileVisuals(t, false);
          });

          // Execute Strip Jelly (Visuals + Logic)
          tilesToStripJellyOnly.forEach(t => {
              processTileForTargets(t, false, true, false); 
              t.setData('jelly', null);
              this.gridManager.updateTileVisuals(t, false);
          });

          // Execute Destroy (Visuals + Logic + Grid Removal)
          tilesToDestroy.forEach(t => {
              processTileForTargets(t, true, false, false); 
              this.gridManager.removeTileFromGrid(t);
          });

          this.updateReactState();

          // Play Animations for destroyed tiles
          await this.gridManager.animateDestroy(tilesToDestroy);
      }
  }

  // --- Game Loop Helpers ---

  async playClearBoardSequence() {
      this.isProcessing = true;
      this.isBonusPhase = true;
      const startTime = Date.now();
      
      while (this.sys.isActive()) {
          const specials = this.gridManager.getTileGroup().getChildren().filter((t: any) => t.active && t.getData('type') !== TileType.NORMAL && t.getData('type') !== TileType.WOOD && t.getData('type') !== TileType.STONE);
          if (specials.length === 0) break;

          const elapsed = Date.now() - startTime;
          const speedMultiplier = elapsed > 10000 ? 5.0 : 1.0;

          await this.processDestruction([specials[0]], 1.0);
          await this.gridManager.refillBoard(speedMultiplier);
          
          await this.processCascades(speedMultiplier);
      }
  }

  async processCascades(speedMultiplier: number) {
      let iterations = 0;
      while(this.sys.isActive()) {
          const matches = GridUtils.findMatches(this.gridManager.getGridArray(), this.config.rows, this.config.cols);
          if (matches.length === 0) break;
          const allDestroy = matches.flatMap(m => m.tiles);
          await this.processDestruction(allDestroy, 1.0);
          await this.gridManager.refillBoard(speedMultiplier);
          iterations++;
          if (iterations > 10) break;
      }
  }

  async playBonusSequence() {
      this.isProcessing = true;
      this.tutorialManager.end();
      const bonusPerMove = 1000;
      await new Promise(r => setTimeout(r, 500));
      const moveDrainSpeed = this.moves > 10 ? 50 : 200;

      while (this.moves > 0) {
          this.moves = Math.max(0, this.moves - 1);
          this.score += bonusPerMove;
          if (this.sys.isActive()) {
              this.effectManager.showFloatingText(this.scale.width/2, this.scale.height/2, `Bonus! +${bonusPerMove}`, '#00ff00');
          }
          this.updateReactState();
          await new Promise(r => setTimeout(r, moveDrainSpeed));
      }
      this.moves = 0;
      this.updateReactState();
      await new Promise(r => setTimeout(r, 500));
  }

  checkWinCondition(): boolean {
    const hasCollectionTargets = this.config.collectionTargets && this.config.collectionTargets.length > 0;
    let targetsMet = true;
    if (hasCollectionTargets) {
      for (const t of this.config.collectionTargets!) {
        if ((this.targetsRemaining[t.type] || 0) > 0) {
          targetsMet = false;
          break;
        }
      }
    }
    const scoreMet = this.score >= this.config.targetScore;
    if (hasCollectionTargets) return targetsMet;
    else return scoreMet;
  }

  updateReactState(forceWin: boolean = false) {
    if (!this.onStateChange) return;
    const displayMoves = Math.max(0, this.moves);

    if (this.isGameEnded) {
        this.onStateChange({
            score: this.score,
            movesLeft: displayMoves,
            status: 'won',
            targetsLeft: { ...this.targetsRemaining }
        });
        return;
    }

    if (this.levelCompleteTriggered && !forceWin) {
         this.onStateChange({
            score: this.score,
            movesLeft: displayMoves,
            status: 'playing', 
            targetsLeft: { ...this.targetsRemaining }
         });
         return;
    }

    const won = forceWin || this.checkWinCondition();
    const lost = this.moves <= 0 && !won && !this.isProcessing;
    const finalStatus = forceWin ? 'won' : (lost ? 'lost' : 'playing');

    this.onStateChange({
      score: this.score,
      movesLeft: displayMoves,
      status: finalStatus,
      targetsLeft: { ...this.targetsRemaining }
    });
  }
}
