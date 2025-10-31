import type { AttrDomain, Condition } from './types';
import { attrGet, attrSet, type GameState } from './state';

export function applyAttrOps(state: GameState, domain: AttrDomain, expr?: Record<string, any>) {
  Object.entries(expr || {}).forEach(([k, v]) => {
    if (typeof v === 'object' && v) {
      if ('$incr' in v) attrSet(state, domain, k, (attrGet(state, domain, k, 0) as number) + (v['$incr'] ?? 0));
      else if ('$decr' in v) attrSet(state, domain, k, (attrGet(state, domain, k, 0) as number) - (v['$decr'] ?? 0));
      else if ('$toggle' in v) attrSet(state, domain, k, !attrGet(state, domain, k, false));
      else if ('$set' in v) attrSet(state, domain, k, v['$set']);
    } else {
      attrSet(state, domain, k, v);
    }
  });
}

export function matchCondition(state: GameState, domain: AttrDomain, cond?: Condition) {
  if (!cond) return true;
  return Object.entries(cond).every(([k, ops]) => {
    const val = attrGet(state, domain, k, undefined);
    if (typeof ops !== 'object' || ops === null) return val === ops;
    return Object.entries(ops as Record<string, any>).every(([op, rhs]) => {
      switch (op) {
        case '$eq': return val === rhs;
        case '$ne': return val !== rhs;
        case '$gt': return (val as number) > (rhs as number);
        case '$gte': return (val as number) >= (rhs as number);
        case '$lt': return (val as number) < (rhs as number);
        case '$lte': return (val as number) <= (rhs as number);
        case '$in': return Array.isArray(rhs) ? (rhs as any[]).includes(val) : false;
        default: return false;
      }
    });
  });
}

export function resolvePath(base: string, rel?: string) {
  if (!rel) return base;
  if (rel.startsWith('http://') || rel.startsWith('https://') || rel.startsWith('/')) return rel;
  return `${base.replace(/\/?$/, '/')}${rel}`;
}

