import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { LIGHTNING_LOOK } from '../data/stormcrownAssets';
import type { SimEvents } from '../sim/events';
import { colorOf } from './color';

// Lightning arcs (064): each arc event drawn as a jagged cyan-white bolt from one enemy to the next, at body height, in
// a wide violet glow under a thin bright core, its joints jumping as it flickers; it holds a moment, then fades. Drawn
// over the world, in one graphics, in the room it happened in.

const L = LIGHTNING_LOOK;

interface Bolt {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  age: number;
  seed: number;
}

/** A small stable hash: the bolt's joints for one flicker. */
const hash = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

export class ArcView {
  private readonly g: GameObjects.Graphics;
  private bolts: Bolt[] = [];
  private shownCount = 0;

  constructor(scene: Scene) {
    this.g = scene.add.graphics().setDepth(DEPTHS.motes).setBlendMode(BlendModes.ADD);
  }

  /** How many arcs are on screen, for `ui().lightningArcs`. */
  get shown(): number {
    return this.shownCount;
  }

  /** `events` are the ticks' since the last draw (only the shown room's arcs reach it); `deltaMs` the frame's time. */
  update(events: SimEvents, here: boolean, deltaMs: number): void {
    if (here) for (const a of events.arcs) this.bolts.push({ x0: a.fromX, y0: a.fromY - L.lift, x1: a.toX, y1: a.toY - L.lift, age: 0, seed: a.from * 7919 + a.to });
    // 065: a killed static mite's discharge, a bolt to each mite it hit, low (mites are small).
    if (here) for (const d of events.discharges) for (const h of d.hit) this.bolts.push({ x0: d.x, y0: d.y - L.miteLift, x1: h.x, y1: h.y - L.miteLift, age: 0, seed: d.id * 7919 + h.id });
    for (const b of this.bolts) b.age += deltaMs;
    this.bolts = this.bolts.filter((b) => b.age < L.ms);
    this.shownCount = this.bolts.length;
    this.g.clear();
    for (const b of this.bolts) {
      const alpha = 1 - b.age / L.ms;
      const pts = this.joints(b);
      this.stroke(pts, L.width, L.glow, 0.6 * alpha);
      this.stroke(pts, L.width * 0.55, L.color, 0.9 * alpha);
      this.stroke(pts, L.core, L.coreColor, alpha);
    }
  }

  /** One pass of the bolt along its joints. */
  private stroke(pts: readonly { x: number; y: number }[], width: number, color: string, alpha: number): void {
    const [first, ...rest] = pts;
    if (!first) return;
    this.g.lineStyle(width, colorOf(color), alpha).beginPath().moveTo(first.x, first.y);
    for (const p of rest) this.g.lineTo(p.x, p.y);
    this.g.strokePath();
  }

  /** The bolt's joints this flicker: the line split in `segments`, each inner joint knocked off it across the bolt. */
  private joints(b: Bolt): { x: number; y: number }[] {
    const dx = b.x1 - b.x0;
    const dy = b.y1 - b.y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const flick = Math.floor(b.age / L.flickerMs);
    return Array.from({ length: L.segments + 1 }, (_, i) => {
      const k = i / L.segments;
      const off = i === 0 || i === L.segments ? 0 : ((hash(b.seed * 31 + flick * 101 + i) % 1000) / 1000 - 0.5) * 2 * L.jitter;
      return { x: b.x0 + dx * k + nx * off, y: b.y0 + dy * k + ny * off };
    });
  }
}
