import { RIPPLES } from '../../data/ambient';
import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { OVERWORLD } from '../../data/overworld';
import type { Quality } from '../../data/settings';
import type { Room } from '../../data/rooms';
import { nextFloat, type RngState } from '../../sim/rng';

// 077: water ripples (render only): rings on ponds (the Reed Marsh's too) and on Ley Springs' pools, one every
// RIPPLES.everyMs at a point in the deep water, growing and fading. Only the pools whose box meets the view are looked
// at (pools are bucketed by ground chunk once a map); the timing comes from the render-side stream. Pure but for that
// stream, so tests replay it from a seed.

const T = TILE_SIZE;
const C = GROUND.chunk;

/** A pond or a spring's pool, world px: its middle and radii. */
export interface Pool {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  spring: boolean;
}

/** A ring on the water: where, its age (ms) and whether it's a spring's. */
export interface Ring {
  x: number;
  y: number;
  age: number;
  spring: boolean;
}

type View = { x: number; y: number; width: number; height: number };

const pools = new WeakMap<Room, Map<string, Pool[]>>();

/** A map's ponds and springs, bucketed by every ground chunk their box touches. */
export function poolBuckets(room: Room): Map<string, Pool[]> {
  const known = pools.get(room);
  if (known) return known;
  const list: Pool[] = [
    ...(room.terrain?.ponds ?? []).map((p, i) => ({ id: `pond-${i}`, x: (p.cx + 0.5) * T, y: (p.cy + 0.5) * T, rx: p.rx * T, ry: p.ry * T, spring: false })),
    ...(room.terrain ? OVERWORLD.springs : []).map((s) => ({ id: s.id, x: (s.tx + 0.5) * T, y: (s.ty + 0.5) * T, rx: s.radius * T, ry: s.radius * T * 0.7, spring: true })),
  ];
  const map = new Map<string, Pool[]>();
  for (const p of list) {
    for (let cy = Math.floor((p.y - p.ry) / C); cy <= Math.floor((p.y + p.ry) / C); cy++) {
      for (let cx = Math.floor((p.x - p.rx) / C); cx <= Math.floor((p.x + p.rx) / C); cx++) {
        const k = `${cx},${cy}`;
        map.set(k, [...(map.get(k) ?? []), p]);
      }
    }
  }
  pools.set(room, map);
  return map;
}

/** The pools whose box meets the view, from the chunks the view touches. */
export function poolsInView(room: Room, v: View): Pool[] {
  const b = poolBuckets(room);
  const seen = new Set<Pool>();
  for (let cy = Math.floor(v.y / C); cy <= Math.floor((v.y + v.height) / C); cy++) {
    for (let cx = Math.floor(v.x / C); cx <= Math.floor((v.x + v.width) / C); cx++) {
      for (const p of b.get(`${cx},${cy}`) ?? []) if (p.x + p.rx >= v.x && p.x - p.rx <= v.x + v.width && p.y + p.ry >= v.y && p.y - p.ry <= v.y + v.height) seen.add(p);
    }
  }
  return [...seen];
}

const between = (rng: RngState, r: readonly [number, number]): number => r[0] + nextFloat(rng) * (r[1] - r[0]);

export class RippleModel {
  readonly rings: Ring[] = [];
  /** Ms until each pool's next ring, for the pools seen so far. */
  private readonly next = new Map<string, number>();
  private readonly rng: RngState;

  constructor(rng: RngState) {
    this.rng = rng;
  }

  /** Ages the rings by `dt` ms and adds the pools' next rings, at most the tier's in view; none on Low. */
  step(dt: number, inView: readonly Pool[], quality: Quality): void {
    for (const r of this.rings) r.age += dt;
    for (let i = this.rings.length - 1; i >= 0; i--) if ((this.rings[i]?.age ?? 0) >= RIPPLES.lifeMs) this.rings.splice(i, 1);
    const max = RIPPLES.max[quality];
    if (max === 0) {
      this.rings.length = 0;
      return;
    }
    for (const p of inView) {
      let t = (this.next.get(p.id) ?? between(this.rng, RIPPLES.everyMs)) - dt;
      if (t <= 0) {
        if (this.rings.length < max) {
          const a = nextFloat(this.rng) * Math.PI * 2;
          const k = Math.sqrt(nextFloat(this.rng)) * RIPPLES.deep;
          this.rings.push({ x: p.x + Math.cos(a) * p.rx * k, y: p.y + Math.sin(a) * p.ry * k, age: 0, spring: p.spring });
        }
        t += between(this.rng, RIPPLES.everyMs);
      }
      this.next.set(p.id, t);
    }
  }

  /** A ring's look now: its width across (px) and alpha. */
  static look(r: Ring): { across: number; alpha: number } {
    const k = Math.min(1, r.age / RIPPLES.lifeMs);
    return { across: RIPPLES.grow[0] + (RIPPLES.grow[1] - RIPPLES.grow[0]) * k, alpha: RIPPLES.alpha * (1 - k) };
  }
}

/** High's glints on a pond: `perPond` fixed points on its water, each twinkling on its own beat; their alpha now. */
export function glints(p: Pool, timeMs: number): { x: number; y: number; alpha: number }[] {
  const G = RIPPLES.glints;
  return Array.from({ length: G.perPond }, (_, i) => {
    const a = (i * 2.4 + p.x * 0.013) % (Math.PI * 2);
    const tw = Math.max(0, Math.sin((timeMs / G.periodMs) * Math.PI * 2 + i * 2.1 + p.y * 0.01));
    return { x: p.x + Math.cos(a) * p.rx * 0.45 - p.rx * 0.15, y: p.y + Math.sin(a) * p.ry * 0.35 - p.ry * 0.2, alpha: G.alpha * tw * tw };
  });
}
