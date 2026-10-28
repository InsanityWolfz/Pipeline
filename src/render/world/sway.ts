import { SWAY, WIND } from '../../data/ambient';
import { TILE_SIZE } from '../../data/config';
import type { SwayKind } from '../../data/decor';
import { decorRegion } from './decorPlace';
import { toward } from './wind';

// 077: the sway stepper. Each built chunk keeps its swaying objects (plants, vines, trees, tree nodes, the Colossus's
// ivy) in squares of SWAY.bucket px; each frame only the chunks the camera's view touches are looked at, and only
// their squares in view, and at most `cap` objects are turned (past that, in turns). Chunks out of view are never
// touched: their objects stand as they were left. On Low (cap 0) the objects in view rest at angle 0, set once.
// Rotation changes neither a sprite's frame nor its position, so 070's cover key never changes with it. Each object
// keeps its own cycle; the wind it's given eases its amplitude and lean over SWAY.easeMs, so a gust or a region's blend
// never jumps a frame (review).

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
  /** Where it stands along its region's wind, in cycles (worked out once, when it's filed). */
  along?: number;
}

/** The wind where the camera is: its strength (gusts included) and the unit direction it blows toward (screen, x east, y south). */
export interface SwayWind {
  strength: number;
  dx: number;
  dy: number;
}

type View = { x: number; y: number; width: number; height: number };

/** Where a point stands along its own region's wind, in cycles: fixed for a plant, so a region's blend never moves its phase. */
export function alongWind(x: number, y: number): number {
  const v = toward(WIND[decorRegion(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))].toward);
  return (x * v.dx + y * v.dy) / SWAY.wave;
}

/** Files an object in its chunk's square; returns the square's list. */
function put(map: Map<string, Map<string, SwayEntry[]>>, chunk: string, e: SwayEntry): SwayEntry[] {
  if (e.along === undefined) e.along = alongWind(e.x, e.y);
  const buckets = map.get(chunk) ?? new Map<string, SwayEntry[]>();
  map.set(chunk, buckets);
  const b = `${Math.floor(e.x / SWAY.bucket)},${Math.floor(e.y / SWAY.bucket)}`;
  const list = buckets.get(b) ?? [];
  list.push(e);
  buckets.set(b, list);
  return list;
}

/** A plant's angle at `timeMs` in a wind, degrees: within amplitude × (1 + SWAY.lean); its cycle is its own in any wind. */
export function swayAngle(e: Pick<SwayEntry, 'x' | 'y' | 'kind' | 'period' | 'phase' | 'along'>, timeMs: number, wind: SwayWind): number {
  const amp = SWAY.amplitude[e.kind];
  const s = Math.min(SWAY.maxStrength, Math.max(0, wind.strength));
  const phi = 2 * Math.PI * (timeMs / e.period - (e.along ?? alongWind(e.x, e.y)) + e.phase * SWAY.hashPhase);
  return amp * s * Math.sin(phi) + SWAY.lean * amp * s * wind.dx;
}

/** A frame's report: objects turned, and the chunks looked at. */
export interface SwayStep {
  updated: number;
  chunks: string[];
  /** The first few angles turned this frame (for the test hook: they change frame to frame). */
  sample: number[];
}

export class SwayStepper {
  private readonly size: number;
  /** Each built chunk's objects, by its key, in squares by `bx,by`. */
  private readonly chunks = new Map<string, Map<string, SwayEntry[]>>();
  /** Objects that outlive chunks (tree nodes, drawn by NodeView), by chunk key and square, added and removed one by one. */
  private readonly fixed = new Map<string, Map<string, SwayEntry[]>>();
  /** Chunks whose objects rest at 0 already (Low). */
  private readonly rested = new Set<string>();
  private cursor = 0;
  /** The wind as the plants feel it: eased toward the wind given, over SWAY.easeMs. */
  private air: SwayWind | null = null;
  private airMs = 0;
  /** Every object turned since it was made, for tests: how often each was turned. */
  touched: WeakMap<SwayTarget, number> | null = null;

  /** `chunkSize`: a chunk's width in px (the ground's). */
  constructor(chunkSize: number) {
    this.size = chunkSize;
  }

