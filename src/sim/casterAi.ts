import type { CasterDef } from '../data/enemies';
import { engage, leash, startWindup, stepAttack, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { castOrb } from './orbs';
import type { SimState } from './state';

// The Wisp (009): aggros in range, floats to its preferred distance (backing off
// when the player crowds it), charges with its aim locked, then casts a slow orb.

/** Advances a Wisp's mode and returns this tick's own move, px. */
export function castThink(state: SimState, e: EnemyState, def: CasterDef): [number, number] {
  const { cast } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  const idle = engage(state, e, dist <= cast.aggroRange);
  if (idle) return idle;
  const attack = stepAttack(e, def, () => castOrb(state, e));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  if (dist < cast.backOff) return toward(-dx, -dy, def);
  if (dist > cast.aggroRange) return toward(dx, dy, def);
  if (e.cooldown === 0) {
    startWindup(e, def, dx, dy);
    return [0, 0];
  }
  // Drift toward the preferred distance while the cooldown runs.
  const off = dist - cast.keepAway;
  if (Math.abs(off) < 2) return [0, 0];
  const step = toward(dx, dy, def);
  const scale = Math.min(1, Math.abs(off) / Math.max(1e-9, Math.hypot(step[0], step[1])));
  return off > 0 ? [step[0] * scale, step[1] * scale] : [-step[0] * scale, -step[1] * scale];
}
