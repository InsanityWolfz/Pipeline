import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { EMBER_ENEMY_LOOK } from '../data/emberworksEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';
import { fillAt, rimStyle } from './telegraphLook';
import { drawLane } from './hollowsTelegraphs';

// The Emberworks enemies' telegraphs (061), all in the shared enemy red: a cinder mote's burst circle growing under it
// as it swells; a bellows hound's lane, the Charger's; a slag golem's slam circle ahead of it. (A whelp's bite is the
// Husk's arc.) Returns whether the enemy was one of theirs.

export function drawEmberTelegraph(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): boolean {
  if (def.kind === 'mote') {
    if (e.mode === 'windup') drawGrowingCircle(g, e.x, e.y, def.swell.radius, Math.min(1, e.modeTicks / def.swell.windupTicks));
    return true;
  }
  if (def.kind === 'golem') {
    if (e.mode === 'windup') drawGrowingCircle(g, e.spotX, e.spotY, def.slam.radius, Math.min(1, e.modeTicks / def.slam.windupTicks));
    return true;
  }
  // The hound's lane is the Charger's (035).
  if (def.kind === 'hound') {
    if (e.mode === 'windup') drawLane(g, e, def.dash.distance, def.dash.width, Math.min(1, e.modeTicks / def.dash.windupTicks));
    return true;
  }
  return false;
}

/** A circle's whole area faint, a disc growing to it with `progress`, and its rim. */
export function drawGrowingCircle(g: GameObjects.Graphics, x: number, y: number, radius: number, progress: number): void {
  const S = EMBER_ENEMY_LOOK.swell;
  const color = colorOf(ENEMY_FX.telegraphColor);
  g.fillStyle(color, S.alpha).fillCircle(x, y, radius);
  g.fillStyle(color, fillAt(S.fillAlpha, progress)).fillCircle(x, y, radius * progress);
  rimStyle(g).strokeCircle(x, y, radius);
}
