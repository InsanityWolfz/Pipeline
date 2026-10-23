import { ammoDef } from '../../src/data/ammo';
import { TICK_RATE, TILE_SIZE } from '../../src/data/config';
import { OVERWORLD, OVERWORLD_ROOM, ringOf } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { defOf } from '../../src/sim/champions';
import { createEnemy, targetable, type EnemyState } from '../../src/sim/enemies';
import { nextInt } from '../../src/sim/rng';
import { angleDiff } from '../../src/sim/shield';
import { rotate, volleyRounds } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { clearShot } from '../../src/sim/sightLine';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { CAREFUL, steer, takenThisTick } from './bots';
import { feed, lines } from './builds';
import { arena, run } from './fight';

// A pack fight for 041's targets (test code): a pack placed as the population places one
// (each member on open ground within 2 tiles of its centre, picked with the sim's RNG, all
// in the pack's ring) but without its champion roll, since 041.8 names plain members; and a
// bot that kites it: it reads every telegraph and walks round
// it (rolling through one it can't), keeps its distance from the nearest member, and holds
// fire on the nearest one it can hurt from where it stands.

/** Open ground a member can stand on (the population's rule): floor or path. */
const open = (tx: number, ty: number): boolean => {
  const symbol = WORLD[OVERWORLD_ROOM]?.rows[ty]?.[tx];
  return symbol === TILE.floor || symbol === TILE.path;
};

/** Places a pack of `ids` round a centre tile, each member on open ground in the centre's ring within 2 tiles, with the sim's RNG. */
export function placePack(s: SimState, ids: readonly string[], centre: { tx: number; ty: number }): EnemyState[] {
  const ring = ringOf(centre.tx, centre.ty);
  const spots: { tx: number; ty: number }[] = [];
  for (let k = 0; k < 400 && spots.length < ids.length; k++) {
    const t = { tx: centre.tx + nextInt(s.rng, -2, 2), ty: centre.ty + nextInt(s.rng, -2, 2) };
    if (open(t.tx, t.ty) && ringOf(t.tx, t.ty) === ring && !spots.some((o) => o.tx === t.tx && o.ty === t.ty)) spots.push(t);
  }
  const pack = ids.map((id, i) => createEnemy(s.nextEnemyId++, id, tileCentre(spots[i] ?? centre), OVERWORLD.id, 'pop-test'));
  s.enemies.push(...pack);
  return pack;
}

/** Whether a straight shot from the player would meet its shield's front. */
const shieldFacing = (s: SimState, e: EnemyState): boolean => {
  if (!defOf(e).shield) return false;
  return Math.abs(angleDiff(e.angle, Math.atan2(s.player.y - e.y, s.player.x - e.x))) <= Math.PI / 2;
};

/**
 * The pack member to shoot: the nearest one it can hurt from here, a clear line to it and no shield's front in the way;
 * then the nearest with a clear line (its bombs still land); then the nearest at all.
 */
export function targetOf(s: SimState, pack: readonly EnemyState[]): EnemyState | undefined {
  const p = s.player;
  const room = WORLD[OVERWORLD_ROOM];
  const up = pack.filter((e) => e.health > 0 && targetable(e) && e.rising <= 0);
  const seen = up.filter((e) => !room || clearShot(room, p.x, p.y, e.x, e.y + defOf(e).hurtbox.offsetY));
  const by = (list: EnemyState[]) => list.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  return by(seen.filter((e) => !shieldFacing(s, e))) ?? by(seen) ?? by(up);
}

/**
 * Where to aim at a target: its body (the hurtbox's middle). When no straight round's lane is on the cursor (048: every
 * fed entrance takes a lane of the fan, whatever its ammo), the aim turns so the straight round nearest the middle
 * flies straight at it, as a player learns to.
 */
function aimAt(s: SimState, target: EnemyState): { aimX: number; aimY: number } {
  const p = s.player;
  const body = { x: target.x, y: target.y + defOf(target).hurtbox.offsetY };
  const lanes = volleyRounds(s).filter((r) => ammoDef(r.ammoId).kind === 'straight').map((r) => r.lane);
  const lane = lanes.sort((a, b) => Math.abs(a) - Math.abs(b))[0] ?? 0;
  if (lane === 0) return { aimX: body.x, aimY: body.y };
  const [dx, dy] = rotate(body.x - p.x, body.y - p.y, -lane);
  return { aimX: p.x + dx, aimY: p.y + dy };
}

/** The strafe round the nearest member, radians, and how hard home pulls the goal back (0..1). */
const STRAFE = Math.PI / 6;
const HOME_PULL = 0.35;

