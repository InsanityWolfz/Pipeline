import { SOUNDS } from '../data/sounds';
import { THUNDERHAWK } from '../data/stormcrownEnemies';
import { STORM_ENEMY_LOOK } from '../data/stormcrownEnemyAssets';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// The Stormcrown enemies' feel (065), from playStormcrown (stormcrownFeel.ts): a thunderhawk setting off down its dive
// line (its rushing whistle and a spit of sparks off its wings); a static mite's zap (sparks) a killed mite's discharge (a snap); a gale ram's gust (its roar, dust and a shake). Their wind-up cues are WINDUP_SOUNDS'.

const FEEL = STORM_ENEMY_LOOK.feel;

export function playStormEnemies(ev: SimEvents, j: JuiceView, s: SoundView): void {
  for (const d of ev.dives) {
    s.play(SOUNDS.hawkDive);
    j.burst('hitLightning', d.x, d.y + THUNDERHAWK.hurtbox.offsetY, undefined, 'cue');
  }
  for (const z of ev.zaps) j.burst('hitLightning', z.x, z.y - FEEL.zapLift, undefined, 'cue');
  // A killed mite's discharge: its snap, once a frame however many went (ArcView draws the bolts).
  if (ev.discharges.length > 0) s.play(SOUNDS.miteDischarge);
  // A gale ram's gust: its roar of wind and a little shake.
  for (const g of ev.gusts) {
    s.play(SOUNDS.ramGust);
    j.burst('rollDust', g.x + g.dx * FEEL.gustDust, g.y + g.dy * FEEL.gustDust, undefined, 'cue');
    j.shake('small');
  }
}
