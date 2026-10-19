import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { HOLLOWS_ENEMY_LOOK } from '../data/hollowsEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// Region 2's four's telegraphs (035), all in the shared enemy red: the Charger's lane from
// its feet, filling down it as it paws. Returns whether the enemy was one of theirs.

export function drawHollowsTelegraph(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): boolean {
  if (def.kind === 'charger') {
    if (e.mode === 'windup') drawLane(g, e, def.charge.distance, def.charge.width, Math.min(1, e.modeTicks / def.charge.windupTicks));
    return true;
  }
  return false;
}

/** The lane: a band `width` wide from its start `length` along its locked direction, faint, its fill running out to `progress`, edged. */
function drawLane(g: GameObjects.Graphics, e: EnemyState, length: number, width: number, progress: number): void {
  const L = HOLLOWS_ENEMY_LOOK.lane;
  const color = colorOf(ENEMY_FX.telegraphColor);
  const band = (len: number) => {
    const nx = -e.swipeDirY * (width / 2);
    const ny = e.swipeDirX * (width / 2);
    const ex = e.spotX + e.swipeDirX * len;
    const ey = e.spotY + e.swipeDirY * len;
    return [
      { x: e.spotX + nx, y: e.spotY + ny },
      { x: ex + nx, y: ey + ny },
      { x: ex - nx, y: ey - ny },
      { x: e.spotX - nx, y: e.spotY - ny },
    ];
  };
  trace(g.fillStyle(color, L.alpha), band(length)).fillPath();
  trace(g.fillStyle(color, L.fillAlpha), band(length * progress)).fillPath();
  trace(g.lineStyle(L.edgeWidth, color, L.edgeAlpha), band(length)).strokePath();
}

/** Traces a closed polygon as the graphics' current path. */
function trace(g: GameObjects.Graphics, pts: readonly { x: number; y: number }[]): GameObjects.Graphics {
  g.beginPath();
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  g.closePath();
  return g;
}
