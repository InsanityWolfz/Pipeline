import { enemyAnims } from './enemyAnims';

// How the Forgewright reads on screen (060), beyond its rig (src/data/art/forgewright.ts): its bellows in their three
// looks, its embers in flight, the glow of its core while it vents, its telegraphs (the slam's circle, the spray's
// cone, the flood's red half), the fire pools, and its boss bar's heat gauge. Palette ids, ms, world px, alphas 0..1.

/** Sprite frames: a bellows whole, broken (torn and slack) and patching (its tears stitched with glowing brass), an ember and its shadow. */
export const FORGE_SPRITES = {
  bellows: { whole: 'forge-bellows-whole', broken: 'forge-bellows-broken', patching: 'forge-bellows-patching' },
  ember: 'forge-ember',
  emberShadow: 'forge-ember-shadow',
} as const;

/** Its animation set (joined into ENEMY_ANIMS): it blocks on its plating, draws its hammer back to spray, raises it high to flood, and staggers venting. */
export const FORGE_ANIMS = { forgewright: enemyAnims('forgewright', true, ['block', 'spray', 'flood', 'vent'], 1, true) } as const;

export const FORGE_LOOK = {
  /** A bellows shows `patching` over the last `patchingTicks` of its patch; its small bar shows once it's hurt, `w` × `h` px, `gap` px over its box. */
  bellows: { patchingTicks: 90, bar: { w: 22, h: 2, gap: 3, border: 1, color: 'cinder', back: 'ink', patch: 'brass' }, flashMs: 120, flashColor: 'snow' },
  /** The brass hoses from its sides out to its bellows, drawn under them: their width, colour and the rise off the ground. */
  hose: { width: 3, color: 'brass-dark', light: 'brass', rise: 22 },
  /** Its core glowing through the open plating while it vents: a pulsing ember disc on its chest. */
  core: { at: -46, radius: 10, color: 'cinder', pulseMs: 380, alpha: [0.45, 0.95] as const, swell: 0.35 },
  /** An ember in flight, lifted off its ground point. */
  ember: { lift: 16 },
  /** The slam's circle (the shared enemy red), the spray's cone (`length` px), the flood's red half (054's shade), each filling as its wind-up runs. */
  slam: { alpha: 0.22, fillAlpha: 0.5 },
  spray: { length: 140, alpha: 0.2, fillAlpha: 0.4 },
  flood: { shadeAlpha: 0.16, fillAlpha: 0.32, edgeWidth: 2, edgeAlpha: 0.8 },
  /** The fire pools: a flickering molten sheet, `alpha` low to high every `flickerMs`, a bright edge and tongues of flame every `tongueEvery` px. */
  pools: { color: 'flame-dark', bright: 'cinder', light: 'cinder-light', alpha: [0.45, 0.6] as const, flickerMs: 260, edgeWidth: 2, tongueEvery: 24, tongue: 5 },
  /** The boss bar's heat gauge under its health bar, `inset` px in from each end (clear of the sandbox's strip): `h` px, `gap` px below it, its fill ember, flashing `full` once full. */
  heat: { h: 4, gap: 3, inset: 12, back: 'ink', fill: 'cinder', full: 'cinder-light', pulseMs: 200 },
} as const;
