import { SOUND_LEVELS, SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// Landmines' and bomblets' feel (038), for FeelView: a mine arming with an iron clunk,
// bursting with a sharp crack and a small shake; a cluster bomb's bomblets popping
// with the bomb's burst sound played quieter, once for the lot (038.10). 078: their blasts are ShotFxView's.

export function playMines(ev: SimEvents, j: JuiceView, s: SoundView): void {
  if (ev.mineArms.length > 0) s.play(SOUNDS.mineArm, SOUND_LEVELS.quiet);
  ev.mineBursts.forEach(() => {
    s.play(SOUNDS.mineBurst);
    j.shake('small');
  });
  if (ev.bombletBursts.length > 0) s.play(SOUNDS.burst, SOUND_LEVELS.quiet);
}
