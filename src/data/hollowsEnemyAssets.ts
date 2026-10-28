import { enemyAnims } from './enemyAnims';

// How Stonefall Hollows' four enemies (035) read on screen, beyond their rigs (src/data/art):
// their telegraphs in the shared enemy red (ENEMY_FX.telegraphColor, as the Warden's slam
// circle), the Burrower's ripple, the Shardback's runes, the Sniper's lens and laser and its
// bolt. Palette ids, ms, world px, alphas 0..1.

/** Sprite frames (shapes in src/data/art): the Burrower's ripple, two frames it alternates as it moves. */
export const HOLLOWS_ENEMY_SPRITES = { ripple: ['burrower-ripple/0', 'burrower-ripple/1'], rippleCracked: 'burrower-ripple/2' } as const;

/** Their animation sets (joined into ENEMY_ANIMS): the Charger paws over two frames and reels when stunned; the Burrower digs; the Shardback shuffles and blocks; the Sniper steps out. */
export const HOLLOWS_ENEMY_ANIMS = {
  charger: enemyAnims('charger', true, ['stun'], 2),
  burrower: enemyAnims('burrower', true, ['dig']),
  shardback: enemyAnims('shardback', true, ['turn', 'block']),
  sniper: enemyAnims('sniper', true, ['step']),
} as const;

export const HOLLOWS_ENEMY_LOOK = {
  /** The Charger's lane: faint over its whole length, a fill running down it with the wind-up, an edge line. */
  lane: { alpha: 0.22, fillAlpha: 0.5, edgeWidth: 1.5, edgeAlpha: 0.75 },
  /** The Burrower's cracked ring at the locked spot: growing to its radius over the wind-up, with `cracks` lines out from the middle, each jagging `jag` radians halfway. */
  ring: { alpha: 0.22, fillAlpha: 0.45, width: 2, cracks: 6, crackWidth: 1.5, crackStart: 0.3, crackAlpha: 0.8, jag: 0.25 },
  /**
   * The ripple underground: the mound sprite heaving every `wobbleMs` while it moves faster than `minSpeed` px a tick
   * (out of step by `phaseMs` per enemy id), `drop` px below the feet and `depth` over the ground decals.
   */
  ripple: { wobbleMs: 260, minSpeed: 0.2, phaseMs: 97, drop: 4, depth: 0.1 },
  /**
   * 076: the ripple's wind-up phases (its body is underground): gathering, the mound settles to `settle` (x, y);
   * coiling, it swells to `coil` with progress, its cracks gaping (the cracked frame) from `crackAt` of the wind-up and
   * its dust thickening to every `dustMs` at the peak; at the peak it rises to `peak` and trembles.
   */
  rippleWindup: { settle: [1.1, 0.75] as const, coil: 1.25, peak: 1.4, crackAt: 0.5, dustMs: 30 },
  /** Dust kicked up every `ms`: by a moving ripple (`rippleDrop` px below its feet), and a Charger's hooves through the charge and on the paw strokes of its wind-up (down `pawOn` of every `pawTicks`). */
  dust: { ms: 90, rippleDrop: 2, pawTicks: 20, pawOn: 10 },
  /** Where 035's bursts go, px out along the attack: the Charger's chips on a wall, the Shardback's bash sparks, the Sniper's lens flash. */
  bursts: { impactAhead: 12, bashAhead: 18, boltAhead: 8 },
  /**
   * The Shardback's flare on its shield over the wind-up, in brass (cyan is the player's): `ahead` px out along its
   * facing (half that on screen's y), `rise` px up, growing from `grow[0]` to the whole of `radius` and to `alpha`,
   * flickering by `flicker` every `pulseMs`; just over the sprite.
   */
  flare: { color: 'brass-light', ahead: 12, rise: 20, radius: 16, grow: [0.5, 0.5] as const, alpha: 0.7, flicker: 0.2, pulseMs: 140, depth: 1 },
  /**
   * The Sniper's laser from its lens: thin while tracking, brighter and wider once locked, blinking on and off every
   * `blinkTicks` sim ticks (so it holds still when the sim does), a hot `core` down its middle when on, at `dim` of its
   * alphas when off, a dot of `width + dot` px where it ends. Lens offsets from the feet per view (side faces right).
   */
  laser: { width: 1, alpha: 0.55, lockedWidth: 2.5, lockedAlpha: 0.95, blinkTicks: 4, glow: 4, glowAlpha: 0.25, core: 'rust-light', coreWidth: 1, dim: 0.5, dot: 1 },
  lens: { side: [6, -40] as const, down: [0, -38] as const, up: [0, -40] as const },
  /** The bolt in flight: a streak `length` px long behind it at `alpha`, its core over the front `coreFrom`.. of it, lifted `lift` px off its ground point. */
  bolt: { length: 14, width: 3, alpha: 0.9, core: 1.2, coreFrom: 0.4, color: 'danger', coreColor: 'snow', lift: 18 },
} as const;
