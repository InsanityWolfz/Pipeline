import { TILE_SIZE } from '../data/config';
import { STORMCROWN_GATE } from '../data/stormcrown';
import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// The Stormcrown's feel (064), for FeelView: its barrier across the ramps breaking with the Hollows barrier's sound and
// shards (034), as the Emberworks' does (`playStormcrown` returns whether it fell this frame, so FeelView doesn't also
// play the tutorial gate's sound for it).

type View = { x: number; y: number; width: number; height: number };

export function playStormcrown(ev: SimEvents, j: JuiceView, s: SoundView, v: View): boolean {
  const fell = ev.gates.some((g) => g.gate === 'stormcrown');
  if (!fell) return false;
  s.play(SOUNDS.barrierCollapse);
  for (const [i, t] of STORMCROWN_GATE.entries()) {
    const x = (t.tx + 0.5) * TILE_SIZE;
    const y = (t.ty + 0.5) * TILE_SIZE;
    if (i % 2 === 0 && x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height) j.burst('barrierShards', x, y);
  }
  j.shake('medium');
  return true;
}
