// How the arcane ranger moves (075): snappy and exaggerated, poses snapping in fast and settling with a small
// overshoot, contacts squashing and releases stretching. Starting values, tuned by eye. Style px, radians and 60 Hz
// frames (one sim tick each); `squash` is positive for a squash and negative for a stretch. Render-only: nothing here
// changes a sim timing, so anticipation is folded into each action's opening frames.

export const WANDERER_MOTION = {
  /** One 60 Hz frame, ms. */
  frameMs: 1000 / 60,
  run: {
    /** Stride radians per world px moved (016's), so the feet don't slide: half a cycle is one step. */
    radPerPx: 0.32,
    /** The passing knee bends up to this far; the trailing foot kicks this far back as it lifts. */
    kneeBend: 0.9,
    kickBack: 2.6,
    /** The body bobs this far, lowest `lag` radians of stride after each contact, squashing there and stretching at passing. */
    bob: 1.5,
    lag: 0.35,
    contactSquash: 0.06,
    passingStretch: 0.04,
    /** The side view leans this far into the run. */
    lean: 0.12,
    /** The stride eases in over this many frames as a move starts. */
    startFrames: 5,
  },
  /** The cape trails to `run` radians at full speed, plus a flap; its tails swing `tail` of that a quarter cycle behind; the hood's tail `hood`. */
  cape: { run: 0.35, flap: 0.07, tail: 0.6, hood: 0.7 },
  /** The tank rides this far up and down a quarter of the bob's cycle behind the body, squashing as it lands. */
  tank: { bob: 1.2, squash: 0.08 },
  /** Moving while firing: a braced strafe at this share of the stride and bob, stepping twice as often so the feet stay planted. */
  strafe: { stride: 0.5, bob: 0.5, flap: 0.14 },
  /** As a stride ends: one settle, a squash over `frames` then rest, while the feet step home. */
  stop: { squash: 0.04, frames: 8 },
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
  },
  hit: {
    /** The first frame snaps back this far (away from the aim) and squashes, then recovers with an overshoot over `frames`. */
    frames: 8,
    lean: 0.35,
    squash: 0.12,
    push: -2,
    /** The cape and hood tail flick forward this far. */
    flick: 0.45,
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
    /** The fall turns about the kneeling hip; the dropped tube lands this far in front of the feet. */
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
} as const;
