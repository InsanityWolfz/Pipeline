import { MAX_HEALTH } from '../data/player';
import { OBJECTIVES } from '../data/objectives';
import { WORLD } from './world';
import type { SimEvents } from './events';
import { unlockedPieces } from './placement';
import { isInvulnerable, isRolling } from './movement';
import type { Facing } from './player';
import type { ArmorPiece } from './armor';
import { fixtureDef } from './fixtures';
import { currentObjective } from './objectives';
import { volleyRounds, nextPress } from './volley';
import { ENTRANCE_CAP, INTAKE } from '../data/foundry';
import type { SimState } from './state';
import {
  arrowSummary,
  bombSummary,
  enemySummary,
  nodeSummary,
  pieceSummary,
  round,
  type ArrowSummary,
  type BombSummary,
  type EnemySummary,
  type NodeSummary,
  type PieceSummary,
} from './summaryParts';
import { OVERWORLD, ringOf } from '../data/overworld';
import { TILE_SIZE } from '../data/config';
import { enemiesNearPlayer, enemiesOnScreen } from './population';

/** The compact JSON summary that window.__GAME__.getState() returns. */
export interface SimSummary {
  tick: number;
  seed: number;
  /** The room the player is in. */
  room: string;
  /** Where the player is (017): the room, the overworld's ring there (null elsewhere), and live enemies in the room. */
  area: { room: string; ring: 0 | 1 | 2 | null; liveEnemies: number };
  /** The living population is out (017), how many enemies are within a screen of the player, and how many the camera shows. */
  populated: boolean;
  nearPlayer: number;
  onScreen: number;
  /** Every room id. */
  rooms: string[];
  player: {
    /** Feet centre, px. */
    x: number;
    y: number;
    /** Velocity, px per tick. */
    vx: number;
    vy: number;
    facing: Facing;
    rolling: boolean;
    invulnerable: boolean;
    rollCooldown: number;
    /** The last aim point, world px. */
    aim: { x: number; y: number };
    health: number;
    maxHealth: number;
    /** Hit invulnerability after taking a hit (roll i-frames are `invulnerable`). */
    hitInvulnerable: boolean;
    /** KO'd this tick; the room has already reset. */
    ko: boolean;
    /** Ticks left on the death animation; 0 when alive. */
    dying: number;
  };
  /** Item id to count. */
  inventory: Record<string, number>;
  tube: {
    ammo: string;
    fireCooldown: number;
    /** Ticks before the next punch can happen (023). */
    meleeCooldown: number;
    firing: boolean;
    /** This tick's shot was a volley from the intake's entrances (024). */
    fromReservoir: boolean;
    /** Projectiles this tick's shot fired (a volley of several rounds fires several). */
    shotCount: number;
    /** What the next fire press does (023, 024): a carried round, a volley, or a punch. */
    next: 'carried' | 'volley' | 'melee';
  };
  /** The tube's link to the foundry. */
  link: {
    attuned: boolean;
    /** Ticks left on the attuning pulse. */
    attunePulse: number;
  };
  /** Arrows and ley bolts in flight; x, y is the ground point. */
  arrows: ArrowSummary[];
  enemies: EnemySummary[];
  groundItems: { id: number; itemId: string; room: string; x: number; y: number }[];
  nodes: NodeSummary[];
  /** The harvest in progress: the node's id and ticks into it. */
  harvest: { nodeId: number; progress: number } | null;
  bombs: BombSummary[];
  /** Item ids hand-crafted at least once. */
  crafted: string[];
  /** Pieces the player can place, in build bar order. */
  unlocked: string[];
  building: boolean;
  foundry: { pieces: PieceSummary[] };
  /** Wisp orbs in flight; x, y is the ground point. */
  orbs: { id: number; room: string; x: number; y: number; dx: number; dy: number }[];
  /** Claimed room ids. */
  claims: string[];
  /** The claim hold in progress: its room and ticks into it. */
  claimHold: { site: string; progress: number } | null;
  /** Ticks left on a pylon's activation. */
  activatePulse: number;
  /** The foundry's fixed furniture: id, kind, tile, and a port's raw waiting to go out. */
  fixtures: { id: string; kind: string; tx: number; ty: number; item: string | null }[];
  /** What the stash holds. */
  stash: Record<string, number>;
  /** Identified armor (010); unidentified pieces are carried as the `unidentified-armor` item. */
  armorPieces: (ArmorPiece & { identified: true })[];
  /** The worn piece's id, or null. */
  equippedArmor: number | null;
  firstHuskDropped: boolean;
  /** The tutorial (012): the tube in hand, gates open, the first line full, the current goal, the end. */
  hasTube: boolean;
  gates: { foundry: boolean; shrine: boolean };
  firstLineFull: boolean;
  /** The first unfinished objective (index and text), or null once all are done. */
  objective: { index: number; text: string } | null;
  prototypeComplete: boolean;
  /**
   * The foundry intake (019, 024): each entrance's mouth tile, whether it's open, the ammo it holds and how many;
   * and the volley the reservoirs fire once no round of the selected ammo is carried, as ammo ids (one per fed entrance, west to east).
   */
  intake: { entrances: { tx: number; ty: number; open: boolean; ammo: string | null; count: number; cap: number }[]; volley: string[] };
  /** What a death keeps: the inventory as last banked. */
  banked: Record<string, number>;
  /** What happened on the last tick. */
  events: SimEvents;
}

