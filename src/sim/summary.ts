import type { GearPiece, GearSlot } from '../data/gear';
import { playerStats, type PlayerStats } from './stats';
import { wardReady } from './relics';
import { WORLD } from './world';
import type { SimEvents } from './events';
import { unlockedPieces } from './placement';
import { stagesUnlocked } from './stages';
import { portSummary } from './summaryPorts';
import { fixtureDef } from './fixtures';
import { objectiveLine } from './objectives';
import { volleyRounds, nextPress, hudActive, type HudActive, type NextPress } from './volley';
import { INTAKE } from '../data/foundry';
import { entranceCap } from './research';
import { researchSummary, type ResearchSummary } from './researchSummary';
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
import { atRiskCounts } from './banking';
import { LANDMARK_LIST } from '../data/landmarks';
import { isOpened } from './cache';
import { regionOf } from './regions';
import { hollowsSummary, type HollowsSummary } from './summaryHollows';
import { levelingSummary, type LevelingSummary } from './summaryLeveling';
import { minesSummary, type MinesSummary } from './summaryMines';
import { sandboxSummary, type SandboxSummary } from './summarySandbox';
import { playerSummary, type PlayerSummary } from './summaryPlayer';

/** The compact JSON summary that window.__GAME__.getState() returns. The player and springs (`player`, `springs`) are in summaryPlayer.ts. Stonefall Hollows' part (034) is in summaryHollows.ts, landmines' (038) in summaryMines.ts. */
export interface SimSummary extends PlayerSummary, HollowsSummary, LevelingSummary, MinesSummary, SandboxSummary {
  tick: number;
  seed: number;
  /** The room the player is in. */
  room: string;
  /** Where the player is (017): the room, the overworld's ring there (null elsewhere: 3 in Stonefall Hollows, 034), its region (034), and live enemies in the room. */
  area: { room: string; ring: 0 | 1 | 2 | 3 | null; region: number; liveEnemies: number };
  /** The living population is out (017), how many enemies are within a screen of the player, and how many the camera shows. */
  populated: boolean;
  nearPlayer: number;
  onScreen: number;
  /** Every room id. */
  rooms: string[];
  /** Item id to count. */
  inventory: Record<string, number>;
  /** 047: the carried bar (keys 1–5): each slot's item kind or null, and the selected slot. */
  hotbar: { slots: (string | null)[]; selected: number };
  /** 047: the grid inventory's order of kinds. */
  bag: string[];
  tube: {
    fireCooldown: number;
    /** Ticks before the next punch can happen (023). */
    meleeCooldown: number;
    firing: boolean;
    /** This tick's shot was a volley from the intake's entrances (024). */
    fromReservoir: boolean;
    /** Projectiles this tick's shot fired (a volley of several rounds fires several). */
    shotCount: number;
    /** What the next fire press (left click) does (023, 024, 047): a volley, a carried round before attuning (047.9), or a punch. */
    next: NextPress['kind'];
  };
  /** The bottom HUD (025): what the tube slot shows, which is what the next fire press does. */
  hud: { active: HudActive };
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
  /** 040.2: rounds ever carried, in the order first carried. */
  carried: string[];
  /** How many of each item machines have made (027). */
  machineMade: Record<string, number>;
  /** Pieces the player can place, in build bar order. */
  unlocked: string[];
  /** Stage machines unlocked by hand-applying them at the bench (029), in stage order. */
  stagesUnlocked: string[];
  building: boolean;
  foundry: { pieces: PieceSummary[] };
  /** Enemy projectiles in flight, x, y the ground point: Wisp orbs (009) and Sniper bolts (035), by the kind that shot them. */
  orbs: { id: number; enemyId: string; room: string; x: number; y: number; dx: number; dy: number }[];
  /** Claimed room ids. */
  claims: string[];
  /** Landmarks seen at least once (032), in the order found. */
  discovered: string[];
  /** Every landmark (032): found yet, its pylon claimed, its cache opened (false where it has none). */
  landmarks: { id: string; discovered: boolean; claimed: boolean; opened: boolean }[];
  /** A cache being opened (032): its landmark and ticks into the hold. */
  cacheHold: { id: string; progress: number } | null;
  /** The claim hold in progress: its room and ticks into it. */
  claimHold: { site: string; progress: number } | null;
  /** Ticks left on a pylon's activation. */
  activatePulse: number;
  /** The foundry's fixed furniture: id, kind, tile, and a port's raw waiting to go out. */
  fixtures: { id: string; kind: string; tx: number; ty: number; item: string | null }[];
  /** What the stash holds. */
  stash: Record<string, number>;
  /** Identified gear (036); unidentified pieces are carried as the `unidentified-armor` item. */
  gear: GearPiece[];
  /** The worn piece's id in each slot, or null (036). */
  equipped: Record<GearSlot, number | null>;
  /** What the worn gear makes of the player (036): `playerStats`. */
  stats: PlayerStats;
  /** The relics' states (036): the Wardstone's quiet ticks and whether it's ready, and whether Last Ember is spent this trip. */
  relics: { wardTicks: number; wardReady: boolean; emberSpent: boolean };
  firstHuskDropped: boolean;
  /** The tutorial (012): the tube in hand, gates open, the first line full, the current goal, the end. */
  hasTube: boolean;
  /** The gates (012), and Stonefall Hollows' barrier (034). */
  gates: { foundry: boolean; shrine: boolean; hollows: boolean };
  /** 046: the foundry's lines ran dry once (the refill goal shows), and what's been refilled by hand since. */
  lineRanDry: boolean;
  refilled: string[];
  firstLineFull: boolean;
  /** The objective line (028): the first unfinished goal's index and text, or the frontier goal with no index once all are done. */
  objective: { index: number | null; text: string };
  prototypeComplete: boolean;
  /**
   * The foundry intake (019, 024): each entrance's mouth tile, whether it's open, the ammo it holds and how many;
   * and the volley the reservoirs fire once no round of the selected ammo is carried, as ammo ids (one per fed entrance, west to east),
   * with each one's lane beside it, degrees off the aim (048).
   */
  intake: { entrances: { tx: number; ty: number; open: boolean; ammo: string | null; count: number; cap: number; cooldown: number }[]; volley: string[]; lanes: number[] };
  /** The supply ports standing (028): each one's raw, tile, pylon count, raws a minute, and whether a refused raw waits in it. */
  ports: { id: string; raw: string; tx: number; ty: number; pylons: number; perMinute: number; waiting: boolean }[];
  /** What a death keeps: the inventory as last banked. */
  banked: Record<string, number>;
  /** Carried items a death would take (031): only those with at least one at risk. */
  atRisk: Record<string, number>;
  /** Research (033): each node's state and whether it's ready, the entrance cap and machine speed now, and the schematics carried and banked. */
  research: ResearchSummary;
  /** What happened on the last tick. */
  events: SimEvents;
}

