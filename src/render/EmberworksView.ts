import { BlendModes, type GameObjects, type Scene } from 'phaser';
import type { WorldLayer } from './lighting/WorldLayer';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { EMBERWORKS } from '../data/emberworks';
import { ANVIL_HALL } from '../data/emberworksSites';
import { HOLLOWS_LOOK, HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { OVERWORLD_ROOM } from '../data/overworld';
import { altarState, type AltarState } from '../sim/altar';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { drawCrackedCircle } from './crackedCircle';
import { ForgewrightView, NO_FORGE_SHOWN, type ForgeShown } from './ForgewrightView';
import { RingCurtain, type CurtainArc } from './ringCurtain';
import { addVector, showFrame } from './vector/textures';

/** The Emberworks' live things as drawn (060), for `ui().emberworks`. */
export interface EmberworksShown {
  /** The barrier across the ramps: shut, collapsing (its fade running) or down; and its alpha. */
  barrier: 'shut' | 'collapsing' | 'down';
  barrierAlpha: number;
  /** The Anvil Hall's altar as drawn (null outside the overworld), and whether its summon's circle shows. */
  altar: AltarState | null;
  summonCircle: boolean;
  /** The Forgewright's bellows, pools and core. */
  forge: ForgeShown;
}

export const NO_EMBERWORKS_SHOWN: EmberworksShown = { barrier: 'shut', barrierAlpha: 0, altar: null, summonCircle: false, forge: NO_FORGE_SHOWN };

const T = TILE_SIZE;

/**
 * The barrier's arcs: across the top of each ramp, on the circle its gate band stands on, as wide as the ramp and half
 * a tile more each side so it meets the cliffs. Screen angles: a bearing (clockwise from north) less a quarter turn.
 */
const ARCS: readonly CurtainArc[] = EMBERWORKS.ramps.map((ramp) => {
  const { gateAt, halfWidth } = EMBERWORKS.ramp;
  const a = ((ramp.bearing - 90) * Math.PI) / 180;
  const half = (halfWidth + 0.5) / gateAt;
  return { r: gateAt, from: a - half, to: a + half };
});

// The Emberworks' live things (060): the ley barrier across the top of each ramp up through the Hollows' cliff edge,
// in the Hollows barrier's look (ringCurtain.ts), until the Bulwark's first kill, then collapsing with it; the Anvil
// Hall's altar (the forum's look: dim, awake, summoning) and the red circle cracking open where the Forgewright rises;
// and the Forgewright's own pieces (ForgewrightView.ts).
export class EmberworksView {
  private readonly curtain: RingCurtain;
  private readonly altar: GameObjects.Image;
  private readonly summon: GameObjects.Graphics;
  private readonly forge: ForgewrightView;
  private riseMs = 0;
  private barrierState: EmberworksShown['barrier'] = 'shut';
  private collapseMs = 0;
  private time = 0;
  private shownState: EmberworksShown = NO_EMBERWORKS_SHOWN;

  /** `world` (074 review): the altar takes the region's mood and lights. */
  constructor(scene: Scene, world?: WorldLayer) {
    this.curtain = new RingCurtain(scene);
    const a = ANVIL_HALL.altar;
    this.altar = addVector(scene, (a.tx + 0.5) * T, (a.ty + 1) * T, HOLLOWS_SPRITES.altar.dim).setDepth((a.ty + 1) * T).setVisible(false);
    world?.addProp(this.altar);
    this.summon = scene.add.graphics().setDepth(DEPTHS.groundFx).setBlendMode(BlendModes.ADD).setVisible(false);
    this.forge = new ForgewrightView(scene);
  }

  get shown(): EmberworksShown {
    return this.shownState;
  }

  /** `events` are the ticks' since the last draw; `deltaMs` the frame's time on the tween clock. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const B = HOLLOWS_LOOK.barrier;
    this.time += deltaMs;
    if (this.barrierState === 'shut' && sim.gates.emberworks) {
      // Down at boot (a loaded game past the Bulwark) shows nothing; down now collapses.
      this.barrierState = events.gates.some((g) => g.gate === 'emberworks') ? 'collapsing' : 'down';
      this.collapseMs = 0;
    }
    if (this.barrierState === 'collapsing') {
      this.collapseMs += deltaMs;
      if (this.collapseMs >= B.collapseMs) this.barrierState = 'down';
    }
    let alpha = 0;
    if (shown !== OVERWORLD_ROOM || this.barrierState === 'down') this.curtain.clear();
    else {
      const k = this.barrierState === 'collapsing' ? this.collapseMs / B.collapseMs : 0;
      alpha = this.barrierState === 'collapsing' ? Math.max(0, 1 - k) : 1;
      this.curtain.draw(ARCS, this.time, k, alpha);
    }
    const here = shown === OVERWORLD_ROOM;
    const state = here ? altarState(sim, ANVIL_HALL.altar.id) : null;
    this.altar.setVisible(here);
    if (state) showFrame(this.altar, state === 'awake' ? HOLLOWS_SPRITES.altar.awake : state === 'summoning' ? HOLLOWS_SPRITES.altar.summoning : HOLLOWS_SPRITES.altar.dim);
    const summoning = here && sim.summoning?.altar === ANVIL_HALL.altar.id;
    if (!summoning && this.shownState.summonCircle) this.riseMs = HOLLOWS_LOOK.summon.riseMs;
    this.riseMs = Math.max(0, this.riseMs - deltaMs);
    this.drawSummon(summoning ? (sim.summoning?.ticks ?? 0) / ANVIL_HALL.summonTicks : null);
    this.forge.update(sim, shown, this.time);
    this.shownState = { barrier: this.barrierState, barrierAlpha: alpha, altar: state, summonCircle: summoning, forge: this.forge.shown };
  }

  /** The summon (034's look): a red circle at the hall's start, its cracks spreading as `progress` runs 0..1; then a flare as it rises. */
  private drawSummon(progress: number | null): void {
    const g = this.summon.clear();
    const S = HOLLOWS_LOOK.summon;
    const rise = this.riseMs > 0 ? this.riseMs / S.riseMs : 0;
    if (progress === null && rise === 0) {
      g.setVisible(false);
      return;
    }
    const c = { x: (ANVIL_HALL.start.tx + 0.5) * T, y: (ANVIL_HALL.start.ty + 0.5) * T };
    g.setVisible(true);
    drawCrackedCircle(g, c.x, c.y, S.radius, progress ?? 1);
    const F = S.flare;
    if (rise > 0) g.fillStyle(colorOf(S.color), F.alpha * rise).fillEllipse(c.x, c.y - F.lift, S.radius * F.w, S.radius * F.h * rise);
  }
}
