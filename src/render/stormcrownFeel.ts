import { TILE_SIZE } from '../data/config';
import { STORMCROWN_GATE } from '../data/stormcrown';
import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';
import { playStormEnemies } from './stormEnemyFeel';

// The Stormcrown's feel (064), for FeelView: its barrier across the ramps breaking with the Hollows barrier's sound and
// shards (034), as the Emberworks' does (`playStormcrown` returns whether it fell this frame, so FeelView doesn't also
// play the tutorial gate's sound for it); lightning striking a storm rod in view; and the Conductor's fight.

type View = { x: number; y: number; width: number; height: number };

/** How far above a rod's base its strike's sparks burst, px: its crown. */
const CROWN = 56;

const inView = (v: View, x: number, y: number): boolean => x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height;

/**
 * The Conductor's (its own wind-up crack is WINDUP_SOUNDS'): the blink's zip, the storm call's rising hum and the rod
 * chain's buzz as they begin, a jolt as the lash lands, and the strikes' crack and a little shake as they land; a
 * broken rod throws sparks off its crown.
 */
function playConductor(ev: SimEvents, j: JuiceView, s: SoundView): void {
  if (ev.blinks.length > 0) s.play(SOUNDS.blink);
  if (ev.conductorWindups.some((w) => w.attack === 1)) s.play(SOUNDS.stormCall);
  if (ev.conductorWindups.some((w) => w.attack === 2)) s.play(SOUNDS.rodChain);
  if (ev.lashes.length > 0) j.shake('small');
  if (ev.strikes.length > 0) {
    s.play(SOUNDS.rodStrike);
    j.shake('small');
  }
  for (const r of ev.rodBreaks) j.burst('rodStrike', r.x, r.y - CROWN);
}

export function playStormcrown(ev: SimEvents, j: JuiceView, s: SoundView, v: View): boolean {
  // Lightning striking a storm rod in view: its crack and rumble, sparks off its crown, a little shake.
  let struck = false;
  for (const r of ev.rodStrikes) {
    if (!inView(v, r.x, r.y)) continue;
    j.burst('rodStrike', r.x, r.y - CROWN);
    struck = true;
  }
  if (struck) {
    s.play(SOUNDS.rodStrike);
    j.shake('small');
  }
  // A lightning arc leaping between enemies: its crackle, once a frame however many leapt.
  if (ev.arcs.length > 0) s.play(SOUNDS.arcCrackle);
  playConductor(ev, j, s);
  // 065: the region's enemies.
  playStormEnemies(ev, j, s);
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
