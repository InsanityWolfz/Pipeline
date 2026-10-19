// How Stonefall Hollows' four enemies (035) read on screen, beyond their rigs (src/data/art):
// their telegraphs in the shared enemy red (ENEMY_FX.telegraphColor, as the Warden's slam
// circle), the Burrower's ripple, the Shardback's runes, the Sniper's lens and laser and its
// bolt. Palette ids, ms, world px, alphas 0..1.

/** Sprite frames (shapes in src/data/art): the Burrower's ripple, two frames it alternates as it moves. */
export const HOLLOWS_ENEMY_SPRITES = { ripple: ['burrower-ripple/0', 'burrower-ripple/1'] } as const;

export const HOLLOWS_ENEMY_LOOK = {
  /** The Charger's lane: faint over its whole length, a fill running down it with the wind-up, an edge line. */
  lane: { alpha: 0.22, fillAlpha: 0.5, edgeWidth: 1.5, edgeAlpha: 0.75 },
  /** The Burrower's cracked ring at the locked spot: growing to its radius over the wind-up, with `cracks` lines out from the middle. */
  ring: { alpha: 0.22, fillAlpha: 0.45, width: 2, cracks: 6, crackWidth: 1.5, crackStart: 0.3, crackAlpha: 0.8 },
  /** The ripple underground: the mound sprite heaving every `wobbleMs` while it moves faster than `minSpeed` px a tick. */
  ripple: { wobbleMs: 260, minSpeed: 0.2 },
  /** Dust kicked up every `ms` by a moving ripple and a Charger's hooves. */
  dust: { ms: 90 },
  /**
   * The Shardback's bash arc, in the Husk's swipe style (004), and its crystals' flare over the wind-up: a cyan glow on
   * the shield, `ahead` px out along its facing and `rise` px up, growing to `radius` and `alpha` as the wind-up runs.
   */
  bash: { alpha: 0.25, fillAlpha: 0.55 },
  flare: { color: 'cyan-glow', ahead: 12, rise: 20, radius: 16, alpha: 0.7, pulseMs: 140 },
  /**
   * The Sniper's laser from its lens: thin while tracking, brighter and wider once locked, blinking on and off every
   * `blinkTicks` sim ticks (so it holds still when the sim does), a hot `core` down its middle when on. Lens offsets from the feet per view (side faces
   * right), world px.
   */
  laser: { width: 1, alpha: 0.55, lockedWidth: 2.5, lockedAlpha: 0.95, blinkTicks: 4, glow: 4, glowAlpha: 0.25, core: 'rust-light', coreWidth: 1 },
  lens: { side: [6, -40] as const, down: [0, -38] as const, up: [0, -40] as const },
  /** The bolt in flight: a streak `length` px long behind it, lifted `lift` px off its ground point. */
  bolt: { length: 14, width: 3, core: 1.2, color: 'danger', coreColor: 'snow', lift: 18 },
} as const;
