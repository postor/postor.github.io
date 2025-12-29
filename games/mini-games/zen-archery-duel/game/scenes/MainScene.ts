import Phaser from 'phaser';
import { DIFFICULTY_SETTINGS, COLORS, GAME_WIDTH, GAME_HEIGHT, GRAVITY, ARROW_SPEED, MAX_HP, DAMAGE_BODY, DAMAGE_HEAD } from '../../constants';
import { Difficulty, TurnState } from '../../types';

export class MainScene extends Phaser.Scene {
  // Explicitly declare scene properties
  declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare physics: Phaser.Physics.Arcade.ArcadePhysics;
  declare input: Phaser.Input.InputPlugin;
  declare tweens: Phaser.Tweens.TweenManager;
  declare time: Phaser.Time.Clock;

  private difficulty: Difficulty;
  private turnState: TurnState = TurnState.PLAYER_AIMING;
  
  // Game Objects
  private player!: Phaser.GameObjects.Container;
  private ai!: Phaser.GameObjects.Container;
  private ground!: Phaser.GameObjects.Rectangle;
  private arrow!: Phaser.GameObjects.Container; 
  private trajectoryLine!: Phaser.GameObjects.Graphics;
  private dragGraphics!: Phaser.GameObjects.Graphics; 
  private windValue: number = 0;
  
  // State
  private playerHp: number = MAX_HP;
  private aiHp: number = MAX_HP;
  private timeElapsed: number = 0;
  
  // Input State
  // We track the specific pointer (mouse or touch ID) to prevent multi-touch glitches
  private dragPointer: Phaser.Input.Pointer | null = null; 
  private dragStartPos: Phaser.Math.Vector2 | null = null;
  private dragCurrentPos: Phaser.Math.Vector2 | null = null;
  private currentAimAngle: number = 0;
  
  // Callbacks
  private onStatsUpdate?: (stats: any) => void;
  private onGameOver?: (winner: 'Player' | 'AI') => void;

  constructor() {
    super({ key: 'MainScene' });
    this.difficulty = Difficulty.BEGINNER;
  }

  init(data: { difficulty?: Difficulty; onStatsUpdate?: any; onGameOver?: any }) {
    this.difficulty = data?.difficulty || Difficulty.BEGINNER;
    this.onStatsUpdate = data?.onStatsUpdate;
    this.onGameOver = data?.onGameOver;
    
    this.playerHp = MAX_HP;
    this.aiHp = MAX_HP;
    this.turnState = TurnState.PLAYER_AIMING;
    this.dragPointer = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.currentAimAngle = 0;
    this.changeWind();
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);
    
