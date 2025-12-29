import Phaser from 'phaser';
import { GameStateData, PlayerTurn, BallGroup, GameRule, Difficulty } from '../types';

export class MainScene extends Phaser.Scene {
  declare make: Phaser.GameObjects.GameObjectCreator;
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare matter: Phaser.Physics.Matter.MatterPhysics;
  declare scale: Phaser.Scale.ScaleManager;
  declare input: Phaser.Input.InputPlugin;
  declare time: Phaser.Time.Clock;
  declare scene: Phaser.Scenes.ScenePlugin;
  declare children: Phaser.GameObjects.DisplayList;

  private cueBall!: Phaser.Physics.Matter.Image;
  private balls: Phaser.Physics.Matter.Image[] = [];
  private cueStick!: Phaser.GameObjects.Graphics;
  private lineGuide!: Phaser.GameObjects.Graphics;
  private ghostBall!: Phaser.GameObjects.Graphics;
  private placementGuide!: Phaser.GameObjects.Graphics;
  private cushionGraphics!: Phaser.GameObjects.Graphics;
  private forbiddenIcon!: Phaser.GameObjects.Graphics;
  
  private isDragging = false;
  private isShooting = false; 
  private isPlacingCueBall = false;
  private dragStartX = 0;
  private dragStartY = 0;
  
  // Game Settings
  private gameRule: GameRule = '8_BALL';
  private difficulty: Difficulty = 'MEDIUM';
  private vsAI: boolean = false;
  private holes: { x: number, y: number }[] = [];
  
  // Game State
  private currentTurn: PlayerTurn = PlayerTurn.PLAYER_1;
  private scores = { p1: 0, p2: 0 };
  private p1Group: BallGroup = null;
  private isTableOpen = true; // For 8-ball
  
  // Turn Analysis State
  private shotState = {
      firstHitBall: null as Phaser.Physics.Matter.Image | null,
      pottedBalls: [] as Phaser.Physics.Matter.Image[],
      isScratch: false
  };
  private snookerState: 'RED' | 'COLOR' = 'RED';

  // Callbacks
  public onTurnChange?: (turn: PlayerTurn) => void;
  public onScoreUpdate?: (scores: { p1: number, p2: number }) => void;
  public onGroupUpdate?: (p1Group: BallGroup) => void;
  public onLog?: (msg: string) => void;
  public onRequestAI?: (state: GameStateData) => void;
  public onGameOver?: (result: string) => void;
  public onHandStateChange?: (isActive: boolean) => void;

  // Dimensions - Shrinking table to fit UI better
  private playWidth = 280; 
  private playHeight = 540; 
  private cushionSize = 18; 
  private frameSize = 22; 
  private tableX = 0;
  private tableY = 0;
  private playOriginX = 0;
  private playOriginY = 0;
  public ballRadius = 9; 
  private shotThreshold = 0.15;
  private maxShotPower = 32;

  // Physics Config
  private readonly ballPhysicsOptions = {
    friction: 0.04,
    frictionAir: 0.008,
    restitution: 0.9,
    density: 0.05
  };

  private ballColors8Ball = [
    0xf1c40f, 0x3498db, 0xe74c3c, 0x9b59b6, 0xe67e22, 0x2ecc71, 0x800000, 0x111111, // 1-8
    0xf1c40f, 0x3498db, 0xe74c3c, 0x9b59b6, 0xe67e22, 0x2ecc71, 0x800000 // 9-15
  ];

  constructor() {
    super('MainScene');
  }

  init(data: { vsAI: boolean, gameRule: GameRule, difficulty: Difficulty }) {
    this.vsAI = data.vsAI;
    this.gameRule = data.gameRule;
    this.difficulty = data.difficulty;
    
    this.currentTurn = PlayerTurn.PLAYER_1;
    this.scores = { p1: 0, p2: 0 };
    this.balls = [];
    this.isShooting = false;
    this.isPlacingCueBall = false;
    this.isTableOpen = true;
    this.p1Group = null;
    this.snookerState = 'RED';
    this.shotState = { firstHitBall: null, pottedBalls: [], isScratch: false };
    if (this.onHandStateChange) this.onHandStateChange(false);
  }

  preload() {
    this.createBallTexture('cue_ball', 0xffffff, 0, false);
    for (let i = 1; i <= 15; i++) {
        const colorIdx = (i > 8 ? i - 8 : i) - 1;
        const color = this.ballColors8Ball[i-1];
        const isStripe = i > 8;
        this.createBallTexture(`ball_${i}`, color, i, isStripe);
    }
    // Snooker Textures
    this.createBallTexture('snooker_red', 0xdc2626, 1, false, true);
    this.createBallTexture('snooker_yellow', 0xfacc15, 2, false, true);
    this.createBallTexture('snooker_green', 0x22c55e, 3, false, true);
    this.createBallTexture('snooker_brown', 0x92400e, 4, false, true);
    this.createBallTexture('snooker_blue', 0x2563eb, 5, false, true);
    this.createBallTexture('snooker_pink', 0xec4899, 6, false, true);
    this.createBallTexture('snooker_black', 0x0f172a, 7, false, true);
  }

