// How the arcane ranger moves (075): snappy and exaggerated for actions (firing, the roll, the hit), poses snapping in
// fast and settling with a small overshoot, contacts squashing and releases stretching; locomotion is a calm,
// purposeful jog (075.13, after Shaun's playtest, 2026-10-28: the first build stepped 12 times a second and bounced on
// every step). Starting values, tuned by eye. Style px, radians and 60 Hz
// frames (one sim tick each); `squash` is positive for a squash and negative for a stretch. Render-only: nothing here
// changes a sim timing, so anticipation is folded into each action's opening frames.

export const WANDERER_MOTION = {
  /** One 60 Hz frame, ms. */
  frameMs: 1000 / 60,
  run: {
    /**
     * Stride radians per world px moved: half a cycle is one step, so a step is 32 px and walk speed (120 px/s) takes
     * about 3.75 steps a second (075.13: it was 0.32, about 12). The short legs can't reach 32 px, so the planted foot
     * slides a little; in this 3/4 view that reads better than frantic legs.
     */
    radPerPx: Math.PI / 32,
    /** Each foot reaches this far (style px) ahead of and behind the hip through its stance. */
    reach: 9.5,
    /** The passing knee bends up to this far; the trailing foot kicks this far back as it lifts. */
    kneeBend: 0.75,
    kickBack: 1.8,
    /** The body bobs this far (style px), lowest `lag` radians of stride after each contact, squashing a touch there and stretching at passing. */
    bob: 0.6,
    lag: 0.35,
    contactSquash: 0.012,
    passingStretch: 0.008,
    /** The side view leans this far into the run. */
    lean: 0.08,
    /** The stride eases in over this many frames as a move starts. */
    startFrames: 8,
  },
  /**
   * The cape trails to `run` radians at full speed, plus a flap; its tails swing `tail` of the flap a quarter cycle
   * behind and `tailTrail` of the trail; the hood's tail `hood` of the flap and `hoodTrail` of the trail. Strafing, the
   * cape trails `strafeTrail` as far and flaps in the shot's wind at `wind` radians a ms.
   */
  cape: { run: 0.35, flap: 0.035, tail: 0.6, hood: 0.7, tailTrail: 0.18, hoodTrail: 0.5, strafeTrail: 0.4, wind: 0.006 },
  /** The skirt's flaps swing `share` of the angle to their foot, over `reach` px down from the hip. */
  skirt: { share: 0.5, reach: 20 },
  /** The tank rides this far up and down a quarter of the bob's cycle behind the body, squashing a touch as it lands. */
  tank: { bob: 0.5, squash: 0.012 },
  /** Moving while firing: a braced strafe at this share of the stride and bob, at the walk's own rate per px (so, slower than it walks, never faster). */
  strafe: { stride: 0.6, bob: 0.5, flap: 0.06 },
  /** As a stride ends: one gentle settle, a squash over `frames` then rest, while the feet step home. */
  stop: { squash: 0.015, frames: 8 },
  brace: {
    /** On the first frame of firing: a quick dip `dip` px deep over `dipFrames`. */
    dipFrames: 3,
    dip: 2.5,
    /** Then into the brace (wider stance, crouch, lean back) over `settleFrames`, overshooting by `overshoot` (back-out ease). */
    settleFrames: 10,
    overshoot: 1.7,
    lean: -0.16,
    crouch: 2.2,
    stance: 8.5,
    push: -2.5,
    /** Out of the brace when firing stops. */
    releaseFrames: 8,
  },
  /** Each shot: the tube kicks back, the shoulders shove, the body squashes, recovering over `frames` through a small stretch. */
  recoil: { kick: 3.5, shove: -1, squash: 0.06, stretch: 0.02, frames: 6, lean: -0.05 },
  /** The barrel's spin, radians a frame at full; it ramps up over `upFrames` of firing and winds down over `downFrames`. */
  spin: { rate: 0.55, upFrames: 15, downFrames: 30 },
  /** The muzzle flash's frames; the hose pulse's trip from tank to tube (150 ms); the tank window's flare as each leaves. */
  flashFrames: 3,
  pulseFrames: 9,
  windowFlareFrames: 6,
  /** The face glow flares for this many frames on a shot. */
  glowFlareFrames: 4,
  roll: {
    /** Frames 1–2 tuck; 3–15 turn (a somersault side on, a tumble facing down or up); 16–18 land. */
    tuckEnd: 2,
    turnEnd: 15,
    tuck: 0.15,
    tumble: 0.25,
    wobble: 0.3,
    land: 0.1,
    crouch: 10,
    /** Side on, the body curls this far forward over the tucked legs, and the somersault turns about this height above the feet. */
    curl: 0.9,
    centre: 17,
    /** The landing's squash eases out over this many frames. */
    landRecover: 1.5,
    /** Tucked, the feet pull up this high, in under the hips (`inward` toward the centre, `forward` along the roll). */
    feet: { lift: 8, inward: 2, forward: 2 },
    /** Tucked side on, the tube turns to point this way (radians) and slides this far back into the chest. */
    tubeAim: -1.6,
    tubeSlide: 7,
    /** The cape and hood tail through the somersault (`tail` at its height), and wrapping round the tumble (`sway` and `tail` per radian of wobble). */
    somersault: { cape: 0.15, tail: 0.5, hood: 0.6 },
    tumbleCape: { cape: 0.5, sway: -1.4, tail: 1.2 },
  },
  hit: {
    /**
     * The first frame snaps back this far (away from the aim) and squashes, then recovers with an overshoot over the
     * sim's hit pose ticks (PLAYER_HIT_FX.poseTicks), its wave's half period `swing` of them.
     */
    lean: 0.35,
    swing: 0.75,
    squash: 0.12,
    push: -2,
    /** The cape and hood tail flick forward this far (the hood's tail `hoodFlick` times as far). */
    flick: 0.45,
    hoodFlick: 1.4,
    /** The face glow dips to this for this many frames. */
    glow: 0.4,
    glowFrames: 4,
  },
  ko: {
    /** Stagger back to frame 10, buckle to a kneel by 24, topple to flat by 36 (landing squashed), the glow out by 48. */
    stagger: 10,
    kneel: 24,
    flat: 36,
    out: 48,
    lean: -0.4,
    stretch: 0.05,
    dip: 0.5,
    kneelCrouch: 9,
    kneelLean: -0.15,
    land: 0.15,
    settleFrames: 6,
    /** The landing's bounce: its squash's cosine runs this fast through the settle. */
    bounce: 1.4,
    /** Kneeling: the back foot behind (its toe tilted down), the front foot planted ahead. */
    kneelFeet: { far: { x: -7, y: 0, tilt: -0.6 }, near: { x: 6, y: 0, tilt: 0 } },
    /** Lying: the feet out from the hip, the legs this share of straight. */
    lieFeet: { far: 0.5, near: 2, straight: 0.98 },
    /** The glow dims by this share by the fall, then gutters, `low` on the second half of every `period` frames. */
    glowDim: 0.35,
    gutter: { period: 4, low: 0.25 },
    /** The cape: blown forward by the stagger, back by the fall; its tails and the hood's tail by the fall. */
    cape: { stagger: 0.25, fall: -0.2, tail: -0.3, hood: -0.4 },
    /** The fall turns about the kneeling hip; the tube drops `after` frames into the fall, over `frames`, to lie this far in front of the feet. */
    tubeDrop: { after: 4, frames: 8 },
    tubeAt: [2, 5],
    tubeAngle: 0.15,
  },
  idle: {
    /** A breath every `breathMs`: the chest and hips rise `rise` px, with a small squash and stretch. */
    breathMs: 2400,
    rise: 0.8,
    squash: 0.02,
    /** The cape and hood tail sway this far every `swayMs`, the tails a quarter cycle behind. */
    swayMs: 3000,
    sway: 0.05,
  },
  /** The punch and the tube jab (023): a stretch on the thrust. */
  jabStretch: 0.06,
  /** The bubble rises this share of the flow's travel. */
  bubbleRise: 0.3,
  /** The clocks count at most this many ticks at once (a long stall), and a frame's move feeds the stride at most this far, world px (a door or a respawn). */
  maxTicks: 10,
  maxStep: 20,
} as const;