  add(chunk: string, e: SwayEntry): void {
    put(this.chunks, chunk, e);
  }

  /** An object that isn't a chunk's (a tree node): kept by where it stands until `remove` is called. Returns `remove`. */
  addFixed(e: SwayEntry): () => void {
    const chunk = `${Math.floor(e.x / this.size)},${Math.floor(e.y / this.size)}`;
    const list = put(this.fixed, chunk, e);
    this.rested.delete(chunk);
    return () => {
      const i = list.indexOf(e);
      if (i >= 0) list.splice(i, 1);
    };
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

  /** Eases the plants' wind toward `wind` (its strength within SWAY.maxStrength) for the time since the last frame. */
  private ease(timeMs: number, wind: SwayWind): SwayWind {
    const strength = Math.min(SWAY.maxStrength, Math.max(0, wind.strength));
    const a = this.air;
    if (!a) {
      this.air = { strength, dx: wind.dx, dy: wind.dy };
      this.airMs = timeMs;
      return this.air;
    }
    const k = 1 - Math.exp((-3 * Math.max(0, timeMs - this.airMs)) / SWAY.easeMs);
    this.airMs = timeMs;
    a.strength += (strength - a.strength) * k;
    a.dx += (wind.dx - a.dx) * k;
    a.dy += (wind.dy - a.dy) * k;
    return a;
  }

  /** One frame: turns up to `cap` objects in `view` (plus SWAY.margin) at `timeMs`; with `cap` 0 they rest at 0. */
  step(view: View, timeMs: number, windNow: SwayWind, cap: number): SwayStep {
    const wind = this.ease(timeMs, windNow);
    const m = SWAY.margin;
    const x0 = view.x - m;
    const y0 = view.y - m;
    const x1 = view.x + view.width + m;
    const y1 = view.y + view.height + m;
    const chunks: string[] = [];
    const inView: SwayEntry[] = [];
    // The chunks the view itself touches (at most 2 × 2: the view is 640 × 360, a chunk 640 px), and the rows a margin
    // below it (tree feet standing just below the view, their canopies in it); within them, objects near the view.
    for (let cy = Math.floor(view.y / this.size); cy <= Math.floor((view.y + view.height - 1 + m) / this.size); cy++) {
      for (let cx = Math.floor(view.x / this.size); cx <= Math.floor((view.x + view.width - 1) / this.size); cx++) {
        const key = `${cx},${cy}`;
        const sets = [this.chunks.get(key), this.fixed.get(key)].filter((b): b is Map<string, SwayEntry[]> => b !== undefined);
        if (sets.length === 0) continue;
        chunks.push(key);
        if (cap <= 0) {
          if (this.rested.has(key)) continue;
          this.rested.add(key);
          for (const buckets of sets) for (const list of buckets.values()) for (const e of list) this.turn(e, 0);
          continue;
        }
        this.rested.delete(key);
        for (const buckets of sets) {
          for (let by = Math.floor(y0 / SWAY.bucket); by <= Math.floor(y1 / SWAY.bucket); by++) {
            for (let bx = Math.floor(x0 / SWAY.bucket); bx <= Math.floor(x1 / SWAY.bucket); bx++) {
              for (const e of buckets.get(`${bx},${by}`) ?? []) if (e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1 + SWAY.bucket) inView.push(e);
            }
          }
        }
      }
    }
    if (cap <= 0 || inView.length === 0) return { updated: 0, chunks, sample: [] };
    const n = inView.length;
    const count = Math.min(cap, n);
    const start = n <= cap ? 0 : this.cursor % n;
    const sample: number[] = [];
    for (let i = 0; i < count; i++) {
      const e = inView[(start + i) % n];
      if (!e) continue;
      const a = swayAngle(e, timeMs, wind);
      this.turn(e, a);
      if (sample.length < 4) sample.push(Math.round(a * 1000) / 1000);
    }
    this.cursor = n <= cap ? 0 : (start + count) % n;
    return { updated: count, chunks, sample };
  }

  private turn(e: SwayEntry, angle: number): void {
    e.target.setAngle(angle);
    if (this.touched) this.touched.set(e.target, (this.touched.get(e.target) ?? 0) + 1);
  }
}
