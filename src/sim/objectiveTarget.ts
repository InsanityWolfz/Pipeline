import { TILE_SIZE } from '../data/config';
import { INTAKE } from '../data/foundry';
import { arenaOf, HOLLOWS } from '../data/hollows';
import { nodeDef } from '../data/nodes';
import { OBJECTIVES } from '../data/objectives';
import { OVERWORLD_ROOM } from '../data/overworld';
import { FOUNDRY_ROOM } from '../data/rooms';
import { COLLECT_FROM, type TargetDef, type TargetKind } from '../data/targets';
import { facingVector } from './direction';
import { fixtureDef } from './fixtures';
import { currentObjective } from './objectives';
import { pieceAt, type HopperState } from './pieces';
import { machineRecipe } from './stages';
import { roomById, roomOf, type SimState } from './state';
import { goalLacks } from './subSteps';
import { tileCentre } from './tiles';
import { WORLD } from './world';
import { diagrams } from './research';
import { nextGhost } from './guided';

// Where the current goal points (051, B.1): every point its target names, and the one the waypoint arrow goes to —
// the nearest in the player's room (051.2), or the door of the player's room that leads to the target's (the
// foundry's door inside, its stairs outside). Points are ground points, world px: a tile's bottom centre, a node's
// base, an enemy's feet. Pure: render draws what this says.

export interface GoalPoint {
  roomId: string;
  x: number;
  y: number;
  kind: TargetKind;
  /** What stands there, for the arrow's lift: a node or an enemy type. */
  ref?: string;
  /** 051 (B.2): the raw a hopper takes, for its icon (the refill goal's hoppers only). */
  itemId?: string;
  /** A room as a whole (the foundry, or outside): reached once the player is in it. */
  whole?: true;
}

export interface Waypoint {
  x: number;
  y: number;
  /** `door`: the target is in another room, and this is the door there. */
  via: 'door' | 'target';
  /** The point it leads to (in the player's room, or beyond the door). */
  target: GoalPoint;
}

const tileBase = (t: { tx: number; ty: number }): { x: number; y: number } => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE });

/** The raw a hopper takes (051, B.2): the first input of the machine its front feeds, else what it last held. */
export function hopperRaw(state: Pick<SimState, 'foundry'>, h: HopperState): string | null {
  const [dx, dy] = facingVector(h.facing);
  const front = pieceAt(state.foundry, h.tx + dx, h.ty + dy);
  const input = front?.kind === 'machine' ? Object.keys(machineRecipe(front).inputs)[0] : undefined;
  return input ?? h.item;
}

/** Harvestable nodes of these raws (any room); with none harvestable, the spent ones, as they'll grow back. */
function nodesOf(state: SimState, items: readonly string[], kind: TargetKind): GoalPoint[] {
  const all = state.nodes.filter((n) => items.includes(nodeDef(n.nodeId).itemId));
  const live = all.filter((n) => n.uses > 0);
  return (live.length > 0 ? live : all).map((n) => ({ roomId: n.roomId, x: n.x, y: n.y + nodeDef(n.nodeId).feetBox.h / 2, kind, ref: n.nodeId }));
}

const enemyPoints = (state: SimState, keep: (e: SimState['enemies'][number]) => boolean, kind: TargetKind): GoalPoint[] =>
  state.enemies.filter((e) => e.health > 0 && keep(e)).map((e) => ({ roomId: e.roomId, x: e.x, y: e.y, kind, ref: e.enemyId }));

/** The intake's mouths (in the foundry's north wall) for these entrance indices. */
const mouths = (indices: readonly number[], kind: TargetKind): GoalPoint[] =>
  indices.flatMap((i) => {
    const m = INTAKE.entrances[i];
    return m ? [{ roomId: FOUNDRY_ROOM, ...tileBase(m), kind }] : [];
  });

const indicesWhere = (state: SimState, keep: (e: SimState['link']['entrances'][number]) => boolean): number[] =>
  state.link.entrances.flatMap((e, i) => (keep(e) ? [i] : []));

/** Every pylon in the world with its room. */
const pylons = () => Object.values(WORLD).flatMap((room) => (room.pylons ?? []).map((p) => ({ roomId: room.id, p })));