/**
 * Where it heads: round to the back of a shielded target facing it (a flank, 90 px out); into range of a target its
 * shots can't reach; otherwise circling the nearest member `keep` px out (a strafe, 30° on round it), drawn toward home
 * so it doesn't back into the terrain.
 */
function goalOf(s: SimState, near: EnemyState | undefined, target: EnemyState | undefined, home: { x: number; y: number }, keep: number): { x: number; y: number } {
  const p = s.player;
  const pull = (g: { x: number; y: number }) => ({ x: g.x * (1 - HOME_PULL) + home.x * HOME_PULL, y: g.y * (1 - HOME_PULL) + home.y * HOME_PULL });
  if (target && shieldFacing(s, target)) {
    const bearing = Math.atan2(p.y - target.y, p.x - target.x);
    const fromBack = angleDiff(bearing, target.angle + Math.PI);
    const a = bearing + Math.sign(fromBack || 1) * Math.min(0.7, Math.abs(fromBack));
    return { x: target.x + Math.cos(a) * FLANK, y: target.y + Math.sin(a) * FLANK };
  }
  if (target && Math.hypot(target.x - p.x, target.y - p.y) > REACH) {
    const d = Math.hypot(p.x - target.x, p.y - target.y) || 1;
    return { x: target.x + ((p.x - target.x) / d) * (REACH - 40), y: target.y + ((p.y - target.y) / d) * (REACH - 40) };
  }
  if (!near) return home;
  const a = Math.atan2(p.y - near.y, p.x - near.x) + STRAFE;
  return pull({ x: near.x + Math.cos(a) * keep, y: near.y + Math.sin(a) * keep });
}

/** How far out it flanks a shield, and the furthest it shoots from (inside an arrow's 320 px), px. */
const FLANK = 44;
const REACH = 260;

/** What a pack fight came to: ticks from its first round at the pack to its last death, damage taken, and a KO. */
export interface PackFight {
  cleared: boolean;
  ko: boolean;
  ticks: number;
  taken: number;
}

/** Kites and shoots a pack until it's dead, the player KO'd, or `limit` ticks pass. `keep` is the distance it keeps from the nearest member, px. */
export function fightPack(s: SimState, pack: readonly EnemyState[], home: { x: number; y: number }, limit: number, keep = 150): PackFight {
  let first = 0;
  let taken = 0;
  for (let t = 1; t <= limit; t++) {
    feed(s);
    const p = s.player;
    const alive = pack.filter((e) => e.health > 0);
    const near = alive.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const target = targetOf(s, pack);
    const goal = goalOf(s, near, target, home, keep);
    const cmd = steer(s, goal, CAREFUL).cmd;
    run(s, 1, target ? { ...cmd, fire: true, ...aimAt(s, target) } : cmd);
    if (first === 0 && s.events.shots.length > 0) first = t;
    taken += takenThisTick(s);
    if (pack.every((e) => !s.enemies.includes(e))) return { cleared: true, ko: false, ticks: t - first, taken };
    if (s.player.dying > 0) return { cleared: false, ko: true, ticks: t - first, taken };
  }
  return { cleared: false, ko: false, ticks: limit, taken };
}

/** A tile's centre in px. */
export const at = (tx: number, ty: number): { x: number; y: number } => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

/**
 * 041.8's ring-matched packs: each pack, the lines of its fitting volley, its centre tile, and the player's start 6 to 7
 * tiles off. 053: on the round map, open ground in each ring: south-west of the meadow (ring 1), by the south road
 * (ring 2), and the Cistern Terrace's flagstones (ring 3, where it was before, moved with the Terrace). 060: +31 each
 * way with the centre.
 */
export const PACKS = {
  1: { ids: ['husk', 'husk', 'husk', 'husk'], lines: ['arrow'], centre: { tx: 105, ty: 134 }, start: at(111, 134) },
  2: { ids: ['husk', 'husk', 'husk', 'husk', 'wisp'], lines: ['arrow', 'arrow'], centre: { tx: 114, ty: 155 }, start: at(121, 155) },
  3: { ids: ['shardback', 'charger', 'charger', 'burrower', 'sniper'], lines: ['bomb', 'arrow'], centre: { tx: 53, ty: 139 }, start: at(59, 139) },
} as const;

/** The longest a pack fight runs, ticks: 60 s. */
export const PACK_LIMIT = 60 * TICK_RATE;

/** One ring's pack fight on a seed: no talents, nothing worn, only the volley's lines (041.8's arithmetic). */
export function packClear(ring: keyof typeof PACKS, seed: number): PackFight {
  const def = PACKS[ring];
  const s = arena(seed, def.start);
  lines(s, ...def.lines);
  return fightPack(s, placePack(s, def.ids, def.centre), def.start, PACK_LIMIT);
}
