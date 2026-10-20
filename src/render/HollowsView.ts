import type { GameObjects, Scene } from 'phaser';
import { BlendModes } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { HOLLOWS } from '../data/hollows';
import { HOLLOWS_LOOK, HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { OVERWORLD_ROOM } from '../data/overworld';
import { altarState, type AltarState } from '../sim/altar';
import { arenaSealed } from '../sim/arenaLock';
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

// Stonefall Hollows' live things (034): the ley barrier shimmering across the gap in the
// eastern cliffs until the shrine is claimed, then collapsing; the same curtain across the
// forum's way in while the Bulwark fights (043), fading as it drops; the forum's altar (dim,
// awake, summoning) and the red circle cracking open where the Bulwark rises; and the
// Bulwark's bombs, each a red ring with a disc growing inside it, the bomb arcing in first.
export class HollowsView {
  private readonly scene: Scene;
  private readonly barrier: GameObjects.Graphics;
  private readonly seal: GameObjects.Graphics;
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
    this.barrier = scene.add.graphics().setVisible(false);
    this.seal = scene.add.graphics().setVisible(false);
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
    const sealAlpha = this.drawSeal(here, arenaSealed(sim, HOLLOWS.arena), deltaMs);
    const state = here ? altarState(sim, HOLLOWS.arena.altar.id) : null;
    this.altar.setVisible(here);
    if (state) showFrame(this.altar, state === 'awake' ? HOLLOWS_SPRITES.altar.awake : state === 'summoning' ? HOLLOWS_SPRITES.altar.summoning : HOLLOWS_SPRITES.altar.dim);
    if (sim.summoning === null && this.shownState.summonCircle) this.riseMs = L.summon.riseMs;
    this.riseMs = Math.max(0, this.riseMs - deltaMs);
    const summoning = here && sim.summoning !== null;
    this.drawSummon(summoning ? (sim.summoning?.ticks ?? 0) / HOLLOWS.arena.summonTicks : null);
    const bombs = this.drawBombs(sim, here);
    this.shownState = { barrier: this.barrierState, barrierAlpha: alpha, seal: this.sealState, sealAlpha, altar: state, summonCircle: summoning, enemyBombs: bombs };
  }

  /** The barrier: a cyan curtain of light over the gap, its ripples climbing; collapsing, it flashes and fades. Returns its alpha. */
  private drawBarrier(here: boolean): number {
    const g = this.barrier;
    g.clear();
    if (!here || this.barrierState === 'down') {
      g.setVisible(false);
      return 0;
    }
    const B = L.barrier;
    const gate = HOLLOWS.gate;
    const x = (gate[0]?.tx ?? 0) * T + T / 2;
    const top = (gate[0]?.ty ?? 0) * T;
    const bottom = ((gate[gate.length - 1]?.ty ?? 0) + 1) * T;
    const k = this.barrierState === 'collapsing' ? this.collapseMs / B.collapseMs : 0;
    const alpha = this.barrierState === 'collapsing' ? Math.max(0, 1 - k) : 1;
    // The curtain stands up from the ground: drawn from the gap's top less its height to its bottom.
    const w = T * B.width;
    g.setVisible(true).setDepth(bottom);
    drawCurtain(g, { x0: x - w / 2, x1: x + w / 2, top: top - B.height, bottom }, this.time, k, alpha);
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
    const tiles = HOLLOWS.arena.seal.tiles;
    const x0 = Math.min(...tiles.map((t) => t.tx)) * T;
    const x1 = (Math.max(...tiles.map((t) => t.tx)) + 1) * T;
    // It stands on the door row's middle, its curtain's footprint as deep as the barrier's is wide.
    const half = (T * B.width) / 2;
    const bottom = ((tiles[0]?.ty ?? 0) + 0.5) * T + half;
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
