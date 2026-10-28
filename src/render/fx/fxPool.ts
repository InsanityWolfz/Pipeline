import { FX_LOOK } from '../../data/fxQuality';

// 078: the pools behind the shot effects, pure so they're tested without Phaser. Each is made up to its high-water
// mark and only grows; nothing is allocated per projectile per frame once warm.

/** Objects made once and reused: `take` hands out a free one (or makes one), `release` swap-removes a live one. */
export class Pool<T> {
  readonly live: T[] = [];
  private readonly free: T[] = [];
  created = 0;
  private readonly make: () => T;

  constructor(make: () => T) {
    this.make = make;
  }

  take(): T {
    let item = this.free.pop();
    if (item === undefined) {
      item = this.make();
      this.created += 1;
    }
    this.live.push(item);
    return item;
  }

  /** Frees the live item at `index`: the last live item takes its place. */
  release(index: number): T | undefined {
    const item = this.live[index];
    if (item === undefined) return undefined;
    const last = this.live.pop();
    if (last !== undefined && index < this.live.length) this.live[index] = last;
    this.free.push(item);
    return item;
  }

  releaseAll(): void {
    while (this.live.length > 0) this.release(this.live.length - 1);
  }

  /** Makes objects up to `n` in all (a tier's high-water mark) at once, so a fight later makes none. */
  warm(n: number): void {
    while (this.created < n) {
      this.free.push(this.make());
      this.created += 1;
    }
  }
}

/** A trail's drawn points, newest first: a fixed ring of `FX_LOOK.points`. */
export class TrailRing {
  private readonly xs = new Float32Array(FX_LOOK.points);
  private readonly ys = new Float32Array(FX_LOOK.points);
  private head = -1;
  count = 0;

  /** Adds a point, unless it is where the newest one is (a frame drawn with no tick between). */
  push(x: number, y: number): void {
    if (this.count > 0 && this.xs[this.head] === Math.fround(x) && this.ys[this.head] === Math.fround(y)) return;
    this.head = (this.head + 1) % FX_LOOK.points;
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    this.count = Math.min(FX_LOOK.points, this.count + 1);
  }

  /** The `i`th newest point's x and y. */
  x(i: number): number {
    return this.xs[(this.head - i + FX_LOOK.points * 2) % FX_LOOK.points] ?? 0;
  }

  y(i: number): number {
    return this.ys[(this.head - i + FX_LOOK.points * 2) % FX_LOOK.points] ?? 0;
  }

  reset(): void {
    this.head = -1;
    this.count = 0;
  }
}

/** One reused answer from `trailCut`, so drawing allocates nothing. */
const CUT = { points: 0, last: 1 };

/** How much of a ring a trail `length` px long draws: the points from the newest, the last segment's drawn share (one shared answer, read it before the next call). */
export function trailCut(r: TrailRing, length: number): { points: number; last: number } {
  let acc = 0;
  for (let i = 1; i < r.count; i++) {
    const seg = Math.hypot(r.x(i) - r.x(i - 1), r.y(i) - r.y(i - 1));
    if (seg > 0 && acc + seg >= length) {
      CUT.points = i + 1;
      CUT.last = (length - acc) / seg;
      return CUT;
    }
    acc += seg;
  }
  CUT.points = r.count;
  CUT.last = 1;
  return CUT;
}

/** Marks on the ground: at most `cap` live, the oldest recycled first when a new one needs room. */
export class MarkRing<T> {
  /** Oldest first. */
  readonly live: T[] = [];
  private readonly free: T[] = [];
  created = 0;
  private readonly make: () => T;

  constructor(make: () => T) {
    this.make = make;
  }

  place(cap: number): T {
    if (this.live.length >= cap && this.live.length > 0) {
      const oldest = this.live.shift() as T;
      this.live.push(oldest);
      return oldest;
    }
    let m = this.free.pop();
    if (m === undefined) {
      m = this.make();
      this.created += 1;
    }
    this.live.push(m);
    return m;
  }

  /** Makes marks up to `n` in all (the tier's cap) at once. */
  warm(n: number): void {
    while (this.created < n) {
      this.free.push(this.make());
      this.created += 1;
    }
  }

  /** A mark faded out: its slot is free again. */
  expire(m: T): void {
    const i = this.live.indexOf(m);
    if (i < 0) return;
    this.live.splice(i, 1);
    this.free.push(m);
  }

  /** A lower tier's cap applies at once: the oldest go first. */
  trim(cap: number): T[] {
    const gone: T[] = [];
    while (this.live.length > cap) {
      const m = this.live.shift() as T;
      this.free.push(m);
      gone.push(m);
    }
    return gone;
  }
}
