import { TILE_SIZE } from '../data/config';
import { EMBERWORKS_GATE } from '../data/emberworks';
import { SOUND_LEVELS, SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import { ventState } from '../sim/nodes';
import type { SimState } from '../sim/state';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';
import { playEmberEnemies } from './emberEnemyFeel';

// The Emberworks' feel (060), for FeelView: its barrier across the ramps breaking with the Hollows barrier's sound and
// shards (034) (`playEmberworks` returns whether it fell this frame, so FeelView doesn't also play the tutorial gate's
// sound for it); the Forgewright's fight; and a cinder vent in view flaring open, with its roar and embers (`VentFeel`).

export function playEmberworks(ev: SimEvents, j: JuiceView, s: SoundView, v: { x: number; y: number; width: number; height: number }): boolean {
  playForge(ev, j, s);
  // 061: the region's enemies.
  playEmberEnemies(ev, j, s);
  const fell = ev.gates.some((g) => g.gate === 'emberworks');
  if (!fell) return false;
  s.play(SOUNDS.barrierCollapse);
  // Its shards burst along the ramps in view, every other tile, as the Hollows barrier's do.
  for (const [i, t] of EMBERWORKS_GATE.entries()) {
    const x = (t.tx + 0.5) * TILE_SIZE;
    const y = (t.ty + 0.5) * TILE_SIZE;
    if (i % 2 === 0 && x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height) j.burst('barrierShards', x, y);
  }
  j.shake('medium');
  return true;
}

/**
 * The Forgewright's fight (060): a bellows bursting, its vent's hiss (and embers off its core), its hammer slam shaking
 * the screen, its ember spray, and the Forge Flood's roar as the pools spread. A hit on its plating is the Shield's
 * clang and spark (hollowsFeel.ts plays every `blocked`).
 */
function playForge(ev: SimEvents, j: JuiceView, s: SoundView): void {
  for (const b of ev.bellowsBreaks) {
    s.play(SOUNDS.bellowsBreak);
    j.burst('bellowsBurst', b.x, b.y);
    j.shake('small');
  }
  for (const v of ev.vents) {
    s.play(SOUNDS.ventHiss);
    j.burst('embers', v.x, v.y - 40);
    j.shake('medium');
  }
  for (const sl of ev.slams) {
    s.play(SOUNDS.hammerSlam);
    j.burst('slamDust', sl.x, sl.y);
    j.shake('big');
  }
  if (ev.sprays.length > 0) s.play(SOUNDS.emberSpray);
  for (const f of ev.floods) {
    s.play(SOUNDS.floodRoar);
    j.burst('floodFlare', (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2);
    j.shake('medium');
  }
}

/** How far above a vent's base its embers burst, px: its mouth. */
const MOUTH = 12;

/** Watches the cinder vents in the room on screen (no event: the open is the cycle's), sounding each one that opens in view. */
export class VentFeel {
  private readonly was = new Map<number, string | null>();

  watch(sim: SimState, shown: string, v: { x: number; y: number; width: number; height: number }, j: JuiceView, s: SoundView): void {
    let flared = false;
    for (const n of sim.nodes) {
      if (n.roomId !== shown) continue;
      const now = ventState(n);
      if (now === null) continue;
      const before = this.was.get(n.id);
      this.was.set(n.id, now);
      if (before === undefined || before === 'open' || now !== 'open' || n.uses === 0) continue;
      if (n.x < v.x || n.x > v.x + v.width || n.y < v.y || n.y > v.y + v.height) continue;
      j.burst('ventFlare', n.x, n.y - MOUTH);
      flared = true;
    }
    if (flared) s.play(SOUNDS.ventFlare, SOUND_LEVELS.cue);
  }
}
