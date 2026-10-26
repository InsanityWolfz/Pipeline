import type { SoundRecipe } from './soundRecipe.ts';

// 065's sounds, as synth recipes beside sounds.ts's: a thunderhawk's screech as it marks its dive (a harsh falling
// cry with a crackle of static) and its dive (a rushing whistle down into a crack); static mites' buzz as they wind up
// their zap (a dry electric whine) and a killed mite's discharge (a snap of current); the storm sentinel's call (a
// rising hum of current as its circle is called down; the strike itself is 064's crack); and the gale ram's gust (a
// roar of wind with a low thud).

/** 065's sound keys (joined into SOUNDS). */
export const STORMCROWN_ENEMY_SOUNDS = {
  hawkScreech: 'hawk-screech',
  hawkDive: 'hawk-dive',
  miteBuzz: 'mite-buzz',
  miteDischarge: 'mite-discharge',
  sentinelCall: 'sentinel-call',
  ramGust: 'ram-gust',
} as const;

/** Their wind-up cues, by enemy kind (joined into WINDUP_SOUNDS): the hawk's screech, the mite's buzz, the sentinel's call, and the ram drawing breath (its gust's own whoosh plays as it lands). */
export const STORMCROWN_ENEMY_WINDUPS = {
  hawk: STORMCROWN_ENEMY_SOUNDS.hawkScreech,
  mite: STORMCROWN_ENEMY_SOUNDS.miteBuzz,
  sentinel: STORMCROWN_ENEMY_SOUNDS.sentinelCall,
} as const;

export const STORMCROWN_ENEMY_SOUND_RECIPES = {
  'hawk-screech': {
    layers: [
      { wave: 'saw', from: 2400, to: 1300, dur: 0.42, attack: 0.02, volume: 0.14, lowpass: 3800, tremolo: { rate: 22, depth: 0.35 } },
      { wave: 'square', from: 1800, to: 1100, dur: 0.38, attack: 0.03, volume: 0.05, lowpass: 3000 },
      { wave: 'noise', from: 7000, to: 4000, dur: 0.3, attack: 0.01, volume: 0.06, tremolo: { rate: 45, depth: 0.9 } },
    ],
  },
  'hawk-dive': {
    layers: [
      { wave: 'noise', from: 800, to: 3600, dur: 0.45, attack: 0.2, volume: 0.28 },
      { wave: 'sine', from: 1400, to: 500, dur: 0.45, attack: 0.1, volume: 0.1 },
      { wave: 'noise', from: 6000, to: 1500, delay: 0.4, dur: 0.12, attack: 0.002, volume: 0.25 },
    ],
  },
  'mite-buzz': {
    layers: [
      { wave: 'square', from: 520, to: 760, dur: 0.48, attack: 0.05, volume: 0.06, lowpass: 2400, tremolo: { rate: 38, depth: 0.8 } },
      { wave: 'noise', from: 5000, to: 6500, dur: 0.48, attack: 0.1, volume: 0.05, tremolo: { rate: 30, depth: 0.9 } },
    ],
  },
  'mite-discharge': {
    layers: [
      { wave: 'noise', from: 9000, to: 2500, dur: 0.14, attack: 0.001, volume: 0.32 },
      { wave: 'square', from: 2200, to: 400, dur: 0.1, attack: 0.001, volume: 0.08 },
    ],
  },
  'sentinel-call': {
    layers: [
      { wave: 'triangle', from: 180, to: 520, dur: 0.9, attack: 0.3, volume: 0.16, tremolo: { rate: 9, depth: 0.5 } },
      { wave: 'noise', from: 2000, to: 5000, dur: 0.9, attack: 0.5, volume: 0.06, tremolo: { rate: 24, depth: 0.7 } },
    ],
  },
  'ram-gust': {
    layers: [
      { wave: 'noise', from: 400, to: 1400, dur: 0.6, attack: 0.04, volume: 0.42 },
      { wave: 'noise', from: 1800, to: 700, delay: 0.1, dur: 0.5, attack: 0.05, volume: 0.2 },
      { wave: 'sine', from: 80, to: 45, dur: 0.3, attack: 0.004, volume: 0.4 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
