import type { GameObjects } from 'phaser';
import { arenaOf } from '../data/arenas';
import { ENEMY_FX } from '../data/assets';
import type { ForgewrightDef } from '../data/enemies';
import { FORGE_LOOK } from '../data/forgewrightAssets';
import type { EnemyState } from '../sim/enemies';
import { floodRect } from '../sim/forgewrightAi';
import { colorOf } from './color';
import { fillAt, rimStyle } from './telegraphLook';

// How the Forgewright reads on screen (060), for EnemyView and telegraphs.ts: its pose for its mode (the slam, the
// spray's draw-back, the flood's raised hammer, the vent's stagger, a rock on its plating as a hit rings off), and its
// telegraphs on the ground, each filling as its wind-up runs: the slam's red circle ahead of it, the spray's cone, and
// the flood's red half of the hall (054's shade) with a hard edge where the pools will stop.

/** Its wind-up's progress, 0..1. */
const progress = (e: EnemyState, ticks: number): number => Math.min(1, e.modeTicks / ticks);

/** Draws its telegraph for the frame. Returns whether the flood's half was shaded (for `ui()`). */
export function drawForgeTelegraph(g: GameObjects.Graphics, e: EnemyState, def: ForgewrightDef): boolean {
  const color = colorOf(ENEMY_FX.telegraphColor);
  if (e.mode === 'windup') {
    const S = FORGE_LOOK.slam;
    const x = e.x + e.swipeDirX * def.slam.reach;
    const y = e.y + e.swipeDirY * def.slam.reach;
    g.fillStyle(color, S.alpha).fillCircle(x, y, def.slam.radius);
    const p = progress(e, def.slam.windupTicks);
    g.fillStyle(color, fillAt(S.fillAlpha, p)).fillCircle(x, y, def.slam.radius * p);
    rimStyle(g).strokeCircle(x, y, def.slam.radius);
    return false;
  }
  if (e.mode === 'spray-windup') {
    const S = FORGE_LOOK.spray;
    const angle = Math.atan2(e.swipeDirY, e.swipeDirX);
    const half = (def.spray.coneDegrees * Math.PI) / 360;
    g.fillStyle(color, S.alpha);
    g.slice(e.x, e.y, S.length, angle - half, angle + half, false);
    g.fillPath();
    const p = progress(e, def.spray.windupTicks);
    g.fillStyle(color, fillAt(S.fillAlpha, p));
    g.slice(e.x, e.y, S.length * p, angle - half, angle + half, false);
    g.fillPath();
    rimStyle(g);
    g.slice(e.x, e.y, S.length, angle - half, angle + half, false);
    g.strokePath();
    return false;
  }
  const arena = arenaOf(e.enemyId);
  if (e.mode !== 'flood-windup' || !arena) return false;
  const F = FORGE_LOOK.flood;
  const r = floodRect(arena, e.floodSide);
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  g.fillStyle(color, F.shadeAlpha).fillRect(r.x0, r.y0, w, h);
  // The fill climbs from the half's south edge to its north as the hammer goes up.
  const k = progress(e, def.flood.windupTicks);
  g.fillStyle(color, fillAt(F.fillAlpha, k)).fillRect(r.x0, r.y1 - h * k, w, h * k);
  rimStyle(g).strokeRect(r.x0, r.y0, w, h);
  return true;
}
