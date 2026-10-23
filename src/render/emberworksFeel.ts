import { TILE_SIZE } from '../data/config';
import { EMBERWORKS_GATE } from '../data/emberworks';
import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// The Emberworks' feel (060), for FeelView: its barrier across the ramps breaking with the Hollows barrier's sound and
// shards (034). Returns whether it fell this frame, so FeelView doesn't also play the tutorial gate's sound for it.

export function playEmberworks(ev: SimEvents, j: JuiceView, s: SoundView, v: { x: number; y: number; width: number; height: number }): boolean {
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
