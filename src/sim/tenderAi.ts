import { TICK_RATE } from '../data/config';
import type { TenderDef } from '../data/emberworksEnemies';
import { enemyDef } from '../data/enemies';
import { engage, enter, hold, inAggroBox, leash, startWindup, toward } from './aiCommon';
import { defOf } from './champions';
import { targetable, type EnemyState } from './enemies';
import { clearShot } from './sightLine';
import { roomById, type SimState } from './state';

// The kiln-tender (061): a small kiln on legs with a brass nozzle. It has no attack: it keeps its distance from the
// player (between `keep.min` and `keep.max`) and, every cooldown, picks its most hurt packmate in reach along a clear
// line, winds up a beam to it (`windup`), then channels a heal into it (`swipe`), never past its max health. The
// channel breaks on a blocked line, the target's death, or any damage to the tender; then it recovers. It never
// heals a boss, itself, or an enemy of another pack.

type BreakReason = 'blocked' | 'died' | 'hurt' | 'stunned';

/** Advances a tender's mode and returns this tick's own move, px. */
export function tenderThink(state: SimState, e: EnemyState, def: TenderDef): [number, number] {
  const { beam } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) {
    e.beamTarget = -1;
    return idle;
  }
  if (e.mode === 'windup' || e.mode === 'swipe') {
    const broken = breaks(state, e);
    if (broken) return endBeam(state, e, broken);
    if (e.mode === 'windup') {
      if (e.modeTicks < beam.windupTicks) return hold(e);
      enter(e, 'swipe');
      return [0, 0];
    }
    heal(state, e, def);
    if (e.modeTicks < beam.swipeTicks) return hold(e);
    e.beamTarget = -1;
    enter(e, 'recover');
    return [0, 0];
  }
  if (e.mode === 'recover') {
    // A Stun (039) can cut a beam short: the recovery ends it.
    e.beamTarget = -1;
    if (e.modeTicks < beam.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) return home;
  const target = e.cooldown === 0 && e.roomId === state.roomId ? pickTarget(state, e, def) : null;
  if (target) {
    startWindup(e, def, target.x - e.x, target.y - e.y);
    e.beamTarget = target.id;
    e.beamHeld = e.health;
    state.events.beams.push({ id: e.id, target: target.id });
    return [0, 0];
  }
  return keepAway(e, def, p.x - e.x, p.y - e.y);
}

/** Its band from the player: back off when closer than `min`, close in when farther than `max`, else hold. */
function keepAway(e: EnemyState, def: TenderDef, dx: number, dy: number): [number, number] {
  const dist = Math.hypot(dx, dy);
  if (dist < def.keep.min) return toward(-dx, -dy, def);
  if (dist > def.keep.max) return toward(dx, dy, def);
  return [0, 0];
}

/** Its living packmate with the lowest share of its max health below full, in reach along a clear line, or null. */
export function pickTarget(state: SimState, e: EnemyState, def: TenderDef): EnemyState | null {
  if (e.group === '') return null;
  const room = roomById(e.roomId);
  let best: EnemyState | null = null;
  let lowest = 1;
  for (const o of state.enemies) {
    if (o === e || o.group !== e.group || o.roomId !== e.roomId || o.health <= 0 || !targetable(o) || enemyDef(o.enemyId).boss) continue;
    const share = o.health / defOf(o).maxHealth;
    if (share >= lowest || Math.hypot(o.x - e.x, o.y - e.y) > def.beam.range || !clearShot(room, e.x, e.y, o.x, o.y)) continue;
    best = o;
    lowest = share;
  }
  return best;
}

/** Why the beam breaks this tick, or null: its target is dead or gone, the line to it is blocked, or the tender was hurt. */
function breaks(state: SimState, e: EnemyState): BreakReason | null {
  const t = state.enemies.find((o) => o.id === e.beamTarget);
  if (!t || t.health <= 0) return 'died';
  if (e.health < e.beamHeld) return 'hurt';
  return clearShot(roomById(e.roomId), e.x, e.y, t.x, t.y) ? null : 'blocked';
}

function endBeam(state: SimState, e: EnemyState, reason: BreakReason): [number, number] {
  state.events.beamBreaks.push({ id: e.id, target: e.beamTarget, reason });
  e.beamTarget = -1;
  enter(e, 'recover');
  return [0, 0];
}

/** A Stun (039) that takes on a tender mid-beam (its wind-up or channel) ends the beam, with its break (061.10). */
export function stunEndsBeam(state: SimState, e: EnemyState): void {
  if (e.beamTarget < 0 || (e.mode !== 'windup' && e.mode !== 'swipe')) return;
  state.events.beamBreaks.push({ id: e.id, target: e.beamTarget, reason: 'stunned' });
  e.beamTarget = -1;
}

/** A tick of the channel: `heal` a second into the target, never past its max health (ring and champion scaled). */
function heal(state: SimState, e: EnemyState, def: TenderDef): void {
  const t = state.enemies.find((o) => o.id === e.beamTarget);
  if (!t || enemyDef(t.enemyId).boss) return;
  t.health = Math.min(defOf(t).maxHealth, t.health + def.beam.heal / TICK_RATE);
}

/** True while a tender's channel (not its wind-up) is healing this enemy (061: render's glow and hover line). */
export const repairing = (state: Pick<SimState, 'enemies'>, id: number): boolean => state.enemies.some((t) => t.beamTarget === id && t.mode === 'swipe' && t.health > 0 && enemyDef(t.enemyId).kind === 'tender');

/** Its beam while it winds up or channels (061: getState's), else null. */
export const beamShown = (e: Pick<EnemyState, 'mode' | 'beamTarget'>): { target: number; phase: 'windup' | 'channel' } | null =>
  e.beamTarget >= 0 && (e.mode === 'windup' || e.mode === 'swipe') ? { target: e.beamTarget, phase: e.mode === 'windup' ? 'windup' : 'channel' } : null;
