import { WANDERER_FEEL, type WandererView } from '../../data/art/wanderer';
import { REST_POSE, type WandererPose } from './wandererRig';

// Fixed wanderer poses for the contact sheet (016): what PlayerView produces live
// for idle, walking, firing, a hit, a roll and a death, plus the tube's states and the punch (023).

const AIM: Record<WandererView, number> = { side: 0.15, down: Math.PI / 2, up: -Math.PI / 2 };

export function sheetPoses(view: WandererView): { label: string; pose: WandererPose }[] {
  const base: WandererPose = { ...REST_POSE, view, aim: AIM[view] };
  return [
    { label: 'idle', pose: base },
    ...[0, 1, 2, 3].map((i) => ({ label: `walk ${i}`, pose: { ...base, stride: (i * Math.PI) / 2, stepping: 1, flap: 0.05 } })),
    { label: 'firing', pose: { ...base, lean: -0.16, crouch: 2.2, stance: 8.5, push: -2.5, flap: 0.12, glow: 1, muzzle: 1 } },
    { label: 'shot', pose: { ...base, lean: -0.21, crouch: 2.2, stance: 8.5, push: -3.5, kick: 3.5, flap: 0.16, glow: 1, muzzle: 1 } },
    { label: 'hit', pose: { ...base, lean: 0.2, push: -2, glow: 1 } },
    { label: 'roll', pose: { ...base, lean: 0.55, crouch: 9, stance: 3 } },
    { label: 'death', pose: { ...base, lean: -1.2, crouch: 10, stance: 7, glow: 0.15, muzzle: 0 } },
    { label: 'dormant', pose: { ...base, attuned: false, muzzle: 0 } },
    { label: 'attuning', pose: { ...base, attuned: false, attuning: 0.55 } },
    { label: 'no tube', pose: { ...base, hasTube: false } },
    { label: 'tube jab', pose: { ...base, jab: 1, lean: WANDERER_FEEL.jab.lean, push: WANDERER_FEEL.jab.push } },
    { label: 'punch', pose: { ...base, hasTube: false, jab: 1, lean: WANDERER_FEEL.jab.lean, push: WANDERER_FEEL.jab.push } },
  ];
}
