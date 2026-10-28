import { BlendModes, type GameObjects, type Scene } from 'phaser';
import type { TrailKind } from '../../data/ammoFx';
import { DEPTHS } from '../../data/assets';
import { FX_LOOK, FX_QUALITY } from '../../data/fxQuality';
import type { Quality } from '../../data/settings';
import { colorOf } from '../color';
import { Pool, ribbonEdges, TrailRing, trailCut, type Points } from './fxPool';
import { roundFx, type RoundLook } from './roundFx';

// 078: every round's trail ribbon, from pooled slots: each a fixed ring of drawn points, cut to its trail's length
// when drawn, tapering from the round to nothing. Two Graphics at `shotTrail` (a Graphics has one blend mode: plain,
// and additive for the core and edge of ley and lightning on Medium and High), cleared and redrawn once a frame, so trails lie under the
// telegraphs and everything standing. Capped by tier; a round past the cap flies with no trail. A slot is kept
// until its round ends and its trail fades. Lightning crackles and fire flickers, unless Flashes is off.

interface Slot {
  ring: TrailRing;
  key: number;
  look: RoundLook;
  /** The frame it was last fed a point. */
  seen: number;
  /** Ms left fading once its round ended, or -1 while it flies. */
  fade: number;
  /** A phase for its fire flicker. */
  phase: number;
  /** It began at the drawn muzzle: its oldest point bridges the tube to the round (not its flight). */
  bridged: boolean;
}

/** What the trails draw, for the test hook. */
export interface TrailsShown {
  byKind: Partial<Record<TrailKind, number>>;
  slots: { live: number; created: number };
  cap: number;
  /** Trails drawn last frame for rounds still flying (never past the cap). */
  drawn: number;
  /** Where the newest trail begun at the drawn muzzle starts (its first point), or null. */
  start: { x: number; y: number } | null;
  /** The most any drawn trail turns from its tail to its head, degrees (a homing bolt's curving wake). */
  bend: number;
}

export class TrailView {
  private readonly normal: GameObjects.Graphics;
  private readonly additive: GameObjects.Graphics;
  private readonly pool = new Pool<Slot>(() => ({ ring: new TrailRing(), key: -1, look: roundFx('arrow'), seen: 0, fade: -1, phase: 0, bridged: false }));
  private readonly byKey = new Map<number, Slot>();
  private frame = 0;
  private cap = FX_QUALITY.medium.trailCap;
  /** Test hook only: the cap held at this many trails (null: the tier's). */
  capHeld: number | null = null;
  private time = 0;
  /** Slots whose round still flies (counted at each frame's start, then kept as slots are taken). */
  private live = 0;
  /** Trails drawn this frame for rounds still flying, and the last frame's count (the cap's check). */
  private drawnNow = 0;
  private drawnLast = 0;
  /** Where the newest trail begun at the drawn muzzle starts (075.10's bridge), for the test hook. */
  private lastStart: { x: number; y: number } | null = null;
  /** Scratch: a trail's drawn points and its edge vertices, made once. */
  private readonly scratch = new Scratch();
  private readonly edges = new Float32Array(FX_LOOK.points * 4);

  constructor(scene: Scene) {
    this.normal = scene.add.graphics().setDepth(DEPTHS.shotTrail);
    this.additive = scene.add.graphics().setDepth(DEPTHS.shotTrail).setBlendMode(BlendModes.ADD);
  }

  /** A new frame of points: rounds not fed one this frame start fading at `end`. */
  begin(quality: Quality): void {
    this.frame += 1;
    this.cap = this.capHeld ?? FX_QUALITY[quality].trailCap;
    // Pools only grow: a tier's slots are made once, as it comes in (each live slot can fade while a new one flies).
    this.pool.warm(this.cap + FX_LOOK.fadeSlots);
    this.live = this.flying();
    // A tier change applies at once: the newest slots past the cap go.
    while (this.live > this.cap) {
      this.live -= 1;
      const live = this.pool.live;
      for (let i = live.length - 1; i >= 0; i--) {
        const s = live[i];
        if (s && s.fade < 0) {
          this.drop(i);
          break;
        }
      }
    }
  }

