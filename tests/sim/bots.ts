import { TICK_RATE } from '../../src/data/config';
import type { EnemyDef } from '../../src/data/enemies';
import { WALK_SPEED } from '../../src/data/player';
import { windupsOf } from '../../src/sim/bulwarkPhases';
import { defOf } from '../../src/sim/champions';
import type { EnemyState } from '../../src/sim/enemies';
import type { Command } from '../../src/sim/input';
import type { SimState } from '../../src/sim/state';

// Scripted players for 041's targets (test code): what a careful player reads from the
// screen. Every telegraphed attack about to land is a danger zone (a Bulwark bomb's ring,
// its pound circle and rear half-disc, a swipe or bash arc, a Charger's lane, a Burrower's
// ring, a Sniper's locked line, an orb or bolt in flight); each tick the bot walks the
// way that keeps it out of every zone and nearest its goal, and rolls through a zone it
// can't walk out of in time. It reads only what getState() shows.

/** A telegraphed area and the ticks before it lands. */
type Shape = (
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'arc'; x: number; y: number; r: number; dirX: number; dirY: number; deg: number }
  | { kind: 'lane'; x: number; y: number; dirX: number; dirY: number; length: number; width: number }
) & {
  /** Ticks before it lands. */
  left: number;
  /** A roll's i-frames don't save from it (041.12: its second ring shows it): the player has to be out by then. */
  rollProof?: boolean;
};

/** A shape and the ticks it has shown. */
type Zone = Shape & { age: number };

/** Feet-box padding round every zone, px: a margin for the box and a tick's walk. */
const PAD = 12;

/** How far a roll carries before its i-frames run out, px (a margin under the bare roll's 96 over 18 ticks). */
const ROLL_REACH = 60;

/** Ticks before a roll-proof zone lands that a roll out of it starts: a whole roll's 18. */
const ROLL_OUT_TICKS = 18;

/** True if a point is inside a zone grown by `pad` px. */
export function inZone(z: Zone, x: number, y: number, pad = PAD): boolean {
  const dx = x - z.x;
  const dy = y - z.y;
  const dist = Math.hypot(dx, dy);
  if (z.kind === 'circle') return dist <= z.r + pad;
  if (z.kind === 'arc') {
    if (dist > z.r + pad) return false;
    if (dist <= pad) return true;
    return (dx * z.dirX + dy * z.dirY) / dist >= Math.cos(((z.deg / 2) * Math.PI) / 180) - pad / Math.max(dist, 1);
  }
  const along = dx * z.dirX + dy * z.dirY;
  const across = Math.abs(dx * -z.dirY + dy * z.dirX);
  return along >= -pad && along <= z.length + pad && across <= z.width / 2 + pad;
}

/** One enemy's telegraph, if it's winding up (or charging, or a bolt is about to fly). */
function enemyZone(e: EnemyState, def: EnemyDef): Zone | null {
  const left = (windup: number) => Math.max(0, windup - e.modeTicks);
  const age = e.modeTicks;
  const z = zoneOf(e, def, left);
  return z ? { ...z, age } : null;
}

