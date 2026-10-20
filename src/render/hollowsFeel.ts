import { TILE_SIZE } from '../data/config';
import { HOLLOWS } from '../data/hollows';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { SOUND_LEVELS, SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// Stonefall Hollows' feel (034), for FeelView: a shot ringing off a shield (a clang and
// brass sparks), the Bulwark's lob (the stone grinding, its bombs' fuses ticking), a bomb
// bursting, the pound shaking the screen, the summon's drone and crack, and the barrier
// breaking into shards with a sound of its own; 041's roar, rear stomp and adds rising.
// Returns whether the barrier fell this frame, so FeelView doesn't also play the tutorial
// gate's sound for it.

export function playHollows(ev: SimEvents, j: JuiceView, s: SoundView): boolean {
  for (const b of ev.blocked) {
    s.play(SOUNDS.shieldClang);
    j.burst('blockSpark', b.x, b.y);
  }
  if (ev.lobs.length > 0) s.play(SOUNDS.enemyBombTick, SOUND_LEVELS.cue);
  for (const b of ev.enemyBursts) {
    s.play(SOUNDS.enemyBombBurst);
    j.burst('enemyBurst', b.x, b.y);
    j.shake('small');
  }
  for (const p of ev.pounds) {
    s.play(SOUNDS.bulwarkPound);
    j.burst('poundDust', p.x, p.y);
    j.shake('big');
  }
  if (ev.summons.length > 0) s.play(SOUNDS.summon);
  // 041: the enrage's roar, the rear stomp (a smaller pound behind it), the adds rising.
  if (ev.enrages.length > 0) {
    s.play(SOUNDS.bulwarkRoar);
    j.shake('medium');
  }
  for (const p of ev.stomps) {
    s.play(SOUNDS.bulwarkStomp);
    const k = HOLLOWS_LOOK.stomp.dustAt * p.radius;
    j.burst('stompDust', p.x + p.dirX * k, p.y + p.dirY * k);
    j.shake('small');
  }
  if (ev.addsRise.length > 0) s.play(SOUNDS.addsRise);
  for (const w of ev.backWaves) {
    s.play(SOUNDS.bulwarkWave);
    const k = HOLLOWS_LOOK.wave.sprayAt * w.radius;
    j.burst('waveSpray', w.x + w.dirX * k, w.y + w.dirY * k);
  }
  const fell = ev.gates.some((g) => g.gate === 'hollows');
  if (fell) {
    s.play(SOUNDS.barrierCollapse);
    for (const t of HOLLOWS.gate) j.burst('barrierShards', (t.tx + 0.5) * TILE_SIZE, (t.ty + 0.5) * TILE_SIZE);
    j.shake('medium');
  }
  return fell;
}
