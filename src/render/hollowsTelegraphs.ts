import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { HOLLOWS_ENEMY_LOOK } from '../data/hollowsEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';
import { drawArc } from './telegraphs';

// Region 2's four's telegraphs (035), all in the shared enemy red: the Charger's lane from
// its feet, filling down it as it paws; the Burrower's cracked ring growing at its locked
// spot; the Shardback's bash arc along its shield, turning with it. Returns whether the
// enemy was one of theirs.

export function drawHollowsTelegraph(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): boolean {
  if (def.kind === 'charger') {
    if (e.mode === 'windup') drawLane(g, e, def.charge.distance, def.charge.width, Math.min(1, e.modeTicks / def.charge.windupTicks));
    return true;
  }
  if (def.kind === 'burrower') {
    if (e.mode === 'windup') drawRing(g, e.spotX, e.spotY, def.burrow.radius, Math.min(1, e.modeTicks / def.burrow.windupTicks));
    return true;
  }
  if (def.kind === 'shardback') {
    const B = HOLLOWS_ENEMY_LOOK.bash;
    if (e.mode === 'windup') drawArc(g, e.x, e.y, e.angle, def.bash.arcDegrees, def.bash.reach, Math.min(1, e.modeTicks / def.bash.windupTicks), B.alpha, B.fillAlpha);
    return true;
  }
  return false;
}

/** The ring: the full circle faint, a disc and a cracked rim growing to it, cracks running out from the middle. */
function drawRing(g: GameObjects.Graphics, x: number, y: number, radius: number, progress: number): void {
  const R = HOLLOWS_ENEMY_LOOK.ring;
  const color = colorOf(ENEMY_FX.telegraphColor);
  const r = radius * progress;
  g.fillStyle(color, R.alpha).fillCircle(x, y, radius);
  g.fillStyle(color, R.fillAlpha).fillCircle(x, y, r);
  g.lineStyle(R.width, color, R.crackAlpha).strokeCircle(x, y, r);
  g.lineStyle(R.crackWidth, color, R.crackAlpha);
  for (let i = 0; i < R.cracks; i++) {
    const a = R.crackStart + (i * Math.PI * 2) / R.cracks;
    // Each crack jags once halfway out.
    const mid = a + (i % 2 === 0 ? 0.25 : -0.25);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(mid) * r * 0.5, y + Math.sin(mid) * r * 0.5);
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    g.strokePath();
  }
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
