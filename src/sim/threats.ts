import type { EnemyDef } from '../data/enemies';
import { THREAT_WINDUPS, type ThreatMode } from '../data/threats';
import { defOf } from './champions';
import type { EnemyState } from './enemies';
import { viewRect } from './population';
import type { SimState } from './state';

// Off-screen threats (071): the enemies outside the camera's view (render's, or viewRect, 017's "on screen") that are
// winding up an attack on the player, for render's edge arrows and getState(). Derived from state each call, never stored.

/** An off-screen threat: the enemy and where its feet are, px. */
export interface Threat {
  id: number;
  enemyId: string;
  x: number;
  y: number;
}

/** Every mode some kind winds up in, for a cheap first check. */
const WINDUP_MODES: ReadonlySet<string> = new Set(Object.values(THREAT_WINDUPS).flat());

/** True while the enemy is in a wind-up aimed at the player (src/data/threats.ts). */
export function threatening(e: Pick<EnemyState, 'mode'>, def: EnemyDef): boolean {
  const modes = THREAT_WINDUPS[def.kind];
  return modes !== undefined && modes.includes(e.mode as ThreatMode);
}

/** A view, world px: what the camera shows. */
export type ViewBox = ReturnType<typeof viewRect>;

/**
 * The enemies among `enemies` (render passes the room on screen; every enemy by default) in the player's room, feet
 * outside the camera's view, winding up on the player. None while the player is down. The view is the one the camera
 * really shows when render passes it (its easing and a boss fight's lift, fix-playtest-ui), else the settled one the sim
 * knows (`viewRect`, 017's "on screen").
 */
export function offscreenThreats(state: SimState, enemies: readonly EnemyState[] = state.enemies, shown?: ViewBox): Threat[] {
  if (state.player.dying > 0) return [];
  const out: Threat[] = [];
  let view = shown ?? null;
  for (const e of enemies) {
    // The mode first: almost every enemy is in none of these, so the view is worked out only when one is.
    if (!WINDUP_MODES.has(e.mode)) continue;
    if (e.roomId !== state.roomId || !threatening(e, defOf(e))) continue;
    view ??= viewRect(state);
    if (e.x >= view.x0 && e.x <= view.x1 && e.y >= view.y0 && e.y <= view.y1) continue;
    out.push({ id: e.id, enemyId: e.enemyId, x: e.x, y: e.y });
  }
  return out;
}
