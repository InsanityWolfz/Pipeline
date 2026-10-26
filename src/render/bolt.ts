import type { GameObjects } from 'phaser';
import { colorOf } from './color';

// A jagged bolt of lightning (064) for the Conductor's lash, rod chain and strikes: a line split every `step` px, each
// inner joint knocked up to `jag` px off it, the same for one `seed` (a new seed each flicker).

export interface BoltPoint {
  x: number;
  y: number;
}

/** A small stable hash: a joint's offset for one flicker. */
const hash = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

/** The bolt's joints from (x0, y0) to (x1, y1). */
export function boltPoints(x0: number, y0: number, x1: number, y1: number, step: number, jag: number, seed: number): BoltPoint[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const n = Math.max(1, Math.round(len / step));
  const nx = -dy / len;
  const ny = dx / len;
  return Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n;
    const off = i === 0 || i === n ? 0 : ((hash(seed * 31 + i) % 1000) / 1000 - 0.5) * 2 * jag;
    return { x: x0 + dx * k + nx * off, y: y0 + dy * k + ny * off };
  });
}

/** One pass of a bolt along its joints. */
export function strokeBolt(g: GameObjects.Graphics, pts: readonly BoltPoint[], width: number, color: string, alpha: number): void {
  const [first, ...rest] = pts;
  if (!first) return;
  g.lineStyle(width, colorOf(color), alpha).beginPath().moveTo(first.x, first.y);
  for (const p of rest) g.lineTo(p.x, p.y);
  g.strokePath();
}

/** A bolt in three passes: a wide glow, the bolt, a thin bright core. */
export function drawBolt(g: GameObjects.Graphics, pts: readonly BoltPoint[], look: { glow: string; bolt: string; core: string; width: number; glowWidth: number }, alpha: number): void {
  strokeBolt(g, pts, look.glowWidth, look.glow, 0.5 * alpha);
  strokeBolt(g, pts, look.width * 1.6, look.bolt, 0.9 * alpha);
  strokeBolt(g, pts, look.width * 0.6, look.core, alpha);
}
