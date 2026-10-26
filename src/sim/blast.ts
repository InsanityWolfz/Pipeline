import type { DamageType } from '../data/ammo';
import { damageEnemy, immune, targetable, type EnemyState } from './enemies';
import { chainFromBurst } from './lightning';
import { hitPart, partsNear, plated } from './bossParts';
import type { SimState } from './state';

// A Burst's damage (029, 034, 037, 038, 039; 060: on the Forgewright's bellows too; 064: a lightning one chains once): a bomb's, a landmine's, a Bomblet's or an
// Arrow's Pool-burst hits every live, targetable enemy round its point. It comes from above, so
// no shield blocks it, and it never hurts the player. Its own file, so bombs, mines and the
// keystones share it without importing each other.

/** Damages every live, targetable enemy in a room whose feet are within `radius` of (x, y), flashing it without knockback; `skip` is spared. */
export function blastArea(state: SimState, roomId: string, x: number, y: number, radius: number, damage: number, damageType: DamageType, skip: number | null = null): void {
  const style = { knock: 0, flash: true, damageType } as const;
  const struck: EnemyState[] = [];
  for (const e of state.enemies) {
    if (e.roomId !== roomId || e.health <= 0 || immune(e) || e.id === skip) continue;
    // 060: each of the Forgewright's bellows in reach takes it (064: each of the Conductor's rods); its plated body blocks it (damageEnemy). A Burst that
    // vents it, breaking its second bellows, spends itself there: only later hits land on the body it opened.
    const wasPlated = plated(e);
    for (const part of partsNear(e, x, y, radius)) hitPart(state, e, part, damage, style);
    // 068: a body it can't reach yet (the Conductor blinking in) takes nothing; its rods did.
    if ((wasPlated && !plated(e)) || !targetable(e)) continue;
    if (Math.hypot(e.x - x, e.y - y) > radius) continue;
    damageEnemy(state, e, damage, e.x - x, e.y - y, style);
    if (!plated(e)) struck.push(e);
  }
  // 064: a lightning Burst or Bomblet starts one chain, from the enemy it hit nearest its centre.
  if (damageType === 'lightning') chainFromBurst(state, struck, x, y, damage);
}