export function summarize(state: SimState): SimSummary {
  const { player: p, tube } = state;
  const volley = volleyRounds(state);
  return {
    tick: state.tick,
    seed: state.seed,
    room: state.roomId,
    area: {
      room: state.roomId,
      ring: state.roomId === OVERWORLD.id ? ringOf(Math.floor(state.player.x / TILE_SIZE), Math.floor(state.player.y / TILE_SIZE)) : null,
      region: regionOf(state.roomId, state.player),
      liveEnemies: state.enemies.filter((e) => e.roomId === state.roomId).length,
    },
    populated: state.populated,
    nearPlayer: enemiesNearPlayer(state),
    onScreen: enemiesOnScreen(state),
    rooms: Object.keys(WORLD),
    ...playerSummary(state),
    inventory: { ...state.inventory },
    hotbar: { slots: [...state.hotbar.slots], selected: state.hotbar.selected },
    bag: [...state.bag],
    tube: {
      fireCooldown: tube.fireCooldown,
      meleeCooldown: tube.meleeCooldown,
      firing: tube.firing,
      fromReservoir: tube.fromReservoir,
      shotCount: tube.shotCount,
      next: nextPress(state).kind,
    },
    hud: { active: hudActive(state) },
    link: {
      attuned: state.link.attuned,
      attunePulse: state.link.attunePulse,
    },
    arrows: state.arrows.map(arrowSummary),
    enemies: state.enemies.map((e) => enemySummary(state, e)),
    groundItems: state.groundItems.map((g) => ({ id: g.id, itemId: g.itemId, room: g.roomId, x: round(g.x), y: round(g.y) })),
    nodes: state.nodes.map(nodeSummary),
    harvest: state.harvest ? { ...state.harvest } : null,
    bombs: state.bombs.map(bombSummary),
    crafted: [...state.crafted],
    carried: [...state.carried],
    machineMade: { ...state.machineMade },
    unlocked: unlockedPieces(state),
    stagesUnlocked: stagesUnlocked(state),
    building: state.building,
    foundry: { pieces: state.foundry.pieces.map((p) => pieceSummary(p)) },
    intake: {
      entrances: INTAKE.entrances.map((t, i) => {
        const e = state.link.entrances[i];
        return { tx: t.tx, ty: t.ty, open: e?.open ?? false, ammo: e?.ammoId ?? null, count: e?.count ?? 0, cap: entranceCap(state), cooldown: e?.cooldown ?? 0 };
      }),
      volley: volley.map((r) => r.ammoId),
      lanes: volley.map((r) => r.lane),
    },
    orbs: state.orbs.map((o) => ({ id: o.id, enemyId: o.enemyId, room: o.roomId, x: round(o.x), y: round(o.y), dx: round(o.dx), dy: round(o.dy) })),
    claims: [...state.claims],
    discovered: [...state.discovered],
    landmarks: LANDMARK_LIST.map((l) => ({
      id: l.id,
      discovered: state.discovered.includes(l.id),
      claimed: l.pylon !== undefined && state.claims.includes(l.pylon.site),
      opened: isOpened(state, l.id),
    })),
    cacheHold: state.cacheHold ? { ...state.cacheHold } : null,
    claimHold: state.claimHold ? { site: state.claimHold.site, progress: state.claimHold.progress } : null,
    activatePulse: state.activatePulse,
    fixtures: state.fixtures.map((f) => {
      const d = fixtureDef(f.id);
      return { id: f.id, kind: d.kind, tx: d.tx, ty: d.ty, item: f.item };
    }),
    ports: portSummary(state),
    stash: { ...state.stash },
    gear: structuredClone(state.gear),
    equipped: { ...state.equipped },
    stats: playerStats(state),
    relics: { wardTicks: p.wardTicks, wardReady: wardReady(state), emberSpent: p.emberSpent },
    firstHuskDropped: state.firstHuskDropped,
    banked: { ...state.banked },
    atRisk: atRiskCounts(state),
    hasTube: state.hasTube,
    gates: { ...state.gates },
    firstLineFull: state.firstLineFull,
    lineRanDry: state.lineRanDry,
    refilled: [...state.refilled],
    objective: objectiveLine(state),
    prototypeComplete: state.prototypeComplete,
    research: researchSummary(state),
    ...hollowsSummary(state),
    ...levelingSummary(state),
    ...minesSummary(state),
    ...sandboxSummary(state),
    events: structuredClone(state.events),
  };
}