/** An enemy's telegraph shape and the ticks before it lands. */
function zoneOf(e: EnemyState, def: EnemyDef, left: (windup: number) => number): Shape | null {
  switch (def.kind) {
    case 'melee':
      return e.mode === 'windup' ? { kind: 'arc', x: e.x, y: e.y, r: def.swipe.reach, dirX: e.swipeDirX, dirY: e.swipeDirY, deg: def.swipe.arcDegrees, left: left(def.swipe.windupTicks) } : null;
    case 'shardback':
      return e.mode === 'windup' ? { kind: 'arc', x: e.x, y: e.y, r: def.bash.reach, dirX: Math.cos(e.angle), dirY: Math.sin(e.angle), deg: def.bash.arcDegrees, left: left(def.bash.windupTicks) } : null;
    case 'charger':
      if (e.mode === 'windup') return { kind: 'lane', x: e.spotX, y: e.spotY, dirX: e.swipeDirX, dirY: e.swipeDirY, length: def.charge.distance, width: def.charge.width, left: left(def.charge.windupTicks) };
      return e.mode === 'swipe' ? { kind: 'lane', x: e.x, y: e.y, dirX: e.swipeDirX, dirY: e.swipeDirY, length: def.charge.distance, width: def.charge.width + 8, left: 0 } : null;
    case 'burrower':
      return e.mode === 'windup' ? { kind: 'circle', x: e.spotX, y: e.spotY, r: def.burrow.radius, left: left(def.burrow.windupTicks) } : null;
    case 'sniper':
      return e.mode === 'windup' && e.modeTicks >= def.snipe.trackTicks
        ? { kind: 'lane', x: e.x, y: e.y, dirX: e.swipeDirX, dirY: e.swipeDirY, length: def.snipe.range, width: def.snipe.boltSize + 8, left: left(def.snipe.windupTicks) }
        : null;
    case 'slammer':
      return e.mode === 'windup' ? { kind: 'circle', x: e.x, y: e.y, r: def.slam.radius, left: left(def.slam.windupTicks) } : null;
    case 'bulwark': {
      const w = windupsOf(e, def);
      if (e.mode === 'windup') return { kind: 'circle', x: e.x, y: e.y, r: def.pound.radius, left: left(w.pound), rollProof: def.pound.rollProof };
      return e.mode === 'stomp-windup' ? { kind: 'arc', x: e.x, y: e.y, r: def.stomp.radius, dirX: e.swipeDirX, dirY: e.swipeDirY, deg: def.stomp.arcDegrees, left: left(w.stomp) } : null;
    }
    case 'forgewright': {
      // 060: its slam's circle ahead of it (its flood and spray the Forgewright's own bot reads, tests/sim/forgewrightBot.ts).
      const r = def.slam.reach;
      return e.mode === 'windup' ? { kind: 'circle', x: e.x + e.swipeDirX * r, y: e.y + e.swipeDirY * r, r: def.slam.radius, left: left(def.slam.windupTicks) } : null;
    }
    // 061: a mote's swell is its burst's circle round it.
    case 'mote':
      return e.mode === 'windup' ? { kind: 'circle', x: e.x, y: e.y, r: def.swell.radius, left: left(def.swell.windupTicks) } : null;
    case 'caster':
      return null;
  }
}

/** Every danger zone in the player's room: enemy telegraphs, the Bulwark's bombs, and orbs and bolts in flight (their next 40 ticks of path). */
export function dangerZones(s: SimState): Zone[] {
  const out: Zone[] = [];
  for (const e of s.enemies) {
    if (e.roomId !== s.roomId || e.frozen > 0 || e.stunned > 0) continue;
    const z = enemyZone(e, defOf(e));
    if (z) out.push(z);
  }
  // The Bulwark's back wave (041.16), building beside whatever else it does.
  for (const e of s.enemies) {
    const def = defOf(e);
    if (def.kind !== 'bulwark' || e.waveTicks <= 0 || e.roomId !== s.roomId) continue;
    out.push({ kind: 'arc', x: e.x, y: e.y, r: def.wave.radius, dirX: e.waveDirX, dirY: e.waveDirY, deg: def.wave.arcDegrees, left: windupsOf(e, def).wave - e.waveTicks, age: e.waveTicks, rollProof: def.wave.rollProof });
  }
  for (const b of s.enemyBombs) if (b.roomId === s.roomId) out.push({ kind: 'circle', x: b.x, y: b.y, r: b.radius, left: b.fuseTicks - b.fuse, age: b.fuse, rollProof: b.rollProof });
  for (const o of s.orbs) {
    if (o.roomId !== s.roomId) continue;
    const def = defOf({ enemyId: o.enemyId, champion: null, ring: 0 });
    const speed = def.kind === 'sniper' ? def.snipe.boltSpeed : def.kind === 'caster' ? def.cast.orbSpeed : def.kind === 'forgewright' ? def.spray.speed : 0;
    out.push({ kind: 'lane', x: o.x, y: o.y, dirX: o.dx, dirY: o.dy, length: (speed / TICK_RATE) * 40, width: 14, left: 0, age: speed > 0 ? Math.floor(o.travelled / (speed / TICK_RATE)) : 0 });
  }
  return out;
}

/** -1, 0 or 1. */
const sign = (v: number, dead = 2): -1 | 0 | 1 => (Math.abs(v) < dead ? 0 : v > 0 ? 1 : -1);

const MOVES: readonly (readonly [-1 | 0 | 1, -1 | 0 | 1])[] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** How far the player walks in `ticks`, px, firing or not (a margin under the real pace). */
const walkPx = (ticks: number, firing: boolean): number => (WALK_SPEED / TICK_RATE) * (firing ? 0.7 : 1) * ticks * 0.9;

