import type { SoundRecipe } from './soundRecipe.ts';

// 035's sounds, as synth recipes beside sounds.ts's: the Charger pawing (a stone scrape and
// a rising snort) and slamming into a wall, the Burrower's rumble under the ground and its
// eruption, the Shardback's bash (its shield's clang is 034's), the Sniper's laser hum and
// its lock beep, and its bolt.

/** 035's sound keys (joined into SOUNDS). */
export const HOLLOWS_ENEMY_SOUNDS = {
  chargerWindup: 'charger-windup',
  chargerImpact: 'charger-impact',
  burrowRumble: 'burrow-rumble',
  burrowErupt: 'burrow-erupt',
  shieldBash: 'shield-bash',
  laserHum: 'laser-hum',
  laserLock: 'laser-lock',
  sniperBolt: 'sniper-bolt',
} as const;

/** Their wind-up cues, by enemy kind (joined into WINDUP_SOUNDS): a snort, a rumble, the Husk's cue as runes flare, a laser's hum. */
export const HOLLOWS_ENEMY_WINDUPS = {
  charger: HOLLOWS_ENEMY_SOUNDS.chargerWindup,
  burrower: HOLLOWS_ENEMY_SOUNDS.burrowRumble,
  shardback: 'husk-windup',
  sniper: HOLLOWS_ENEMY_SOUNDS.laserHum,
} as const;

export const HOLLOWS_ENEMY_SOUND_RECIPES = {
  'charger-windup': {
    layers: [
      { wave: 'noise', from: 1400, to: 500, dur: 0.18, attack: 0.01, volume: 0.25 },
      { wave: 'noise', from: 1400, to: 500, delay: 0.3, dur: 0.18, attack: 0.01, volume: 0.25 },
      { wave: 'saw', from: 70, to: 140, dur: 0.7, attack: 0.15, volume: 0.14, lowpass: 500 },
    ],
  },
  'charger-impact': {
    layers: [
      { wave: 'sine', from: 110, to: 38, dur: 0.45, attack: 0.002, volume: 0.7 },
      { wave: 'noise', from: 3000, to: 300, dur: 0.35, attack: 0.002, volume: 0.45 },
      { wave: 'triangle', from: 520, to: 480, delay: 0.05, dur: 0.3, attack: 0.002, volume: 0.08, tremolo: { rate: 22, depth: 0.5 } },
    ],
  },
  'burrow-rumble': {
    layers: [
      { wave: 'noise', from: 300, to: 160, dur: 0.85, attack: 0.25, volume: 0.35, tremolo: { rate: 11, depth: 0.6 } },
      { wave: 'sine', from: 48, to: 62, dur: 0.85, attack: 0.25, volume: 0.4 },
    ],
  },
  'burrow-erupt': {
    layers: [
      { wave: 'sine', from: 140, to: 40, dur: 0.4, attack: 0.002, volume: 0.65 },
      { wave: 'noise', from: 4000, to: 400, dur: 0.45, attack: 0.002, volume: 0.45 },
      { wave: 'noise', from: 900, to: 300, delay: 0.12, dur: 0.4, attack: 0.02, volume: 0.2 },
    ],
  },
  'shield-bash': {
    layers: [
      { wave: 'sine', from: 180, to: 70, dur: 0.22, attack: 0.002, volume: 0.6 },
      { wave: 'triangle', from: 900, to: 820, dur: 0.2, attack: 0.001, volume: 0.14, tremolo: { rate: 28, depth: 0.4 } },
      { wave: 'noise', from: 2500, to: 600, dur: 0.12, attack: 0.002, volume: 0.3 },
    ],
  },
  'laser-hum': {
    layers: [
      { wave: 'sine', from: 660, to: 700, dur: 1.0, attack: 0.08, volume: 0.1, tremolo: { rate: 9, depth: 0.35 } },
      { wave: 'saw', from: 330, to: 350, dur: 1.0, attack: 0.08, volume: 0.05, lowpass: 1200 },
    ],
  },
  'laser-lock': {
    layers: [
      { wave: 'square', from: 1760, to: 1760, dur: 0.06, attack: 0.001, volume: 0.12, lowpass: 4000 },
      { wave: 'square', from: 1760, to: 1760, delay: 0.12, dur: 0.06, attack: 0.001, volume: 0.12, lowpass: 4000 },
    ],
  },
  'sniper-bolt': {
    layers: [
      { wave: 'saw', from: 1800, to: 300, dur: 0.18, attack: 0.002, volume: 0.22, lowpass: 5000 },
      { wave: 'noise', from: 8000, to: 2000, dur: 0.1, attack: 0.001, volume: 0.25 },
      { wave: 'sine', from: 240, to: 90, dur: 0.15, attack: 0.002, volume: 0.35 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
