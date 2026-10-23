import type { Scene } from 'phaser';
import { EMBERWORKS } from '../data/emberworks';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { OVERWORLD_ROOM } from '../data/overworld';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { RingCurtain, type CurtainArc } from './ringCurtain';

/** The Emberworks' live things as drawn (060), for `ui().emberworks`. */
export interface EmberworksShown {
  /** The barrier across the ramps: shut, collapsing (its fade running) or down; and its alpha. */
  barrier: 'shut' | 'collapsing' | 'down';
  barrierAlpha: number;
}

export const NO_EMBERWORKS_SHOWN: EmberworksShown = { barrier: 'shut', barrierAlpha: 0 };

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
// in the Hollows barrier's look (ringCurtain.ts), until the Bulwark's first kill, then collapsing with it.
export class EmberworksView {
  private readonly curtain: RingCurtain;
  private barrierState: EmberworksShown['barrier'] = 'shut';
  private collapseMs = 0;
  private time = 0;
  private shownState: EmberworksShown = NO_EMBERWORKS_SHOWN;

  constructor(scene: Scene) {
    this.curtain = new RingCurtain(scene);
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
    this.shownState = { barrier: this.barrierState, barrierAlpha: alpha };
  }
}
