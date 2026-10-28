import type { Scene } from 'phaser';
import { AMMO_FX, type FxBurst } from '../../data/ammoFx';
import { DEPTHS } from '../../data/assets';
import { TILE_SIZE } from '../../data/config';
import { FX_LOOK, FX_QUALITY, MACHINE_SPARKS } from '../../data/fxQuality';
import { SPARKS } from '../../data/foundryFx';
import { PARTICLES } from '../../data/juice';
import { FEET_BOX } from '../../data/player';
import { FOUNDRY_ROOM } from '../../data/rooms';
import type { Quality } from '../../data/settings';
import { DRAW_HEIGHT } from '../../data/tube';
import { defOf } from '../../sim/champions';
import type { EnemyState } from '../../sim/enemies';
import type { BurstEvent, SimEvents } from '../../sim/events';
import { pieceRect } from '../../sim/pieces';
import type { SimState } from '../../sim/state';
import type { Particles } from '../Particles';
import { matchImpacts, type ClusterAt, type HitMatch } from './impactMatch';
import { machineSparkColors } from './machineSparks';
import { MarkView } from './MarkView';
import type { AmmoFxShown, ImpactShown } from './ammoFxShown';
import { FuseView } from './FuseView';
import { bombletFx, burstDepth, cachedFx, elementOfDamage, roundFx, shownLook, type RoundLook } from './roundFx';
import { ShotTracks } from './shotTracks';
import type { TrailView } from './TrailView';

// 078: the shot effects, from the frame's events and the rounds drawn last frame and this frame: muzzle sparks down
// each shot's lane from the tube's drawn muzzle; each hit's impact (the round that made it, impactMatch.ts), a blast
// at each bomb's, mine's and bomblet's burst, an end where a round vanished with no hit, the element's fallback where
// nothing matched; the shed bits in flight (ley motes, frost flakes, embers, fuse smoke) at the tier's rate; landing
// dust as a mine arms; and machine sparks as a machine finishes a craft. Particles come from the pooled `Particles`
// under the shared budget; marks, shock rings and flashes from MarkView's pools. Nothing feeds back into the sim.

const IMPACTS_KEPT = 24;
/** Impact flashes sit at about the height shots fly. */
const HIT_LIFT = FX_LOOK.hitLift;
const CLUSTERS_KEPT = 8;

export class ShotFxView {
  private readonly particles: () => Particles | undefined;
  private readonly lastOf: (id: number) => EnemyState | undefined;
  private readonly trails: TrailView;
  readonly marks: MarkView;
  private readonly fuses: FuseView;
  private readonly tracks = new ShotTracks();
  private readonly clusters: ClusterAt[] = [];
  private lastTick = -1;
  private room = '';
  private readonly impacts: ImpactShown[] = [];
  private ends = 0;
  private played = 0;
  private fallbacks = 0;
  private muzzle: AmmoFxShown['muzzle'] = null;
  private machine = 0;
  private landings = 0;
  /** `?fx=off` (dev) or the hook: no 078 trails, impacts, marks or sparks (the probe's A/B, the determinism check). */
  off: boolean;

  constructor(scene: Scene, trails: TrailView, particles: () => Particles | undefined, lastOf: (id: number) => EnemyState | undefined) {
    this.trails = trails;
    this.particles = particles;
    this.lastOf = lastOf;
    this.marks = new MarkView(scene);
    this.fuses = new FuseView(scene);
    this.off = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fx') === 'off';
  }