  private flying(): number {
    let n = 0;
    for (const s of this.pool.live) if (s.fade < 0) n += 1;
    return n;
  }

  /** Feeds a round's drawn point (`key` its id); a round seen first starts its trail at `from` (the drawn muzzle). False past the cap. */
  track(key: number, look: RoundLook, x: number, y: number, from: { x: number; y: number } | null): boolean {
    let s = this.byKey.get(key);
    if (!s) {
      if (look.trail.length <= 0 || this.live >= this.cap || this.pool.live.length >= this.cap + FX_LOOK.fadeSlots) return false;
      this.live += 1;
      s = this.pool.take();
      s.ring.reset();
      s.key = key;
      s.fade = -1;
      s.phase = (key * 1.7) % (Math.PI * 2);
      s.bridged = from !== null;
      if (from) {
        s.ring.push(from.x, from.y);
        this.lastStart = { x: from.x, y: from.y };
      }
      this.byKey.set(key, s);
    }
    s.look = look;
    s.seen = this.frame;
    s.ring.push(x, y);
    return true;
  }

  /** The points a round's trail holds now (029's hook: `tagged.trails`), or 0 with none. */
  points(key: number): number {
    const s = this.byKey.get(key);
    return s && s.fade < 0 ? s.ring.count : 0;
  }

  private drop(i: number): void {
    const s = this.pool.live[i];
    if (!s) return;
    if (this.byKey.get(s.key) === s) this.byKey.delete(s.key);
    this.pool.release(i);
  }

  /** Fades the ended trails by `deltaMs` and redraws every trail. */
  end(deltaMs: number, quality: Quality, flashes: boolean): void {
    this.time += deltaMs;
    const q = FX_QUALITY[quality];
    this.drawnNow = 0;
    this.normal.clear();
    this.additive.clear();
    const live = this.pool.live;
    for (let i = live.length - 1; i >= 0; i--) {
      const s = live[i];
      if (!s) continue;
      if (s.seen !== this.frame && s.fade < 0) {
        s.fade = FX_LOOK.fadeMs;
        // Its id may come back for a new round; this slot no longer answers to it.
        if (this.byKey.get(s.key) === s) this.byKey.delete(s.key);
      }
      if (s.fade >= 0) {
        s.fade -= deltaMs;
        if (s.fade <= 0) {
          this.drop(i);
          continue;
        }
      }
      this.draw(s, q, flashes);
    }
    this.drawnLast = this.drawnNow;
  }

  private draw(s: Slot, q: (typeof FX_QUALITY)[Quality], flashes: boolean): void {
    const t = s.look.trail;
    // The colour lies flat (so a ley ribbon stays cyan on sunlit ground); a glowing trail's core and edge add light.
    const glow = t.additive && q.additive ? this.additive : this.normal;
    const fade = s.fade < 0 ? 1 : s.fade / FX_LOOK.fadeMs;
    // Fire flickers ±flicker, smoothly (two slow waves, not a per-frame reroll); none with Flashes off.
    const [fa, fb] = FX_LOOK.flickerMs;
    const flicker = flashes && t.flicker > 0 ? 1 + t.flicker * Math.sin(this.time / fa + s.phase) * Math.sin(this.time / fb + s.phase * 2) : 1;
    const n = this.gather(s, flashes ? t.jitter : 0);
    if (n < 2) return;
    if (s.fade < 0) this.drawnNow += 1;
    const passes = q.edge ? 3 : q.core ? 2 : 1;
    for (let pass = passes === 3 ? 0 : 1; pass < (passes === 1 ? 2 : 3); pass++) {
      // Pass 0: High's soft edge under it; 1: the colour; 2: the core (a tier's wider, so it reads in flight).
      const color = colorOf(pass === 0 ? (t.edge ?? t.color) : pass === 1 ? t.color : t.core);
      const share = pass === 0 ? FX_LOOK.edge : pass === 1 ? 1 : s.look.tier === 'stone' ? FX_LOOK.core : FX_LOOK.tierCore;
      const half = (t.width * share * flicker) / 2;
      const alpha = t.alpha * fade * (pass === 0 ? FX_LOOK.edgeAlpha : 1);
      this.fill(pass === 1 ? this.normal : glow, n, half, color, alpha);
    }
  }

