import { CLUSTER } from '../../data/tags';
import type { BurstEvent, HitEvent } from '../../sim/events';

// 078: which round made which hit, worked out in render (pure). getState() includes the tick's events, so the sim
// adds nothing; render matches each event to the rounds it drew last frame and this frame:
// 1. a bomb's burst: the bomb that vanished at the burst's point (within 1 px);
// 2. a mine's burst: the armed mine at that point;
// 3. a bomblet's burst: the bomblet that vanished there (it carries its cluster bomb's ammo), else the latest cluster
//    burst within CLUSTER.distance + 2 px;
// 4. an enemy hit (not a punch, a burn's beat or an arc): the straight round whose path this frame passed nearest the
//    hurtbox's centre, within its half-size + 8 px; a round hits an enemy once, so each (round, enemy) pair matches once;
// 5. a straight round that vanished with no hit: its end, one frame's travel past its last drawn point;
// 6. no match: the element's fallback.

/** A round as drawn: last frame's point and this frame's (one frame's travel on, for a straight round that vanished). */
export interface Track {
  id: number;
  ammoId: string;
  kind: 'straight' | 'lob' | 'mine' | 'bomblet';
  x0: number;
  y0: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** Drawn this frame; false once it has vanished. */
  live: boolean;
  /** Where a lob or bomblet lands (its burst's point). */
  toX: number;
  toY: number;
}

export interface MatchEvents {
  hits: readonly HitEvent[];
  bursts: readonly BurstEvent[];
  mineBursts: readonly BurstEvent[];
  bombletBursts: readonly BurstEvent[];
}

/** A struck enemy's hurtbox: its centre `offsetY` from the feet, and how near a round's path must pass (half-size + 8). */
export type Reach = (enemyId: number) => { offsetY: number; r: number } | null;

/** A cluster bomb's burst, for its bomblets. */
export interface ClusterAt {
  x: number;
  y: number;
  ammoId: string;
}

export type HitMatch = { kind: 'round'; ammoId: string; trackId: number; x: number; y: number; dx: number; dy: number } | { kind: 'fallback' } | { kind: 'arc' } | { kind: 'skip' };

export interface Matches {
  /** One per hit event, in order. */
  hits: HitMatch[];
  /** One per burst event of each list: the ammo id, or null for none. */
  bursts: (string | null)[];
  mines: (string | null)[];
  bomblets: (string | null)[];
  ends: { ammoId: string; x: number; y: number; dx: number; dy: number }[];
}

const NEAR = 1;

/** The point on the segment a→b nearest p, as its share along it (0..1). */
function along(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  return len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
}

function lobAt(tracks: readonly Track[], kind: Track['kind'], b: BurstEvent, vanished: boolean): string | null {
  const t = tracks.find((x) => x.kind === kind && (!vanished || !x.live) && Math.abs(x.toX - b.x) <= NEAR && Math.abs(x.toY - b.y) <= NEAR);
  return t?.ammoId ?? null;
}

export function matchImpacts(tracks: readonly Track[], ev: MatchEvents, reach: Reach, clusters: readonly ClusterAt[]): Matches {
  const used = new Set<string>();
  const hitTracks = new Set<number>();
  const hits = ev.hits.map((h): HitMatch => {
    if (h.target !== 'enemy' || h.melee || h.burn) return { kind: 'skip' };
    if (h.arc) return { kind: 'arc' };
    const box = reach(h.id);
    const cx = h.x;
    const cy = h.y + (box?.offsetY ?? 0);
    const r = box?.r ?? 0;
    let best: { t: Track; d: number; u: number } | null = null;
    for (const t of tracks) {
      if (t.kind !== 'straight' || used.has(`${t.id}:${h.id}`)) continue;
      const u = along(t.x0, t.y0, t.x, t.y, cx, cy);
      const d = Math.hypot(t.x0 + (t.x - t.x0) * u - cx, t.y0 + (t.y - t.y0) * u - cy);
      if (d <= r && (!best || d < best.d)) best = { t, d, u };
    }
    if (!best) return { kind: 'fallback' };
    const { t, u } = best;
    used.add(`${t.id}:${h.id}`);
    hitTracks.add(t.id);
    return { kind: 'round', ammoId: t.ammoId, trackId: t.id, x: t.x0 + (t.x - t.x0) * u, y: t.y0 + (t.y - t.y0) * u, dx: t.dx, dy: t.dy };
  });
  const bursts = ev.bursts.map((b) => lobAt(tracks, 'lob', b, true));
  const mines = ev.mineBursts.map((b) => lobAt(tracks, 'mine', b, false));
  const bomblets = ev.bombletBursts.map((b) => {
    const own = lobAt(tracks, 'bomblet', b, true);
    if (own) return own;
    for (let i = clusters.length - 1; i >= 0; i--) {
      const c = clusters[i];
      if (c && Math.hypot(c.x - b.x, c.y - b.y) <= CLUSTER.distance + 2) return c.ammoId;
    }
    return null;
  });
  const ends = tracks.filter((t) => t.kind === 'straight' && !t.live && !hitTracks.has(t.id)).map((t) => ({ ammoId: t.ammoId, x: t.x, y: t.y, dx: t.dx, dy: t.dy }));
  return { hits, bursts, mines, bomblets, ends };
}
