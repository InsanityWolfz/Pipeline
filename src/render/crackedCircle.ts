import type { GameObjects } from 'phaser';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { colorOf } from './color';

// The cracked red circle something rises through (034's altar summon; 041's Bulwark adds,
// smaller), lying flat on the ground (half as tall): its ring opens over the first half of
// `progress` (0..1), and its cracks run out from the middle to reach the ring by the end.

export function drawCrackedCircle(g: GameObjects.Graphics, x: number, y: number, radius: number, progress: number): void {
  const S = HOLLOWS_LOOK.summon;
  const color = colorOf(S.color);
  const ring = Math.min(1, progress * 2);
  g.lineStyle(S.ringWidth, color, S.alpha).strokeEllipse(x, y, radius * 2 * ring, radius * ring);
  for (let i = 0; i < S.cracks; i++) {
    const a = (i / S.cracks) * Math.PI * 2 + S.crackStart;
    const r = radius * progress;
    g.lineStyle(S.crackWidth, color, S.alpha).lineBetween(x, y, x + Math.cos(a) * r, y + (Math.sin(a) * r) / 2);
  }
}
