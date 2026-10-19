import { TILE_SIZE } from '../data/config';
import { BOSS_REFIGHT_XP, CHAMPION_XP, CLAIM_XP, LANDMARK_XP, LEVEL_CAP, RING_XP, XP_CURVE, type XpSource } from '../data/leveling';
import { enemyDef } from '../data/enemies';
import { OVERWORLD_ROOM, ringOf } from '../data/overworld';
import type { EnemyState } from './enemies';
import type { SimState } from './state';

// Leveling (037): XP from kills (more in outer rings and from champions), bosses (half
// on any kill after the first, 034's altar refights), claims and first discoveries.
// Nothing in the factory gives XP. Each level is one talent point. Level, XP, points and
// talents are kept through a KO (resetWorld never touches them).

type Leveling = Pick<SimState, 'level' | 'xp' | 'talentPoints' | 'events'>;

/** XP needed to reach the next level, or 0 at the cap (the bar shows full). */
export const xpToNext = (s: Pick<SimState, 'level'>): number => (s.level >= LEVEL_CAP ? 0 : (XP_CURVE[s.level - 1] ?? 0));

/**
 * Adds XP: each time it reaches the curve's value the level rises by 1 with a talent point and an event, the rest
 * carrying over, so one big gain can raise several levels. At the cap nothing counts (and XP stays 0).
 */
export function gainXp(s: Leveling, amount: number, source: XpSource): void {
  if (amount <= 0 || s.level >= LEVEL_CAP) return;
  s.events.xp.push({ amount, source });
  s.xp += amount;
  for (let need = xpToNext(s); need > 0 && s.xp >= need; need = xpToNext(s)) {
    s.xp -= need;
    s.level += 1;
    s.talentPoints += 1;
    s.events.levelUps.push({ level: s.level });
  }
  if (s.level >= LEVEL_CAP) s.xp = 0;
}

/** The danger ring an enemy belongs to: its home tile's in the overworld, ring 0 in any other room. */
function homeRing(e: Pick<EnemyState, 'roomId' | 'homeX' | 'homeY'>): number {
  return e.roomId === OVERWORLD_ROOM ? ringOf(Math.floor(e.homeX / TILE_SIZE), Math.floor(e.homeY / TILE_SIZE)) : 0;
}

/**
 * Gives an enemy's death its XP, whatever killed it: a boss its own XP on its first kill and BOSS_REFIGHT_XP of it
 * after; anything else its XP times its ring's multiplier, and CHAMPION_XP times that for a champion.
 */
export function killXp(state: SimState, e: EnemyState): void {
  const def = enemyDef(e.enemyId);
  if (def.boss) {
    const first = !state.killedBosses.includes(def.id);
    if (first) state.killedBosses.push(def.id);
    gainXp(state, first ? def.xp : def.xp * BOSS_REFIGHT_XP, 'boss');
    return;
  }
  gainXp(state, def.xp * (RING_XP[homeRing(e)] ?? 1) * (e.champion ? CHAMPION_XP : 1), 'kill');
}

/** After the tick's claims and discoveries: each claim (once per pylon, 009) and each first discovery (032) gives its XP. */
export function stepLeveling(state: SimState): void {
  state.events.claims.forEach(() => gainXp(state, CLAIM_XP, 'claim'));
  state.events.discoveries.forEach(() => gainXp(state, LANDMARK_XP, 'landmark'));
}
