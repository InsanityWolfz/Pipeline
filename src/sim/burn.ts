import { lobAmmo } from '../data/ammo';
import { damageEnemy } from './enemies';
import type { SimState } from './state';

// Fire's damage over time. Runs before bombs, so a burn started this tick
// first ticks on the next, and deals its first damage `everyTicks` after the burst.

const BURN_HIT = { knock: false, flash: false } as const;

export function stepBurns(state: SimState): void {
  for (const e of state.enemies) {
    if (e.burnTicks <= 0 || e.health <= 0) continue;
    e.burnTicks -= 1;
    const { burn } = lobAmmo(e.burnAmmo);
    if (e.burnTicks % burn.everyTicks === 0) damageEnemy(state, e, burn.damage, 0, 0, BURN_HIT);
  }
}