  /**
   * Plays the frame's shot effects. `looks` is how ArrowView draws each straight round; `muzzle` the tube's drawn
   * muzzle this frame; `deltaMs` the tween clock's step.
   */
  update(sim: SimState, ev: SimEvents, shown: string, o: { muzzle: { x: number; y: number } | null; looks: (id: number) => RoundLook | undefined; quality: Quality; flashes: boolean; deltaMs: number }): void {
    const here = shown === sim.roomId;
    if (shown !== this.room || !here || this.off) {
      this.room = shown;
      this.tracks.clear();
      this.marks.clear();
      this.fuses.clear();
      this.clusters.length = 0;
      this.lastTick = sim.tick;
      if (!here || this.off) return;
    }
    this.marks.setQuality(o.quality);
    const ticks = this.lastTick < 0 ? 1 : sim.tick - this.lastTick;
    this.lastTick = sim.tick;
    const t = this.tracks;
    t.begin();
    for (const a of sim.arrows) if (a.roomId === shown) t.straight(a, o.looks(a.id));
    for (const b of sim.bombs) if (b.roomId === shown) t.lob(b);
    for (const b of sim.mines.bomblets) if (b.roomId === shown) t.bomblet(b);
    for (const m of sim.mines.armed) if (m.roomId === shown) t.mine(m);
    t.settle(ticks);
    const p = this.particles();
    if (p) this.play(sim, ev, p, o.quality, o.flashes, o.muzzle);
    if (p) this.shed(p, o.quality, o.deltaMs);
    this.glintFuses(o.flashes, FX_QUALITY[o.quality].additive, o.deltaMs);
    t.sweep();
    this.marks.update(o.deltaMs);
  }

  private play(sim: SimState, ev: SimEvents, p: Particles, quality: Quality, flashes: boolean, muzzle: { x: number; y: number } | null): void {
    const tracks = this.tracks.all;
    const m = matchImpacts(tracks, ev, (id) => this.reach(id), this.clusters);
    for (const s of ev.shots) this.muzzleSparks(p, sim, s.ammoId, s.x, s.y, muzzle, flashes);
    ev.hits.forEach((h, i) => {
      if (h.target !== 'enemy') return;
      const hit: HitMatch = m.hits[i] ?? { kind: 'skip' };
      if (hit.kind === 'round') {
        const look = tracks.find((x) => x.kind === 'straight' && x.id === hit.trackId)?.look ?? roundFx(hit.ammoId);
        this.impact(p, shownLook(look, flashes), hit.x, hit.y, Math.atan2(hit.dy, hit.dx), h.y, quality, 1);
      } else if (hit.kind === 'arc') {
        // An arc's hit plays half the lightning impact (064's arc is drawn by ArcView).
        this.impact(p, shownLook(cachedFx('shard', 'lightning', null, 'stone'), flashes), h.x, h.y, 0, h.y, quality, 0.5, true);
      } else if (hit.kind === 'fallback') {
        const element = elementOfDamage(h.damageType);
        const key = (element ? AMMO_FX.elements[element]?.fallback : undefined) ?? 'hitPhysical';
        p.emit(PARTICLES[key], h.x, h.y, h.y - 0.5, 'shot');
        this.fallbacks += 1;
      }
    });
    ev.bursts.forEach((b, i) => {
      const id = m.bursts[i] ?? null;
      const look = id ? roundFx(id) : cachedFx('bomb', elementOfDamage(b.damageType), null, 'stone');
      if (look.impact.cluster) {
        this.clusters.push({ x: b.x, y: b.y, ammoId: look.id });
        if (this.clusters.length > CLUSTERS_KEPT) this.clusters.shift();
      }
      this.blast(p, shownLook(look, flashes), b, quality);
    });
    ev.mineBursts.forEach((b, i) => this.blast(p, shownLook(roundFx(m.mines[i] ?? 'landmine'), flashes), b, quality));
    ev.bombletBursts.forEach((b, i) => this.blast(p, shownLook(bombletFx(m.bomblets[i] ?? 'bomb+cluster'), flashes), b, quality));
    for (const e of m.ends) {
      const look = e.ammoId === 'shard' ? null : roundFx(e.ammoId);
      const end = look ? shownLook(look, flashes).end : null;
      if (!end) continue;
      this.ends += 1;
      for (const b of end.bursts) p.emitFx(b, e.x, e.y, burstDepth(b, e.y, null), Math.atan2(e.dy, e.dx), 'end', true);
      if (end.ring) this.marks.flash(end.ring, e.x, e.y - DRAW_HEIGHT, e.y, 0, FX_QUALITY[quality].additive, end.ringScale);
    }
    for (const a of ev.mineArms) {
      const mine = sim.mines.armed.find((x) => x.id === a.id);
      const landing = mine ? roundFx(mine.ammoId).landing : AMMO_FX.families.landmine?.landing;
      if (landing) this.landings += p.emitFx(landing, a.x, a.y, a.y, 0, 'landingDust', false) > 0 ? 1 : 0;
    }
    if (sim.roomId === FOUNDRY_ROOM) for (const made of ev.made) this.machineSparks(p, sim, made.id, made.pieceId);
  }

