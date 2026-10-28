import { BOMB_LIFT } from '../../data/assets';
import { TICK_RATE } from '../../data/config';
import { bombletAt } from '../bombletPath';
import { DRAW_HEIGHT } from '../../data/tube';
import type { ArrowState } from '../../sim/arrows';
import type { BombState } from '../../sim/bombs';
import type { BombletState, MineState } from '../../sim/mines';
import { Pool } from './fxPool';
import type { Track } from './impactMatch';
import { bombletFx, roundFx, type RoundLook } from './roundFx';

// 078: the rounds the shot effects follow, frame to frame: each straight round, bomb or landmine in flight, bomblet
// and armed mine as a pooled track (last frame's point and this one's), so the matcher can tell which round made which
// hit and which vanished. Tracks are reused; a frame makes none once warm.

export interface FxTrack extends Track {
  look: RoundLook;
  /** Flight speed px/s (straight rounds), for an end's one frame of travel. */
  speed: number;
  /** Where its shed bits leave and its fuse glints: a straight round's drawn point, a bomb's or bomblet's fuse; and the depth it's drawn at. */
  sx: number;
  sy: number;
  depth: number;
  /** Ms since each of its shed bursts last fired. */
  shed: [number, number];
  /** Made this frame (a round just fired). */
  fresh: boolean;
  /** Its muzzle sparks have flown (one shot event each). */
  muzzled: boolean;
  seen: number;
}


/** No fuse: a round's own centre. */
const NO_FUSE = [0, 0] as const;

export class ShotTracks {
  private readonly pool = new Pool<FxTrack>(() => ({
    id: 0,
    ammoId: '',
    kind: 'straight',
    x0: 0,
    y0: 0,
    x: 0,
    y: 0,
    dx: 1,
    dy: 0,
    live: false,
    toX: 0,
    toY: 0,
    look: roundFx('arrow'),
    speed: 0,
    sx: 0,
    sy: 0,
    depth: 0,
    shed: [0, 0],
    fresh: false,
    muzzled: false,
    seen: 0,
  }));
  private readonly maps: Record<Track['kind'], Map<number, FxTrack>> = { straight: new Map(), lob: new Map(), mine: new Map(), bomblet: new Map() };
  private frame = 0;

  /** Every track: this frame's and those that vanished since last frame (until `sweep`). */
  get all(): readonly FxTrack[] {
    return this.pool.live;
  }

  get created(): number {
    return this.pool.created;
  }

  /** Last frame's points become the starting points; nothing is live until seen. */
  begin(): void {
    this.frame += 1;
    for (const t of this.pool.live) {
      t.x0 = t.x;
      t.y0 = t.y;
      t.live = false;
      t.fresh = false;
    }
  }

  /** The track for a round (made, `fresh`, on first sight: the caller sets its look). */
  private get(kind: Track['kind'], id: number, ammoId: string): FxTrack {
    const map = this.maps[kind];
    let t = map.get(id);
    if (!t) {
      t = this.pool.take();
      t.id = id;
      t.kind = kind;
      t.ammoId = ammoId;
      t.fresh = true;
      t.muzzled = false;
      t.shed[0] = 0;
      t.shed[1] = 0;
      map.set(id, t);
    }
    t.live = true;
    t.seen = this.frame;
    return t;
  }

  /** A straight round this frame; `look` is how ArrowView draws it (a Shard's tier, a burning arrow's fire). */
  straight(a: ArrowState, look: RoundLook | undefined): void {
    const t = this.get('straight', a.id, a.ammoId);
    if (look) t.look = look;
    else if (t.fresh) t.look = roundFx(a.ammoId);
    if (t.fresh) {
      // Its path this frame: from where it left (as far back as it has flown).
      const back = Math.min(a.travelled, (a.speed / TICK_RATE) * 2);
      t.x0 = a.x - a.dx * back;
      t.y0 = a.y - a.dy * back;
    }
    t.x = a.x;
    t.y = a.y;
    t.dx = a.dx;
    t.dy = a.dy;
    t.speed = a.speed;
    t.sx = a.x;
    t.sy = a.y - DRAW_HEIGHT;
    t.depth = a.y;
  }

  /** A bomb or landmine in flight. */
  lob(b: BombState): void {
    const t = this.get('lob', b.id, b.ammoId);
    if (t.fresh) t.look = roundFx(b.ammoId);
    if (t.fresh) {
      t.x0 = b.fromX;
      t.y0 = b.fromY;
    }
    const len = Math.hypot(b.toX - b.fromX, b.toY - b.fromY) || 1;
    t.x = b.x;
    t.y = b.y;
    t.dx = (b.toX - b.fromX) / len;
    t.dy = (b.toY - b.fromY) / len;
    t.toX = b.toX;
    t.toY = b.toY;
    const fuse = t.look.fuse ?? NO_FUSE;
    t.sx = b.x + fuse[0];
    t.sy = b.y - BOMB_LIFT - b.height + fuse[1];
    t.depth = b.y;
  }

  /** A cluster bomb's bomblet on its way out; its burst's point is where it lands. */
  bomblet(b: BombletState): void {
    const t = this.get('bomblet', b.id, b.ammoId);
    if (t.fresh) t.look = bombletFx(b.ammoId);
    t.x = t.toX = b.x;
    t.y = t.toY = b.y;
    const at = bombletAt(b);
    const fuse = t.look.fuse ?? NO_FUSE;
    t.sx = at.x + fuse[0];
    t.sy = at.y - at.lift + fuse[1];
    t.depth = at.y;
  }

  /** An armed mine where it lies. */
  mine(m: MineState): void {
    const t = this.get('mine', m.id, m.ammoId);
    if (t.fresh) t.look = roundFx(m.ammoId);
    t.x = t.toX = m.x;
    t.y = t.toY = m.y;
  }

  /** Rounds that vanished this frame: a straight one is placed one frame's travel (`ticks`) past its last point. */
  settle(ticks: number): void {
    for (const t of this.pool.live) {
      if (t.live || t.seen === this.frame) continue;
      if (t.kind === 'straight') {
        const step = (t.speed / TICK_RATE) * Math.max(1, ticks);
        t.x = t.x0 + t.dx * step;
        t.y = t.y0 + t.dy * step;
      }
    }
  }

  /** Forgets the rounds that vanished (after the frame's matching). */
  sweep(): void {
    const live = this.pool.live;
    for (let i = live.length - 1; i >= 0; i--) {
      const t = live[i];
      if (!t || t.live) continue;
      this.maps[t.kind].delete(t.id);
      this.pool.release(i);
    }
  }

  clear(): void {
    this.pool.releaseAll();
    for (const m of Object.values(this.maps)) m.clear();
  }
}
