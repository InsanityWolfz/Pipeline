import { ARENA_DOOR_LOOK as L, ARENA_DOOR_SPRITES } from '../arenaAssets';
import { TILE_SIZE } from '../config';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// A boss arena's door (055, D.5, Shaun: "a big door… ooh, what's this? I'm going to go in"): two rune-carved stone
// jambs under a lintel with a keystone, and two brass-banded stone leaves meeting in the middle under a brass
// medallion. Sealed, an iron bar lies across the leaves and the medallion's rune is dormant; open, the rune burns ley
// cyan and light leaks down the seam between the leaves. World px round the anchor at the bottom centre of the door's
// row; light from the top left.

const leafFill = { linear: [0, -L.height, 0, 0] as const, stops: [{ at: 0, color: 'carve-light' }, { at: 1, color: 'carve' }] };
const jambFill = { linear: [0, 0, L.jamb, 0] as const, stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] };

/** A door `tiles` wide, sealed or open. */
function door(tiles: number, open: boolean): Shape[] {
  const w = (tiles * TILE_SIZE) / 2;
  const h = L.height;
  const top = -h + L.lintel;
  const mid = -h * 0.52;
  const rune = open ? 'cyan' : 'dormant-dark';
  const jamb = (x: number): Shape[] => [
    rect(x, -h, L.jamb, h, 1.5, { fill: jambFill, outline: true }),
    line([x + 2, -h + 16, x + L.jamb - 2, -h + 16], 0.8, 'rock-dark'),
    line([x + 2, -h + 30, x + L.jamb - 2, -h + 30], 0.8, 'rock-dark'),
    path(`M ${x + L.jamb / 2 - 2} ${-h + 22} L ${x + L.jamb / 2} ${-h + 26} L ${x + L.jamb / 2 + 2} ${-h + 22}`, open ? { ...trim('cyan', 1), glow: { color: 'cyan', blur: 3 } } : trim('rock-dark', 0.9)),
  ];
  const leaf = (x0: number, x1: number): Shape[] => [
    rect(x0, top, x1 - x0, -top, 1, { fill: leafFill, outline: true }),
    ...[0.28, 0.72].map((k) => rect(x0, top + -top * k - 1.5, x1 - x0, 3, 0.5, solid('brass'))),
    ...[0.28, 0.72].flatMap((k) => [x0 + 4, x1 - 4].map((x) => ellipse(x, top + -top * k, 0.9, 0.9, flat('brass-light')))),
  ];
  const inner = w - L.jamb;
  return [
    shadow(w + 2, 5, -1),
    ...leaf(-inner, 0),
    ...leaf(0, inner),
    // The seam between the leaves: dark when sealed, ley light leaking through when open.
    open ? { ...line([0, top + 2, 0, -1], 1.6, 'cyan-glow'), glow: { color: 'cyan', blur: 5 } } : line([0, top + 1, 0, -1], 1.2, 'carve-dark'),
    ...(open ? [] : [rect(-inner + 2, mid + 8, inner * 2 - 4, 5, 1, solid('iron')), line([-inner + 3, mid + 9, inner - 3, mid + 9], 0.8, 'iron-light')]),
    ...jamb(-w),
    ...jamb(w - L.jamb),
    rect(-w - L.overhang, -h - 2, (w + L.overhang) * 2, L.lintel + 2, 2, solid('rock-light')),
    line([-w - L.overhang + 2, -h + L.lintel - 1, w + L.overhang - 2, -h + L.lintel - 1], 1, 'rock'),
    path(`M -6 ${-h - 2} L 6 ${-h - 2} L 4 ${-h + L.lintel} L -4 ${-h + L.lintel} Z`, solid('rock-pale')),
    ellipse(0, mid, L.medallion, L.medallion, { fill: { radial: [-2, mid - 2, L.medallion], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
    ellipse(0, mid, L.medallion - 2.5, L.medallion - 2.5, flat(open ? 'hood-dark' : 'carve-dark')),
    { ...path(`M 0 ${mid - 4} L 3 ${mid} L 0 ${mid + 4} L -3 ${mid} Z`, trim(rune, 1.2)), ...(open ? { glow: { color: 'cyan', blur: 5 } } : {}) },
    ellipse(-w - 2, -h + 1, 5, 1.8, flat('moss-tuft')),
  ];
}

/** Every door sprite: each width, sealed and open. */
export const ARENA_DOOR_SPRITES_VECTOR: readonly VectorSprite[] = Object.entries(ARENA_DOOR_SPRITES).flatMap(([n, f]) => {
  const tiles = Number(n);
  const size: readonly [number, number] = [tiles * TILE_SIZE + 2 * L.overhang + 4, L.height + 8];
  const anchor: readonly [number, number] = [size[0] / 2, L.height + 4];
  return [
    { key: f.sealed, size, anchor, frames: [door(tiles, false)] },
    { key: f.open, size, anchor, frames: [door(tiles, true)] },
  ];
});