  /** A struck enemy's hurtbox: its centre's height over its feet and how near a round's path must pass (half-size + 8). */
  private reach(id: number): { offsetY: number; r: number; half: number } | null {
    const e = this.lastOf(id);
    if (!e) return null;
    const hb = defOf(e).hurtbox;
    return { offsetY: hb.offsetY, r: Math.max(hb.w, hb.h) / 2 + 8, half: hb.w / 2 };
  }

  /** The round's muzzle sparks from the drawn muzzle down its lane (its new track's flight, else the shot's line from the player). */
  private muzzleSparks(p: Particles, sim: SimState, ammoId: string, x: number, y: number, muzzle: { x: number; y: number } | null, flashes: boolean): void {
    let best: (typeof this.tracks.all)[number] | null = null;
    for (const t of this.tracks.all) if (t.fresh && !t.muzzled && t.ammoId === ammoId && (!best || Math.hypot(t.x0 - x, t.y0 - y) < Math.hypot(best.x0 - x, best.y0 - y))) best = t;
    if (best) best.muzzled = true;
    const angle = best ? Math.atan2(best.dy, best.dx) : Math.atan2(y - sim.player.y, x - sim.player.x);
    const from = muzzle ?? { x, y: y - DRAW_HEIGHT };
    const look = shownLook(best?.look ?? roundFx(ammoId), flashes);
    const depth = sim.player.y + FEET_BOX.h / 2 + 1;
    let sparks = 0;
    for (const b of look.muzzle) sparks += p.emitFx(b, from.x, from.y, depth, angle, 'muzzle', false);
    this.muzzle = { x: from.x, y: from.y, angle, ammoId, sparks };
  }

  /** An impact at a point on the round's path (a ground point), its sparks just behind the struck enemy. */
  private impact(p: Particles, look: RoundLook, x: number, y: number, angle: number, struck: number, quality: Quality, scale: number, arc = false): void {
    const i = look.impact;
    let n = 0;
    let glints = 0;
    const tierBursts = look.tier === 'stone' ? 0 : (AMMO_FX.tiers[look.tier]?.impact.length ?? 0);
    i.bursts.forEach((b, k) => {
      const flew = p.emitFx(b, x, y, burstDepth(b, y, struck), angle, 'impact', true, scale);
      n += flew;
      if (k >= i.bursts.length - tierBursts) glints += flew;
    });
    const add = FX_QUALITY[quality].additive;
    const lift = HIT_LIFT;
    const depth = struck - 0.5;
    if (i.ring) this.marks.flash(i.ring, x, y - lift, depth, 0, add);
    if (i.tick) this.marks.flash(i.tick, x, y - lift, depth, angle + Math.PI / 4, add);
    if (i.star) this.marks.flash(i.star, x, y - lift, depth, 0, add, arc ? 0.6 : 1);
    if (i.mark && !arc) this.marks.mark(i.mark, x, y, 0);
    this.record(look, n, glints, !!(i.ring ?? i.tick ?? i.star), i.mark && !arc ? i.mark.look : null);
  }

  /** A blast at a burst's point: its debris and smoke, the shock ring to its radius and its mark (the flash is kept elsewhere). */
  private blast(p: Particles, look: RoundLook, b: BurstEvent, quality: Quality): void {
    const i = look.impact;
    let n = 0;
    let glints = 0;
    const tierBursts = look.tier === 'stone' ? 0 : (AMMO_FX.tiers[look.tier]?.impact.length ?? 0);
    i.bursts.forEach((x, k) => {
      const flew = p.emitFx(x, b.x, b.y, burstDepth(x, b.y, null), 0, 'blast', true);
      n += flew;
      if (k >= i.bursts.length - tierBursts) glints += flew;
    });
    if (i.shock) this.marks.shock(i.shock, b.x, b.y, b.radius);
    if (i.mark) this.marks.mark(i.mark, b.x, b.y, b.radius);
    if (i.star) this.marks.flash(i.star, b.x, b.y - HIT_LIFT, b.y, 0, FX_QUALITY[quality].additive);
    this.record(look, n, glints, false, i.mark?.look ?? null);
  }

