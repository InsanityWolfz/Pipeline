import { OUTLINE_WIDTH } from '../../data/art/style';
import type { Shape } from '../../data/art/types';
import { WORLD_ART_SPRITES } from '../../data/art/worldArt';
import type { Room } from '../../data/rooms';
import { drawShapes } from '../vector/draw';
import { scatterAt } from './decorPlace';

// 077: ground scatter (pebbles, litter, chips, slag drips, slate shards…) painted into a chunk's ground texture when
// it's baked, like 074's patches and cracks: flat and still, so it costs nothing per frame. Its shapes are the
// scatter sprites' (src/data/art/decor*.ts), drawn at each mark's place.

const SHAPES = new Map<string, readonly Shape[]>(WORLD_ART_SPRITES.filter((s) => s.key.startsWith('scatter-')).map((s) => [s.key, s.frames[0] ?? []]));

/** Paints the scatter of tiles tx0..tx1 × ty0..ty1 (a chunk and the margin round it) onto a canvas in world px. */
export function paintScatter(c: CanvasRenderingContext2D, room: Room, tx0: number, ty0: number, tx1: number, ty1: number, pxPerUnit: number): void {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const m = scatterAt(room, tx, ty);
      const shapes = m && SHAPES.get(m.frame);
      if (!m || !shapes) continue;
      c.save();
      c.translate(m.x, m.y);
      if (m.flip) c.scale(-1, 1);
      drawShapes(c, shapes, { outline: OUTLINE_WIDTH, blurScale: pxPerUnit });
      c.restore();
    }
  }
}
