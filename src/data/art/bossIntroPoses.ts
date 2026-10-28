import type { EnemyPose } from './enemyRig';

// 080: the bosses' intro poses (docs/specs/080-boss-intros.md "Per boss"), spread into each rig's pose table: asleep
// at its post (`dormant`), the first stir, the rise in three poses picked by progress (squash and stretch, 076's
// channels), the beat's blow, and the challenge pose on a slow two-frame breathe (`ready`). Glows dark while dormant
// and lit by the ready pose. Render picks the frame by intro ticks (src/render/bossIntro.ts).

export interface IntroPoses {
  readonly dormant: readonly EnemyPose[];
  readonly stir: readonly EnemyPose[];
  readonly rise: readonly EnemyPose[];
  readonly beat: readonly EnemyPose[];
  readonly ready: readonly EnemyPose[];
}

/** The Pylon Warden rises: knelt on one knee in the moss, it pushes up on its fists, stands tall, slams both fists down. */
export const WARDEN_INTRO: IntroPoses = {
  dormant: [{ sink: 8, squash: 0.12, lean: 0.35, head: 0.45, headLift: 2, armBack: -0.6, armFront: -0.6, legFront: 0.7, step: 2, glow: 0 }],
  stir: [{ sink: 7.5, squash: 0.12, lean: 0.33, head: 0.38, headLift: 1.5, armBack: -0.62, armFront: -0.62, legFront: 0.7, step: 2, glow: 0.25 }],
  rise: [
    { sink: 6, squash: 0.15, lean: 0.32, head: 0.3, headLift: 1, armBack: -0.75, armFront: -0.75, legFront: 0.5, step: 1.5, glow: 0.45 },
    { sink: 2.5, squash: -0.05, lean: 0.1, head: 0.05, armBack: -0.3, armFront: -0.3, legFront: 0.2, glow: 0.75 },
    { bob: -1.5, squash: -0.12, lean: -0.1, head: -0.15, armBack: 0.5, armFront: 0.5, glow: 1 },
  ],
  beat: [{ armBack: -0.45, armFront: -0.45, lean: 0.25, sink: 4, squash: 0.18, glow: 1 }],
  ready: [
    { armBack: 2.3, armFront: 2.3, lean: -0.12, head: -0.15, squash: -0.04, glow: 1 },
    { armBack: 2.4, armFront: 2.4, lean: -0.14, head: -0.18, bob: -0.6, squash: -0.05, glow: 0.9 },
  ],
};

/** The Bulwark rises: crouched behind its shield planted edge-down, it hauls the shield up, stands, slams its edge down. */
export const BULWARK_INTRO: IntroPoses = {
  dormant: [{ sink: 6, squash: 0.12, raise: -4, lean: 0.25, head: 0.35, armFront: 0.25, armBack: -0.3, glow: 0 }],
  stir: [{ sink: 5.5, squash: 0.11, raise: -4, lean: 0.23, head: 0.3, armFront: 0.25, armBack: -0.3, glow: 0.3 }],
  rise: [
    { raise: 2, sink: 5, squash: 0.13, lean: 0.2, armBack: 0.5, head: 0.2, glow: 0.45 },
    { raise: 6, sink: 1, squash: -0.05, armBack: 0.9, glow: 0.75 },
    { raise: 9, bob: -1.5, squash: -0.12, lean: -0.12, head: -0.15, armBack: 1.2, glow: 1 },
  ],
  beat: [{ raise: -2, armFront: 0.22, armBack: -0.4, sink: 5, squash: 0.18, glow: 1 }],
  ready: [
    { raise: 5, armBack: 0.6, lean: -0.05, glow: 1 },
    { raise: 5.5, armBack: 0.65, lean: -0.06, bob: -0.5, glow: 0.85 },
  ],
};

/** The Forgewright forms, kindling: a cold forge whose seams light from the core out, its hammer lifted and struck down. */
export const FORGE_INTRO: IntroPoses = {
  dormant: [{ sink: 3, squash: 0.06, lean: 0.15, head: 0.3, headLift: 1, armFront: 0.7, armBack: 0.4, glow: 0 }],
  stir: [{ sink: 2.8, squash: 0.06, lean: 0.14, head: 0.26, headLift: 1, armFront: 0.68, armBack: 0.4, glow: 0.25 }],
  rise: [
    { sink: 2, squash: 0.09, lean: 0.1, head: 0.15, armFront: 0.6, armBack: 0.3, glow: 0.45 },
    { squash: -0.04, armFront: 0.2, glow: 0.75 },
    { bob: -1, squash: -0.1, head: -0.15, lean: -0.1, armFront: -2.2, armBack: -0.3, glow: 1 },
  ],
  beat: [{ armFront: 1, lean: 0.22, sink: 4, squash: 0.16, glow: 1 }],
  ready: [
    { armFront: -1.6, armBack: -0.2, lean: -0.06, glow: 1 },
    { armFront: -1.65, armBack: -0.22, lean: -0.07, bob: -0.6, glow: 0.9 },
  ],
};

/** The Conductor forms from lightning: its robe slack, the staff leaning; it fills, straightens and takes a bolt on its staff. */
export const CONDUCTOR_INTRO: IntroPoses = {
  dormant: [{ sink: 2, squash: 0.08, lean: 0.2, head: 0.4, headLift: 1, armFront: 0.5, armBack: 0.4, glow: 0 }],
  stir: [{ sink: 1.8, squash: 0.08, lean: 0.19, head: 0.36, headLift: 1, armFront: 0.5, armBack: 0.4, glow: 0.15 }],
  rise: [
    { bob: -1, squash: 0.04, lean: 0.12, head: 0.25, armFront: 0.3, armBack: 0.3, glow: 0.35 },
    { bob: -2, squash: -0.04, armFront: -0.2, glow: 0.7 },
    { bob: -3, squash: -0.1, lean: -0.1, head: -0.15, armFront: -1.6, armBack: -0.4, glow: 1 },
  ],
  beat: [{ armFront: -2.9, armBack: -0.9, bob: -4, squash: -0.12, head: -0.2, glow: 1 }],
  ready: [
    { armFront: -2.4, armBack: -0.6, bob: -3, lean: -0.05, glow: 1 },
    { armFront: -2.45, armBack: -0.62, bob: -3.5, lean: -0.06, glow: 0.9 },
  ],
};

/** The Bulwark's roar as it enrages (041's 60 ticks), a strip by progress: it rears back with the shield lifted, roars with its head thrown up, settles into the hunch. */
export const BULWARK_ROAR: readonly EnemyPose[] = [
  { lean: -0.25, raise: 6, armBack: 1.2, bob: -1, squash: -0.06, head: -0.2, glow: 1 },
  { lean: -0.32, head: -0.55, headLift: -1, bob: -3, raise: 4, armBack: 1.6, armFront: -0.25, squash: -0.1, glow: 1 },
  { lean: 0.2, sink: 2, squash: 0.08, head: 0.15, raise: 1, armBack: 0.4, glow: 1 },
];
