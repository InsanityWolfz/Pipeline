import { arenaOf } from '../data/arenas';
import { OVERWORLD_ROOM } from '../data/overworld';
import { WORLD } from './world';
import { defOf } from './champions';
import { altarState, type AltarState } from './altar';
import { ARENAS } from '../data/arenas';
import { arenaLocked, doorUnlocked, playerInside } from './arenaLock';
import { engaged } from './bulwarkAi';
import { fuseProgress } from './enemyBombs';
import type { EnemyMode } from './enemies';
import type { SimState } from './state';
import { round } from './summaryParts';
import { plated } from './forgewrightParts';
import { degrees } from './summaryKinds';

// Stonefall Hollows' part of `getState()` (034): its bosses, their bombs, the bosses
// defeated and the altars.

export interface HollowsSummary {
  /**
   * Each living region boss: its health, facing angle in degrees (0 east, 90 south), mode, cooldowns and whether it
   * fights; 041: whether it's enraged, its rear-stomp counter and cooldown, and whether its adds have risen this fight.
   */
  bosses: {
    id: number;
    enemyId: string;
    health: number;
    maxHealth: number;
    angle: number;
    mode: EnemyMode;
    modeTicks: number;
    lobCooldown: number;
    poundCooldown: number;
    engaged: boolean;
    enraged: boolean;
    behind: number;
    stompCooldown: number;
    addsRisen: boolean;
    /** 041.16: ticks to its next adds (once the first have risen), its back wave's countdown and wind-up (0: none). */
    addsCooldown: number;
    waveCooldown: number;
    waveTicks: number;
    /** 060: the Forgewright's heat (0..100, to one place), ticks left venting, its plating holding, and each bellows' health and ticks left broken. */
    heat: number;
    vent: number;
    plated: boolean;
    bellows: { health: number; patch: number }[];
  }[];
  /** 060: the Forge Flood's pools: whose, the rect they cover (px), and ticks left. */
  floodPools: { owner: number; room: string; x0: number; y0: number; x1: number; y1: number; ticks: number }[];
  /** Enemy bombs on the ground: where, their ring's radius, the fuse burnt and its length, and how far the inner circle has grown (0..1). */
  enemyBombs: { id: number; room: string; x: number; y: number; from: { x: number; y: number }; radius: number; fuse: number; fuseTicks: number; progress: number; rollProof: boolean }[];
  /** Region bosses killed at least once, in order. */
  bossDefeats: string[];
  /** Each altar: its boss, its state, and the ticks a summon has run (0 when none is). */
  altars: { id: string; boss: string; state: AltarState; summonTicks: number }[];
  /**
   * Each boss arena (043, 055): `locked` while its boss fights (043's seal over the door); `unlocked` once E at its
   * door goes in (its gate is open); `inside` while the player is in it; and its door's tiles.
   */
  arenas: { id: string; locked: boolean; unlocked: boolean; inside: boolean; door: { tx: number; ty: number }[] }[];
}


export function hollowsSummary(state: SimState): HollowsSummary {
  return {
    bosses: state.enemies
      .filter((e) => arenaOf(e.enemyId) !== undefined)
      .map((e) => ({
        id: e.id,
        enemyId: e.enemyId,
        health: e.health,
        maxHealth: defOf(e).maxHealth,
        angle: degrees(e.angle),
        mode: e.mode,
        modeTicks: e.modeTicks,
        lobCooldown: e.lobCooldown,
        poundCooldown: e.cooldown,
        engaged: engaged(e),
        enraged: e.enraged,
        behind: e.behind,
        stompCooldown: e.stompCooldown,
        addsRisen: e.addsRisen,
        addsCooldown: e.addsCooldown,
        waveCooldown: e.waveCooldown,
        waveTicks: e.waveTicks,
        heat: Math.round(e.heat * 10) / 10,
        vent: e.vent,
        plated: plated(e),
        bellows: e.bellows.map((b) => ({ health: b.health, patch: b.patch })),
      })),
    floodPools: state.floodPools.map((p) => ({ owner: p.ownerId, room: p.roomId, x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, ticks: p.ticks })),
    enemyBombs: state.enemyBombs.map((b) => ({ id: b.id, room: b.roomId, x: round(b.x), y: round(b.y), from: { x: round(b.fromX), y: round(b.fromY) }, radius: b.radius, fuse: b.fuse, fuseTicks: b.fuseTicks, progress: round(fuseProgress(b)), rollProof: b.rollProof })),
    bossDefeats: [...state.bossDefeats],
    arenas: ARENAS.map((a) => {
      const room = a.rooms.includes(state.roomId) ? state.roomId : OVERWORLD_ROOM;
      return {
        id: a.id,
        locked: arenaLocked(state, a, room),
        unlocked: doorUnlocked(state, a, room),
        inside: state.roomId === room && playerInside(state, a),
        door: a.door.tiles.map((t) => ({ tx: t.tx, ty: t.ty })),
      };
    }),
    altars: (WORLD[OVERWORLD_ROOM]?.altars ?? []).map((a) => ({ id: a.id, boss: a.boss, state: altarState(state, a.id), summonTicks: state.summoning?.altar === a.id ? state.summoning.ticks : 0 })),
  };
}
