import type { SoundRecipe } from './sounds.ts';

// 060's sounds, as synth recipes beside sounds.ts's: a cinder vent flaring open (a rushing roar of hot air with a low
// rumble under it and a crackle on top), and an enemy catching fire (a dry crackle over a soft whoomph). Its
// barrier's collapse is the Hollows barrier's own (034). The Forgewright's: a bellows bursting (a leathery rip and a
// gasp of air), its vent (a long hiss of steam over a falling groan), its hammer slam (an anvil's ring on a deep
// thud), its ember spray (a breathy whoosh with crackle), and the Forge Flood (a rising roar of fire); its slam's
// wind-up grinds as the Bulwark's does.

/** 060's sound keys (joined into SOUNDS). */
export const EMBERWORKS_SOUNDS = {
  ventFlare: 'vent-flare',
  burnCrackle: 'burn-crackle',
  bellowsBreak: 'bellows-break',
  ventHiss: 'vent-hiss',
  hammerSlam: 'hammer-slam',
  emberSpray: 'ember-spray',
  floodRoar: 'flood-roar',
} as const;

/** 060: the Forgewright's slam wind-up (joined into WINDUP_SOUNDS): its iron grinds as the Bulwark's stone does. */
export const EMBERWORKS_WINDUPS = { forgewright: 'bulwark-grind' } as const;

export const EMBERWORKS_SOUND_RECIPES = {
  'vent-flare': {
    layers: [
      { wave: 'noise', from: 400, to: 2600, dur: 0.7, attack: 0.08, volume: 0.28 },
      { wave: 'sine', from: 60, to: 85, dur: 0.7, attack: 0.06, volume: 0.35, tremolo: { rate: 11, depth: 0.4 } },
      { wave: 'noise', from: 5000, to: 3000, delay: 0.15, dur: 0.45, attack: 0.01, volume: 0.08, tremolo: { rate: 32, depth: 0.8 } },
    ],
  },
  'burn-crackle': {
    layers: [
      { wave: 'noise', from: 300, to: 900, dur: 0.28, attack: 0.03, volume: 0.22 },
      { wave: 'noise', from: 6000, to: 2500, delay: 0.03, dur: 0.32, attack: 0.002, volume: 0.12, tremolo: { rate: 38, depth: 0.9 } },
      { wave: 'sine', from: 140, to: 70, dur: 0.22, attack: 0.01, volume: 0.18 },
    ],
  },
  'bellows-break': {
    layers: [
      { wave: 'noise', from: 1800, to: 500, dur: 0.35, attack: 0.002, volume: 0.32 },
      { wave: 'noise', from: 300, to: 900, delay: 0.05, dur: 0.5, attack: 0.04, volume: 0.22 },
      { wave: 'sine', from: 220, to: 90, dur: 0.25, attack: 0.002, volume: 0.2 },
    ],
  },
  'vent-hiss': {
    layers: [
      { wave: 'noise', from: 6000, to: 3500, dur: 1.4, attack: 0.05, volume: 0.24 },
      { wave: 'sine', from: 140, to: 55, dur: 1.2, attack: 0.08, volume: 0.3, tremolo: { rate: 7, depth: 0.3 } },
    ],
  },
  'hammer-slam': {
    layers: [
      { wave: 'sine', from: 75, to: 30, dur: 0.55, attack: 0.002, volume: 0.7 },
      { wave: 'triangle', from: 1240, to: 1180, dur: 0.9, attack: 0.002, volume: 0.16 },
      { wave: 'noise', from: 1200, to: 150, dur: 0.4, attack: 0.002, volume: 0.35 },
    ],
  },
  'ember-spray': {
    layers: [
      { wave: 'noise', from: 900, to: 3200, dur: 0.45, attack: 0.03, volume: 0.24 },
      { wave: 'noise', from: 6000, to: 3000, delay: 0.08, dur: 0.35, attack: 0.002, volume: 0.1, tremolo: { rate: 36, depth: 0.9 } },
    ],
  },
  'flood-roar': {
    layers: [
      { wave: 'noise', from: 250, to: 1600, dur: 1.3, attack: 0.15, volume: 0.36 },
      { wave: 'sine', from: 45, to: 70, dur: 1.3, attack: 0.1, volume: 0.45, tremolo: { rate: 9, depth: 0.4 } },
      { wave: 'noise', from: 5000, to: 2500, delay: 0.3, dur: 0.9, attack: 0.05, volume: 0.1, tremolo: { rate: 30, depth: 0.8 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
