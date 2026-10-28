import { MINE_SPRITES } from '../mineAssets';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// 038's art, in the 020 style: the landmine (a flat iron disc with a brass rim and a cyan
// ley pip) in flight and lying armed, its icon, the iron plate, a cluster bomb's bomblet,
// and the flashes of a mine's and a bomblet's burst. The arm ring is drawn live (MineView).

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });
const icon = (key: string, shapes: readonly Shape[]): VectorSprite => sprite(key, [16, 16], [8, 8], shapes);

const ironFill = (x0: number, y0: number, x1: number, y1: number) => ({
  linear: [x0, y0, x1, y1] as const,
  stops: [
    { at: 0, color: 'iron-light' },
    { at: 0.55, color: 'iron' },
    { at: 1, color: 'iron-dark' },
  ],
});

/** A ley pip: the cyan eye in the mine's middle, lit or dark. */
const pip = (x: number, y: number, r: number, lit = true): Shape =>
  ellipse(x, y, r, r * 0.8, lit ? { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 3 } } : { fill: 'cyan-deep', outline: true });

/**
 * The landmine seen from above at three-quarter view: a squat iron disc `rx` wide, a brass rim, four rivets and the
 * pip, lit or dark.
 */
function mine(rx: number, lit: boolean): Shape[] {
  const ry = rx * 0.55;
  return [
    ellipse(0, 1.6, rx, ry, solid('iron-dark')),
    // 078: lit from the top left with a pale rim on its lit edge.
    ellipse(0, 0, rx, ry, { fill: ironFill(-rx, -ry, rx, ry), outline: true, rim: { color: { id: 'snow', alpha: 0.45 }, width: 0.7, offset: 0.6 } }),
    ellipse(0, 0, rx * 0.72, ry * 0.72, trim('brass', 1)),
    ...[0, 1, 2, 3].map((k) => {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      return ellipse(Math.cos(a) * rx * 0.86, Math.sin(a) * ry * 0.86, 0.6, 0.5, flat('brass-light'));
    }),
    path(`M ${-rx * 0.5} ${-ry * 0.45} Q 0 ${-ry * 0.8} ${rx * 0.5} ${-ry * 0.45}`, trim({ id: 'snow', alpha: 0.35 }, 0.7)),
    pip(0, 0, rx * 0.22, lit),
  ];
}

/** The iron plate: a riveted square sheet of ley-iron, rust at a corner, a cyan vein glinting. */
const IRON_PLATE: Shape[] = [
  path('M -6 -2 L 1 -6 L 7 -2.5 L 0 1.5 Z', { fill: ironFill(-6, -6, 7, 2), outline: true }),
  path('M -6 -2 L 0 1.5 L 0 4.6 L -6 1 Z', solid('iron-dark')),
  path('M 0 1.5 L 7 -2.5 L 7 0.6 L 0 4.6 Z', solid('iron')),
  path('M 4 -0.8 L 7 -2.5 L 7 0.6 L 5 1.8 Z', flat('iron-rust')),
  ...[
    [-3.4, -2],
    [1, -4.6],
    [4.4, -2.5],
    [0, 0],
  ].map(([x, y]) => ellipse(x ?? 0, y ?? 0, 0.6, 0.4, flat('brass-light'))),
  { ...path('M -3 -1.4 L 0 -3 L 2.6 -2.2', trim('vein', 0.6)), glow: { color: 'vein', blur: 2 } },
];

/** A bomblet: a small dark pellet with a cinder band and a fuse glint. */
const BOMBLET: Shape[] = [
  ellipse(0, 0, 2.6, 2.6, { fill: { radial: [-0.9, -0.9, 3.6], stops: [{ at: 0, color: 'rock' }, { at: 0.75, color: 'rock-dark' }] }, outline: true, rim: { color: 'rock-pale', width: 0.5, offset: 0.45 } }),
  rect(-2.5, -0.5, 5, 1, 0.5, flat('cinder')),
  ellipse(1.6, -2.4, 0.8, 0.8, { fill: 'cinder-light', glow: { color: 'cinder', blur: 2 } }),
];

/**
 * A burst flash `r` px round: a hot core fading through `mid` to the rim's colour, a bright ring of the rim's colour over
 * a dark ink ring (so it reads over grass and stone alike) and `shards` iron or ember splinters flying out.
 */
function flash(r: number, core: string, mid: string, rim: string, shards: number, shard: string): Shape[] {
  return [
    ellipse(0, 0, r, r * 0.62, { fill: { radial: [0, 0, r], stops: [{ at: 0, color: { id: core, alpha: 1 } }, { at: 0.4, color: { id: mid, alpha: 0.85 } }, { at: 0.75, color: { id: rim, alpha: 0.55 } }, { at: 1, color: { id: rim, alpha: 0 } }] } }),
    ellipse(0, 0, r * 0.82, r * 0.5, { stroke: { color: { id: 'ink', alpha: 0.55 }, width: 3.4 } }),
    ellipse(0, 0, r * 0.82, r * 0.5, { stroke: { color: rim, width: 2 }, glow: { color: rim, blur: 5 } }),
    ...Array.from({ length: shards }, (_, k) => {
      const a = (k * Math.PI * 2) / shards + 0.3;
      const [c, s] = [Math.cos(a), Math.sin(a) * 0.62];
      return line([c * r * 0.45, s * r * 0.45, c * r * 0.95, s * r * 0.95], 1.3, shard, true);
    }),
    ellipse(0, 0, r * 0.3, r * 0.2, { fill: 'snow', glow: { color: core, blur: 4 } }),
  ];
}

const R = 24;

/** The landmine's icon shapes (039: a Frost landmine's icon is this with the frost badge). */
export const ICON_LANDMINE: Shape[] = mine(7, true);

export const MINE_SPRITES_VECTOR: readonly VectorSprite[] = [
  sprite(MINE_SPRITES.landmine, [16, 12], [8, 6], mine(6, true)),
  sprite(MINE_SPRITES.landmineShadow, [14, 6], [7, 3], [ellipse(0, 0, 5.5, 1.8, { fill: { id: 'ground-shade', alpha: 0.35 } })]),
  sprite(MINE_SPRITES.armed, [20, 14], [10, 7], [ellipse(0, 2.2, 8, 3, { fill: { id: 'ground-shade', alpha: 0.4 } }), ...mine(7.5, true)]),
  icon(MINE_SPRITES.iconLandmine, ICON_LANDMINE),
  icon(MINE_SPRITES.itemIronPlate, IRON_PLATE),
  sprite(MINE_SPRITES.bomblet, [8, 8], [4, 4], BOMBLET),
  sprite(MINE_SPRITES.bombletShadow, [8, 4], [4, 2], [ellipse(0, 0, 2.6, 1, { fill: { id: 'ground-shade', alpha: 0.35 } })]),
  sprite(MINE_SPRITES.mineFlash, [R * 2 + 4, R * 2 + 4], [R + 2, R + 2], flash(R, 'snow', 'gold-trim', 'cyan-glow', 8, 'iron-light')),
  sprite(MINE_SPRITES.bombletFlash, [R * 2 + 4, R * 2 + 4], [R + 2, R + 2], flash(R, 'cinder-light', 'cinder-light', 'cinder', 6, 'cinder-light')),
];
