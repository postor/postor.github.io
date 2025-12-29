
import Phaser from 'phaser';
import { LevelConfig, TutorialStep } from '../../types';

export class TutorialManager {
  private scene: Phaser.Scene;
  private config: LevelConfig;
  private grid: any[][];
  private currentStepIndex: number = -1;
  
  private tutorialLayer: Phaser.GameObjects.Container;
  private uiLayer: Phaser.GameObjects.Container;
  private mask: Phaser.GameObjects.Graphics | null = null;
  private hand: Phaser.GameObjects.Text | null = null;
  private text: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, config: LevelConfig, grid: any[][]) {
    this.scene = scene;
    this.config = config;
    this.grid = grid;
    this.tutorialLayer = scene.add.container().setDepth(100);
    this.uiLayer = scene.add.container().setDepth(150);
  }

  start() {
    if (this.config.tutorialSteps && this.config.tutorialSteps.length > 0) {
      this.currentStepIndex = 0;
      this.showStep();
    }
  }

  isActive(): boolean {
    return this.currentStepIndex !== -1;
  }

  isInteractionAllowed(row: number, col: number): boolean {
    if (this.currentStepIndex === -1) return true;
    const steps = this.config.tutorialSteps;
    if (!steps) return true;
    
    const step = steps[this.currentStepIndex];
    if (!step || !step.highlight || step.highlight.length === 0) return true;
    
    return step.highlight.some(h => h.r === row && h.c === col);
  }

  advance() {
    if (this.currentStepIndex === -1) return;
    
    // Reset depths of highlighted tiles
    const steps = this.config.tutorialSteps;
    if (steps && steps[this.currentStepIndex]) {
        const step = steps[this.currentStepIndex];
        step.highlight.forEach(pos => {
             if (this.grid[pos.r] && this.grid[pos.r][pos.c]) {
                 this.grid[pos.r][pos.c].setDepth(0);
             }
        });
    }

    this.currentStepIndex++;
    if (steps && this.currentStepIndex < steps.length) {
        this.showStep();
    } else {
        this.end();
    }
  }

  private showStep() {
      const steps = this.config.tutorialSteps;
      if (!steps || this.currentStepIndex >= steps.length) {
          this.end();
          return;
      }
      
      const step = steps[this.currentStepIndex];
      
      // Mask
      if (this.mask) this.mask.clear();
      else this.mask = this.scene.add.graphics();
      this.tutorialLayer.add(this.mask);
      this.mask.fillStyle(0x000000, 0.7);
      this.mask.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);

      // Highlight Tiles
      if (step.highlight.length > 0) {
          step.highlight.forEach(pos => {
              if (pos.r < this.config.rows && pos.c < this.config.cols) {
                  const tile = this.grid[pos.r][pos.c];
                  if (tile) tile.setDepth(101);
              }
          });
      }

      // Cleanup old UI
      if (this.hand) this.hand.destroy();
      if (this.text) this.text.destroy();

      // Text
      const textY = this.scene.scale.height * 0.8;
      const maxWidth = this.scene.scale.width * 0.9;
      this.text = this.scene.add.text(this.scene.scale.width / 2, textY, step.text, {
          fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', backgroundColor: '#000000aa', 
          padding: {x:10, y:10}, align: 'center', wordWrap: { width: maxWidth, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.uiLayer.add(this.text);

      // Hand Animation
      if (step.highlight.length >= 2) {
          const t1 = this.grid[step.highlight[0].r][step.highlight[0].c];
          const t2 = this.grid[step.highlight[1].r][step.highlight[1].c];
          if (t1 && t2) {
              this.hand = this.scene.add.text(t1.x, t1.y + 20, '👆', { fontSize: '40px' }).setOrigin(0.5, 0);
              this.uiLayer.add(this.hand);
              this.scene.tweens.add({ 
                  targets: this.hand, 
                  x: t2.x, 
                  y: t2.y + 20, 
                  duration: 1000, 
                  yoyo: true, 
                  repeat: -1 
              });
          }
      }
  }

  end() {
      this.currentStepIndex = -1;
      if (this.mask) { this.mask.destroy(); this.mask = null; }
      if (this.hand) { this.hand.destroy(); this.hand = null; }
      if (this.text) { this.text.destroy(); this.text = null; }
  }
}
