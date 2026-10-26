import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// The Stormcrown enemies' feel (065), from playStormcrown (stormcrownFeel.ts): a thunderhawk setting off down its dive
// line (its rushing whistle and a spit of sparks off its wings); a static mite's zap (sparks) and a killed mite's discharge (a snap). Their wind-up cues are WINDUP_SOUNDS'.

export function playStormEnemies(ev: SimEvents, j: JuiceView, s: SoundView): void {
  for (const d of ev.dives) {
    s.play(SOUNDS.hawkDive);
    j.burst('hitLightning', d.x, d.y - 30);
  }
  for (const z of ev.zaps) j.burst('hitLightning', z.x, z.y - 4);
  // A killed mite's discharge: its snap, once a frame however many went (ArcView draws the bolts).
  if (ev.discharges.length > 0) s.play(SOUNDS.miteDischarge);
}
