import type { GameObjects, Scene } from 'phaser';
import { BlendModes } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { HOLLOWS } from '../data/hollows';
import { HOLLOWS_LOOK, HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { OVERWORLD_ROOM } from '../data/overworld';
import { altarState, type AltarState } from '../sim/altar';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { addVector, showFrame } from './vector/textures';

/** Stonefall Hollows' live things as drawn (034), for `ui().hollows`. */
export interface HollowsShown {
  /** The barrier over the gap: shut, collapsing (its fade running) or down; and its alpha. */
  barrier: 'shut' | 'collapsing' | 'down';
  barrierAlpha: number;
  /** The altar's frame state as drawn, or null outside the overworld. */
  altar: AltarState | null;
  /** The summon's cracking circle shows at the boss's start point. */
  summonCircle: boolean;
  /** Enemy bombs drawn: each one's id and how far its inner circle has grown (0..1). */
  enemyBombs: { id: number; progress: number }[];
}

export const NO_HOLLOWS_SHOWN: HollowsShown = { barrier: 'shut', barrierAlpha: 0, altar: null, summonCircle: false, enemyBombs: [] };

const T = TILE_SIZE;
const L = HOLLOWS_LOOK;

// Stonefall Hollows' live things (034): the ley barrier shimmering across the gap in the
// eastern cliffs until the shrine is claimed, then collapsing; the forum's altar (dim,
// awake, summoning) and the red circle cracking open where the Bulwark rises; and the
// Bulwark's bombs, each a red ring with a disc growing inside it, the bomb arcing in first.
export class HollowsView {
  private readonly scene: Scene;
  private readonly barrier: GameObjects.Graphics;
  private readonly altar: GameObjects.Image;
  private readonly summon: GameObjects.Graphics;
  private readonly circles: GameObjects.Graphics;
  private readonly bombs = new Map<number, GameObjects.Image>();
  private barrierState: HollowsShown['barrier'] = 'shut';
  private collapseMs = 0;
  private time = 0;
  /** The last summon's light, ms left after the boss rose. */
  private riseMs = 0;
  private shownState: HollowsShown = NO_HOLLOWS_SHOWN;

  constructor(scene: Scene) {
    this.scene = scene;
    this.barrier = scene.add.graphics().setVisible(false);
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
    const state = here ? altarState(sim, HOLLOWS.arena.altar.id) : null;
    this.altar.setVisible(here);
    if (state) showFrame(this.altar, state === 'awake' ? HOLLOWS_SPRITES.altar.awake : state === 'summoning' ? HOLLOWS_SPRITES.altar.summoning : HOLLOWS_SPRITES.altar.dim);
    if (sim.summoning === null && this.shownState.summonCircle) this.riseMs = L.barrier.collapseMs;
    this.riseMs = Math.max(0, this.riseMs - deltaMs);
    const summoning = here && sim.summoning !== null;
    this.drawSummon(summoning ? (sim.summoning?.ticks ?? 0) / HOLLOWS.arena.summonTicks : null);
    const bombs = this.drawBombs(sim, here);
    this.shownState = { barrier: this.barrierState, barrierAlpha: alpha, altar: state, summonCircle: summoning, enemyBombs: bombs };
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
    const color = colorOf(B.color);
    const shimmer = (Math.sin((this.time / B.shimmerMs) * Math.PI * 2) + 1) / 2;
    // The curtain stands up from the ground: drawn from the gap's top less its height to its bottom.
    const y0 = top - B.height;
    const w = T * 0.7;
    g.setVisible(true).setDepth(bottom);
    g.fillStyle(color, B.fill * alpha * (0.8 + 0.2 * shimmer)).fillRect(x - w / 2, y0, w, bottom - y0);
    if (k > 0) g.fillStyle(colorOf(B.glow), B.flash * Math.max(0, 1 - k * 3)).fillRect(x - w / 2, y0, w, bottom - y0);
    g.lineStyle(B.rimWidth, color, B.rim * alpha).strokeRect(x - w / 2, y0, w, bottom - y0);
    // Ripples climbing the curtain; while it collapses, shards of it fall.
    for (let i = 0; i < B.ripples; i++) {
      const f = ((this.time / B.shimmerMs + i / B.ripples) % 1 + 1) % 1;
      const y = bottom - f * (bottom - y0) + (k > 0 ? k * k * 120 * ((i % 2) + 1) : 0);
      g.lineStyle(1, colorOf(B.glow), (0.7 - 0.5 * f) * alpha).lineBetween(x - w / 2 + 2, y, x + w / 2 - 2, y - 6);
    }
    return alpha;
  }

  /** The summon: a red circle at the start point, its cracks spreading as `progress` runs 0..1; then a flare as the boss rises. */
  private drawSummon(progress: number | null): void {
    const g = this.summon;
    g.clear();
    const S = L.summon;
    const c = { x: (HOLLOWS.arena.start.tx + 0.5) * T, y: (HOLLOWS.arena.start.ty + 0.5) * T };
    const rise = this.riseMs > 0 ? this.riseMs / L.barrier.collapseMs : 0;
    if (progress === null && rise === 0) {
      g.setVisible(false);
      return;
    }
    const k = progress ?? 1;
    const color = colorOf(S.color);
    g.setVisible(true);
    g.lineStyle(2, color, S.alpha).strokeEllipse(c.x, c.y, S.radius * 2 * Math.min(1, k * 2), S.radius * Math.min(1, k * 2));
    for (let i = 0; i < S.cracks; i++) {
      const a = (i / S.cracks) * Math.PI * 2 + 0.4;
      const r = S.radius * k;
      g.lineStyle(1.5, color, S.alpha).lineBetween(c.x, c.y, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.5);
    }
    if (rise > 0) g.fillStyle(color, 0.5 * rise).fillEllipse(c.x, c.y - 20, S.radius * 1.2, S.radius * 2.4 * rise);
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