export interface Steer {
  /** The move, a roll if one is needed, and whether it's safe to keep firing. */
  cmd: Partial<Command>;
  danger: boolean;
}

/** How a bot reads the screen: a telegraph is seen once it has shown `react` ticks (a player's reaction), and only once it lands within `horizon` ticks. */
export interface Reading {
  react: number;
  horizon: number;
  /** Fire is held (the walk slows to the firing pace). */
  firing: boolean;
  /** It walks round what it has read (a careful player), or keeps to its goal and only rolls out of what is about to land. */
  walksRound: boolean;
}

/** A careful player's reading: a quarter second to react, fire held, walking round every telegraph. */
export const CAREFUL: Reading = { react: 15, horizon: 45, firing: true, walksRound: true };

/** A player who holds position and fire, and rolls out of a telegraph as it lands. */
export const ROLLER: Reading = { react: 15, horizon: 45, firing: true, walksRound: false };

/**
 * A move toward `goal` that stays out of every zone it has read, rolling through one it can't walk out of. Zones further
 * off than the horizon are ignored: there's time to read them later.
 */
export function steer(s: SimState, goal: { x: number; y: number }, read: Reading = CAREFUL): Steer {
  const p = s.player;
  const zones = dangerZones(s).filter((z) => z.left <= read.horizon && z.age >= read.react);
  const threat = zones.filter((z) => inZone(z, p.x, p.y));
  const danger = threat.length > 0;
  let best: { move: readonly [number, number]; score: number } = { move: [0, 0], score: Infinity };
  for (const move of MOVES) {
    const len = Math.hypot(move[0], move[1]) || 1;
    let score = 0;
    // A careful player walks round all it has read; any player walks out of what a roll won't save from.
    for (const z of read.walksRound ? zones : zones.filter((x) => x.rollProof)) {
      const ticks = Math.max(1, Math.min(z.left, 30));
      const step = walkPx(ticks, read.firing);
      const x = p.x + (move[0] / len) * step;
      const y = p.y + (move[1] / len) * step;
      if (inZone(z, x, y)) score += 10_000 / (1 + z.left);
    }
    const gx = p.x + (move[0] / len) * 24;
    const gy = p.y + (move[1] / len) * 24;
    score += Math.hypot(goal.x - gx, goal.y - gy);
    if (score < best.score) best = { move, score };
  }
  const cmd: Partial<Command> = { moveX: best.move[0] as -1 | 0 | 1, moveY: best.move[1] as -1 | 0 | 1 };
  // About to land on the player and no walking out of it: roll (its i-frames cover the hit).
  // A roll through a zone lands inside its i-frames; one a roll won't save from has to carry the player out, so it
  // starts while the roll can still cover the distance.
  const soon = threat.some((z) => z.left <= (z.rollProof ? ROLL_OUT_TICKS : 3));
  if (soon && p.rollTick === 0 && p.cooldown === 0) {
    const out = rollOut(p, threat, zones);
    Object.assign(cmd, { dodge: true, moveX: out[0], moveY: out[1] });
  }
  return { cmd, danger };
}

/** Moves straight at a point, -1/0/1 an axis. */
export const walkTo = (s: SimState, goal: { x: number; y: number }): Partial<Command> => ({ moveX: sign(goal.x - s.player.x), moveY: sign(goal.y - s.player.y) });

/** Damage the player took this tick, from the hit events. */
export const takenThisTick = (s: SimState): number => s.events.hits.filter((h) => h.target === 'player').reduce((n, h) => n + h.damage, 0);

/** The roll direction that ends furthest from trouble: out of every zone about to land, then out of as many others as it can. */
function rollOut(p: { x: number; y: number }, threat: readonly Zone[], zones: readonly Zone[]): readonly [-1 | 0 | 1, -1 | 0 | 1] {
  let best: readonly [-1 | 0 | 1, -1 | 0 | 1] = [1, 0];
  let bestScore = Infinity;
  for (const move of MOVES) {
    if (move[0] === 0 && move[1] === 0) continue;
    const len = Math.hypot(move[0], move[1]);
    const x = p.x + (move[0] / len) * ROLL_REACH;
    const y = p.y + (move[1] / len) * ROLL_REACH;
    const score = threat.filter((z) => inZone(z, x, y, 4)).length * 100 + zones.filter((z) => inZone(z, x, y, 4)).length;
    if (score < bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}
