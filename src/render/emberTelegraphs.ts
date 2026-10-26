import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { EMBER_ENEMY_LOOK } from '../data/emberworksEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// The Emberworks enemies' telegraphs (061), all in the shared enemy red: a cinder mote's burst circle growing under it
// as it swells. Returns whether the enemy was one of theirs.

export function drawEmberTelegraph(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): boolean {
  if (def.kind === 'mote') {
    if (e.mode === 'windup') drawGrowingCircle(g, e.x, e.y, def.swell.radius, Math.min(1, e.modeTicks / def.swell.windupTicks));
    return true;
  }
  return false;
}

/** A circle's whole area faint, a disc growing to it with `progress`, and its rim. */
export function drawGrowingCircle(g: GameObjects.Graphics, x: number, y: number, radius: number, progress: number): void {
  const S = EMBER_ENEMY_LOOK.swell;
  const color = colorOf(ENEMY_FX.telegraphColor);
  g.fillStyle(color, S.alpha).fillCircle(x, y, radius);
  g.fillStyle(color, S.fillAlpha).fillCircle(x, y, radius * progress);
  g.lineStyle(S.edgeWidth, color, S.edgeAlpha).strokeCircle(x, y, radius);
}
