import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// The Emberworks enemies' feel (061), from playEmberworks (emberworksFeel.ts): a cinder mote bursting (its whoomph and
// a spray of embers; a killed one's death burst the same), a bellows hound setting off down its lane, a slag golem's
// slam and its split. Their wind-up cues (the mote's swell, the tender's hum) are WINDUP_SOUNDS'.

export function playEmberEnemies(ev: SimEvents, j: JuiceView, s: SoundView): void {
  for (const b of [...ev.moteBursts, ...ev.deathBursts]) {
    s.play(SOUNDS.moteBurst);
    j.burst('embers', b.x, b.y - 16);
    j.shake('small');
  }
  for (const d of ev.dashes) {
    s.play(SOUNDS.houndDash);
    j.burst('ventFlare', d.x, d.y);
  }
  for (const sl of ev.golemSlams) {
    s.play(SOUNDS.golemSlam);
    j.burst('slamDust', sl.x, sl.y);
    j.shake('medium');
  }
  for (const sp of ev.golemSplits) {
    s.play(SOUNDS.golemSplit);
    j.burst('slamDust', sp.x, sp.y);
  }
}
