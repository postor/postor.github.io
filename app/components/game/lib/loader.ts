import type { GameConfig, Resource } from './types';
import { resolvePath } from './utils';

export async function loadGameConfig(cfgPath: string): Promise<{ cfg: GameConfig; base: string }> {
  const base = cfgPath.replace(/\/?$/, '/');
  const url = resolvePath(base, 'config.json');
  const cfg = await (await fetch(url)).json() as GameConfig;
  return { cfg, base };
}

export function resolveResourceUrl(base: string, res: Resource) {
  return resolvePath(base, res.url);
}

