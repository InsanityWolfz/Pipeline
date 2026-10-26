import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, ENEMY_FX } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { CONDUCTOR_LOOK, CONDUCTOR_SPRITES } from '../data/conductorAssets';
import type { ConductorDef } from '../data/enemies';
import { HOLLOWS_LOOK, HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { OVERWORLD_ROOM } from '../data/overworld';
import { CROWN_SPIRE } from '../data/stormcrownSites';
import { altarState, type AltarState } from '../sim/altar';
import { chainSegments } from '../sim/conductorAi';
import { conductorDefOf, rodBox, rodPoint } from '../sim/conductorRods';
import type { EnemyState } from '../sim/enemies';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { boltPoints, drawBolt } from './bolt';
import { colorOf } from './color';
import { drawCrackedCircle } from './crackedCircle';
import { addVector, showFrame } from './vector/textures';

type RodLook = keyof typeof CONDUCTOR_SPRITES.rod;

/** The Conductor's pieces as drawn (064), for `ui().stormcrown.conductor`. */
export interface ConductorShown {
  /** Each arena rod's look (none while no Conductor is in the room on screen), and the rod a blink's warning flashes (-1: none). */
  rods: RodLook[];
  target: number;
  /** Storm call circles on show, whether the rod chain's lightning runs, and bolts (lashes, strikes) still fading. */
  strikes: number;
  chain: boolean;
  bolts: number;
  /** The Crown Spire's altar as drawn (null outside the overworld), and whether its summon's circle shows. */
  altar: AltarState | null;
  summonCircle: boolean;
}

export const NO_CONDUCTOR_SHOWN: ConductorShown = { rods: [], target: -1, strikes: 0, chain: false, bolts: 0, altar: null, summonCircle: false };

const L = CONDUCTOR_LOOK;
const T = TILE_SIZE;

/** A lash, a strike's landing or a blink's flare, fading. */
interface Flash {
  kind: 'lash' | 'strike' | 'blink';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  age: number;
  seed: number;
}

/** A rod's look: broken, regrowing over its last ticks, else standing. */
const lookOf = (regrow: number): RodLook => (regrow <= 0 ? 'standing' : regrow <= L.rod.regrowingTicks ? 'regrowing' : 'broken');

// The Conductor's pieces beyond its rig (064): the six arena rods at their sockets (standing, snapped off, or sprouting
// cyan light as they regrow), each with a small bar once hurt (cyan, filling back, while broken); the flickering light
// up the rod a blink's warning names; the blink's flare where it vanishes and where it appears; the storm call's red
// circles filling to their edge and the bolts that land in them; the lash's bolt along its line; the rod chain's
// lightning running rod to rod; and the spire's altar and its summon (the forum's look).
export class ConductorView {
  private readonly scene: Scene;
  private readonly rods: GameObjects.Image[];
  private readonly bars: GameObjects.Graphics;
  private readonly ground: GameObjects.Graphics;
  private readonly light: GameObjects.Graphics;
  private readonly altar: GameObjects.Image;
  private readonly summon: GameObjects.Graphics;
  private flashes: Flash[] = [];
  private riseMs = 0;
  private time = 0;
  private shownState: ConductorShown = NO_CONDUCTOR_SHOWN;

  constructor(scene: Scene) {
    this.scene = scene;
    this.rods = CROWN_SPIRE.sockets.map((p) => addVector(scene, p.x, p.y, CONDUCTOR_SPRITES.rod.standing).setDepth(p.y).setVisible(false));
    this.bars = scene.add.graphics().setDepth(DEPTHS.worldUi - 1);
    this.ground = scene.add.graphics().setDepth(DEPTHS.groundFx);
    this.light = scene.add.graphics().setDepth(DEPTHS.motes).setBlendMode(BlendModes.ADD);
    const a = CROWN_SPIRE.altar;
    this.altar = addVector(scene, (a.tx + 0.5) * T, (a.ty + 1) * T, HOLLOWS_SPRITES.altar.dim).setDepth((a.ty + 1) * T).setVisible(false);
    this.summon = scene.add.graphics().setDepth(DEPTHS.groundFx).setBlendMode(BlendModes.ADD).setVisible(false);
  }

  get shown(): ConductorShown {
    return this.shownState;
  }

  /** `events` are the ticks' since the last draw; `deltaMs` the frame's time on the tween clock. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    const c = sim.enemies.find((e) => e.roomId === shown && e.health > 0 && conductorDefOf(e) !== null);
    const def = c ? conductorDefOf(c) : null;
    this.collect(events, c);
    for (const f of this.flashes) f.age += deltaMs;
    this.flashes = this.flashes.filter((f) => f.age < this.lifeOf(f.kind));
    this.ground.clear();
    this.light.clear();
    this.bars.clear();
    const rods = c && def ? this.drawRods(c, def) : this.idleRods(shown === OVERWORLD_ROOM);
    const strikes = this.drawStrikes(sim, shown);
    const chain = c !== undefined && c.conductor.attack === 2 && c.mode === 'swipe';
    if (c && chain) this.drawChain(c);
    if (c && c.conductor.blinkTo >= 0) this.drawTarget(c.conductor.blinkTo);
    this.drawFlashes();
    const here = shown === OVERWORLD_ROOM;
    const state = here ? altarState(sim, CROWN_SPIRE.altar.id) : null;
    this.altar.setVisible(here);
    if (state) showFrame(this.altar, state === 'awake' ? HOLLOWS_SPRITES.altar.awake : state === 'summoning' ? HOLLOWS_SPRITES.altar.summoning : HOLLOWS_SPRITES.altar.dim);
    const summoning = here && sim.summoning?.altar === CROWN_SPIRE.altar.id;
    if (!summoning && this.shownState.summonCircle) this.riseMs = HOLLOWS_LOOK.summon.riseMs;
    this.riseMs = Math.max(0, this.riseMs - deltaMs);
    this.drawSummon(summoning ? (sim.summoning?.ticks ?? 0) / CROWN_SPIRE.summonTicks : null);
    this.shownState = { rods, target: c?.conductor.blinkTo ?? -1, strikes, chain, bolts: this.flashes.length, altar: state, summonCircle: summoning };
  }

  private lifeOf(kind: Flash['kind']): number {
    return kind === 'lash' ? L.lash.boltMs : kind === 'strike' ? L.landing.ms : L.blink.ms;
  }

  /** This frame's lashes, landings and blinks, as fading flashes (the Conductor's own, in the room on screen). */
  private collect(ev: SimEvents, c: EnemyState | undefined): void {
    const seed = Math.floor(this.time);
    if (c) for (const l of ev.lashes) if (l.id === c.id) this.flashes.push({ kind: 'lash', ...l, age: 0, seed });
    if (c) for (const b of ev.blinks) if (b.id === c.id) this.flashes.push({ kind: 'blink', x0: b.fromX, y0: b.fromY, x1: b.toX, y1: b.toY, age: 0, seed });
    for (const s of ev.strikes) if (c && s.id === c.id) this.flashes.push({ kind: 'strike', x0: s.x, y0: s.y - L.landing.drop, x1: s.x, y1: s.y, age: 0, seed: seed + s.x });
  }

  /** With no Conductor on screen, the spire's rods stand (in the room it stands in), whole. */
  private idleRods(here: boolean): RodLook[] {
    for (const r of this.rods) {
      if (here && r.frame.name !== CONDUCTOR_SPRITES.rod.standing) showFrame(r, CONDUCTOR_SPRITES.rod.standing);
      r.setVisible(here);
    }
    return [];
  }

  /** The six rods at their sockets, and each one's small bar once hurt. */
  private drawRods(c: EnemyState, def: ConductorDef): RodLook[] {
    const B = L.rod.bar;
    return c.conductor.rods.map((r, i) => {
      const look = lookOf(r.regrow);
      const sprite = this.rods[i];
      if (sprite) {
        const frame = CONDUCTOR_SPRITES.rod[look];
        if (sprite.frame.name !== frame) showFrame(sprite, frame);
        sprite.setVisible(true);
      }
      if (r.regrow > 0 || r.health < def.rods.health) {
        const box = rodBox(def, i);
        const x = Math.round(box.x - B.w / 2);
        const y = Math.round(box.y - box.h / 2 - B.gap - B.h);
        const k = r.regrow > 0 ? 1 - r.regrow / def.rods.regrowTicks : r.health / def.rods.health;
        this.bars.fillStyle(colorOf(B.back)).fillRect(x - B.border, y - B.border, B.w + B.border * 2, B.h + B.border * 2);
        this.bars.fillStyle(colorOf(r.regrow > 0 ? B.regrow : B.color)).fillRect(x, y, Math.max(1, Math.round(B.w * k)), B.h);
      }
      return look;
    });
  }

  /** The rod a blink's warning names: a flickering column up it and a ring at its base. */
  private drawTarget(rod: number): void {
    const F = L.target;
    const p = rodPoint(rod);
    const on = Math.floor(this.time / F.pulseMs) % 2 === 0;
    const alpha = on ? F.alpha[1] : F.alpha[0];
    this.light.fillStyle(colorOf(F.color), alpha).fillRect(p.x - F.w / 2, p.y - F.h, F.w, F.h);
    this.light.lineStyle(F.ringWidth, colorOf(F.ring), alpha).strokeEllipse(p.x, p.y, F.ringR * 2, F.ringR);
  }

  /** The storm call's circles in the room on screen, shaded red and filling to their edge. Returns how many. */
  private drawStrikes(sim: SimState, shown: string): number {
    const S = L.strike;
    const red = colorOf(ENEMY_FX.telegraphColor);
    const list = sim.strikes.filter((s) => s.roomId === shown);
    for (const s of list) {
      const k = 1 - s.delay / Math.max(1, s.delayTicks);
      this.ground.fillStyle(red, S.alpha).fillCircle(s.x, s.y, s.r);
      this.ground.fillStyle(red, S.fillAlpha).fillCircle(s.x, s.y, s.r * k);
      this.ground.lineStyle(S.edgeWidth, red, S.edgeAlpha).strokeCircle(s.x, s.y, s.r);
    }
    return list.length;
  }

  /** The rod chain's lightning along its lines, flickering. */
  private drawChain(c: EnemyState): void {
    const C = L.chain;
    const seed = Math.floor(this.time / C.flickerMs);
    for (const [i, s] of chainSegments(c).entries()) drawBolt(this.light, boltPoints(s.x0, s.y0, s.x1, s.y1, C.step, C.jag, seed * 7 + i), C, 1);
  }

  /** The lashes and landings as bolts, and the blinks' flares, fading. */
  private drawFlashes(): void {
    const C = L.chain;
    for (const f of this.flashes) {
      const alpha = 1 - f.age / this.lifeOf(f.kind);
      if (f.kind === 'blink') {
        const B = L.blink;
        for (const [x, y] of [[f.x0, f.y0], [f.x1, f.y1]] as const) {
          this.light.fillStyle(colorOf(B.color), 0.6 * alpha).fillEllipse(x, y - B.h / 2, B.w, B.h);
          this.light.fillStyle(colorOf(B.core), 0.8 * alpha).fillEllipse(x, y - B.h / 2, B.w * 0.35, B.h * 0.8);
        }
        continue;
      }
      const J = f.kind === 'lash' ? { step: C.step, jag: C.jag } : L.landing;
      drawBolt(this.light, boltPoints(f.x0, f.y0, f.x1, f.y1, J.step, J.jag, f.seed), C, alpha);
    }
  }

  /** The summon (034's look): a red circle at its start, its cracks spreading as `progress` runs 0..1; then a flare as it rises. */
  private drawSummon(progress: number | null): void {
    const g = this.summon.clear();
    const S = HOLLOWS_LOOK.summon;
    const rise = this.riseMs > 0 ? this.riseMs / S.riseMs : 0;
    if (progress === null && rise === 0) {
      g.setVisible(false);
      return;
    }
    const c = { x: (CROWN_SPIRE.start.tx + 0.5) * T, y: (CROWN_SPIRE.start.ty + 0.5) * T };
    g.setVisible(true);
    drawCrackedCircle(g, c.x, c.y, S.radius, progress ?? 1);
    const F = S.flare;
    if (rise > 0) g.fillStyle(colorOf(S.color), F.alpha * rise).fillEllipse(c.x, c.y - F.lift, S.radius * F.w, S.radius * F.h * rise);
  }
}
