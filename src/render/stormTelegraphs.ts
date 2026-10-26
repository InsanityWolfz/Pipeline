import type { GameObjects } from 'phaser';
import type { EnemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import { drawLane } from './hollowsTelegraphs';

// The Stormcrown enemies' telegraphs (065), all in the shared enemy red: a thunderhawk's dive line, the Charger's lane
// (035) from where it hovers through the player's feet. Returns whether the enemy was one of theirs.

export function drawStormTelegraph(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): boolean {
  if (def.kind === 'hawk') {
    if (e.mode === 'windup') drawLane(g, e, def.dive.distance, def.dive.width, Math.min(1, e.modeTicks / def.dive.windupTicks));
    return true;
  }
  return false;
}
