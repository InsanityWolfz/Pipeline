import type { GameObjects } from 'phaser';
import type { EnemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import { drawLane } from './hollowsTelegraphs';
import { drawGrowingCircle } from './emberTelegraphs';
import { drawArc } from './telegraphs';
import { ENEMY_FX } from '../data/assets';

// The Stormcrown enemies' telegraphs (065), all in the shared enemy red: a thunderhawk's dive line, the Charger's lane
// (035) from where it hovers through the player's feet; a static mite's pulse growing under it; a gale ram's cone. Returns whether the enemy was one of theirs.

export function drawStormTelegraph(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): boolean {
  if (def.kind === 'hawk') {
    if (e.mode === 'windup') drawLane(g, e, def.dive.distance, def.dive.width, Math.min(1, e.modeTicks / def.dive.windupTicks));
    return true;
  }
  // A static mite's pulse, a circle growing under it as the mote's swell does (061).
  if (def.kind === 'mite') {
    if (e.mode === 'windup') drawGrowingCircle(g, e.x, e.y, def.zap.radius, Math.min(1, e.modeTicks / def.zap.windupTicks));
    return true;
  }
  // A gale ram's cone, in the Husk's swipe style (004).
  if (def.kind === 'ram') {
    if (e.mode === 'windup') drawArc(g, e.x, e.y, Math.atan2(e.swipeDirY, e.swipeDirX), def.gust.arcDegrees, def.gust.reach, Math.min(1, e.modeTicks / def.gust.windupTicks), ENEMY_FX.telegraphAlpha, ENEMY_FX.telegraphFillAlpha);
    return true;
  }
  return false;
}
