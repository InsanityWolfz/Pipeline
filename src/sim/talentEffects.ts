import { TALENTS, type AmmoScope, type KeystoneRule } from '../data/talents';
import type { SimState } from './state';

// Talent effects (037), summed by kind for playerStats (src/sim/stats.ts), the one place
// stats are computed (036), and the keystones taken. Taking and respec are in talents.ts.

type Talented = Pick<SimState, 'talents'>;

/** Every effect of a set of taken nodes, summed by kind. Damage and fire rate are kept per ammo scope. */
export interface TalentTotals {
  damage: Record<AmmoScope, number>;
  fireRate: Record<AmmoScope, number>;
  freezeHits: number;
  freezeTicks: number;
  blastRadius: number;
  lobTime: number;
  homingTurn: number;
  starShards: number;
  firingWalk: number;
  maxHealth: number;
  regen: number;
  armor: number;
  moveSpeed: number;
}

const perAmmo = (): Record<AmmoScope, number> => ({ arrow: 0, bomb: 0, 'ley-bolt': 0, all: 0 });

/** Sums every taken node's effect (unknown ids are skipped). */
export function talentTotals(talents: readonly string[]): TalentTotals {
  const t: TalentTotals = { damage: perAmmo(), fireRate: perAmmo(), freezeHits: 0, freezeTicks: 0, blastRadius: 0, lobTime: 0, homingTurn: 0, starShards: 0, firingWalk: 0, maxHealth: 0, regen: 0, armor: 0, moveSpeed: 0 };
  for (const id of talents) {
    const e = TALENTS[id]?.effect;
    if (!e) continue;
    switch (e.kind) {
      case 'damage':
        t.damage[e.ammo] += e.value;
        break;
      case 'fire-rate':
        t.fireRate[e.ammo] += e.value;
        break;
      case 'freeze':
        t.freezeHits += e.hits;
        t.freezeTicks += e.ticks;
        break;
      case 'blast-radius':
        t.blastRadius += e.value;
        break;
      case 'lob-time':
        t.lobTime += e.value;
        break;
      case 'homing-turn':
        t.homingTurn += e.value;
        break;
      case 'star-shards':
        t.starShards += e.value;
        break;
      case 'firing-walk':
        t.firingWalk += e.value;
        break;
      case 'max-health':
        t.maxHealth += e.value;
        break;
      case 'regen':
        t.regen += e.value;
        break;
      case 'armor':
        t.armor += e.value;
        break;
      case 'move-speed':
        t.moveSpeed += e.value;
        break;
      case 'none':
      case 'keystone':
        break;
    }
  }
  return t;
}

/** Whether a keystone with this rule is taken. */
export const hasKeystone = (state: Partial<Talented>, rule: KeystoneRule): boolean =>
  (state.talents ?? []).some((id) => {
    const e = TALENTS[id]?.effect;
    return e?.kind === 'keystone' && e.rule === rule;
  });
