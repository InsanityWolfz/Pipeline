import { BOSS_LOOK } from '../data/arenaAssets';
import { arenaOf } from '../data/arenas';
import { VIEW_HEIGHT } from '../data/config';
import { FORGE_LOOK } from '../data/forgewrightAssets';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { FEET_BOX } from '../data/player';
import { engaged } from '../sim/bulwarkAi';
import { forgeDefOf } from '../sim/forgewrightParts';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';

// fix-playtest-ui: the boss bar (034) along the top, and the camera's nudge that keeps a fighting boss from standing
// under it, pure so tests can check the layout.

const B = HOLLOWS_LOOK.bossBar;

/** The region boss fighting the player in their room (its bar shows), or undefined. */
export function engagedBoss(sim: SimState): EnemyState | undefined {
  return sim.enemies.find((e) => e.roomId === sim.roomId && arenaOf(e.enemyId) !== undefined && engaged(e));
}

/** The boss bar's bottom edge, view px: its frame's, or the heat gauge's under it (060: the Forgewright's). */
export function bossBarBottom(heat: boolean): number {
  const bar = B.top + B.h + B.border * 2;
  return heat ? bar + FORGE_LOOK.heat.gap + FORGE_LOOK.heat.h + B.border : bar;
}

/**
 * How far up the camera's centre sits from the player's feet, view px (0 or more), so a boss `dy` px below the player
 * (negative: north of them) shows its top `clear` px under the bar; no more than `max`, and none for a boss lower down.
 */
export function bossLookShift(enemyId: string, dy: number, heat: boolean): number {
  const L = BOSS_LOOK;
  const top = VIEW_HEIGHT / 2 + dy - (L.heights[enemyId] ?? L.height);
  return Math.min(L.max, Math.max(0, bossBarBottom(heat) + L.clear - top));
}

/** The shift for this frame: the fighting boss's, or 0 with none. */
export function bossLookTarget(sim: SimState): number {
  const boss = engagedBoss(sim);
  // From the point the camera follows: the player's sprite, whose origin is the bottom of the feet box.
  return boss ? bossLookShift(boss.enemyId, boss.y - (sim.player.y + FEET_BOX.h / 2), forgeDefOf(boss) !== null) : 0;
}
