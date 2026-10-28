import { enemyAnims } from './enemyAnims';

// How the Conductor reads on screen (064), beyond its rig (src/data/art/conductor.ts): its six arena rods in their
// three looks with small bars, the flash on the rod a blink's warning names, the blink's flare out and in, its
// telegraphs (the lash's line, the rod chain's lines and the lightning along them; the storm call's circles), and the
// strikes landing. Palette ids, ms, world px, alphas 0..1.

/** Sprite frames: an arena rod standing (a tall iron rod with a forked brass crown, cyan-lit), broken (snapped off at the base) and regrowing (its stump sprouting cyan light). */
export const CONDUCTOR_SPRITES = {
  rod: { standing: 'conductor-rod', broken: 'conductor-rod-broken', regrowing: 'conductor-rod-regrowing' },
} as const;

/** Its animation set (joined into ENEMY_ANIMS): it gathers before a blink, raises its staff to call the storm, and spreads its arms to run the rod chain. */
export const CONDUCTOR_ANIMS = { conductor: enemyAnims('conductor', true, ['blink', 'call', 'chain'], 1, true) } as const;

export const CONDUCTOR_LOOK = {
  /** A rod shows `regrowing` over the last `regrowingTicks` of its regrowth; its small bar shows once it's hurt, `w` × `h` px, `gap` px over its box. */
  rod: { regrowingTicks: 300, bar: { w: 22, h: 2, gap: 3, border: 1, color: 'storm-glow', back: 'ink', regrow: 'cyan' } },
  /** The rod a blink's warning names: a flickering column of light up it and a ring at its base, `pulseMs` a beat. */
  target: { color: 'cyan-glow', ring: 'storm-glow', pulseMs: 90, alpha: [0.35, 0.95] as const, w: 10, h: 66, ringR: 20, ringWidth: 2 },
  /** The blink's flare where it vanishes and where it appears: a column of light fading over `ms`. */
  blink: { ms: 260, color: 'storm-glow', core: 'snow', w: 26, h: 90 },
  /** The lash's red line (the shared enemy red), `width` px, its fill running out along it as the wind-up runs; the lash itself, a bolt along it held `ms`. */
  lash: { alpha: 0.22, fillAlpha: 0.5, boltMs: 160 },
  /** The rod chain: its red lines as the wind-up runs, then the lightning along them (`jag` px off the line every `step` px, re-drawn every `flickerMs`). */
  chain: { alpha: 0.22, fillAlpha: 0.5, bolt: 'cyan-glow', core: 'snow', glow: 'storm-glow', width: 2, glowWidth: 6, jag: 5, step: 14, flickerMs: 60 },
  /** The storm call's circles: shaded red, filling to the edge as each one's wait runs; a hard ring at its edge. */
  strike: { alpha: 0.2, fillAlpha: 0.45, edgeWidth: 1.5, edgeAlpha: 0.8 },
  /** A strike landing: a bolt down from `drop` px above, held `ms`. */
  landing: { drop: 120, ms: 140, jag: 7, step: 16 },
} as const;