    // Ground
    this.ground = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH, 40, COLORS.ground);
    this.physics.add.existing(this.ground, true);

    // Characters
    this.player = this.createCharacter(100, GAME_HEIGHT - 90, COLORS.player, true);
    this.ai = this.createCharacter(GAME_WIDTH - 100, GAME_HEIGHT - 90, COLORS.ai, false);

    // UI
    this.trajectoryLine = this.add.graphics();
    this.dragGraphics = this.add.graphics();

    // Input Configuration
    // Allow up to 3 pointers (Mouse + 2 Touches) to ensure we always catch the input
    this.input.addPointer(2); 
    
    // Bind events
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this); 
    this.input.on('pointercancel', this.handlePointerUp, this);
    
    this.updateReactStats();
  }

  update(time: number, delta: number) {
    this.timeElapsed += delta;

    if (this.turnState === TurnState.PLAYER_AIMING) {
      this.drawAimLine(time);
    } else {
      this.trajectoryLine.clear();
      this.dragGraphics.clear();
    }

    if (this.arrow && this.arrow.active) {
      const body = this.arrow.body as Phaser.Physics.Arcade.Body;
      
      if (body && body.enable) {
        body.setAccelerationX(this.windValue);

        if (body.velocity.length() > 10) {
          this.arrow.rotation = body.velocity.angle();
        }

        if (this.arrow.y > GAME_HEIGHT + 50 || this.arrow.x < -100 || this.arrow.x > GAME_WIDTH + 100) {
          this.handleMiss();
        }
      }
    }
  }

  // --- Core Mechanics ---

  private changeWind() {
    const config = DIFFICULTY_SETTINGS[this.difficulty];
    if (!config) {
        this.windValue = 0;
        return;
    }

    if (config.windMax === 0) {
      this.windValue = 0;
    } else {
      this.windValue = (Math.random() * config.windMax * 2) - config.windMax;
    }
    this.updateReactStats();
  }

  private getBreathingOffset(time: number): number {
    const config = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS[Difficulty.BEGINNER];
    return Math.sin(time * 0.002) * config.breathingIntensity;
  }

  private drawAimLine(time: number) {
    // Breathing
    const breathing = this.getBreathingOffset(time);
    const finalAngle = this.currentAimAngle + breathing;

    // Trajectory Guide
    this.trajectoryLine.clear();
    this.trajectoryLine.lineStyle(3, COLORS.trajectory, 0.6);
    this.trajectoryLine.beginPath();
    this.trajectoryLine.moveTo(this.player.x, this.player.y);
    
    const guideLen = 150;
    this.trajectoryLine.lineTo(
      this.player.x + Math.cos(finalAngle) * guideLen, 
      this.player.y + Math.sin(finalAngle) * guideLen
    );
    this.trajectoryLine.strokePath();

    // Drag UI
    this.dragGraphics.clear();
    if (this.dragStartPos && this.dragCurrentPos) {
      // Draw anchor at start
      this.dragGraphics.lineStyle(2, 0xffffff, 0.3);
      this.dragGraphics.strokeCircle(this.dragStartPos.x, this.dragStartPos.y, 40);
      
      // Draw elastic line
      this.dragGraphics.lineStyle(2, 0xffffff, 0.8);
      this.dragGraphics.lineBetween(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);
      
      // Draw finger puck
      this.dragGraphics.fillStyle(0xffffff, 0.8);
      this.dragGraphics.fillCircle(this.dragCurrentPos.x, this.dragCurrentPos.y, 15);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.turnState !== TurnState.PLAYER_AIMING) return;
    
    // If we are already dragging with another finger, ignore new touches
    if (this.dragPointer) return;
    
    this.dragPointer = pointer;
    this.dragStartPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.dragCurrentPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.turnState !== TurnState.PLAYER_AIMING || !this.dragStartPos) return;
    
    // Only listen to the pointer that started the drag
    if (pointer !== this.dragPointer) return;

    this.dragCurrentPos = new Phaser.Math.Vector2(pointer.x, pointer.y);

    // Vector from POINTER to START (Pulling back)
    const vector = this.dragStartPos.clone().subtract(this.dragCurrentPos);
    
    // Deadzone to prevent jitters
    if (vector.length() < 10) return;

    // --- AIM CLAMPING ---
    // We want to shoot generally to the Right (Angle 0).
    // In Slingshot mode, this means we must Drag Left (Vector X > 0).
    // If user Drags Right (Vector X < 0), they are "pushing" the string forward.
    // Instead of snapping incorrectly, we clamp negative X to 0.
    // This creates a smooth transition to vertical Up/Down shots if dragging forward.
    vector.x = Math.max(0, vector.x);

    this.currentAimAngle = vector.angle();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (this.turnState !== TurnState.PLAYER_AIMING || !this.dragStartPos) return;
    
    // Only listen to the pointer that started the drag
    if (pointer !== this.dragPointer) return;

    // Use distance from start to the FINAL reported position of the pointer
    const releasePos = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const dist = Phaser.Math.Distance.BetweenPoints(this.dragStartPos, releasePos);
    
    // Clean up input state immediately
    this.dragPointer = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.dragGraphics.clear();

    // Fire if pull was strong enough
    if (dist > 30) {
        const breathing = this.getBreathingOffset(this.timeElapsed);
        const finalAngle = this.currentAimAngle + breathing;
        this.fireArrow(this.player.x, this.player.y, finalAngle, true);
    }
  }

  private fireArrow(x: number, y: number, angle: number, isPlayer: boolean) {
    this.turnState = isPlayer ? TurnState.PLAYER_PROJECTILE_AIRBORNE : TurnState.AI_PROJECTILE_AIRBORNE;

    this.arrow = this.add.container(x, y);
    const gfx = this.add.graphics();
    gfx.fillStyle(COLORS.arrow);
    gfx.fillRect(-20, -2, 40, 4); 
    gfx.fillStyle(0x555555);
    gfx.fillTriangle(20, -5, 20, 5, 30, 0); 
    this.arrow.add(gfx);

    this.physics.world.enable(this.arrow);
    const body = this.arrow.body as Phaser.Physics.Arcade.Body;
    
    body.setGravityY(GRAVITY);
    body.setCollideWorldBounds(false); 
    body.setSize(10, 10);
    body.setOffset(20, -5); 
    
    this.physics.velocityFromRotation(angle, ARROW_SPEED, body.velocity);
    this.arrow.rotation = angle;

    const target = isPlayer ? this.ai : this.player;
    this.physics.add.overlap(this.arrow, target, this.handleHit, undefined, this);
    this.physics.add.collider(this.arrow, this.ground, this.handleGroundHit, undefined, this);
  }

  private handleHit(arrow: any, target: any) {
    if (this.turnState === TurnState.RESOLVING) return; 

    const isPlayerHit = target === this.player;
    const body = arrow.body as Phaser.Physics.Arcade.Body;
    
    body.setEnable(false);
    arrow.parentContainer = target; 
    
    const relativeY = arrow.y - target.y;
    // Hitbox logic: Head -65 to -35
    const isHeadshot = relativeY < -35 && relativeY > -70; 

    const damage = isHeadshot ? DAMAGE_HEAD : DAMAGE_BODY;
    
    this.showDamageText(target.x, target.y - 80, isHeadshot ? "HEADSHOT!" : `-${damage}`, isHeadshot);

    if (isPlayerHit) {
      this.playerHp = Math.max(0, this.playerHp - damage);
    } else {
      this.aiHp = Math.max(0, this.aiHp - damage);
    }

    this.updateReactStats();
    this.resolveTurn();
  }

  private handleGroundHit(arrow: any) {
     if (this.turnState === TurnState.RESOLVING) return;
     const body = arrow.body as Phaser.Physics.Arcade.Body;
     body.setVelocity(0, 0);
     body.setAcceleration(0, 0);
     body.setAllowGravity(false);
     body.setEnable(false);
     this.handleMiss();
  }

  private handleMiss() {
    if (this.turnState === TurnState.RESOLVING) return;
    this.showDamageText(GAME_WIDTH / 2, GAME_HEIGHT / 2, "MISS", false);
    this.resolveTurn();
  }

  private showDamageText(x: number, y: number, text: string, isCritical: boolean) {
    const style = { 
        fontFamily: 'Cinzel', 
        fontSize: isCritical ? '32px' : '24px', 
        color: isCritical ? '#ff0000' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    };
    const txt = this.add.text(x, y, text, style).setOrigin(0.5);
    
    this.tweens.add({
        targets: txt,
        y: y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => txt.destroy()
    });
  }

  private resolveTurn() {
    const wasPlayerShot = (this.turnState === TurnState.PLAYER_PROJECTILE_AIRBORNE);
    this.turnState = TurnState.RESOLVING;

    if (this.playerHp <= 0) {
      this.time.delayedCall(1000, () => this.onGameOver && this.onGameOver('AI'));
      return;
    }
    if (this.aiHp <= 0) {
      this.time.delayedCall(1000, () => this.onGameOver && this.onGameOver('Player'));
      return;
    }

    this.time.delayedCall(1000, () => {
      if (this.arrow) this.arrow.destroy();
      this.changeWind();
      if (wasPlayerShot) {
        this.startAiTurn();
      } else {
        this.turnState = TurnState.PLAYER_AIMING;
        this.currentAimAngle = 0;
        this.updateReactStats();
      }
    });
  }

  private startAiTurn() {
    this.turnState = TurnState.AI_AIMING;
    this.updateReactStats();

    const config = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS[Difficulty.BEGINNER];

    this.time.delayedCall(config.aiThinkTime, () => {
      if (this.turnState !== TurnState.AI_AIMING) return;

      let baseAngle = Phaser.Math.DegToRad(-135);
      const windComp = (this.windValue / 2000); 
      const error = (Math.random() * config.aiAccuracyError * 2) - config.aiAccuracyError;
      const finalAngle = baseAngle - windComp + error;

      this.fireArrow(this.ai.x, this.ai.y, finalAngle, false);
    });
  }

  private createCharacter(x: number, y: number, color: number, flip: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const gfx = this.add.graphics();
    
    gfx.lineStyle(6, color, 1);
    gfx.fillStyle(color, 1);

    gfx.strokeCircle(0, -50, 15); // Head
    gfx.lineBetween(0, -35, 0, 10); // Torso
    gfx.lineBetween(0, 10, -15, 50); // L Leg
    gfx.lineBetween(0, 10, 15, 50); // R Leg
    gfx.lineBetween(0, -25, 20, -25); // Arms
    
    // Bow
    gfx.lineStyle(4, 0x8B4513, 1);
    gfx.beginPath();
    gfx.arc(20, -25, 40, -Math.PI / 2, Math.PI / 2, false); 
    gfx.strokePath();
    gfx.lineStyle(2, 0xffffff, 0.5);
    gfx.lineBetween(20, -65, 20, 15);

    container.add(gfx);
    this.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    
    body.setSize(25, 115);
    body.setOffset(-12.5, -65);
    body.setImmovable(true);
    body.setAllowGravity(false);

    if (!flip) container.setScale(-1, 1); 

    return container;
  }

  private updateReactStats() {
      if (this.onStatsUpdate) {
          this.onStatsUpdate({
              playerHp: this.playerHp,
              aiHp: this.aiHp,
              currentWind: this.windValue,
              isPlayerTurn: this.turnState === TurnState.PLAYER_AIMING
          });
      }
  }
}