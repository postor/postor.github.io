
import Phaser from 'phaser';
import { MoveFinder } from '../utils/MoveFinder';
import { GridManager } from './GridManager';

export class HintManager {
  private scene: Phaser.Scene;
  private gridManager: GridManager;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private currentTweens: Phaser.Tweens.Tween[] = [];
  
  private readonly IDLE_TIME = 5000; // 5 seconds

  constructor(scene: Phaser.Scene, gridManager: GridManager) {
    this.scene = scene;
    this.gridManager = gridManager;
  }

  /**
   * Starts (or restarts) the inactivity timer.
   * Should be called when the board becomes stable or after a user interaction ends.
   */
  startTimer() {
    this.stopTimer(); // Clear existing
    this.timerEvent = this.scene.time.delayedCall(this.IDLE_TIME, () => {
        this.showHint();
    });
  }

  /**
   * Stops the timer and clears any active hint animations.
   * Should be called when user touches the screen.
   */
  stopTimer() {
    if (this.timerEvent) {
        this.timerEvent.remove(false);
        this.timerEvent = null;
    }
    this.clearHintVisuals();
  }

  private clearHintVisuals() {
    this.currentTweens.forEach(t => t.remove());
    this.currentTweens = [];
    
    // Reset scales of all tiles just in case
    const allTiles = this.gridManager.getTileGroup().getChildren();
    allTiles.forEach((t: any) => {
        if (t.active) t.setScale(1);
    });
  }

  private showHint() {
     if (!this.scene.sys.isActive()) return;

     const grid = this.gridManager.getGridArray();
     const move = MoveFinder.findPotentialMove(grid, this.gridManager.rows, this.gridManager.cols);

     if (move) {
         const { t1, t2 } = move;
         if (t1.scene && t2.scene) {
             // Animate t1
             const tween1 = this.scene.tweens.add({
                 targets: t1,
                 scale: 1.15,
                 angle: { from: -5, to: 5 },
                 yoyo: true,
                 duration: 400,
                 repeat: -1
             });
             
             // Animate t2
             const tween2 = this.scene.tweens.add({
                 targets: t2,
                 scale: 1.15,
                 angle: { from: 5, to: -5 },
                 yoyo: true,
                 duration: 400,
                 repeat: -1
             });

             this.currentTweens.push(tween1, tween2);
         }
     }
  }
}
