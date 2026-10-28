import { LEY_FLOW } from '../../data/ambient';
import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { OVERWORLD } from '../../data/overworld';
import type { Quality } from '../../data/settings';

// 077: beads of light running along every ley line toward its last point, the way hauls run home (053): a line home
// ends on the foundry's ruin, a vein seam on its pylon. Each line's segments get a box once, bucketed by ground chunk,
// so a frame looks only at the segments in view. A bead's place is a pure function of the clock: no state.

const T = TILE_SIZE;
const C = GROUND.chunk;

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Where along its line it starts, px, and its length. */
  s0: number;
  len: number;
}

/** A bead now: where, and its heading (radians, along the line toward its end). */
export interface Bead {
  x: number;
  y: number;
  angle: number;
}

type View = { x: number; y: number; width: number; height: number };

let buckets: Map<string, Segment[]> | null = null;

/** Every ley line's segments, bucketed by the chunks their box touches (once). */
function segmentBuckets(): Map<string, Segment[]> {
  if (buckets) return buckets;
  const map = new Map<string, Segment[]>();
  for (const line of Object.values(OVERWORLD.leyLines)) {
    let s = 0;
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      if (!a || !b) continue;
      const seg = { x0: (a.tx + 0.5) * T, y0: (a.ty + 0.5) * T, x1: (b.tx + 0.5) * T, y1: (b.ty + 0.5) * T, s0: s, len: 0 };
      seg.len = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0);
      s += seg.len;
      if (seg.len === 0) continue;
      for (let cy = Math.floor(Math.min(seg.y0, seg.y1) / C); cy <= Math.floor(Math.max(seg.y0, seg.y1) / C); cy++) {
        for (let cx = Math.floor(Math.min(seg.x0, seg.x1) / C); cx <= Math.floor(Math.max(seg.x0, seg.x1) / C); cx++) {
          const k = `${cx},${cy}`;
          map.set(k, [...(map.get(k) ?? []), seg]);
        }
      }
    }
  }
  return (buckets = map);
}

/** The beads in view at `timeMs` on a tier: one every LEY_FLOW.every tiles, at most LEY_FLOW.max, nearest the view's middle kept. */
export function beadsInView(v: View, timeMs: number, quality: Quality): Bead[] {
  const every = LEY_FLOW.every[quality];
  const max = LEY_FLOW.max[quality];
  if (every === 0 || max === 0) return [];
  const spacing = every * T;
  const run = (LEY_FLOW.speed * timeMs) / 1000;
  const seen = new Set<Segment>();
  const out: Bead[] = [];
  const b = segmentBuckets();
  for (let cy = Math.floor(v.y / C); cy <= Math.floor((v.y + v.height) / C); cy++) {
    for (let cx = Math.floor(v.x / C); cx <= Math.floor((v.x + v.width) / C); cx++) {
      for (const seg of b.get(`${cx},${cy}`) ?? []) {
        if (seen.has(seg)) continue;
        seen.add(seg);
        if (Math.max(seg.x0, seg.x1) < v.x || Math.min(seg.x0, seg.x1) > v.x + v.width || Math.max(seg.y0, seg.y1) < v.y || Math.min(seg.y0, seg.y1) > v.y + v.height) continue;
        const angle = Math.atan2(seg.y1 - seg.y0, seg.x1 - seg.x0);
        // The first bead on the segment: beads sit where (s − run) is a whole number of spacings.
        let s = seg.s0 + ((((run - seg.s0) % spacing) + spacing) % spacing);
        for (; s < seg.s0 + seg.len; s += spacing) {
          const k = (s - seg.s0) / seg.len;
          const x = seg.x0 + (seg.x1 - seg.x0) * k;
          const y = seg.y0 + (seg.y1 - seg.y0) * k;
          if (x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height) out.push({ x, y, angle });
        }
      }
    }
  }
  if (out.length <= max) return out;
  const mx = v.x + v.width / 2;
  const my = v.y + v.height / 2;
  return out.sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my)).slice(0, max);
}
