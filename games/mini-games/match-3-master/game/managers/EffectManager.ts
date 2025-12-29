
import Phaser from 'phaser';

export class EffectManager {
  private scene: Phaser.Scene;
  private effectLayer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.effectLayer = scene.add.container().setDepth(50);
  }

  showFloatingText(x: number, y: number, text: string, color: string = '#ffff00') {
    if (!this.scene.sys.isActive()) return;
    const floatText = this.scene.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold', color: color,
      stroke: '#000000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: floatText, y: y - 80, alpha: 0, scale: 1.5, duration: 1000, ease: 'Power1',
      onComplete: () => { floatText.destroy(); }
    });
  }

  async showGoalReachedText(): Promise<void> {
    return new Promise((resolve) => {
        if (!this.scene.sys.isActive()) {
            resolve();
            return;
        }

        const { width, height } = this.scene.scale;
        
        // Create a high-depth container for the UI overlay
        const container = this.scene.add.container(width / 2, height / 2).setDepth(500);
        
        // Semi-transparent background strip
        const bg = this.scene.add.rectangle(0, 0, width, 140, 0x000000, 0.7);
        
        // Text configuration
        const text = this.scene.add.text(0, 0, "TARGET MET!", {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '60px',
            fontStyle: 'bold',
            color: '#4ade80', // Tailwind green-400
            stroke: '#ffffff',
            strokeThickness: 8,
            align: 'center',
            shadow: { offsetX: 0, offsetY: 5, color: '#000000', blur: 5, stroke: true, fill: true }
        }).setOrigin(0.5);

        // Responsive Scaling: Ensure text fits within 90% of screen width
        const maxWidth = width * 0.9;
        if (text.width > maxWidth) {
            const scale = maxWidth / text.width;
            text.setScale(scale);
        }

        container.add([bg, text]);
        
        // Initial state
        container.setScale(0);
        
        // Animation
        this.scene.tweens.add({
            targets: container,
            scale: 1,
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                this.scene.time.delayedCall(1200, () => {
                    this.scene.tweens.add({
                        targets: container,
                        scale: 0,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            container.destroy();
                            resolve();
                        }
                    });
                });
            }
        });
    });
  }

  // --- Highlights ---
  
  /**
   * Draws a temporary highlight shape behind the specified tiles.
   * Useful for showing the area of effect for bombs/rockets.
   */
  highlightArea(tiles: any[], color: number = 0xffffff, alpha: number = 0.4, duration: number = 400) {
      if (!this.scene.sys.isActive() || tiles.length === 0) return;

      const graphics = this.scene.add.graphics();
      this.effectLayer.add(graphics);
      graphics.fillStyle(color, alpha);

      // Draw a circle or rect for each tile to create a merged shape look
      tiles.forEach(t => {
          if(t && t.active) {
             // Use a slightly larger rect/circle to make them blend
             graphics.fillCircle(t.x, t.y, 35); 
          }
      });

      // Fade out
      this.scene.tweens.add({
          targets: graphics,
          alpha: 0,
          duration: duration,
          onComplete: () => graphics.destroy()
      });
  }

  playMagicZap(source: any, targets: any[], speed: number = 1.0) {
      if (!this.scene.sys.isActive() || !source.scene) return;
      
      // Highlight targets immediately
      this.highlightArea(targets, 0xff00ff, 0.3);

      targets.forEach(target => {
          if (!target.scene) return;
          const particle = this.scene.add.circle(source.x, source.y, 8, 0xff00ff);
          this.effectLayer.add(particle);
          
          this.scene.tweens.add({
              targets: particle,
              x: target.x,
              y: target.y,
              duration: 300 / speed,
              onComplete: () => {
                  particle.destroy();
                  // Small flash at target
                  const flash = this.scene.add.circle(target.x, target.y, 30, 0xffffff, 0.8);
                  this.effectLayer.add(flash);
                  this.scene.tweens.add({
                      targets: flash, scale: 0, alpha: 0, duration: 150,
                      onComplete: () => flash.destroy()
                  });
              }
          });
      });
  }

  playRocketEffect(source: any, isHorizontal: boolean, affectedTiles: any[] = [], speed: number = 1.0) {
      if (!this.scene.sys.isActive()) return;
      const { width, height } = this.scene.scale;
      
      // Highlight the path immediately
      if (affectedTiles.length > 0) {
          this.highlightArea(affectedTiles, 0xffffdd, 0.5);
      }

      const r1 = this.scene.add.text(source.x, source.y, '🚀', { fontSize: '40px' }).setOrigin(0.5);
      const r2 = this.scene.add.text(source.x, source.y, '🚀', { fontSize: '40px' }).setOrigin(0.5);
      this.effectLayer.add([r1, r2]);

      let targetX1, targetY1, targetX2, targetY2;
      
      if (isHorizontal) {
          r1.setAngle(45); // Visual tweaks
          r2.setAngle(-135);
          targetX1 = width + 100; targetY1 = source.y;
          targetX2 = -100; targetY2 = source.y;
      } else {
          r1.setAngle(-45);
          r2.setAngle(135);
          targetX1 = source.x; targetY1 = -100;
          targetX2 = source.x; targetY2 = height + 100;
      }

      this.scene.tweens.add({ targets: r1, x: targetX1, y: targetY1, duration: 500 / speed, onComplete: () => r1.destroy() });
      this.scene.tweens.add({ targets: r2, x: targetX2, y: targetY2, duration: 500 / speed, onComplete: () => r2.destroy() });
  }

  playExplosion(x: number, y: number, affectedTiles: any[] = [], speed: number = 1.0) {
      if (!this.scene.sys.isActive()) return;
      
      // Highlight area
      if (affectedTiles.length > 0) {
          this.highlightArea(affectedTiles, 0xffaa00, 0.4);
      }

      const circle = this.scene.add.circle(x, y, 10, 0xff5500, 1);
      this.effectLayer.add(circle);
      
      this.scene.tweens.add({
          targets: circle,
          scale: 6,
          alpha: 0,
          duration: 300 / speed,
          onComplete: () => circle.destroy()
      });
      
      // Particles
      for(let i=0; i<8; i++) {
          const p = this.scene.add.circle(x, y, 6, 0xffaa00);
          this.effectLayer.add(p);
          const angle = (i / 8) * Math.PI * 2;
          const dist = 80;
          this.scene.tweens.add({
              targets: p,
              x: x + Math.cos(angle) * dist,
              y: y + Math.sin(angle) * dist,
              alpha: 0,
              scale: 0.5,
              duration: 400 / speed,
              onComplete: () => p.destroy()
          });
      }
  }
}
