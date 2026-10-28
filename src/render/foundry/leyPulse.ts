import { SPRITES } from '../../data/assets';
import { TILE_SIZE } from '../../data/config';
import { FLOOR_TILES } from '../../data/roomArt';
import { LEY_PULSE } from '../../data/foundryFx';
import { TILE, type Room } from '../../data/rooms';
import type { Quality } from '../../data/settings';
import { floorFrame } from '../roomTiles';

// 079: ley light running across the foundry's ley-inlaid flags toward the intake (pure, render only). The inlays are
// 020's `floor-flag-inlay` tiles (floorFrame's pick), worked out once a room with their distances from the intake's
// mouth, farthest first. Each item the line feeds in (or an entrance firing) may start a pulse: a front closing on the
// mouth at LEY_PULSE.speed; as it passes an inlay, the rune lights and fades over litMs and a bead slides toward the
// mouth. A frame steps only the live pulses and, of each, only the inlays it has lit and not yet let fade.

export interface Inlay {
  tx: number;
  ty: number;
  /** The rune's middle, world px. */
  x: number;
  y: number;
  /** From the intake's mouth, px. */
  dist: number;
}

const cache = new WeakMap<Room, Inlay[]>();

/** The room's ley inlays, farthest from `mouth` first (worked out once a room). */
export function foundryInlays(room: Room, mouth: { x: number; y: number }): Inlay[] {
  const had = cache.get(room);
  if (had) return had;
  const out: Inlay[] = [];
  for (const [ty, row] of room.rows.entries()) {
    for (let tx = 0; tx < row.length; tx++) {
      if (row[tx] !== TILE.floor || floorFrame(SPRITES.floor, tx, ty) !== FLOOR_TILES.inlay) continue;
      const x = (tx + 0.5) * TILE_SIZE;
      const y = (ty + 0.5) * TILE_SIZE;
      out.push({ tx, ty, x, y, dist: Math.hypot(x - mouth.x, y - mouth.y) });
    }
  }
  out.sort((a, b) => b.dist - a.dist || a.tx - b.tx || a.ty - b.ty);
  cache.set(room, out);
  return out;
}

/** One pulse: its front's distance from the mouth, and when it passed each inlay it has passed (ms since it started). */
export interface Pulse {
  /** Which pulse since boot (the first is 1). */
  id: number;
  front: number;
  age: number;
  /** Inlays passed so far (by index, farthest first). */
  passed: number;
  /** The first passed inlay still lit (those before it have faded). */
  fadedTo: number;
  passedAt: number[];
}

export interface PulseInput {
  /** Refills and entrance fires since the last frame. */
  triggers: number;
  quality: Quality;
  /** The foundry is the room on screen (and the mood is on). */
  shown: boolean;
}

/** An inlay lit by a pulse now: which, how strongly (0..1), and its bead's point. */
export interface LitInlay {
  pulse: number;
  index: number;
  alpha: number;
  bead: { x: number; y: number; alpha: number };
}

export class LeyPulses {
  readonly live: Pulse[] = [];
  private readonly inlays: readonly Inlay[];
  private readonly mouth: { x: number; y: number };
  /** Ms since the last pulse started. */
  private since = Infinity;
  /** Pulses started since boot (for the test hook). */
  started = 0;

  /** `mouth`: the intake's mouth, which the beads slide toward. */
  constructor(inlays: readonly Inlay[], mouth: { x: number; y: number }) {
    this.inlays = inlays;
    this.mouth = mouth;
  }

  step(ms: number, input: PulseInput): void {
    const cap = LEY_PULSE.live[input.quality];
    if (!input.shown || cap === 0) {
      this.live.length = 0;
      return;
    }
    this.since += ms;
    for (const p of this.live) {
      p.age += ms;
      p.front -= (LEY_PULSE.speed * ms) / 1000;
      while (p.passed < this.inlays.length && (this.inlays[p.passed]?.dist ?? 0) >= p.front) {
        const d = this.inlays[p.passed]?.dist ?? 0;
        p.passedAt.push(p.age - ((d - p.front) / LEY_PULSE.speed) * 1000);
        p.passed += 1;
      }
      while (p.fadedTo < p.passed && p.age - (p.passedAt[p.fadedTo] ?? 0) >= LEY_PULSE.litMs) p.fadedTo += 1;
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      if (p && p.passed >= this.inlays.length && p.fadedTo >= p.passed && p.front <= 0) this.live.splice(i, 1);
    }
    if (input.triggers > 0 && this.since >= LEY_PULSE.everyMs && this.live.length < cap && this.inlays.length > 0) {
      this.since = 0;
      this.started += 1;
      this.live.push({ id: this.started, front: this.inlays[0]?.dist ?? 0, age: 0, passed: 0, fadedTo: 0, passedAt: [] });
    }
  }

  /** Every inlay lit now, by live pulse: only each pulse's window of lit, unfaded inlays is looked at. */
  lit(): LitInlay[] {
    const out: LitInlay[] = [];
    for (const [pi, p] of this.live.entries()) {
      for (let i = p.fadedTo; i < p.passed; i++) {
        const t = this.inlays[i];
        if (!t) continue;
        const k = Math.min(1, (p.age - (p.passedAt[i] ?? 0)) / LEY_PULSE.litMs);
        const slide = Math.min(1, (p.age - (p.passedAt[i] ?? 0)) / LEY_PULSE.beadMs);
        const dx = this.mouth.x - t.x;
        const dy = this.mouth.y - t.y;
        const len = Math.hypot(dx, dy) || 1;
        const along = Math.min(LEY_PULSE.beadPx, len) * slide;
        out.push({ pulse: pi, index: i, alpha: 1 - k, bead: { x: t.x + (dx / len) * along, y: t.y + (dy / len) * along, alpha: 1 - slide } });
      }
    }
    return out;
  }

  clear(): void {
    this.live.length = 0;
  }
}
