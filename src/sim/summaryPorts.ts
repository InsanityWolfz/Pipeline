import { portPerMinute, pylonsOf, supplyOf } from './claims';
import { fixtureDef } from './fixtures';
import type { SimState } from './state';
import type { SimSummary } from './summary';

// The supply ports' part of getState() (028), split from summary.ts in 047 to keep it under 300 lines.

/** Each supply port: its raw, tile, the claimed pylons feeding it, its rate and whether an item waits. */
export function portSummary(state: SimState): SimSummary['ports'] {
  return state.fixtures.flatMap((f) => {
    const d = fixtureDef(f.id);
    if (d.kind !== 'port' || d.raw === undefined) return [];
    const pylons = pylonsOf(state, f);
    return [{ id: f.id, raw: d.raw, tx: d.tx, ty: d.ty, pylons, perMinute: portPerMinute(supplyOf(state, f)), waiting: f.item !== null }];
  });
}
