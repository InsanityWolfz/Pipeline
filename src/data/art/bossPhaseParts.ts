import { BOSS_PHASE_SPRITES as S } from '../arenaAssets';
import { ellipse, flat, line, path, type Shape, type VectorSprite } from './types';

// 080: the boss phase looks' parts (docs/specs/080-boss-intros.md "Phase changes, as drawn"): small frames render places
// on the posed rig (BOSS_PHASE_LOOK's anchors, with 076's `posedPoint`), so every attack pose shows them. World px
// about each sprite's anchor, which sits on its anchor point on the rig. Daylight palette ids only.

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], frames: readonly (readonly Shape[])[]): VectorSprite => ({ key, size, anchor, frames });

/** A ley rune chevron across the shield's face, glowing cyan. */
const rune = (y: number): Shape => ({ ...path(`M -6 ${y} L 0 ${y + 6} L 6 ${y}`, { stroke: { color: 'cyan-glow', width: 1.6 } }), glow: { color: 'cyan', blur: 4 } });
const RUNES = [rune(-14), rune(-2), rune(10)];

/** The Bulwark's slate shoulder plates lifted into spikes. */
const spike = (x: number, dir: number): Shape =>
  path(`M ${x} 4 L ${x + dir * 3} -10 L ${x + dir * 9} 2 Z`, { fill: { linear: [x, -10, x + dir * 9, 4], stops: [{ at: 0, color: 'hollow-pale' }, { at: 1, color: 'hollow-dark' }] }, outline: true });

/** A tongue of flame on the helm. */
const flame = (x: number, h: number, w: number): Shape =>
  path(`M ${x - w} 0 Q ${x - w} ${-h * 0.6} ${x} ${-h} Q ${x + w} ${-h * 0.6} ${x + w} 0 Z`, {
    fill: { radial: [x, -h * 0.25, h], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.55, color: 'cinder' }, { at: 1, color: 'flame-dark' }] },
    glow: { color: 'cinder', blur: 4 },
  });

/** A short zigzag arc between two points. */
const zig = (x0: number, y0: number, x1: number, y1: number, k: number): Shape => {
  const mx = (x0 + x1) / 2 + k;
  const my = (y0 + y1) / 2 - k;
  return { ...line([x0, y0, mx, my, x1, y1], 1, 'storm-glow'), glow: { color: 'storm-glow', blur: 3 } };
};

export const BOSS_PHASE_SPRITES_VECTOR: readonly VectorSprite[] = [
  // Lit one by one as its adds rise: one, two, then all three.
  sprite(S.runes, [20, 36], [10, 18], [RUNES.slice(0, 1), RUNES.slice(0, 2), RUNES]),
  // Two lips of the shield's rim broken off and a crack line running down from them.
  sprite(S.chips, [50, 20], [25, 4], [
    [
      path('M -16 -2 L -11 4 L -7 -2 Z', flat('hollow-dark')),
      path('M 8 -2 L 12 3 L 17 -2 Z', flat('hollow-dark')),
      line([-11, 4, -9, 9, -12, 13], 0.8, { id: 'ink', alpha: 0.8 }),
      line([12, 3, 13, 8], 0.8, { id: 'ink', alpha: 0.8 }),
    ],
  ]),
  // The shield split along a glowing red crack.
  sprite(S.crack, [24, 60], [12, 30], [
    [{ ...line([1, -26, -3, -14, 3, -4, -2, 6, 2, 16, -1, 26], 1.6, 'danger'), glow: { color: 'danger', blur: 4 } }, line([1, -26, -3, -14, 3, -4, -2, 6, 2, 16, -1, 26], 0.6, 'cinder-light')],
  ]),
  sprite(S.spikes, [64, 24], [32, 12], [[spike(-24, -1), spike(-16, -1), spike(16, 1), spike(24, 1)]]),
  // The Forgewright's chest plates swung open as it vents.
  sprite(S.plates, [56, 32], [28, 14], [
    [
      path('M -6 -10 L -22 -14 L -24 10 L -7 12 Z', { fill: { linear: [-24, -14, -6, 12], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
      path('M 6 -10 L 22 -14 L 24 10 L 7 12 Z', { fill: { linear: [6, -14, 24, 12], stops: [{ at: 0, color: 'iron' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
      ellipse(-15, -1, 1.2, 1.2, flat('brass')),
      ellipse(15, -1, 1.2, 1.2, flat('brass')),
    ],
  ]),
  sprite(S.crest, [26, 26], [13, 22], [[flame(0, 18, 4.5), flame(-5, 11, 3), flame(5, 12, 3)]]),
  // The storm-glass dome round the Conductor's body: a pale shell, its edge brighter, at most the look's alpha.
  sprite(S.dome, [92, 112], [46, 56], [
    [
      ellipse(0, 0, 42, 52, { fill: { radial: [-10, -16, 52], stops: [{ at: 0, color: 'snow' }, { at: 0.6, color: 'storm-pale' }, { at: 1, color: 'storm-glow' }] }, alpha: 0.5 }),
      ellipse(0, 0, 42, 52, { stroke: { color: 'storm-glow', width: 1.4 } }),
      path('M -26 -34 Q -14 -46 4 -48', { stroke: { color: 'snow', width: 1.6 } }),
    ],
  ]),
  // A halo of violet arcs over the crown, crackling between two frames.
  sprite(S.halo, [44, 20], [22, 10], [
    [zig(-18, 4, -6, -4, 2), zig(-6, -4, 6, -6, -2), zig(6, -6, 18, 4, 2), ellipse(0, 0, 18, 6, { stroke: { color: { id: 'storm-glow', alpha: 0.6 }, width: 0.8 } })],
    [zig(-18, 2, -6, -6, -2), zig(-6, -6, 6, -4, 2), zig(6, -4, 18, 2, -2), ellipse(0, 0, 18, 6, { stroke: { color: { id: 'storm-glow', alpha: 0.6 }, width: 0.8 } })],
  ]),
];
