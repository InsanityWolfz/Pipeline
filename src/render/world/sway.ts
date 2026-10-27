import { SWAY } from '../../data/ambient';
import type { SwayKind } from '../../data/decor';

// 077: the sway stepper. Each built chunk keeps its swaying objects (plants, vines, trees, tree nodes, the Colossus's
// ivy) in squares of SWAY.bucket px; each frame only the chunks the camera's view touches are looked at, and only
// their squares in view, and at most `cap` objects are turned (past that, in turns). Chunks out of view are never
// touched: their objects stand as they were left. On Low (cap 0) the objects in view rest at angle 0, set once.
// Rotation changes neither a sprite's frame nor its position, so 070's cover key never changes with it.

/** Anything that turns about its foot (a Phaser Image's setAngle). */
export interface SwayTarget {
  setAngle(degrees: number): unknown;
}

export interface SwayEntry {
  target: SwayTarget;
  /** Its foot, world px. */
  x: number;
  y: number;
  kind: SwayKind;
  /** Its cycle, ms, and its own phase (0..1, from its tile's hash). */
  period: number;
  phase: number;
}

/** The wind where the camera is: its strength (gusts included) and the unit direction it blows toward (screen, x east, y south). */
export interface SwayWind {
  strength: number;
  dx: number;
  dy: number;
}

type View = { x: number; y: number; width: number; height: number };

/** A plant's angle at `timeMs` in a wind, degrees: within amplitude × (1 + SWAY.lean). */
export function swayAngle(e: Pick<SwayEntry, 'x' | 'y' | 'kind' | 'period' | 'phase'>, timeMs: number, wind: SwayWind): number {
  const amp = SWAY.amplitude[e.kind];
  const s = Math.min(1, Math.max(0, wind.strength));
  // A stronger wind turns them faster too (a gale shows in the rate, as the amplitude is capped).
  const rate = 0.6 + 0.4 * Math.min(2.5, wind.strength);
  const along = (e.x * wind.dx + e.y * wind.dy) / SWAY.wave;
  const phi = 2 * Math.PI * ((timeMs * rate) / e.period - along + e.phase * 0.35);
  return amp * s * Math.sin(phi) + SWAY.lean * amp * s * wind.dx;
}

/** A frame's report: objects turned, and the chunks looked at. */
export interface SwayStep {
  updated: number;
  chunks: string[];
}

export class SwayStepper {
  private readonly size: number;
  /** Each built chunk's objects, by its key, in squares by `bx,by`. */
  private readonly chunks = new Map<string, Map<string, SwayEntry[]>>();
  /** Chunks whose objects rest at 0 already (Low). */
  private readonly rested = new Set<string>();
  private cursor = 0;
  /** Every object turned since it was made, for tests: how often each was turned. */
  touched: WeakMap<SwayTarget, number> | null = null;

  /** `chunkSize`: a chunk's width in px (the ground's). */
  constructor(chunkSize: number) {
    this.size = chunkSize;
  }

  add(chunk: string, e: SwayEntry): void {
    const buckets = this.chunks.get(chunk) ?? new Map<string, SwayEntry[]>();
    this.chunks.set(chunk, buckets);
    const b = `${Math.floor(e.x / SWAY.bucket)},${Math.floor(e.y / SWAY.bucket)}`;
    const list = buckets.get(b) ?? [];
    list.push(e);
    buckets.set(b, list);
  }

  /** Drops a chunk's objects (the chunk was dropped). */
  removeChunk(chunk: string): void {
    this.chunks.delete(chunk);
    this.rested.delete(chunk);
  }

  get builtChunks(): number {
    return this.chunks.size;
  }

  /** Objects kept for a chunk. */
  count(chunk: string): number {
    let n = 0;
    for (const l of this.chunks.get(chunk)?.values() ?? []) n += l.length;
    return n;
  }

  /** One frame: turns up to `cap` objects in `view` (plus SWAY.margin) at `timeMs`; with `cap` 0 they rest at 0. */
  step(view: View, timeMs: number, wind: SwayWind, cap: number): SwayStep {
    const m = SWAY.margin;
    const x0 = view.x - m;
    const y0 = view.y - m;
    const x1 = view.x + view.width + m;
    const y1 = view.y + view.height + m;
    const chunks: string[] = [];
    const inView: SwayEntry[] = [];
    for (let cy = Math.floor(y0 / this.size); cy <= Math.floor(y1 / this.size); cy++) {
      for (let cx = Math.floor(x0 / this.size); cx <= Math.floor(x1 / this.size); cx++) {
        const key = `${cx},${cy}`;
        const buckets = this.chunks.get(key);
        if (!buckets) continue;
        chunks.push(key);
        if (cap <= 0) {
          if (this.rested.has(key)) continue;
          this.rested.add(key);
          for (const list of buckets.values()) for (const e of list) this.turn(e, 0);
          continue;
        }
        this.rested.delete(key);
        for (let by = Math.floor(y0 / SWAY.bucket); by <= Math.floor(y1 / SWAY.bucket); by++) {
          for (let bx = Math.floor(x0 / SWAY.bucket); bx <= Math.floor(x1 / SWAY.bucket); bx++) {
            for (const e of buckets.get(`${bx},${by}`) ?? []) if (e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1 + SWAY.bucket) inView.push(e);
          }
        }
      }
    }
    if (cap <= 0 || inView.length === 0) return { updated: 0, chunks };
    const n = inView.length;
    const count = Math.min(cap, n);
    const start = n <= cap ? 0 : this.cursor % n;
    for (let i = 0; i < count; i++) {
      const e = inView[(start + i) % n];
      if (e) this.turn(e, swayAngle(e, timeMs, wind));
    }
    this.cursor = n <= cap ? 0 : (start + count) % n;
    return { updated: count, chunks };
  }

  private turn(e: SwayEntry, angle: number): void {
    e.target.setAngle(angle);
    if (this.touched) this.touched.set(e.target, (this.touched.get(e.target) ?? 0) + 1);
  }
}
