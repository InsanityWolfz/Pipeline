import type { GameObjects } from 'phaser';
import { EMBER_ENEMY_LOOK } from '../data/emberworksEnemyAssets';
import { FORGE_LOOK } from '../data/forgewrightAssets';
import type { FloodPool } from '../sim/floodPools';
import { colorOf } from './color';

// The round ground hazards (061): a cinder mote's pool (a circle) and a bellows hound's burning trail (a capsule),
// drawn as 060's flood pools are, smaller: a flickering molten sheet in FORGE_LOOK.pools' colours, a bright edge, and
// tongues of flame round it, fading over their last ticks. ForgewrightView draws them beside its rect flood pools.

const P = FORGE_LOOK.pools;
const H = EMBER_ENEMY_LOOK.hazard;

/** One round pool, at scene time `now`. */
export function drawHazard(g: GameObjects.Graphics, p: FloodPool, now: number): void {
  const flicker = (Math.sin((now / P.flickerMs) * Math.PI * 2) + 1) / 2;
  const fade = Math.min(1, p.ticks / H.fadeTicks);
  const alpha = (P.alpha[0] + (P.alpha[1] - P.alpha[0]) * flicker) * fade;
  const dx = p.x1 - p.x0;
  const dy = p.y1 - p.y0;
  const len = Math.hypot(dx, dy);
  const [nx, ny] = len > 0 ? [(-dy / len) * p.r, (dx / len) * p.r] : [0, 0];
  const body = (): void => {
    g.fillCircle(p.x0, p.y0, p.r);
    if (len <= 0) return;
    g.fillCircle(p.x1, p.y1, p.r);
    g.beginPath();
    g.moveTo(p.x0 + nx, p.y0 + ny);
    g.lineTo(p.x1 + nx, p.y1 + ny);
    g.lineTo(p.x1 - nx, p.y1 - ny);
    g.lineTo(p.x0 - nx, p.y0 - ny);
    g.closePath();
    g.fillPath();
  };
  g.fillStyle(colorOf(P.color), alpha);
  body();
  g.lineStyle(H.edgeWidth, colorOf(P.bright), 0.9 * fade);
  if (len <= 0) g.strokeCircle(p.x0, p.y0, p.r);
  else {
    g.lineBetween(p.x0 + nx, p.y0 + ny, p.x1 + nx, p.y1 + ny);
    g.lineBetween(p.x0 - nx, p.y0 - ny, p.x1 - nx, p.y1 - ny);
  }
  // Tongues of flame rising off it, every `tongueEvery` px along it (round a circle's rim), flickering out of step.
  g.fillStyle(colorOf(P.light), 0.7 * fade);
  const spots: { x: number; y: number }[] = [];
  if (len <= 0) {
    const n = Math.max(3, Math.round((2 * Math.PI * p.r) / H.tongueEvery));
    for (let i = 0; i < n; i++) spots.push({ x: p.x0 + Math.cos((i / n) * Math.PI * 2) * p.r * 0.8, y: p.y0 + Math.sin((i / n) * Math.PI * 2) * p.r * 0.8 });
  } else {
    for (let d = 0; d <= len; d += H.tongueEvery) spots.push({ x: p.x0 + (dx / len) * d, y: p.y0 + (dy / len) * d });
  }
  for (const s of spots) {
    const k = (Math.sin(now / P.flickerMs + s.x + s.y) + 1) / 2;
    g.fillTriangle(s.x - H.tongue / 2, s.y, s.x + H.tongue / 2, s.y, s.x, s.y - H.tongue * (1 + k));
  }
}
