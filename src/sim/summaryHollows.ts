import { arenaOf } from '../data/hollows';
import { OVERWORLD_ROOM } from '../data/overworld';
import { WORLD } from './world';
import { defOf } from './champions';
import { altarState, type AltarState } from './altar';
import { engaged } from './bulwarkAi';
import { fuseProgress } from './enemyBombs';
import type { EnemyMode } from './enemies';
import type { SimState } from './state';
import { round } from './summaryParts';
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
  }[];
  /** Enemy bombs on the ground: where, their ring's radius, the fuse burnt and its length, and how far the inner circle has grown (0..1). */
  enemyBombs: { id: number; room: string; x: number; y: number; from: { x: number; y: number }; radius: number; fuse: number; fuseTicks: number; progress: number }[];
  /** Region bosses killed at least once, in order. */
  bossDefeats: string[];
  /** Each altar: its boss, its state, and the ticks a summon has run (0 when none is). */
  altars: { id: string; boss: string; state: AltarState; summonTicks: number }[];
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
      })),
    enemyBombs: state.enemyBombs.map((b) => ({ id: b.id, room: b.roomId, x: round(b.x), y: round(b.y), from: { x: round(b.fromX), y: round(b.fromY) }, radius: b.radius, fuse: b.fuse, fuseTicks: b.fuseTicks, progress: round(fuseProgress(b)) })),
    bossDefeats: [...state.bossDefeats],
    altars: (WORLD[OVERWORLD_ROOM]?.altars ?? []).map((a) => ({ id: a.id, boss: a.boss, state: altarState(state, a.id), summonTicks: state.summoning?.altar === a.id ? state.summoning.ticks : 0 })),
  };
}
