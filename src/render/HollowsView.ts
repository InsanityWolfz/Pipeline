import type { GameObjects, Scene } from 'phaser';
import { BlendModes } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { HOLLOWS } from '../data/hollows';
import { WORLD_SHAPE } from '../data/worldShape';
import { HOLLOWS_LOOK, HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { OVERWORLD_ROOM } from '../data/overworld';
import { altarState, type AltarState } from '../sim/altar';
import { ARENA_ROOMS, arenaSealed } from '../sim/arenaLock';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { drawCurtain } from './leyCurtain';
import { addVector, showFrame } from './vector/textures';
import { drawCrackedCircle } from './crackedCircle';

/** Stonefall Hollows' live things as drawn (034), for `ui().hollows`. */
export interface HollowsShown {
  /** The barrier over the gap: shut, collapsing (its fade running) or down; and its alpha. */
  barrier: 'shut' | 'collapsing' | 'down';
  barrierAlpha: number;
  /** The Sunken Forum's seal across its way in (043): shut while the Bulwark fights, fading as it drops, or down; and its alpha. */
  seal: 'shut' | 'fading' | 'down';
  sealAlpha: number;
  /** The altar's frame state as drawn, or null outside the overworld. */
  altar: AltarState | null;
  /** The summon's cracking circle shows at the boss's start point. */
  summonCircle: boolean;
  /** Enemy bombs drawn: each one's id and how far its inner circle has grown (0..1). */
  enemyBombs: { id: number; progress: number }[];
}

export const NO_HOLLOWS_SHOWN: HollowsShown = { barrier: 'shut', barrierAlpha: 0, seal: 'down', sealAlpha: 0, altar: null, summonCircle: false, enemyBombs: [] };

const T = TILE_SIZE;
const L = HOLLOWS_LOOK;

/** The barrier's circle (053.2) in world px: its centre and radius, through the middle of its band of tiles. */
const RING = {
  x: (WORLD_SHAPE.centre.tx + 0.5) * TILE_SIZE,
  y: (WORLD_SHAPE.centre.ty + 0.5) * TILE_SIZE,
  r: WORLD_SHAPE.region1 * TILE_SIZE,
};

/** Fills the upright quad standing `h` px tall on the ground from a to b, in the graphics' current fill. */
function quad(g: GameObjects.Graphics, a: { x: number; y: number }, b: { x: number; y: number }, h: number): void {
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(b.x, b.y - h);
  g.lineTo(a.x, a.y - h);
  g.closePath();
  g.fillPath();
}

// Stonefall Hollows' live things (034): the ley barrier shimmering on the circle round Region 1 (053) until the
// shrine is claimed, then collapsing; the same curtain across the
// forum's way in while the Bulwark fights (043), fading as it drops; the forum's altar (dim,
// awake, summoning) and the red circle cracking open where the Bulwark rises; and the
// Bulwark's bombs, each a red ring with a disc growing inside it, the bomb arcing in first.
export class HollowsView {
  private readonly scene: Scene;
  /** 053: the barrier's curtain, one graphics per gate row in view (each at its row's depth), reused frame to frame. */
  private readonly barrier: GameObjects.Graphics[] = [];

  private readonly seal: GameObjects.Graphics;
  /** The seal's span across the way in, px, and the door row (fixed data, worked out once). */
  private readonly sealSpan: { x0: number; x1: number; ty: number };
  private readonly altar: GameObjects.Image;
  private readonly summon: GameObjects.Graphics;
  private readonly circles: GameObjects.Graphics;
  private readonly bombs = new Map<number, GameObjects.Image>();
  private barrierState: HollowsShown['barrier'] = 'shut';
  private collapseMs = 0;
  private sealState: HollowsShown['seal'] = 'down';
  private sealFadeMs = 0;
  private time = 0;
  /** The last summon's light, ms left after the boss rose. */
  private riseMs = 0;
  private shownState: HollowsShown = NO_HOLLOWS_SHOWN;

  constructor(scene: Scene) {
    this.scene = scene;
    this.seal = scene.add.graphics().setVisible(false);
    const tiles = HOLLOWS.arena.seal.tiles;
    this.sealSpan = { x0: Math.min(...tiles.map((t) => t.tx)) * T, x1: (Math.max(...tiles.map((t) => t.tx)) + 1) * T, ty: tiles[0]?.ty ?? 0 };
    const a = HOLLOWS.arena.altar;
    this.altar = addVector(scene, (a.tx + 0.5) * T, (a.ty + 1) * T, HOLLOWS_SPRITES.altar.dim).setDepth((a.ty + 1) * T).setVisible(false);
    this.summon = scene.add.graphics().setDepth(DEPTHS.groundFx).setBlendMode(BlendModes.ADD).setVisible(false);
    this.circles = scene.add.graphics().setDepth(DEPTHS.groundFx).setVisible(false);
  }

  get shown(): HollowsShown {
    return this.shownState;
  }

  /** `events` are the ticks' since the last draw; `deltaMs` the frame's time on the tween clock. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const here = shown === OVERWORLD_ROOM;
    this.time += deltaMs;
    if (this.barrierState === 'shut' && sim.gates.hollows) {
      // Down at boot (a start with the shrine claimed) shows nothing; down now collapses.
      this.barrierState = events.gates.some((g) => g.gate === 'hollows') ? 'collapsing' : 'down';
      this.collapseMs = 0;
    }
    if (this.barrierState === 'collapsing') {
      this.collapseMs += deltaMs;
      if (this.collapseMs >= L.barrier.collapseMs) this.barrierState = 'down';
    }
    const alpha = this.drawBarrier(here);
    // 044: the forum's seal and the Bulwark's bombs show wherever the forum stands (the sandbox's room too).
    const arenaHere = ARENA_ROOMS.includes(shown);
    const sealAlpha = this.drawSeal(arenaHere, arenaSealed(sim, HOLLOWS.arena, arenaHere ? shown : OVERWORLD_ROOM), deltaMs);
    const state = here ? altarState(sim, HOLLOWS.arena.altar.id) : null;
    this.altar.setVisible(here);
    if (state) showFrame(this.altar, state === 'awake' ? HOLLOWS_SPRITES.altar.awake : state === 'summoning' ? HOLLOWS_SPRITES.altar.summoning : HOLLOWS_SPRITES.altar.dim);
    if (sim.summoning === null && this.shownState.summonCircle) this.riseMs = L.summon.riseMs;
    this.riseMs = Math.max(0, this.riseMs - deltaMs);
    const summoning = here && sim.summoning !== null;
    this.drawSummon(summoning ? (sim.summoning?.ticks ?? 0) / HOLLOWS.arena.summonTicks : null);
    const bombs = this.drawBombs(sim, arenaHere);
    this.shownState = { barrier: this.barrierState, barrierAlpha: alpha, seal: this.sealState, sealAlpha, altar: state, summonCircle: summoning, enemyBombs: bombs };
  }

  /**
   * The barrier (053.2: the whole circle round Region 1): a curtain of cyan light standing up from the circle, its top
   * rim bright and its ripples climbing; collapsing, it flashes and fades. Drawn in short straight lengths, only those
   * in view, each in a graphics at its foot's row so the curtain stands behind what's south of it. Returns its alpha.
   */
  private drawBarrier(here: boolean): number {
    for (const g of this.barrier) g.clear().setVisible(false);
    if (!here || this.barrierState === 'down') return 0;
    const B = L.barrier;
    const k = this.barrierState === 'collapsing' ? this.collapseMs / B.collapseMs : 0;
    const alpha = this.barrierState === 'collapsing' ? Math.max(0, 1 - k) : 1;
    const v = this.scene.cameras.main.worldView;
    const color = colorOf(B.color);
    const glow = colorOf(B.glow);
    const shimmer = (Math.sin((this.time / B.shimmerMs) * Math.PI * 2) + 1) / 2;
    const fill = B.fill * alpha * (1 - B.shimmerDip + B.shimmerDip * shimmer);
    const n = Math.ceil((2 * Math.PI * RING.r) / B.segment);
    const rows = new Map<number, GameObjects.Graphics>();
    let used = 0;
    const at = (i: number) => ({ x: RING.x + RING.r * Math.cos((i / n) * 2 * Math.PI), y: RING.y + RING.r * Math.sin((i / n) * 2 * Math.PI) });
    for (let i = 0; i < n; i++) {
      const a = at(i);
      const b = at(i + 1);
      if (Math.max(a.x, b.x) < v.x || Math.min(a.x, b.x) > v.x + v.width || Math.max(a.y, b.y) < v.y || Math.min(a.y, b.y) - B.height > v.y + v.height) continue;
      const row = Math.floor(Math.max(a.y, b.y) / T);
      let g = rows.get(row);
      if (!g) {
        g = this.barrier[used] ?? this.scene.add.graphics();
        this.barrier[used++] = g;
        g.setVisible(true).setDepth((row + 1) * T);
        rows.set(row, g);
      }
      const fall = k > 0 ? k * k * B.shardFall : 0;
      quad(g.fillStyle(color, fill), a, b, B.height);
      if (k > 0) quad(g.fillStyle(glow, B.flash * Math.max(0, 1 - k * B.flashFade)), a, b, B.height);
      g.lineStyle(B.rimWidth, color, B.rim * alpha).lineBetween(a.x, a.y - B.height, b.x, b.y - B.height);
      for (let r = 0; r < B.ripples; r++) {
        const f = (((this.time / B.shimmerMs + r / B.ripples + i * B.rippleSkew) % 1) + 1) % 1;
        const h = f * B.height - fall * ((r % 2) + 1);
        g.lineStyle(B.ripple.width, glow, (B.ripple.alpha - B.ripple.fade * f) * alpha).lineBetween(a.x, a.y - h, b.x, b.y - h);
      }
    }
    return alpha;
  }

  /**
   * The forum's seal (043): the barrier's curtain lying across the way in while `sealed`; as it drops it fades as the
   * barrier collapses. Returns its alpha.
   */
  private drawSeal(here: boolean, sealed: boolean, deltaMs: number): number {
    const g = this.seal;
    g.clear();
    if (sealed) this.sealState = 'shut';
    else if (this.sealState === 'shut') {
      this.sealState = 'fading';
      this.sealFadeMs = 0;
    }
    const B = L.barrier;
    if (this.sealState === 'fading') {
      this.sealFadeMs += deltaMs;
      if (this.sealFadeMs >= B.collapseMs) this.sealState = 'down';
    }
    if (!here || this.sealState === 'down') {
      g.setVisible(false);
      return 0;
    }
    const { x0, x1, ty } = this.sealSpan;
    // It stands on the door row's middle, its curtain's footprint as deep as the barrier's is wide.
    const half = (T * B.width) / 2;
    const bottom = (ty + 0.5) * T + half;
    const k = this.sealState === 'fading' ? this.sealFadeMs / B.collapseMs : 0;
    const alpha = this.sealState === 'fading' ? Math.max(0, 1 - k) : 1;
    g.setVisible(true).setDepth(bottom);
    drawCurtain(g, { x0, x1, top: bottom - 2 * half - B.height, bottom }, this.time, k, alpha);
    return alpha;
  }

  /** The summon: a red circle at the start point, its cracks spreading as `progress` runs 0..1; then a flare as the boss rises. */
  private drawSummon(progress: number | null): void {
    const g = this.summon;
    g.clear();
    const S = L.summon;
    const c = { x: (HOLLOWS.arena.start.tx + 0.5) * T, y: (HOLLOWS.arena.start.ty + 0.5) * T };
    const rise = this.riseMs > 0 ? this.riseMs / S.riseMs : 0;
    if (progress === null && rise === 0) {
      g.setVisible(false);
      return;
    }
    const k = progress ?? 1;
    const color = colorOf(S.color);
    g.setVisible(true);
    drawCrackedCircle(g, c.x, c.y, S.radius, k);
    const F = S.flare;
    if (rise > 0) g.fillStyle(color, F.alpha * rise).fillEllipse(c.x, c.y - F.lift, S.radius * F.w, S.radius * F.h * rise);
  }

  /** Each enemy bomb: its ring and growing disc, and the bomb arcing in from the thrower, then sitting at the centre. */
  private drawBombs(sim: SimState, here: boolean): HollowsShown['enemyBombs'] {
    const g = this.circles;
    g.clear();
    const B = L.bomb;
    const live = new Set<number>();
    const out: HollowsShown['enemyBombs'] = [];
    for (const b of here ? sim.enemyBombs.filter((x) => x.roomId === sim.roomId) : []) {
      live.add(b.id);
      const progress = Math.min(1, b.fuse / b.fuseTicks);
      out.push({ id: b.id, progress });
      const color = colorOf(B.color);
      g.lineStyle(B.ringWidth, color, B.ringAlpha).strokeCircle(b.x, b.y, b.radius);
      g.fillStyle(color, B.fillAlpha).fillCircle(b.x, b.y, Math.max(1, b.radius * progress));
      // 041.12: an enraged Bulwark's bomb, which a roll won't save from, wears a second ring.
      if (b.rollProof) g.lineStyle(L.rollProof.width, colorOf(L.rollProof.color), L.rollProof.alpha).strokeCircle(b.x, b.y, b.radius + L.rollProof.gap);
      const t = Math.min(1, b.fuse / B.flightTicks);
      const x = b.fromX + (b.x - b.fromX) * t;
      const y = b.fromY + (b.y - b.fromY) * t - 4 * B.arcPeak * t * (1 - t);
      const sprite = this.bombs.get(b.id) ?? addVector(this.scene, x, y, HOLLOWS_SPRITES.enemyBomb);
      this.bombs.set(b.id, sprite);
      sprite.setPosition(x, y).setDepth(t < 1 ? DEPTHS.worldUi - 2 : b.y);
    }
    g.setVisible(out.length > 0);
    for (const [id, sprite] of this.bombs) {
      if (live.has(id)) continue;
      sprite.destroy();
      this.bombs.delete(id);
    }
    return out;
  }
}