/** The points a target names now. */
export function targetPoints(state: SimState, target: TargetDef, goal: number): GoalPoint[] {
  const check = OBJECTIVES[goal]?.check;
  const k = target.kind;
  switch (target.kind) {
    case 'tubeStone': {
      if (state.hasTube) return [];
      return Object.values(WORLD).flatMap((r) => (r.tubeStone ? [{ roomId: r.id, ...tileBase(r.tubeStone), kind: k }] : []));
    }
    case 'nodes':
      return check?.kind === 'gathered' ? nodesOf(state, check.items.filter((i) => !state.gathered.includes(i)), k) : [];
    case 'collect': {
      const lacks = check ? goalLacks(state, check) : [];
      return lacks.flatMap((raw) => {
        const from = COLLECT_FROM[raw];
        const foes = from ? enemyPoints(state, (e) => e.enemyId === from.enemy && e.roomId === OVERWORLD_ROOM, k) : [];
        return foes.length > 0 ? foes : nodesOf(state, [raw], k);
      });
    }
    case 'pack':
      return enemyPoints(state, (e) => e.group === target.group, k);
    case 'room':
      return [{ roomId: target.room, ...tileCentre(roomById(target.room).spawn), kind: k, whole: true }];
    case 'hoppers':
      return state.foundry.pieces.flatMap((p) => {
        if (p.kind !== 'hopper') return [];
        const raw = hopperRaw(state, p);
        if (target.unfilled && raw !== null && state.refilled.includes(raw)) return [];
        // Only the refill goal shows each hopper's raw (B.2); the next goal keeps a plain arrow.
        return [{ roomId: FOUNDRY_ROOM, ...tileBase(p), kind: k, ...(raw && target.unfilled ? { itemId: raw } : {}) }];
      });
    case 'bench':
      return state.fixtures.flatMap((f) => {
        const d = fixtureDef(f.id);
        return d.kind === 'bench' ? [{ roomId: FOUNDRY_ROOM, ...tileBase(d), kind: k }] : [];
      });
    case 'pylon':
      return pylons()
        .filter(({ p }) => p.site === target.site && state.claims.includes(p.site) === (target.claimed ?? false))
        .map(({ roomId, p }) => ({ roomId, ...tileBase(p), kind: k }));
    case 'caps':
      return mouths(diagrams(state).flatMap((d) => (d.entrance === null ? [] : [d.entrance])), k);
    case 'ghost': {
      const g = nextGhost(state)?.ghost;
      return g ? [{ roomId: FOUNDRY_ROOM, ...tileBase(g), kind: k }] : [];
    }
    case 'intake': {
      const empty = indicesWhere(state, (e) => e.open && e.count === 0);
      return mouths(empty.length > 0 ? empty : indicesWhere(state, (e) => e.open), k);
    }
    case 'barrier':
      // 053: the barrier rings Region 1; the goal points where the road west to the Cistern Terrace crosses it.
      return [{ roomId: OVERWORLD_ROOM, ...tileBase(HOLLOWS.crossing), kind: k }];
    case 'boss': {
      const foe = enemyPoints(state, (e) => e.enemyId === target.boss, k);
      const arena = arenaOf(target.boss);
      return foe.length > 0 ? foe : arena ? [{ roomId: OVERWORLD_ROOM, ...tileBase(arena.start), kind: k, ref: target.boss }] : [];
    }
  }
}

/** Every point the current goal names (none in the sandbox, which has no goals, 044.5, or once every goal is done). */
export function objectiveTargets(state: SimState): GoalPoint[] {
  const goal = currentObjective(state);
  const def = goal === null ? undefined : OBJECTIVES[goal];
  if (state.sandbox || goal === null || !def?.target) return [];
  return targetPoints(state, def.target, goal);
}

const near = (state: SimState) => (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - state.player.x, a.y - state.player.y) - Math.hypot(b.x - state.player.x, b.y - state.player.y);

/** Where the waypoint arrow points: the nearest target in the player's room, else the door toward one; null for none. */
export function waypoint(state: SimState): Waypoint | null {
  const points = objectiveTargets(state);
  const here = points.filter((p) => p.roomId === state.roomId);
  if (here.some((p) => p.whole)) return null;
  const best = [...here].sort(near(state))[0];
  if (best) return { x: best.x, y: best.y, via: 'target', target: best };
  for (const d of roomOf(state).doorways ?? []) {
    const beyond = points.find((p) => p.roomId === d.to);
    if (beyond) return { ...tileBase(d), via: 'door', target: beyond };
  }
  return null;
}