  /** The slot's drawn points into the scratch buffer: cut to its length (the last part way), crackled by `jitter`. */
  private gather(s: Slot, jitter: number): number {
    const cut = trailCut(s.ring, s.look.trail.length);
    const n = cut.points;
    const b = this.scratch;
    for (let i = 0; i < n; i++) {
      let x = s.ring.x(i);
      let y = s.ring.y(i);
      if (i === n - 1 && i > 0 && cut.last < 1) {
        x = s.ring.x(i - 1) + (x - s.ring.x(i - 1)) * cut.last;
        y = s.ring.y(i - 1) + (y - s.ring.y(i - 1)) * cut.last;
      }
      if (jitter > 0 && i > 0) {
        x += (Math.random() * 2 - 1) * jitter;
        y += (Math.random() * 2 - 1) * jitter;
      }
      b.xs[i] = x;
      b.ys[i] = y;
    }
    return n;
  }

  /**
   * One ribbon as one continuous fill (078 review: separate round-capped segments overlapped into beads): quads between
   * shared edge vertices, tapering from the round to `tail` of its width, fading toward the far end.
   */
  private fill(g: GameObjects.Graphics, n: number, half: number, color: number, alpha: number): void {
    const e = this.edges;
    ribbonEdges(this.scratch, n, half, half * FX_LOOK.tail, e);
    for (let i = 1; i < n; i++) {
      const k = 1 - i / (n - 1);
      g.fillStyle(color, alpha * Math.min(1, k + 1 / (n - 1)));
      g.beginPath();
      g.moveTo(e[(i - 1) * 4] ?? 0, e[(i - 1) * 4 + 1] ?? 0);
      g.lineTo(e[i * 4] ?? 0, e[i * 4 + 1] ?? 0);
      g.lineTo(e[i * 4 + 2] ?? 0, e[i * 4 + 3] ?? 0);
      g.lineTo(e[(i - 1) * 4 + 2] ?? 0, e[(i - 1) * 4 + 3] ?? 0);
      g.closePath();
      g.fillPath();
    }
  }

  /** Clears every trail (a room swap). */
  clear(): void {
    this.pool.releaseAll();
    this.byKey.clear();
    this.normal.clear();
    this.additive.clear();
  }

  get shown(): TrailsShown {
    const byKind: Partial<Record<TrailKind, number>> = {};
    let bend = 0;
    for (const s of this.pool.live) {
      if (s.fade >= 0) continue;
      byKind[s.look.trail.kind] = (byKind[s.look.trail.kind] ?? 0) + 1;
      const r = s.ring;
      const cut = trailCut(r, s.look.trail.length).points;
      // The muzzle's bridge (while the ring still holds it) is no part of the flight's bend.
      const n = s.bridged && cut === r.count && r.count < FX_LOOK.points ? cut - 1 : cut;
      if (n < 3) continue;
      const head = Math.atan2(r.y(0) - r.y(1), r.x(0) - r.x(1));
      const tail = Math.atan2(r.y(n - 2) - r.y(n - 1), r.x(n - 2) - r.x(n - 1));
      const d = Math.abs(((head - tail + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      bend = Math.max(bend, (d * 180) / Math.PI);
    }
    return { byKind, slots: { live: this.pool.live.length, created: this.pool.created }, cap: this.cap, drawn: this.drawnLast, start: this.lastStart ? { ...this.lastStart } : null, bend };
  }
}

/** A trail's drawn points (cut and crackled), reused for every trail each frame. */
class Scratch implements Points {
  readonly xs = new Float32Array(FX_LOOK.points);
  readonly ys = new Float32Array(FX_LOOK.points);

  x(i: number): number {
    return this.xs[i] ?? 0;
  }

  y(i: number): number {
    return this.ys[i] ?? 0;
  }
}