  private record(look: RoundLook, particles: number, glints: number, flash: boolean, mark: string | null): void {
    this.played += 1;
    this.impacts.push({ look: look.id, kind: look.impact.kind, family: look.family, element: look.element, tier: look.tier, particles, glints, flash, mark });
    if (this.impacts.length > IMPACTS_KEPT) this.impacts.shift();
  }

  /** Each live round's shed bits at the tier's rate: ley motes, frost flakes, embers, fuse smoke (all lingering, under the telegraphs). */
  private shed(p: Particles, quality: Quality, deltaMs: number): void {
    const q = FX_QUALITY[quality];
    for (const t of this.tracks.all) {
      if (!t.live || (t.kind !== 'straight' && t.kind !== 'lob')) continue;
      const shed = t.look.shed;
      for (let k = 0; k < shed.length && k < 2; k++) {
        const s = shed[k];
        const every = s ? (s.rate === 'smoke' ? q.smokeMs : q.bitMs) : null;
        if (!s || every === null) continue;
        t.shed[k] = (t.shed[k] ?? 0) + deltaMs;
        if ((t.shed[k] ?? 0) < every) continue;
        t.shed[k] = 0;
        this.emitShed(p, s.burst, t.sx, t.sy, Math.atan2(t.dy, t.dx));
      }
    }
  }

  private emitShed(p: Particles, b: FxBurst, x: number, y: number, angle: number): void {
    p.emitFx(b, x, y, DEPTHS.shotTrail, angle, 'trailBits', false);
  }

  /** Each bomb's and bomblet's fuse glint in flight. */
  private glintFuses(flashes: boolean, additive: boolean, deltaMs: number): void {
    this.fuses.begin(deltaMs);
    for (const t of this.tracks.all) if (t.live && t.look.fuse && (t.kind === 'lob' || t.kind === 'bomblet')) this.fuses.glint(t.sx, t.sy, t.depth, t.id * 1.3, flashes, additive);
  }

  /** 4 sparks from a machine's window as it finishes a craft (`craftPuff` still plays). 079: the forges' are FoundryMood's. */
  private machineSparks(p: Particles, sim: SimState, id: number, pieceId: string): void {
    if (SPARKS.machines.includes(pieceId)) return;
    const colors = machineSparkColors(pieceId);
    const piece = sim.foundry.pieces.find((x) => x.id === id);
    if (!colors || !piece) return;
    const r = pieceRect(piece);
    const S = MACHINE_SPARKS.burst;
    const y = r.y + TILE_SIZE / 2;
    const b: FxBurst = { colors, count: S.count, speed: S.speed, aim: 'up', cone: S.cone, gravity: S.gravity, lifeMs: S.lifeMs, size: S.size, lift: MACHINE_SPARKS.windowLift };
    this.machine += p.emitFx(b, r.x, y, y + 1, 0, 'machineSparks', false);
  }

  /** Clears everything (a KO, a room swap). */
  clear(): void {
    this.tracks.clear();
    this.marks.clear();
    this.fuses.clear();
    this.trails.clear();
  }

  get shown(): AmmoFxShown {
    const tr = this.trails.shown;
    return {
      off: this.off,
      trails: tr.byKind,
      slots: tr.slots,
      trailCap: tr.cap,
      bend: tr.bend,
      drawn: tr.drawn,
      start: tr.start,
      fuses: this.fuses.count,
      marks: this.marks.shown,
      tracks: this.tracks.all.length,
      impacts: [...this.impacts],
      played: this.played,
      ends: this.ends,
      fallbacks: this.fallbacks,
      muzzle: this.muzzle ? { ...this.muzzle } : null,
      machineSparks: this.machine,
      landings: this.landings,
    };
  }
}
