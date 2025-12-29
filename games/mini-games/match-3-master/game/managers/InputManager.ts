
import Phaser from 'phaser';
import { TileType } from '../../types';

export class InputManager {
  private scene: Phaser.Scene;
  private gridManager: any; // Type as GridManager when available
  private tutorialManager: any;
  private onSwap: (t1: any, t2: any) => void;
  private onInteraction?: () => void;
  
  private dragStartPos: { x: number, y: number } | null = null;
  private dragStartTile: any = null;
  private selectedTile: any = null;

  constructor(
      scene: Phaser.Scene, 
      gridManager: any, 
      tutorialManager: any, 
      onSwap: (t1: any, t2: any) => void,
      onInteraction?: () => void
  ) {
    this.scene = scene;
    this.gridManager = gridManager;
    this.tutorialManager = tutorialManager;
    this.onSwap = onSwap;
    this.onInteraction = onInteraction;
  }

  enable() {
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  disable() {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.dragStartTile = null;
    this.dragStartPos = null;
    this.selectedTile = null;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer, targets: any[]) {
    // Notify interaction (e.g. stop hint timer)
    if (this.onInteraction) this.onInteraction();

    // Note: With Containers, targets[0] might be the text inside. traverse up to Container.
    let tile = targets[0];
    if (tile && tile.parentContainer) {
        tile = tile.parentContainer;
    }

    if (tile && tile.getData) {
      const r = tile.getData('row');
      const c = tile.getData('col');
      const isLocked = tile.getData('locked');
      const hasJelly = tile.getData('jelly');
      const type = tile.getData('type');

      // Locked, Jelly, Wood, and Stone cannot be dragged
      if (isLocked || hasJelly || type === TileType.WOOD || type === TileType.STONE) {
          if (hasJelly || type === TileType.WOOD || type === TileType.STONE) {
               // Shake effect to indicate "Stuck"
               this.scene.tweens.add({ targets: tile, angle: { from: -2, to: 2 }, duration: 50, yoyo: true, repeat: 1 });
          }
          return;
      }

      if (this.tutorialManager.isActive() && !this.tutorialManager.isInteractionAllowed(r, c)) {
        return;
      }

      this.dragStartTile = tile;
      this.dragStartPos = { x: pointer.x, y: pointer.y };
      this.dragStartTile.setAlpha(0.6);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.dragStartTile || !this.dragStartPos) return;
    
    // Safety check if tile was destroyed during drag
    if (!this.dragStartTile.scene) {
        this.resetDrag();
        return;
    }

    const endX = pointer.x;
    const endY = pointer.y;
    const dx = endX - this.dragStartPos.x;
    const dy = endY - this.dragStartPos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const swipeThreshold = 20;

    const tile = this.dragStartTile;
    tile.setAlpha(1);
    this.resetDrag();

    if (dist > swipeThreshold) {
      // Handle Swipe
      let dirRow = 0; let dirCol = 0;
      if (Math.abs(dx) > Math.abs(dy)) dirCol = dx > 0 ? 1 : -1;
      else dirRow = dy > 0 ? 1 : -1;

      const r = tile.getData('row');
      const c = tile.getData('col');
      const targetR = r + dirRow;
      const targetC = c + dirCol;

      if (this.tutorialManager.isActive() && !this.tutorialManager.isInteractionAllowed(targetR, targetC)) {
          return;
      }

      const targetTile = this.gridManager.getTileAt(targetR, targetC);
      
      // Check if target is Blocked
      if (targetTile) {
          const tType = targetTile.getData('type');
          if (targetTile.getData('locked') || targetTile.getData('jelly') || tType === TileType.WOOD || tType === TileType.STONE) {
               this.scene.tweens.add({ targets: targetTile, x: '+=5', duration: 50, yoyo: true, repeat: 1 });
               return;
          }
          this.onSwap(tile, targetTile);
      }
      
      // Clear selection on swipe
      if (this.selectedTile) {
          this.selectedTile.setScale(1);
          this.selectedTile = null;
      }

    } else {
      // Handle Tap
      this.handleTap(tile);
    }
  }

  private handleTap(tile: any) {
    if (!this.selectedTile) {
      this.selectedTile = tile;
      tile.setScale(1.2);
    } else {
      if (!this.selectedTile.scene) {
        this.selectedTile = tile; 
        tile.setScale(1.2); 
        return;
      }

      const t1 = this.selectedTile;
      const t2 = tile;
      const r1 = t1.getData('row'); const c1 = t1.getData('col');
      const r2 = t2.getData('row'); const c2 = t2.getData('col');

      if (this.tutorialManager.isActive() && !this.tutorialManager.isInteractionAllowed(r2, c2)) {
         t1.setScale(1); 
         this.selectedTile = null; 
         return;
      }

      const dRow = Math.abs(r1 - r2);
      const dCol = Math.abs(c1 - c2);

      if (dRow + dCol === 1) {
        const t2Type = t2.getData('type');
        // Prevent swap if target is blocked
        if (t2.getData('locked') || t2.getData('jelly') || t2Type === TileType.WOOD || t2Type === TileType.STONE) {
             this.scene.tweens.add({ targets: t2, x: '+=5', duration: 50, yoyo: true, repeat: 1 });
             t1.setScale(1);
             this.selectedTile = null;
             return;
        }

        this.onSwap(t1, t2);
        t1.setScale(1);
        this.selectedTile = null;
      } else {
        t1.setScale(1);
        if (t1 === t2) {
            this.selectedTile = null;
        } else {
            this.selectedTile = t2;
            t2.setScale(1.2);
        }
      }
    }
  }

  private resetDrag() {
      this.dragStartTile = null;
      this.dragStartPos = null;
  }
}
