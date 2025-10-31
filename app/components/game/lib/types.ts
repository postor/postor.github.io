export type AttrDomain = 'global' | 'game' | string;

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface MetaConfig {
  viewport: ViewportConfig;
  backgroundColor?: string;
  startScene?: string | number;
}

export type Easing =
  | 'Linear'
  | 'Sine.easeIn'
  | 'Sine.easeOut'
  | 'Sine.easeInOut'
  | string;

export interface BaseResource {
  type: 'image' | 'sprite' | 'video' | 'audio' | 'button';
  url?: string; // relative to cfg path
  ref?: string; // reference another resource key
  position?: { x?: number; y?: number };
  scale?: number | { x?: number; y?: number };
  opacity?: number;
  rotation?: number;
  depth?: number;
}

export interface SpriteResource extends BaseResource {
  type: 'sprite';
  frameConfig?: { frameWidth: number; frameHeight: number };
}

export interface VideoResource extends BaseResource {
  type: 'video';
  video?: { loadEvent?: string; loop?: boolean };
}

export interface AudioResource extends BaseResource {
  type: 'audio';
  audio?: { loop?: boolean; volume?: number };
}

export interface ButtonResource extends BaseResource {
  type: 'button';
  button?: {
    onClick?: Step[];
    goScene?: string | number;
  };
}

export type Resource =
  | BaseResource
  | SpriteResource
  | VideoResource
  | AudioResource
  | ButtonResource;

export interface SceneConfig {
  resources?: Record<string, Partial<Resource>>;
  steps?: Step[];
}

export interface GameConfig {
  meta: MetaConfig;
  resources?: Record<string, Resource>;
  scenes: Record<string, SceneConfig>;
}

export type AttrOps =
  | number
  | string
  | boolean
  | { $incr?: number; $decr?: number; $toggle?: boolean; $set?: unknown };

export type ConditionOps = {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  $in?: unknown[];
};

export type Condition = Record<string, ConditionOps | unknown>;

export interface StepBase {
  delay?: number; // seconds
  waitFor?: number; // seconds
  waitForClick?: boolean;
  loop?: { times?: number; until?: Condition };
}

export interface StepDialog extends StepBase {
  act: 'dialog';
  args?: { speaker?: string; text?: string; typingSpeed?: number };
}

export interface StepShow extends StepBase {
  act: 'show';
  args: Partial<Resource> & { name: string; fade?: number; easing?: Easing };
}

export interface StepHide extends StepBase {
  act: 'hide';
  args: { all?: boolean; name?: string; fade?: number; easing?: Easing };
}

export interface StepOptions extends StepBase {
  act: 'options';
  args: {
    title?: string;
    items?: Array<{
      text: string;
      domain?: AttrDomain;
      require?: Condition;
      set?: Record<string, AttrOps>;
      goScene?: string | number;
      steps?: Step[];
    }>;
  };
}

export interface StepChoice extends StepBase {
  act: 'choice';
  args: {
    title?: string;
    options?: Array<{
      text?: string;
      label?: string;
      domain?: AttrDomain;
      require?: Condition;
      set?: Record<string, AttrOps>;
      goScene?: string | number;
      go?: string | number;
      steps?: Step[];
    }>;
  };
}

export interface StepTween extends StepBase {
  act: 'tween';
  args: {
    target: string;
    to: Record<string, unknown>;
    duration?: number; // ms
    easing?: Easing;
  };
}

export interface StepSetAttr extends StepBase {
  act: 'setAttr' | 'set attribute';
  args: { domain?: AttrDomain; values?: Record<string, AttrOps>; name?: string; value?: unknown };
}

export interface StepIf extends StepBase {
  act: 'if';
  args: { domain?: AttrDomain; test?: Condition; then?: Step[]; else?: Step[] };
}

export interface StepAudio extends StepBase {
  act: 'audio';
  args: { name: string };
}

export interface StepGoScene extends StepBase {
  act: 'goScene' | 'go';
  args: { to?: string | number; scene?: string | number };
}

export interface StepSetVisible extends StepBase {
  act: 'setVisible';
  args: { target: string; visible: boolean };
}

export interface StepDestroy extends StepBase {
  act: 'destroy';
  args: { target: string };
}

export interface StepUpdateHud extends StepBase {
  act: 'updateHud';
  args: { id?: string; text?: string };
}

export type Step =
  | StepDialog
  | StepShow
  | StepHide
  | StepOptions
  | StepChoice
  | StepTween
  | StepSetAttr
  | StepIf
  | StepAudio
  | StepGoScene
  | StepSetVisible
  | StepDestroy
  | StepUpdateHud
  | (StepBase & { act: string; args?: Record<string, any> });

