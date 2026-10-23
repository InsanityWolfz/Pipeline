import type { GameObjects, Scene } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { WORLD_SHAPE } from '../data/worldShape';
import { colorOf } from './color';

// A ley barrier standing on a circle round the foundry (053.2's Hollows barrier, 060's barrier across the Emberworks'
// ramps): a curtain of cyan light up from arcs of the circle, its top rim bright and its ripples climbing; collapsing,
// it flashes, shards fall and it fades. Drawn in short straight lengths, only those in view, each in a graphics at its
// foot's row so the curtain stands behind what's south of it.

const T = TILE_SIZE;
const B = HOLLOWS_LOOK.barrier;

/** An arc of a circle round the foundry's door: its radius in tiles and its screen angles, radians (0 east, clockwise). */
export interface CurtainArc {
  r: number;
  from: number;
  to: number;
}

/** The circle's centre in world px: the door tile's centre. */
const CX = (WORLD_SHAPE.centre.tx + 0.5) * T;
const CY = (WORLD_SHAPE.centre.ty + 0.5) * T;

/** Fills the upright quad standing `h` px tall on the ground from a to b, in the graphics' current fill. */
function quad(g: GameObjects.Graphics, a: { x: number; y: number }, b: { x: number; y: number }, h: number): void {
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(b.x, b.y - h);
  g.lineTo(a.x, a.y - h);
  g.closePath();
  g.fillPath();
}

/** One barrier's curtain: its graphics, one per row in view, reused frame to frame. */
export class RingCurtain {
  private readonly scene: Scene;
  private readonly pool: GameObjects.Graphics[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** Hides it. */
  clear(): void {
    for (const g of this.pool) g.clear().setVisible(false);
  }

  /** Draws `arcs` at `alpha`, `timeMs` on the shimmer clock, `k` its collapse 0..1 (0: standing). */
  draw(arcs: readonly CurtainArc[], timeMs: number, k: number, alpha: number): void {
    this.clear();
    const v = this.scene.cameras.main.worldView;
    const color = colorOf(B.color);
    const glow = colorOf(B.glow);
    const shimmer = (Math.sin((timeMs / B.shimmerMs) * Math.PI * 2) + 1) / 2;
    const fill = B.fill * alpha * (1 - B.shimmerDip + B.shimmerDip * shimmer);
    const rows = new Map<number, GameObjects.Graphics>();
    let used = 0;
    for (const arc of arcs) {
      const r = arc.r * T;
      const n = Math.max(1, Math.ceil((Math.abs(arc.to - arc.from) * r) / B.segment));
      const at = (i: number) => {
        const a = arc.from + ((arc.to - arc.from) * i) / n;
        return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
      };
      for (let i = 0; i < n; i++) {
        const a = at(i);
        const b = at(i + 1);
        if (Math.max(a.x, b.x) < v.x || Math.min(a.x, b.x) > v.x + v.width || Math.max(a.y, b.y) < v.y || Math.min(a.y, b.y) - B.height > v.y + v.height) continue;
        const row = Math.floor(Math.max(a.y, b.y) / T);
        let g = rows.get(row);
        if (!g) {
          g = this.pool[used] ?? this.scene.add.graphics();
          this.pool[used++] = g;
          g.setVisible(true).setDepth((row + 1) * T);
          rows.set(row, g);
        }
        const fall = k > 0 ? k * k * B.shardFall : 0;
        quad(g.fillStyle(color, fill), a, b, B.height);
        if (k > 0) quad(g.fillStyle(glow, B.flash * Math.max(0, 1 - k * B.flashFade)), a, b, B.height);
        g.lineStyle(B.rimWidth, color, B.rim * alpha).lineBetween(a.x, a.y - B.height, b.x, b.y - B.height);
        for (let j = 0; j < B.ripples; j++) {
          const f = (((timeMs / B.shimmerMs + j / B.ripples + i * B.rippleSkew) % 1) + 1) % 1;
          const h = f * B.height - fall * ((j % 2) + 1);
          g.lineStyle(B.ripple.width, glow, (B.ripple.alpha - B.ripple.fade * f) * alpha).lineBetween(a.x, a.y - h, b.x, b.y - h);
        }
      }
    }
  }
}
