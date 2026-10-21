import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TUNNEL_LOOK } from '../data/foundryAssets';
import { facingVector } from '../sim/direction';
import type { FoundryState } from '../sim/pieces';
import { colorOf } from './color';
import { tunnelMarks, type MarkInput, type TunnelMark } from './tunnelMarks';

// The underground pair's tunnels on the floor (052): two lines along each tile a tunnel
// passes under, bright for a pair's tunnel (hovered, or the ghost that would pair) and
// faint for an entrance's reach while placing, which ends in a tick across its farthest
// tile. Over the pieces, so what stands between never hides it. Marks: tunnelMarks.ts.
export class TunnelView {
  private readonly g: GameObjects.Graphics;
  /** The marks drawn now, for the test hook. */
  marks: TunnelMark[] = [];

  constructor(scene: Scene) {
    this.g = scene.add.graphics().setDepth(DEPTHS.worldUi - 2);
  }

  /** Redraws the marks, or none when the foundry isn't on show. */
  update(foundry: FoundryState, shown: boolean, input: MarkInput): void {
    this.marks = shown ? tunnelMarks(foundry, input) : [];
    const L = TUNNEL_LOOK;
    this.g.clear();
    for (const m of this.marks) {
      const alpha = m.kind === 'tunnel' ? L.alpha : L.reachAlpha;
      this.g.lineStyle(L.width + 2, colorOf(L.glow), alpha * L.glowAlpha);
      this.drawLines(m);
      this.g.lineStyle(L.width, colorOf(L.color), alpha);
      this.drawLines(m);
    }
  }

  /** Two lines along each tile, `inset` in from its sides; a reach's farthest tile gets a tick across its far edge. */
  private drawLines(m: TunnelMark): void {
    const { inset, tick } = TUNNEL_LOOK;
    const across = m.facing === 'left' || m.facing === 'right';
    for (const t of m.tiles) {
      const x = t.tx * TILE_SIZE;
      const y = t.ty * TILE_SIZE;
      if (across) {
        this.g.lineBetween(x, y + inset, x + TILE_SIZE, y + inset);
        this.g.lineBetween(x, y + TILE_SIZE - inset, x + TILE_SIZE, y + TILE_SIZE - inset);
      } else {
        this.g.lineBetween(x + inset, y, x + inset, y + TILE_SIZE);
        this.g.lineBetween(x + TILE_SIZE - inset, y, x + TILE_SIZE - inset, y + TILE_SIZE);
      }
    }
    const last = m.tiles[m.tiles.length - 1];
    if (m.kind !== 'reach' || !last) return;
    const [dx, dy] = facingVector(m.facing);
    // The far edge's middle, and a tick across it.
    const ex = (last.tx + 0.5 + dx / 2) * TILE_SIZE;
    const ey = (last.ty + 0.5 + dy / 2) * TILE_SIZE;
    if (across) this.g.lineBetween(ex, ey - tick, ex, ey + tick);
    else this.g.lineBetween(ex - tick, ey, ex + tick, ey);
  }
}