  createBallTexture(key: string, color: number, number: number, isStripe: boolean = false, isSnooker: boolean = false) {
    const r = this.ballRadius;
    const size = r * 2;
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    
    if (isSnooker) {
        gfx.fillStyle(color);
        gfx.fillCircle(r, r, r);
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillCircle(r - 3, r - 3, 3);
    } else {
        if (isStripe) {
            gfx.fillStyle(0xffffff);
            gfx.fillCircle(r, r, r);
            gfx.fillStyle(color);
            gfx.fillRect(4, r - 7, size - 8, 14);
        } else {
            gfx.fillStyle(color);
            gfx.fillCircle(r, r, r);
        }
        if (number > 0) {
            gfx.fillStyle(0xffffff);
            gfx.fillCircle(r, r, 5); 
        }
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillCircle(r - 4, r - 4, 3);
    }
    gfx.generateTexture(key, size, size);
  }

  create() {
    // Add extra pointer for reliable touch
    this.input.addPointer(1);

    const canvasW = this.scale.width;
    const canvasH = this.scale.height;
    const totalTableW = this.playWidth + (this.cushionSize * 2) + (this.frameSize * 2);
    const totalTableH = this.playHeight + (this.cushionSize * 2) + (this.frameSize * 2);

    this.tableX = (canvasW - totalTableW) / 2;
    this.tableY = (canvasH - totalTableH) / 2;
    this.playOriginX = this.tableX + this.frameSize + this.cushionSize;
    this.playOriginY = this.tableY + this.frameSize + this.cushionSize;

    this.matter.world.setBounds(0, 0, canvasW, canvasH);
    this.matter.world.setGravity(0, 0); 

    // Floor & Table
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a); 
    bg.fillRect(0, 0, canvasW, canvasH);
    const tableGfx = this.add.graphics();
    tableGfx.fillStyle(0x3e2723); 
    tableGfx.fillRoundedRect(this.tableX, this.tableY, totalTableW, totalTableH, 16);
    tableGfx.fillStyle(this.gameRule === '9_BALL' ? 0x1e3a8a : 0x15803d); 
    tableGfx.fillRect(this.tableX + this.frameSize, this.tableY + this.frameSize, this.playWidth + this.cushionSize * 2, this.playHeight + this.cushionSize * 2);

    // Baulk Line
    const baulkY = this.playOriginY + (this.playHeight * 0.8);
    tableGfx.lineStyle(2, 0xffffff, 0.3);
    tableGfx.lineBetween(this.playOriginX, baulkY, this.playOriginX + this.playWidth, baulkY);
    if (this.gameRule === 'SNOOKER') {
        tableGfx.beginPath();
        tableGfx.arc(this.playOriginX + this.playWidth/2, baulkY, this.playWidth/6, Math.PI, 0);
        tableGfx.strokePath();
    }

    this.cushionGraphics = this.add.graphics();
    this.createWalls();
    this.createHoles(); 
    this.children.bringToTop(this.cushionGraphics);

    this.setupBalls();

    // Visuals
    this.cueStick = this.add.graphics();
    this.lineGuide = this.add.graphics();
    this.ghostBall = this.add.graphics();
    this.placementGuide = this.add.graphics();
    this.forbiddenIcon = this.add.graphics();

    this.input.on('pointerdown', this.handleInputDown, this);
    this.input.on('pointermove', this.handleInputMove, this);
    this.input.on('pointerup', this.handleInputUp, this);
    this.input.on('pointerupoutside', this.handleInputUp, this); // Catch off-canvas release
    this.matter.world.on('collisionstart', this.handleCollisions.bind(this));

