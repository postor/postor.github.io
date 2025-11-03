import type { AttrDomain } from './types';

export type Attrs = Record<string, Record<string, any>>;

export interface GameState {
  attrs: Attrs;
  objects: Record<string, any>;
  hud: Record<string, any>;
  sceneHistory: Array<string | number>;
  __resizeHandler?: (gameSize: { width: number; height: number }) => void;
}

export function createInitialState(): GameState {
  return {
    attrs: { global: {}, game: {} },
    objects: {},
    hud: {},
    sceneHistory: []
  };
}

export function attrGet(state: GameState, domain: AttrDomain, key: string, def?: any) {
  if (!state.attrs[domain]) state.attrs[domain] = {};
  return key in state.attrs[domain] ? state.attrs[domain][key] : def;
}

export function attrSet(state: GameState, domain: AttrDomain, key: string, value: any) {
  if (!state.attrs[domain]) state.attrs[domain] = {};
  state.attrs[domain][key] = value;
}

