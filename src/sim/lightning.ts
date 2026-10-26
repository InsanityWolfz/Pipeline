import { LIGHTNING } from '../data/tags';
import { damageEnemy, targetable, type EnemyState, type HitStyle } from './enemies';
import { plated } from './bossParts';
import type { SimState } from './state';
import { statOf, statusEmission, type Statted } from './statResolve';

// Lightning (064): a lightning hit arcs on. From the enemy it hit, the chain arcs to the nearest living, hittable enemy
// in its room within the chain range that the chain hasn't hit yet, dealing the chain share of the hit's damage, then
// arcs on from there, up to the chain count. An arc skips burrowed and rising enemies (immune) and the plated
// Forgewright, and never a boss's part; a Shield doesn't stop it (it comes from beside, and only a round's front hit
// asks the Shield). An arc hit is Lightning damage with no knockback, and is a hit of its own kind: it never arcs again,
// Splits or sets off the keystones, which only a round's own hit does (combat.ts, blast.ts).

/** An arc's hit: Lightning damage that flashes, with no knockback, marked so it never chains again. */
const ARC: HitStyle = { knock: 0, flash: true, damageType: 'lightning', arc: true };

/** How many arcs a chain makes with the player's stats (064's talent: +1, through resolveStat). */
export const chainsOf = (state: Statted): number => Math.round(statOf(state, 'chains', statusEmission('lightning'), LIGHTNING.chains));

/** How far each arc reaches with the player's stats, px (064's talent: a tile further, through resolveStat). */
export const chainRangeOf = (state: Statted): number => statOf(state, 'chain-range', statusEmission('lightning'), LIGHTNING.chainRange);

/** The nearest enemy an arc from `from` can reach, not yet in `hit`, or undefined. */
function nextLink(state: SimState, from: EnemyState, hit: ReadonlySet<number>, range: number): EnemyState | undefined {
  let best: EnemyState | undefined;
  let bestD = range;
  for (const e of state.enemies) {
    if (e.roomId !== from.roomId || e.health <= 0 || hit.has(e.id) || !targetable(e) || plated(e)) continue;
    const d = Math.hypot(e.x - from.x, e.y - from.y);
    if (d <= bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

/**
 * A lightning hit's chain: from `struck` (the enemy a round, a Shard or a Burst's middle hit, for `damage`), up to the
 * chain count of arcs, each to the nearest enemy in range the chain hasn't hit, for the chain share of `damage`.
 */
export function chainLightning(state: SimState, struck: EnemyState, damage: number): void {
  const hit = new Set<number>([struck.id]);
  const range = chainRangeOf(state);
  const share = damage * LIGHTNING.chainShare;
  let from = struck;
  for (let n = chainsOf(state); n > 0; n--) {
    const to = nextLink(state, from, hit, range);
    if (!to) return;
    hit.add(to.id);
    state.events.arcs.push({ from: from.id, to: to.id, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y });
    damageEnemy(state, to, share, 0, 0, ARC);
    from = to;
  }
}

/** A Burst's or a Bomblet's chain (064): one, from the enemy among those it hit nearest its centre. */
export function chainFromBurst(state: SimState, hit: readonly EnemyState[], x: number, y: number, damage: number): void {
  let first: EnemyState | undefined;
  let bestD = Infinity;
  for (const e of hit) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bestD) {
      first = e;
      bestD = d;
    }
  }
  if (first) chainLightning(state, first, damage);
}