    if (this.onTurnChange) this.onTurnChange(this.currentTurn);
    if (this.onLog) {
        if (this.gameRule === '8_BALL') this.onLog("8-Ball: Solids vs Stripes. Don't sink 8 early!");
        if (this.gameRule === '9_BALL') this.onLog("9-Ball: Hit lowest number first.");
        if (this.gameRule === 'SNOOKER') this.onLog("Snooker: Pot Red then Color.");
    }
  }

  createWalls() {
    const wallOptions = { isStatic: true, friction: 0.1, restitution: 0.8, label: 'cushion' };
    const cs = this.cushionSize;
    const w = this.playWidth;
    const h = this.playHeight;
    const ox = this.playOriginX;
    const oy = this.playOriginY;
    const cornerGap = 16; const midGap = 12; 

    // Cushions
    const topW = w - (cornerGap * 2);
    this.matter.add.rectangle(ox + w/2, oy - cs/2, topW, cs, wallOptions);
    this.matter.add.rectangle(ox + w/2, oy + h + cs/2, topW, cs, wallOptions);
    const sideH = (h / 2) - midGap - cornerGap;
    const tlY = oy + cornerGap + (sideH / 2);
    this.matter.add.rectangle(ox - cs/2, tlY, cs, sideH, wallOptions);
    const blY = oy + h/2 + midGap + (sideH / 2);
    this.matter.add.rectangle(ox - cs/2, blY, cs, sideH, wallOptions);
    this.matter.add.rectangle(ox + w + cs/2, tlY, cs, sideH, wallOptions);
    this.matter.add.rectangle(ox + w + cs/2, blY, cs, sideH, wallOptions);

    // Safety Walls (Thicker to prevent tunneling)
    const safetyThickness = 100;
    this.matter.add.rectangle(ox + w/2, this.tableY - safetyThickness/2, w + 400, safetyThickness, { ...wallOptions, label: 'safety' });
    this.matter.add.rectangle(ox + w/2, this.tableY + h + (this.cushionSize*2) + this.frameSize*2 + safetyThickness/2, w + 400, safetyThickness, { ...wallOptions, label: 'safety' });
    this.matter.add.rectangle(this.tableX - safetyThickness/2, oy + h/2, safetyThickness, h + 400, { ...wallOptions, label: 'safety' });
    this.matter.add.rectangle(this.tableX + w + (this.cushionSize*2) + this.frameSize*2 + safetyThickness/2, oy + h/2, safetyThickness, h + 400, { ...wallOptions, label: 'safety' });

    // Graphics
    const gfx = this.cushionGraphics;
    gfx.fillStyle(this.gameRule === '9_BALL' ? 0x172554 : 0x14532d); 
    gfx.fillRect(ox + cornerGap, oy - cs, topW, cs);
    gfx.fillRect(ox + cornerGap, oy + h, topW, cs);
    gfx.fillRect(ox - cs, oy + cornerGap, cs, sideH);
    gfx.fillRect(ox - cs, oy + h/2 + midGap, cs, sideH);
    gfx.fillRect(ox + w, oy + cornerGap, cs, sideH);
    gfx.fillRect(ox + w, oy + h/2 + midGap, cs, sideH);
  }

  createHoles() {
    const w = this.playWidth;
    const h = this.playHeight;
    const ox = this.playOriginX;
    const oy = this.playOriginY;
    const co = 6; const mo = 8; 
    const positions = [
      { x: ox - co, y: oy - co }, { x: ox + w + co, y: oy - co }, 
      { x: ox - mo, y: oy + h / 2 }, { x: ox + w + mo, y: oy + h / 2 }, 
      { x: ox - co, y: oy + h + co }, { x: ox + w + co, y: oy + h + co }, 
    ];
    this.holes = positions;
    positions.forEach(pos => {
      this.add.circle(pos.x, pos.y, 13, 0x000000); 
      this.matter.add.circle(pos.x, pos.y, 9, { isSensor: true, label: 'hole' });
    });
  }

  // Helper to ensure ALL balls are created equal
  applyBallPhysics(ball: Phaser.Physics.Matter.Image) {
      // setCircle re-creates the body. 
      // We pass the physics options here to ensure Mass = Density * Volume(Radius) is calculated correctly.
      ball.setCircle(this.ballRadius, this.ballPhysicsOptions);
  }

  setupBalls() {
    const ox = this.playOriginX; const oy = this.playOriginY;
    const w = this.playWidth; const h = this.playHeight;
    
    const baulkY = oy + (h * 0.8);
    
    // Create Cue Ball
    this.cueBall = this.matter.add.image(ox + w*0.5, baulkY, 'cue_ball');
    this.cueBall.setName('ball_cue');
    this.applyBallPhysics(this.cueBall);

    if (this.gameRule === '8_BALL') this.setup8Ball(ox, oy, w, h);
    else if (this.gameRule === '9_BALL') this.setup9Ball(ox, oy, w, h);
    else if (this.gameRule === 'SNOOKER') this.setupSnooker(ox, oy, w, h);
  }

  setup8Ball(ox: number, oy: number, w: number, h: number) {
    const rackY = oy + (h * 0.25);
    const rackX = ox + (w / 2);
    const spacing = this.ballRadius * 2 + 0.5;
    const layout = [1, 9, 2, 3, 8, 10, 4, 14, 5, 12, 13, 6, 11, 7, 15];
    let idx = 0;
    for (let i = 0; i < 5; i++) {
      const rowWidth = i * spacing;
      const rowStartX = rackX - (rowWidth / 2);
      for (let j = 0; j <= i; j++) {
        const x = rowStartX + (j * spacing);
        const y = rackY - (i * (spacing * 0.866)); 
        const num = layout[idx++];
        this.spawnBall(x, y, `ball_${num}`, num, num > 8 ? 'stripes' : (num === 8 ? 'black' : 'solids'));
      }
    }
  }

  setup9Ball(ox: number, oy: number, w: number, h: number) {
    const rackY = oy + (h * 0.25);
    const rackX = ox + (w / 2);
    const spacing = this.ballRadius * 2 + 0.5;
    const coords = [
        {r:0, c:0, n:1}, {r:1, c:0, n:2}, {r:1, c:1, n:3},
        {r:2, c:0, n:4}, {r:2, c:1, n:9}, {r:2, c:2, n:5},
        {r:3, c:0, n:6}, {r:3, c:1, n:7}, {r:4, c:0, n:8},
    ];
    coords.forEach(p => {
        let x = rackX; let y = rackY;
        if (p.r === 0) { y = rackY; }
        else if (p.r === 1) { y = rackY - spacing*0.866; x = rackX + (p.c === 0 ? -spacing/2 : spacing/2); }
        else if (p.r === 2) { y = rackY - spacing*0.866*2; x = rackX + (p.c-1)*spacing; }
        else if (p.r === 3) { y = rackY - spacing*0.866*3; x = rackX + (p.c === 0 ? -spacing/2 : spacing/2); }
        else if (p.r === 4) { y = rackY - spacing*0.866*4; }
        this.spawnBall(x, y, `ball_${p.n}`, p.n);
    });
  }

  setupSnooker(ox: number, oy: number, w: number, h: number) {
    const pyramidTipY = oy + (h * 0.25);
    const centerX = ox + (w / 2);
    const spacing = this.ballRadius * 2 + 0.5;
    for (let i = 0; i < 5; i++) {
      const rowWidth = i * spacing;
      const rowStartX = centerX - (rowWidth / 2);
      for (let j = 0; j <= i; j++) {
        const x = rowStartX + (j * spacing);
        const y = pyramidTipY - (i * (spacing * 0.866)); 
        this.spawnBall(x, y, 'snooker_red', 1, 'red');
      }
    }
    this.spawnBall(centerX, oy + (h * 0.08), 'snooker_black', 7, 'color');
    this.spawnBall(centerX, pyramidTipY + spacing, 'snooker_pink', 6, 'color');
    this.spawnBall(centerX, oy + (h * 0.5), 'snooker_blue', 5, 'color');
    const baulkY = oy + (h * 0.8);
    const dRadius = w/6;
    this.spawnBall(centerX, baulkY, 'snooker_brown', 4, 'color');
    this.spawnBall(centerX - dRadius, baulkY, 'snooker_green', 3, 'color');
    this.spawnBall(centerX + dRadius, baulkY, 'snooker_yellow', 2, 'color');
  }

  spawnBall(x: number, y: number, key: string, value: number, group: string = 'neutral') {
    const ball = this.matter.add.image(x, y, key);
    ball.setName(key);
    this.applyBallPhysics(ball); // Ensures correct mass
    (ball as any).ballValue = value;
    (ball as any).ballGroup = group;
    (ball as any).startPos = { x, y };
    this.balls.push(ball);
  }

  handleCollisions(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    event.pairs.forEach(pair => {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;
      
      // Check Hole
      const isHole = bodyA.label === 'hole' || bodyB.label === 'hole';
      if (isHole) {
        const ballBody = bodyA.label === 'hole' ? bodyB : bodyA;
        const ballObj = ballBody.gameObject as Phaser.Physics.Matter.Image;
        if (ballObj) this.handlePot(ballObj);
      }

      // Check First Hit (Ball vs Ball)
      if (this.isShooting && !this.shotState.firstHitBall) {
          const ballA = bodyA.gameObject as Phaser.Physics.Matter.Image;
          const ballB = bodyB.gameObject as Phaser.Physics.Matter.Image;
          if (ballA?.name === 'ball_cue' && ballB) this.shotState.firstHitBall = ballB;
          else if (ballB?.name === 'ball_cue' && ballA) this.shotState.firstHitBall = ballA;
      }
    });
  }

  handlePot(ball: Phaser.Physics.Matter.Image) {
    if (!ball.active) return;
    
    if (ball.name === 'ball_cue') {
        this.shotState.isScratch = true;
    } else {
        this.shotState.pottedBalls.push(ball);
    }

    ball.setActive(false);
    ball.setVisible(false);
    this.matter.world.remove(ball.body!);
  }

  // Called when all balls stop
  onShotEnd() {
    this.isShooting = false;
    let turnContinues = false;
    let isFoul = false;
    let foulMsg = "";

    // 1. Basic Foul Checks
    if (this.shotState.isScratch) {
        isFoul = true; foulMsg = "Scratch!";
    } else if (!this.shotState.firstHitBall) {
        isFoul = true; foulMsg = "Missed everything!";
    }

    // 2. Rule Specific Checks
    if (!isFoul || this.shotState.isScratch) {
        const firstHit = this.shotState.firstHitBall;
        const potted = this.shotState.pottedBalls;
        
        if (this.gameRule === '8_BALL') {
            // Check First Hit (only if not already scratched)
            if (!this.shotState.isScratch && this.p1Group) {
                const myGroup = this.currentTurn === PlayerTurn.PLAYER_1 ? this.p1Group : (this.p1Group === 'solids' ? 'stripes' : 'solids');
                const hitGroup = (firstHit as any).ballGroup;
                if (hitGroup !== myGroup && hitGroup !== 'black') { 
                    const myBallsExist = this.balls.some(b => b.active && (b as any).ballGroup === myGroup);
                    if (myBallsExist && hitGroup !== myGroup) {
                         isFoul = true; foulMsg = "Hit wrong group first!";
                    }
                }
            }
            
            // 8-Ball Special Pot Logic
            const potted8 = potted.find(b => (b as any).ballValue === 8);
            if (potted8) {
                const myGroup = this.currentTurn === PlayerTurn.PLAYER_1 ? this.p1Group : (this.p1Group === 'solids' ? 'stripes' : 'solids');
                const hasGroupAssigned = !!myGroup;
                const myBallsRemain = hasGroupAssigned && this.balls.some(b => b.active && (b as any).ballGroup === myGroup);
                
                if (!hasGroupAssigned || myBallsRemain) {
                     // Early 8-Ball pot -> Foul & Respawn (Casual Rule to prevent soft-lock)
                     isFoul = true; 
                     foulMsg = "Early 8-Ball! Penalty.";
                     this.respawnBall(potted8); // Auto-place
                } else {
                     if (this.shotState.isScratch) {
                         this.handleLoss("Scratch on 8-Ball"); return;
                     } else {
                         this.handleWin("8-Ball Potted"); return; 
                     }
                }
            }

            if (!isFoul) {
                 // Turn Continuation
                 const myGroup = this.currentTurn === PlayerTurn.PLAYER_1 ? this.p1Group : (this.p1Group === 'solids' ? 'stripes' : 'solids');
                 const pottedMyGroup = potted.some(b => !myGroup || (b as any).ballGroup === myGroup);
                 
                 if (pottedMyGroup) {
                     turnContinues = true;
                     // Group Assignment
                     if (this.isTableOpen && potted.length > 0) {
                         const firstPotted = potted[0];
                         const g = (firstPotted as any).ballGroup;
                         if (g !== 'black') {
                             this.isTableOpen = false;
                             this.p1Group = this.currentTurn === PlayerTurn.PLAYER_1 ? g : (g === 'solids' ? 'stripes' : 'solids');
                             if (this.onGroupUpdate) this.onGroupUpdate(this.p1Group);
                         }
                     }
                 }
            }

            // Update 8-Ball Scores (Balls Potted Count)
            if (this.p1Group) {
                const p1Target = this.p1Group;
                const p2Target = p1Target === 'solids' ? 'stripes' : 'solids';
                const p1Rem = this.balls.filter(b => b.active && (b as any).ballGroup === p1Target).length;
                const p2Rem = this.balls.filter(b => b.active && (b as any).ballGroup === p2Target).length;
                this.scores.p1 = 7 - p1Rem;
                this.scores.p2 = 7 - p2Rem;
            }
        }
        else if (this.gameRule === '9_BALL') {
             const lowest = this.balls.filter(b => b.active).reduce((p, c) => (p as any).ballValue < (c as any).ballValue ? p : c);
             
             // Foul Check
             if (!this.shotState.isScratch && firstHit !== lowest) {
                 isFoul = true; foulMsg = "Must hit lowest ball!";
             }

             // Check 9-Ball Pot
             const potted9 = potted.find(b => (b as any).ballValue === 9);
             if (potted9) {
                 if (isFoul || this.shotState.isScratch) {
                     // 9-Ball potted on foul -> Respawn
                     foulMsg += " (9-Ball Respawned)";
                     this.respawnBall(potted9);
                 } else {
                     // 9-Ball potted legally (combo or direct) -> Win
                     this.handleWin("9-Ball Potted!"); return;
                 }
             }

             if (!isFoul) {
                 if (potted.length > 0) {
                     turnContinues = true;
                 }
             }
        }
        else if (this.gameRule === 'SNOOKER') {
             // Snooker Foul Logic
             const firstVal = (firstHit as any).ballValue;
             const isRedHit = firstHit ? firstVal === 1 : false;
             
             if (!this.shotState.isScratch) {
                if (this.snookerState === 'RED' && !isRedHit) { isFoul = true; foulMsg = "Must hit Red!"; }
                else if (this.snookerState === 'COLOR' && isRedHit) { isFoul = true; foulMsg = "Must hit Color!"; }
             }
             
             if (isFoul || this.shotState.isScratch) {
                 const penalty = Math.max(4, firstVal || 4);
                 if (this.currentTurn === PlayerTurn.PLAYER_1) this.scores.p2 += penalty; else this.scores.p1 += penalty;
             } else {
                 if (potted.length > 0) {
                     const pBall = potted[0];
                     const pVal = (pBall as any).ballValue;
                     if (this.currentTurn === PlayerTurn.PLAYER_1) this.scores.p1 += pVal; else this.scores.p2 += pVal;
                     
                     if (pVal === 1) { 
                         this.snookerState = 'COLOR';
                         turnContinues = true;
                     } else { 
                         this.snookerState = 'RED';
                         turnContinues = true;
                         const redsExist = this.balls.some(b => b.active && (b as any).ballValue === 1);
                         if (redsExist) {
                             this.time.delayedCall(500, () => this.respawnBall(pBall));
                             if (!this.balls.includes(pBall)) this.balls.push(pBall);
                         }
                     }
                 } else {
                     const redsExist = this.balls.some(b => b.active && (b as any).ballValue === 1);
                     if (redsExist) this.snookerState = 'RED';
                 }
             }
        }
    }

    // 3. Resolve Turn
    if (isFoul) {
        if (this.onLog) this.onLog(`FOUL: ${foulMsg}`);
        this.giveBallInHand();
    } else {
        if (turnContinues) {
            if (this.onLog) this.onLog("Good Shot! Continue.");
            if (this.onScoreUpdate) this.onScoreUpdate(this.scores);
            if (this.currentTurn === PlayerTurn.AI) {
                this.time.delayedCall(1000, () => this.processAITurn());
            }
        } else {
            this.switchTurn();
        }
    }

    this.shotState = { firstHitBall: null, pottedBalls: [], isScratch: false };
  }

  giveBallInHand() {
      // Current player fouled, so NEXT player gets ball in hand
      this.switchTurn(true); 
  }

  switchTurn(ballInHand = false) {
    this.currentTurn = this.currentTurn === PlayerTurn.PLAYER_1 ? PlayerTurn.AI : PlayerTurn.PLAYER_1;
    
    // Update score UI on turn switch as well
    if (this.onScoreUpdate) this.onScoreUpdate(this.scores);
    if (this.onTurnChange) this.onTurnChange(this.currentTurn);
    if (this.onLog) this.onLog(`Turn: ${this.currentTurn}`);

    if (ballInHand) {
        if (this.onLog) this.onLog("Ball in Hand!");
        
        // Ensure cue ball is visually available even if potted
        if (!this.cueBall.active) {
            this.cueBall.setActive(true);
            this.cueBall.setVisible(true);
        }
        
        if (this.currentTurn === PlayerTurn.PLAYER_1) {
            // Player gets to place it manually
            this.enableBallInHand(); 
        } else {
            // AI gets to place it automatically
            this.enableBallInHand(); 
            this.time.delayedCall(800, () => {
                 this.autoPlaceCueBallForAI();
            });
        }
    } else {
        if (this.currentTurn === PlayerTurn.AI) {
             this.processAITurn();
        }
    }
  }

  // Find a target and place cue ball 40px away inline with hole
  autoPlaceCueBallForAI() {
      const validTargets = this.getValidTargetsForAI();
      let bestX = this.playOriginX + this.playWidth / 2;
      let bestY = this.playOriginY + this.playHeight / 2;
      let foundSpot = false;

      // 1. Try to find a straight-in shot
      for (const target of validTargets) {
          for (const hole of this.holes) {
              const dx = hole.x - target.x;
              const dy = hole.y - target.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const dirX = dx / dist;
              const dirY = dy / dist;

              // Place cue ball 40px 'behind' the target along the line to the hole
              // position = targetPos - (direction * 40)
              const placeDist = 40;
              const placeX = target.x - (dirX * placeDist);
              const placeY = target.y - (dirY * placeDist);

              // Check if inside table
              if (this.isPointOnTable(placeX, placeY) && !this.isOverlapping(placeX, placeY, target.name)) {
                   bestX = placeX;
                   bestY = placeY;
                   foundSpot = true;
                   break;
              }
          }
          if (foundSpot) break;
      }

      // 2. If no perfect spot, random table position
      if (!foundSpot) {
          bestX = this.playOriginX + Math.random() * this.playWidth;
          bestY = this.playOriginY + Math.random() * this.playHeight;
      }

      this.cueBall.setPosition(bestX, bestY);
      this.finalizeBallPlacement();
  }

  isPointOnTable(x: number, y: number) {
      const r = this.ballRadius;
      const ox = this.playOriginX; const oy = this.playOriginY;
      const w = this.playWidth; const h = this.playHeight;
      return x > ox + r && x < ox + w - r && y > oy + r && y < oy + h - r;
  }

  isOverlapping(x: number, y: number, ignoreName: string) {
      return this.balls.some(b => {
          if (!b.active || b.name === ignoreName || b.name === 'ball_cue') return false;
          const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
          return dist < this.ballRadius * 2.2;
      });
  }

  respawnBall(ball: Phaser.Physics.Matter.Image) {
      // 1. Activate standard Phaser properties
      ball.setActive(true);
      ball.setVisible(true);
      
      // 2. Find a safe position
      const start = (ball as any).startPos;
      let x = start.x;
      let y = start.y;
      
      // Try to find a spot that doesn't overlap along the Y axis
      let attempts = 0;
      while (this.isOverlapping(x, y, ball.name) && attempts < 50) {
          y += this.ballRadius * 2 + 2; // Move down
          // If we go past table bounds, try moving up instead
          if (y > this.playOriginY + this.playHeight - this.ballRadius) {
              y = start.y - (attempts * 3); 
          }
          attempts++;
      }
      
      ball.setPosition(x, y);
      ball.setVelocity(0, 0);
      ball.setAngularVelocity(0);
      ball.setRotation(0);

      // 3. Re-initialize Physics
      // Removing the old body is critical if it still exists in some form
      if (ball.body) {
          this.matter.world.remove(ball.body);
      }
      
      // Re-create body
      this.applyBallPhysics(ball);
      
      // Ensure it's dynamic
      ball.setStatic(false);
      ball.setSensor(false);
      
      // 4. Force position update to physics body immediately
      if (ball.body) {
          this.matter.body.setPosition(ball.body, { x, y });
      }
  }

  enableBallInHand() {
    this.isPlacingCueBall = true;
    this.cueBall.setVelocity(0, 0);
    this.cueBall.setAngularVelocity(0);

    // Create a temporary sensor body for placement
    if (this.cueBall.body) {
        this.matter.world.remove(this.cueBall.body);
    }
    
    // Static Sensor body
    this.cueBall.setCircle(this.ballRadius, {
        isSensor: true, 
        isStatic: true
    });

    // Reset position if out of bounds (scratch)
    if (this.cueBall.x < 0 || this.cueBall.y < 0) {
        const baulkY = this.playOriginY + (this.playHeight * 0.8);
        this.cueBall.setPosition(this.playOriginX + this.playWidth/2, baulkY);
    }

    if (this.onHandStateChange) this.onHandStateChange(true);
  }
  
  public confirmPlacement() {
      if (this.isPlacingCueBall) {
          this.finalizeBallPlacement();
      }
  }

  finalizeBallPlacement() {
    this.isPlacingCueBall = false;
    this.placementGuide.clear();
    
    // Re-create the REAL physics body
    if (this.cueBall.body) this.matter.world.remove(this.cueBall.body);
    
    // Use unified physics config to match all other balls
    this.applyBallPhysics(this.cueBall);

    // Ensure not static
    this.cueBall.setStatic(false);

    if (this.onHandStateChange) this.onHandStateChange(false);
    if (this.currentTurn === PlayerTurn.AI) this.processAITurn();
  }

  handleWin(reason: string = "") {
    if (this.onLog) this.onLog(`${this.currentTurn} Wins! ${reason}`);
    if (this.onGameOver) this.onGameOver(`${this.currentTurn} WINS! ${reason}`);
  }
  handleLoss(reason: string = "") {
    const winner = this.currentTurn === PlayerTurn.PLAYER_1 ? PlayerTurn.AI : PlayerTurn.PLAYER_1;
    if (this.onLog) this.onLog(`${this.currentTurn} Lost! ${winner} Wins! ${reason}`);
    if (this.onGameOver) this.onGameOver(`${winner} WINS! ${reason}`);
  }

  // --- Input & AI ---

  handleInputDown(pointer: Phaser.Input.Pointer) {
    if (this.isPlacingCueBall && this.currentTurn === PlayerTurn.PLAYER_1) { 
        this.updateCueBallPlacement(pointer);
        return; 
    }
    const canInteract = !this.isShooting && this.currentTurn === PlayerTurn.PLAYER_1;
    if (canInteract) {
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
    }
  }

  handleInputMove(pointer: Phaser.Input.Pointer) {
    if (this.isPlacingCueBall && this.currentTurn === PlayerTurn.PLAYER_1) {
        this.updateCueBallPlacement(pointer);
        return;
    }
    if (this.isDragging) this.drawCue(pointer);
  }

  updateCueBallPlacement(pointer: Phaser.Input.Pointer) {
        const ox = this.playOriginX + this.ballRadius + 5; 
        const oy = this.playOriginY + this.ballRadius + 5; 
        const w = this.playWidth - (this.ballRadius*2) - 10; 
        const h = this.playHeight - (this.ballRadius*2) - 10; 
        
        // Add vertical offset for touch to see ball under finger
        const touchOffset = pointer.pointerType === 'touch' ? 50 : 0;
        
        const x = Phaser.Math.Clamp(pointer.x, ox, ox+w);
        const y = Phaser.Math.Clamp(pointer.y - touchOffset, oy, oy+h);
        this.cueBall.setPosition(x, y);
  }

  handleInputUp(pointer: Phaser.Input.Pointer) {
    if (this.isPlacingCueBall) return;
    if (this.isDragging) {
      this.isDragging = false;
      this.clearCue();
      this.forbiddenIcon.clear();
      const dx = this.dragStartX - pointer.x;
      const dy = this.dragStartY - pointer.y;
      const power = Math.min(Math.sqrt(dx*dx + dy*dy) / 200, 1.0);
      const angle = Math.atan2(dy, dx);
      if (power < this.shotThreshold) { if (this.onLog) this.onLog("Too Weak"); return; }
      this.executeShot(angle, power * this.maxShotPower); 
    }
  }

  executeShot(angle: number, force: number) {
    this.isShooting = true;
    this.shotState = { firstHitBall: null, pottedBalls: [], isScratch: false }; 
    this.cueBall.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
  }

  public visualizeAiAim(angle: number, normalizedForce: number) {
    this.drawTrajectory(angle, normalizedForce);
  }

  public aiShoot(angle: number, normalizedForce: number) {
    this.clearCue();
    
    let jitterAngle = 0;
    let jitterForce = 0;

    if (this.difficulty === 'EASY') {
        jitterAngle = (Math.random() - 0.5) * 0.15; 
        jitterForce = (Math.random() - 0.5) * 0.2; 
    } else if (this.difficulty === 'MEDIUM') {
        jitterAngle = (Math.random() - 0.5) * 0.05; 
        jitterForce = (Math.random() - 0.5) * 0.1; 
    }

    const finalAngle = angle + jitterAngle;
    const finalForce = Phaser.Math.Clamp(normalizedForce + jitterForce, 0.2, 1.0); 

    this.executeShot(finalAngle, finalForce * this.maxShotPower);
  }

  update() {
    // Check for out of bounds Cue Ball (tunneling fix)
    if (this.cueBall.active) {
        const b = this.cueBall;
        const margin = this.ballRadius * 2;
        if (b.x < -margin || b.x > this.scale.width + margin || b.y < -margin || b.y > this.scale.height + margin) {
            this.shotState.isScratch = true;
            b.setVelocity(0,0);
            b.setAngularVelocity(0);
            b.setPosition(this.playOriginX + this.playWidth/2, this.playOriginY + this.playHeight * 0.8);
            
            // Force stop immediately
            this.isShooting = false;
            this.onShotEnd();
            return;
        }
    }

    if (this.isShooting) {
      let isMoving = false;
      const velocityThreshold = 0.05;
      
      if (this.cueBall.active && (Math.abs(this.cueBall.body!.velocity.x) > velocityThreshold || Math.abs(this.cueBall.body!.velocity.y) > velocityThreshold)) isMoving = true;
      this.balls.forEach(b => {
        if (b.active && (Math.abs(b.body!.velocity.x) > velocityThreshold || Math.abs(b.body!.velocity.y) > velocityThreshold)) isMoving = true;
      });

      if (!isMoving) {
        this.time.delayedCall(100, () => {
             if (this.isShooting) this.onShotEnd();
        });
      }
    }
  }

  processAITurn() {
    if (!this.cueBall.active) return;
    
    const validTargets = this.getValidTargetsForAI();
    const gameState: GameStateData = {
      cueBall: { id: 0, x: this.cueBall.x, y: this.cueBall.y, color: 'white', isCue: true },
      targetBalls: validTargets.map(b => ({
        id: (b as any).ballValue,
        x: b.x,
        y: b.y,
        color: 'red',
        isCue: false
      })),
      holes: this.holes
    };
    if (this.onRequestAI) this.onRequestAI(gameState);
  }

  getValidTargetsForAI() {
    let validTargets = this.balls.filter(b => b.active);
    
    if (this.gameRule === '8_BALL' && this.p1Group) {
        const aiGroup = this.p1Group === 'solids' ? 'stripes' : 'solids';
        const myBalls = validTargets.filter(b => (b as any).ballGroup === aiGroup);
        if (myBalls.length > 0) validTargets = myBalls;
        else validTargets = validTargets.filter(b => (b as any).ballValue === 8);
    }
    if (this.gameRule === '9_BALL') {
        const lowest = validTargets.reduce((prev, curr) => (prev as any).ballValue < (curr as any).ballValue ? prev : curr, validTargets[0]);
        if (lowest) validTargets = [lowest];
    }
    if (this.gameRule === 'SNOOKER') {
        const reds = validTargets.filter(b => (b as any).ballValue === 1);
        if (this.snookerState === 'RED' && reds.length > 0) validTargets = reds;
        else if (this.snookerState === 'COLOR' || reds.length === 0) {
             const colors = validTargets.filter(b => (b as any).ballValue > 1);
             validTargets = colors.length > 0 ? colors : validTargets;
        }
    }
    return validTargets;
  }

  drawCue(pointer: Phaser.Input.Pointer) {
    const dx = this.dragStartX - pointer.x;
    const dy = this.dragStartY - pointer.y;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(len / 200, 1.0); 
    this.drawTrajectory(angle, power);
  }

  drawTrajectory(angle: number, power: number) {
    this.cueStick.clear();
    this.lineGuide.clear();
    this.ghostBall.clear();
    this.forbiddenIcon.clear();

    const stickLen = 250;
    const offset = 25 + (power * 100); 
    const stickStartX = this.cueBall.x - Math.cos(angle) * offset;
    const stickStartY = this.cueBall.y - Math.sin(angle) * offset;
    const stickEndX = stickStartX - Math.cos(angle) * stickLen;
    const stickEndY = stickStartY - Math.sin(angle) * stickLen;

    if (power < this.shotThreshold) {
        this.forbiddenIcon.lineStyle(3, 0xff0000, 0.8);
        this.forbiddenIcon.beginPath();
        const iconSize = 20;
        this.forbiddenIcon.moveTo(this.cueBall.x - iconSize, this.cueBall.y - iconSize);
        this.forbiddenIcon.lineTo(this.cueBall.x + iconSize, this.cueBall.y + iconSize);
        this.forbiddenIcon.moveTo(this.cueBall.x + iconSize, this.cueBall.y - iconSize);
        this.forbiddenIcon.lineTo(this.cueBall.x - iconSize, this.cueBall.y + iconSize);
        this.forbiddenIcon.strokePath();
        this.cueStick.lineStyle(8, 0x8d6e63, 0.3);
        this.cueStick.lineBetween(stickStartX, stickStartY, stickEndX, stickEndY);
        return;
    }

    this.cueStick.lineStyle(8, 0x8d6e63); 
    this.cueStick.lineBetween(stickStartX, stickStartY, stickEndX, stickEndY);
    this.cueStick.lineStyle(2, 0x000000);
    this.cueStick.strokeRect(stickStartX - 2, stickStartY -2, 4, 4); 

    const aimDirX = Math.cos(angle);
    const aimDirY = Math.sin(angle);
    
    let closestDist = Infinity;
    let impactPoint: {x: number, y: number} | null = null;
    let targetBall: Phaser.Physics.Matter.Image | null = null;

    this.balls.forEach(ball => {
      if (!ball.active) return;
      const toBallX = ball.x - this.cueBall.x;
      const toBallY = ball.y - this.cueBall.y;
      const dot = toBallX * aimDirX + toBallY * aimDirY;
      
      if (dot > 0) { 
        const closestX = this.cueBall.x + aimDirX * dot;
        const closestY = this.cueBall.y + aimDirY * dot;
        const distSq = (ball.x - closestX) ** 2 + (ball.y - closestY) ** 2;
        const radiusSum = this.ballRadius * 2;
        if (distSq < radiusSum * radiusSum) {
          const backDist = Math.sqrt(radiusSum * radiusSum - distSq);
          const hitDist = dot - backDist;
          if (hitDist < closestDist && hitDist > 0) {
            closestDist = hitDist;
            impactPoint = { x: this.cueBall.x + aimDirX * hitDist, y: this.cueBall.y + aimDirY * hitDist };
            targetBall = ball;
          }
        }
      }
    });

    this.lineGuide.lineStyle(2, 0xffffff, 0.4);
    this.lineGuide.beginPath();
    this.lineGuide.moveTo(this.cueBall.x, this.cueBall.y);

    if (impactPoint && targetBall) {
      this.lineGuide.lineTo(impactPoint.x, impactPoint.y);
      this.lineGuide.strokePath();
      this.ghostBall.lineStyle(2, 0xffffff, 0.8);
      this.ghostBall.strokeCircle(impactPoint.x, impactPoint.y, this.ballRadius);
    } else {
      this.lineGuide.lineTo(this.cueBall.x + aimDirX * 1000, this.cueBall.y + aimDirY * 1000);
      this.lineGuide.strokePath();
    }
  }

  clearCue() {
    this.cueStick.clear();
    this.lineGuide.clear();
    this.ghostBall.clear();
  }
}