export function summarize(state: SimState): SimSummary {
  const { player: p, tube } = state;
  return {
    tick: state.tick,
    seed: state.seed,
    room: state.roomId,
    area: {
      room: state.roomId,
      ring: state.roomId === OVERWORLD.id ? ringOf(Math.floor(state.player.x / TILE_SIZE), Math.floor(state.player.y / TILE_SIZE)) : null,
      liveEnemies: state.enemies.filter((e) => e.roomId === state.roomId).length,
    },
    populated: state.populated,
    nearPlayer: enemiesNearPlayer(state),
    onScreen: enemiesOnScreen(state),
    rooms: Object.keys(WORLD),
    player: {
      x: round(p.x),
      y: round(p.y),
      vx: round(p.vx),
      vy: round(p.vy),
      facing: p.facing,
      rolling: isRolling(p),
      invulnerable: isInvulnerable(p),
      rollCooldown: p.cooldown,
      aim: { x: round(p.aimX), y: round(p.aimY) },
      health: p.health,
      maxHealth: MAX_HEALTH,
      hitInvulnerable: p.hurtTicks > 0,
      ko: state.events.ko,
      dying: p.dying,
    },
    inventory: { ...state.inventory },
    tube: {
      ammo: tube.ammoId,
      fireCooldown: tube.fireCooldown,
      meleeCooldown: tube.meleeCooldown,
      firing: tube.firing,
      fromReservoir: tube.fromReservoir,
      shotCount: tube.shotCount,
      next: nextPress(state).kind,
    },
    link: {
      attuned: state.link.attuned,
      attunePulse: state.link.attunePulse,
    },
    arrows: state.arrows.map(arrowSummary),
    enemies: state.enemies.map(enemySummary),
    groundItems: state.groundItems.map((g) => ({ id: g.id, itemId: g.itemId, room: g.roomId, x: round(g.x), y: round(g.y) })),
    nodes: state.nodes.map(nodeSummary),
    harvest: state.harvest ? { ...state.harvest } : null,
    bombs: state.bombs.map(bombSummary),
    crafted: [...state.crafted],
    unlocked: unlockedPieces(state),
    building: state.building,
    foundry: { pieces: state.foundry.pieces.map((p) => pieceSummary(p)) },
    intake: {
      entrances: INTAKE.entrances.map((t, i) => {
        const e = state.link.entrances[i];
        return { tx: t.tx, ty: t.ty, open: e?.open ?? false, ammo: e?.ammoId ?? null, count: e?.count ?? 0, cap: ENTRANCE_CAP };
      }),
      volley: volleyRounds(state).map((r) => r.ammoId),
    },
    orbs: state.orbs.map((o) => ({ id: o.id, room: o.roomId, x: round(o.x), y: round(o.y), dx: round(o.dx), dy: round(o.dy) })),
    claims: [...state.claims],
    claimHold: state.claimHold ? { site: state.claimHold.site, progress: state.claimHold.progress } : null,
    activatePulse: state.activatePulse,
    fixtures: state.fixtures.map((f) => {
      const d = fixtureDef(f.id);
      return { id: f.id, kind: d.kind, tx: d.tx, ty: d.ty, item: f.item };
    }),
    stash: { ...state.stash },
    armorPieces: state.armor.map((a) => ({ ...a, identified: true as const })),
    equippedArmor: state.equipped,
    firstHuskDropped: state.firstHuskDropped,
    banked: { ...state.banked },
    hasTube: state.hasTube,
    gates: { ...state.gates },
    firstLineFull: state.firstLineFull,
    objective: objectiveSummary(state),
    prototypeComplete: state.prototypeComplete,
    events: structuredClone(state.events),
  };
}

function objectiveSummary(state: SimState): SimSummary['objective'] {
  const i = currentObjective(state);
  const def = i === null ? undefined : OBJECTIVES[i];
  return i === null || !def ? null : { index: i, text: def.text };
}
