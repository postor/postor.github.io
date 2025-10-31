import type PhaserNS from 'phaser';
import type { Step, Resource, SceneConfig } from './types';
import { createInitialState, type GameState, attrSet } from './state';
import { applyAttrOps, matchCondition, resolvePath } from './utils';
import { loadGameConfig, resolveResourceUrl } from './loader';

interface StartOptions {
  cfgPath: string; // folder containing config.json and assets
}

export async function startGame(cfgPath: string | StartOptions) {
  const Phaser = (await import('phaser')).default as typeof PhaserNS;
  const cfgBase = typeof cfgPath === 'string' ? cfgPath : cfgPath.cfgPath;
  const { cfg, base } = await loadGameConfig(cfgBase);

  const gameState: GameState = createInitialState();

  const width = cfg.meta.viewport.width; const height = cfg.meta.viewport.height;

  const parentEl = document.getElementById('game');
  if (parentEl) {
    parentEl.style.width = '100vw';
    parentEl.style.height = '100vh';
    parentEl.style.maxWidth = '100vw';
    parentEl.style.maxHeight = '100vh';
    parentEl.style.margin = '0 auto';
    parentEl.style.display = 'block';
  }

  let currentSceneKey: string | number | null = cfg.meta.startScene || null;
  let currentSceneData: SceneConfig | null = null;
  let phaserScene: PhaserNS.Scene | null = null;

  const phaserConfig: PhaserNS.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: (cfg.meta.backgroundColor || '#000000') as any,
    parent: 'game',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height
    },
    scene: {
      preload,
      create,
      update
    }
  };

  const game = new Phaser.Game(phaserConfig);

  function preload(this: PhaserNS.Scene) {
    phaserScene = this;
    Object.entries(cfg.resources || {}).forEach(([key, res]) => {
      const url = resolveResourceUrl(base, res as Resource);
      switch (res.type) {
        case 'image': this.load.image(key, url); break;
        case 'sprite': this.load.spritesheet(key, url, (res as any).frameConfig || { frameWidth: 32, frameHeight: 32 }); break;
        case 'video': this.load.video(key, url, (res as any).video?.loadEvent || 'canplay'); break;
        case 'audio': this.load.audio(key, url); break;
        case 'button': this.load.image(key, url); break;
      }
    });
  }

  function create(this: PhaserNS.Scene) {
    if (currentSceneKey != null) goToScene(currentSceneKey);
  }

  function update(this: PhaserNS.Scene) {}

  function resolveResourceInstance(name: string, inst?: Partial<Resource>) {
    const baseRes = (cfg.resources && cfg.resources[name]) || ({} as Resource);
    const refBase = inst?.ref ? ((cfg.resources && (cfg.resources as any)[inst.ref]) || {}) : {};
    const merged = { ...baseRes, ...refBase, ...inst } as Resource;
    return merged;
  }

  function instantiateResource(name: string, inst?: Partial<Resource>) {
    const res = resolveResourceInstance(name, inst);
    let obj = gameState.objects[name] || null;
    const px = res.position?.x ?? width / 2;
    const py = res.position?.y ?? height / 2;
    const key = (inst?.ref || name) as string;

    if (!phaserScene) return null;

    if (obj) {
      // update transform
      (obj.setPosition?.bind(obj) || (() => {}))(px, py);
      if (res.scale) obj.setScale(typeof res.scale === 'number' ? res.scale : (res.scale.x || 1));
      if (res.opacity != null && obj.setAlpha) obj.setAlpha(res.opacity);
      if ((res as any).rotation && obj.setRotation) obj.setRotation((res as any).rotation);
      if (res.depth != null && obj.setDepth) obj.setDepth(res.depth);
      if (obj.setVisible) obj.setVisible(true);
      return obj;
    }

    switch (res.type) {
      case 'image':
      case 'button':
        obj = phaserScene.add.image(px, py, key);
        if (res.scale) obj.setScale(typeof res.scale === 'number' ? res.scale : (res.scale.x || 1));
        if (res.opacity != null) obj.setAlpha(res.opacity);
        if ((res as any).rotation) obj.setRotation((res as any).rotation);
        if (res.depth != null) obj.setDepth(res.depth);
        if (name === 'background' && (obj as any).setDisplaySize) {
          (obj as any).setDisplaySize(width, height);
        }
        break;
      case 'sprite':
        obj = phaserScene.add.sprite(px, py, key);
        if (res.scale) obj.setScale(typeof res.scale === 'number' ? res.scale : (res.scale.x || 1));
        if (res.opacity != null) obj.setAlpha(res.opacity);
        if ((res as any).rotation) obj.setRotation((res as any).rotation);
        if (res.depth != null) obj.setDepth(res.depth);
        break;
      case 'video':
        obj = phaserScene.add.video(px, py, key);
        if ((res as any).video?.loop) (obj as Phaser.GameObjects.Video).setLoop(true);
        (obj as Phaser.GameObjects.Video).play(true);
        break;
      case 'audio':
        phaserScene.sound.stopAll();
        const snd = phaserScene.sound.add(key, { loop: (res as any).audio?.loop });
        snd.setVolume((res as any).audio?.volume ?? 1);
        snd.play();
        obj = snd;
        break;
    }
    gameState.objects[name] = obj;

    if (res.type === 'button' && obj) {
      const img = obj as Phaser.GameObjects.Image;
      img.setInteractive(new Phaser.Geom.Rectangle(0, 0, img.width, img.height), Phaser.Geom.Rectangle.Contains);
      img.on('pointerdown', async () => {
        const btn = (res as any).button;
        if (btn?.onClick) {
          await runSteps(btn.onClick);
        }
        if (btn?.goScene != null) {
          const target = resolveSceneTarget(btn.goScene);
          goToScene(target);
        }
      });
    }
    return obj;
  }

  function resolveSceneTarget(to: string | number) {
    if (to === -1) {
      const last = gameState.sceneHistory[gameState.sceneHistory.length - 1];
      return last ?? currentSceneKey!;
    }
    return to;
  }

  function goToScene(sceneKey: string | number) {
    if (!phaserScene) return;
    if (currentSceneKey != null) gameState.sceneHistory.push(currentSceneKey);
    currentSceneKey = sceneKey;
    currentSceneData = cfg.scenes[String(sceneKey)] as any;
    phaserScene.children.removeAll();
    gameState.objects = {};

    Object.entries(currentSceneData?.resources || {}).forEach(([name, inst]) => {
      instantiateResource(name, inst as Partial<Resource>);
    });
    setupUiButtons();
    runSteps(currentSceneData?.steps || []);
  }

  function setupUiButtons() {
    if (!phaserScene) return;
    const pad = 10;
    const style: PhaserNS.Types.GameObjects.Text.TextStyle = { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' } as any;

    const w = phaserScene.scale.width;
    const fsBtn = phaserScene.add.text(w - pad, pad, '\u{26F6}', style);
    fsBtn.setOrigin(1, 0);
    fsBtn.setDepth(10000);
    fsBtn.setScrollFactor(0);
    fsBtn.setInteractive({ useHandCursor: true });
    fsBtn.on('pointerdown', () => {
      const sc = phaserScene!.scale;
      if (sc.isFullscreen) sc.stopFullscreen(); else sc.startFullscreen();
    });

    gameState.objects['__ui_fullscreen'] = fsBtn;

    if ((gameState as any).__resizeHandler) phaserScene.scale.off('resize', (gameState as any).__resizeHandler);
    (gameState as any).__resizeHandler = (gameSize: any) => {
      const widthNow = (gameSize && gameSize.width) ? gameSize.width : phaserScene!.scale.width;
      fsBtn.setX(widthNow - pad);
    };
    phaserScene.scale.on('resize', (gameState as any).__resizeHandler);
  }

  async function runSteps(steps: Step[]) {
    for (const step of steps) {
      const loopTimes = (step as any).loop?.times || 1;
      let i = 0;
      do {
        if ((step as any).delay) await new Promise(r => setTimeout(r, ((step as any).delay) * 1000));
        await runAct(step);
        const isDialog = ((step as any).act === 'dialog');
        const waitForClick = ((step as any).waitForClick != null) ? !!(step as any).waitForClick : isDialog;
        const waitForSec = ((step as any).waitFor != null) ? Number((step as any).waitFor) : ((step as any).args?.fade != null ? Number((step as any).args.fade) : 0);
        if (waitForClick) {
          await waitForClickAnywhere();
        } else if (waitForSec > 0) {
          await new Promise(r => setTimeout(r, waitForSec * 1000));
        }
        i++;
        if ((step as any).loop?.until && matchCondition(gameState, 'game', (step as any).loop.until)) break;
      } while (i < loopTimes);
    }
  }

  function clearUiLayer() {
    Object.entries(gameState.objects).forEach(([k, obj]) => {
      if (!k || !k.startsWith('__ui_')) return;
      if (k === '__ui_fullscreen') return;
      try { (obj as any)?.destroy?.(); } catch { }
      delete gameState.objects[k];
    });
  }

  function addUiObject(key: string, obj: any) {
    const id = key.startsWith('__ui_') ? key : `__ui_${key}`;
    gameState.objects[id] = obj;
    return id;
  }

  function textBox(text: string, opts: { id?: string } = {}) {
    if (!phaserScene) throw new Error('Scene not ready');
    const pad = 24; const w = width - pad * 2; let h = Math.floor(height * 0.32); if (h < 180) h = 180; const x = pad; const y = height - h - pad;
    const g = phaserScene.add.graphics();
    g.setDepth(9998);
    g.fillStyle(0x000000, 0.68); g.fillRoundedRect(x, y, w, h, 12);
    const t = phaserScene.add.text(x + pad, y + pad, text, { fontFamily: 'Arial', fontSize: '28px', color: '#ffffff', lineSpacing: 6, wordWrap: { width: w - pad * 2 } } as any);
    addUiObject('dialog_bg', g);
    t.setDepth(9999);
    addUiObject('dialog_text', t);
    if (opts.id) return { g, t, id: opts.id };
    return { g, t };
  }

  async function runAct(step: Step) {
    const act = (step as any).act as string;
    const args = (step as any).args || {};
    switch (act) {
      case 'dialog': {
        clearUiLayer();
        const speaker = args.speaker ? `${args.speaker}: ` : '';
        const full = `${speaker}${args.text || ''}`;
        const tb = textBox('');
        await typeText(tb.t, full, args.typingSpeed || 40);
        return;
      }
      case 'show': {
        const name = args.name as string;
        if (name) {
          const obj = instantiateResource(name, args);
          const fadeSec = (args.fade ?? null) as number | null;
          if (fadeSec && (obj as any)?.setAlpha) {
            const targetAlpha = (args.opacity != null) ? args.opacity : (((obj as any).alpha != null) ? (obj as any).alpha : 1);
            (obj as any).setAlpha(0);
            await new Promise(resolve => {
              phaserScene!.tweens.add({ targets: obj, alpha: targetAlpha, duration: fadeSec * 1000, ease: (args.easing || 'Linear') as any, onComplete: () => resolve(null) });
            });
          }
        }
        return;
      }
      case 'hide': {
        if (args.all) {
          Object.entries(gameState.objects).forEach(([k, obj]) => {
            if (k && (k.startsWith('__ui_') || k === '__ui_fullscreen')) return;
            try { (obj as any)?.destroy?.(); } catch { }
            delete gameState.objects[k];
          });
        } else if (args.name) {
          const obj = gameState.objects[args.name];
          if (obj) {
            const fadeSec = (args.fade ?? null) as number | null;
            if (fadeSec && (obj as any).setAlpha) {
              await new Promise(resolve => {
                phaserScene!.tweens.add({ targets: obj, alpha: 0, duration: fadeSec * 1000, ease: (args.easing || 'Linear') as any, onComplete: () => { try { (obj as any).setVisible(false); } catch { } resolve(null); } });
              });
            } else if ((obj as any).setVisible) {
              (obj as any).setVisible(false);
            }
          }
        }
        return;
      }
      case 'options': {
        clearUiLayer();
        const items = (args.items || []) as any[];
        const tb = textBox(args.title || 'Choose:');
        let idx = 0;
        for (const it of items) {
          const okDomain = it.domain || 'game';
          if (it.require && !matchCondition(gameState, okDomain, it.require)) continue;
          const t = phaserScene!.add.text(tb.t.x, tb.t.y + 44 * (idx + 1), `- ${it.text}`, { fontFamily: 'Arial', fontSize: '24px', color: '#ffff00' } as any);
          t.setInteractive();
          t.setDepth(9999);
          addUiObject(`option_${idx}`, t);
          t.on('pointerdown', async () => {
            if (it.set) applyAttrOps(gameState, okDomain, it.set);
            if (it.goScene != null) {
              const target = resolveSceneTarget(it.goScene);
              goToScene(target);
            } else if (it.steps) {
              await runSteps(it.steps);
            }
          });
          idx++;
        }
        await waitForSelection();
        return;
      }
      case 'choice': {
        clearUiLayer();
        const items = (args.options || []) as any[];
        const tb = textBox(args.title || 'Choose:');
        let idx = 0;
        for (const it of items) {
          const okDomain = it.domain || 'game';
          if (it.require && !matchCondition(gameState, okDomain, it.require)) continue;
          const label = it.text ?? it.label ?? '';
          const t = phaserScene!.add.text(tb.t.x, tb.t.y + 44 * (idx + 1), `- ${label}`, { fontFamily: 'Arial', fontSize: '24px', color: '#ffff00' } as any);
          t.setInteractive();
          t.setDepth(9999);
          addUiObject(`choice_${idx}`, t);
          t.on('pointerdown', async () => {
            if (it.set) applyAttrOps(gameState, okDomain, it.set);
            if (it.goScene != null || it.go != null) {
              const target = resolveSceneTarget(it.goScene ?? it.go);
              goToScene(target);
            } else if (it.steps) {
              await runSteps(it.steps);
            }
          });
          idx++;
        }
        await waitForSelection();
        return;
      }
      case 'tween': {
        const name = args.target as string;
        const obj = gameState.objects[name] || null;
        if (obj) {
          await new Promise(resolve => {
            phaserScene!.tweens.add({ targets: obj, ...(args.to || {}), duration: (args.duration || 1000), ease: (args.easing || 'Linear') as any, onComplete: () => resolve(null) });
          });
        }
        break;
      }
      case 'setAttr': {
        const domain = (args.domain || 'game') as any;
        applyAttrOps(gameState, domain, args.values || {});
        break;
      }
      case 'set attribute': {
        const domain = (args.domain || 'game') as any;
        if (args.values) {
          applyAttrOps(gameState, domain, args.values);
        } else if (args.name !== undefined) {
          attrSet(gameState, domain, args.name, args.value);
        }
        break;
      }
      case 'if': {
        const domain = (args.domain || 'game') as any;
        if (matchCondition(gameState, domain, args.test)) {
          if (args.then) await runSteps(args.then);
        } else {
          if (args.else) await runSteps(args.else);
        }
        break;
      }
      case 'audio': {
        const name = args.name as string; const res = (cfg.resources as any)[name] as Resource;
        if (res && res.type === 'audio') {
          const snd = phaserScene!.sound.add(name, { loop: (res as any).audio?.loop });
          snd.setVolume((res as any).audio?.volume ?? 1);
          snd.play();
        }
        break;
      }
      case 'goScene': {
        const target = resolveSceneTarget(args.to);
        goToScene(target);
        break;
      }
      case 'go': {
        const target = resolveSceneTarget(args.scene ?? args.to);
        goToScene(target);
        break;
      }
      case 'setVisible': {
        const obj = gameState.objects[args.target]; if (obj) (obj as any).setVisible(!!args.visible); break;
      }
      case 'destroy': {
        const obj = gameState.objects[args.target]; if (obj) { (obj as any).destroy(); delete gameState.objects[args.target]; } break;
      }
      case 'updateHud': {
        const id = (args.id || 'main') as string;
        if (!gameState.hud[id]) {
          const t = phaserScene!.add.text(10, 10 + Object.keys(gameState.hud).length * 20, args.text || '', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' } as any);
          gameState.hud[id] = t;
        } else {
          gameState.hud[id].setText(args.text || '');
        }
        break;
      }
      default:
        console.warn('Unknown act', act);
    }
  }

  function waitForClick(...objs: any[]) {
    return new Promise<void>(resolve => {
      const handler = () => { objs.forEach(o => (o as any)?.destroy?.()); resolve(); };
      phaserScene!.input.once('pointerdown', handler);
    });
  }

  function waitForClickAnywhere() {
    return new Promise<void>(resolve => {
      phaserScene!.input.once('pointerdown', () => resolve());
    });
  }

  function waitForSelection() {
    return new Promise<void>(resolve => {
      const done = () => resolve();
      phaserScene!.input.once('gameobjectdown', done);
      setTimeout(done, 10000);
    });
  }

  async function typeText(textObj: PhaserNS.GameObjects.Text, fullText: string, cps?: number) {
    return new Promise<void>(resolve => {
      const cpsClamped = Math.max(1, cps || 40);
      const total = fullText.length;
      if (total === 0) { textObj.setText(''); resolve(); return; }
      let i = 0; let finished = false;
      const step = () => {
        if (finished) return;
        i++;
        textObj.setText(fullText.slice(0, i));
        if (i >= total) { finished = true; resolve(); return; }
      };
      const timer = phaserScene!.time.addEvent({ delay: Math.max(10, Math.floor(1000 / cpsClamped)), loop: true, callback: step });
      const fastForward = () => {
        if (finished) return;
        finished = true;
        textObj.setText(fullText);
        try { timer.remove(false); } catch { }
        resolve();
      };
      phaserScene!.input.once('pointerdown', fastForward);
    });
  }
}

export default { startGame };
