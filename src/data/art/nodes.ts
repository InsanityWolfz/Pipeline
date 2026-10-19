import { NODE_SPRITES } from '../assets';
import { NODES, REGROW_STAGES } from '../nodes';
import { RIME_CLUSTER } from './stages';
import { LEY_IRON_SEAM } from './hollows';
import { boulder, canopy, shadow, trunk } from './terrain';
import { ellipse, flat, line, path, solid, type Shape, type VectorSprite } from './types';

// Gathering nodes (018), in the 016 vector style. Each node shows its uses left by
// its shape (a tree loses canopy, a boulder shrinks, reeds thin, a vein's crystals
// shrink), then its remains while depleted (a stump with a sapling, pebbles, cut
// stubs, dark crystal stumps), which grow back in REGROW_STAGES stages. World px
// round each anchor, which sits at the bottom of the node's base.

/** A node type's look at every use and regrow stage. `uses[i]` is the look with i + 1 uses left. */
export interface NodeLooks {
  size: readonly [number, number];
  anchor: readonly [number, number];
  uses: readonly (readonly Shape[])[];
  /** Index 0: bare remains; then each regrow stage. */
  regrow: readonly (readonly Shape[])[];
}

// Trees: a full canopy, thinning as wood is cut; a stump with a sapling that grows back into a young tree.
const CANOPY: readonly (readonly [number, number, number])[] = [
  [0, -34, 17],
  [-13, -27, 11],
  [13, -27, 11],
  [-8, -43, 11],
  [8, -43, 11],
  [0, -48, 10],
];
const stump: Shape[] = [
  shadow(9, 3, -1),
  path('M -6 0 Q -4.5 -1 -4.5 -6 L 4.5 -6 Q 4.5 -1 6 0 Z', solid('wood')),
  ellipse(0, -6, 4.5, 1.8, solid('wood-light')),
  ellipse(0, -6, 2.4, 0.9, { stroke: { color: 'wood', width: 0.6 } }),
];
const sapling = (h: number, leaves: number): Shape[] => [
  line([5, -1, 5.5, -h], 1.1, 'wood-dark', true),
  ...Array.from({ length: leaves }, (_, i) => {
    const y = -h + i * 3;
    const side = i % 2 === 0 ? -1 : 1;
    return ellipse(5.5 + side * 2.2, y, 2.4, 1.3, solid(i === 0 ? 'leaf-light' : 'leaf'));
  }),
];
const TREE: NodeLooks = {
  size: [60, 78],
  anchor: [30, 74],
  uses: [
    [
      shadow(16, 4.5),
      ...trunk(18),
      ...canopy([
        [0, -32, 13],
        [-10, -25, 8],
        [9, -27, 7],
      ]),
    ],
    [
      shadow(17, 5),
      ...trunk(18),
      ...canopy([
        [0, -34, 16],
        [-12, -27, 10],
        [12, -27, 10],
        [-6, -42, 9],
      ]),
    ],
    [shadow(18, 5), ...trunk(18), ...canopy(CANOPY)],
  ],
  regrow: [
    [...stump, ...sapling(8, 2)],
    [...stump, ...sapling(13, 3)],
    [
      shadow(10, 3.5),
      ...trunk(8),
      ...canopy([
        [0, -16, 8],
        [-6, -12, 5],
        [6, -12, 5],
      ]),
    ],
    [
      shadow(13, 4),
      ...trunk(12),
      ...canopy([
        [0, -24, 11],
        [-9, -18, 7],
        [9, -18, 7],
        [0, -31, 7],
      ]),
    ],
  ],
};

// Boulders: smaller with every chip taken, then a scatter of pebbles that piles back up.
const pebbles = (k: number): Shape[] => [
  shadow(12 * k + 4, 2.5, -1),
  ellipse(-6, -1.6, 3 * k + 1.2, 2 * k + 0.8, solid('rock')),
  ellipse(5, -1.4, 2.6 * k + 1, 1.8 * k + 0.7, solid('rock-light')),
  ellipse(0.5, -2.4, 2 * k + 1, 1.5 * k + 0.6, solid('rock-dark')),
];
const BOULDER: NodeLooks = {
  size: [44, 36],
  anchor: [22, 32],
  uses: [boulder(0.6), boulder(0.8), boulder(1)],
  regrow: [pebbles(0.4), [...pebbles(0.7), ...boulder(0.3)], [...pebbles(0.8), ...boulder(0.4)], boulder(0.5)],
};

// Reeds: a clump of stalks with brown heads, standing in a ripple of shallow water; thinner as stalks are cut,
// then cut stubs that shoot back up.
const STALKS: readonly (readonly [x: number, h: number, lean: number])[] = [
  [-6, 22, -2],
  [-3, 27, -1],
  [0, 30, 0.5],
  [3, 25, 1.5],
  [6, 21, 2.5],
  [-8, 17, -3],
  [8, 16, 3],
];
const ripple: Shape[] = [
  ellipse(0, -1, 13, 3.4, { fill: { id: 'water-light', alpha: 0.7 } }),
  ellipse(0, -1, 9, 2.2, { stroke: { color: 'foam', width: 0.6 } }),
];
const stalks = (count: number, scale: number, heads: boolean): Shape[] =>
  STALKS.slice(0, count).flatMap(([x, h, lean]) => {
    const top = -h * scale;
    const shapes: Shape[] = [
      line([x, -1, x + lean * scale, top], 1.3, 'leaf-dark', true),
      line([x + 0.4, -2, x + lean * scale * 0.8 + 0.4, top * 0.7], 0.5, 'leaf-light'),
    ];
    if (heads) shapes.push(ellipse(x + lean * scale, top - 2, 1.5, 3.4, solid('wood-dark')));
    return shapes;
  });
const stubs: Shape[] = STALKS.slice(0, 6).flatMap(([x]) => [line([x, -1, x, -4], 1.3, 'leaf-dark', true), ellipse(x, -4, 0.8, 0.4, flat('straw'))]);
const REEDS: NodeLooks = {
  size: [36, 44],
  anchor: [18, 40],
  uses: [
    [...ripple, ...stalks(3, 1, true)],
    [...ripple, ...stalks(5, 1, true)],
    [...ripple, ...stalks(7, 1, true)],
  ],
  regrow: [
    [...ripple, ...stubs],
    [...ripple, ...stubs, ...stalks(4, 0.35, false)],
    [...ripple, ...stalks(5, 0.6, false)],
    [...ripple, ...stalks(6, 0.85, false)],
  ],
};

// Ley veins: cyan crystals pushing out of a dark seam of rock where a ley line surfaces; smaller as shards
// are cracked off, then dull stumps that slowly light and grow again.
const seam: Shape[] = [
  shadow(13, 3, -1),
  path('M -13 0 Q -12 -5 -6 -6 Q 0 -8 7 -6 Q 12 -5 13 0 Z', solid('rock-dark')),
  path('M -9 -3 Q -2 -6 6 -4', { stroke: { color: 'cyan', width: 0.9 }, glow: { color: 'cyan-glow', blur: 3 } }),
];
const crystal = (x: number, h: number, w: number, lean: number, lit: number): Shape[] => {
  const body = `M ${x - w} -3 L ${x - w + lean * 0.4} ${-3 - h * 0.75} L ${x + lean} ${-3 - h} L ${x + w + lean * 0.4} ${-3 - h * 0.75} L ${x + w} -3 Z`;
  if (lit <= 0) return [path(body, solid('rock-pale')), path(`M ${x} -3 L ${x + lean * 0.4} ${-3 - h * 0.7}`, { stroke: { color: 'rock-light', width: 0.6 } })];
  return [
    path(body, {
      ...solid({
        linear: [x, -3, x + lean, -3 - h],
        stops: [
          { at: 0, color: 'cyan-deep' },
          { at: 0.6, color: 'cyan' },
          { at: 1, color: 'cyan-glow' },
        ],
      }),
      glow: { color: 'cyan-glow', blur: 4 * lit },
      alpha: 0.55 + 0.45 * lit,
    }),
    path(`M ${x - w * 0.3} -4 L ${x - w * 0.3 + lean * 0.4} ${-3 - h * 0.7} L ${x + lean * 0.6} ${-3 - h * 0.92}`, {
      stroke: { color: 'snow', width: 0.7 },
      alpha: lit,
    }),
  ];
};
const CRYSTALS: readonly (readonly [x: number, h: number, w: number, lean: number])[] = [
  [0, 18, 3.6, 0.5],
  [-6, 13, 3, -2.5],
  [6, 12, 2.8, 2.5],
  [-2.5, 9, 2.4, -1],
];
const crystals = (count: number, scale: number, lit: number): Shape[] =>
  CRYSTALS.slice(0, count).flatMap(([x, h, w, lean]) => crystal(x, h * scale, w, lean * scale, lit));
const LEY_VEIN: NodeLooks = {
  size: [36, 34],
  anchor: [18, 30],
  uses: [
    [...seam, ...crystals(2, 0.6, 1)],
    [...seam, ...crystals(3, 0.8, 1)],
    [...seam, ...crystals(4, 1, 1)],
  ],
  regrow: [
    [shadow(13, 3, -1), path('M -13 0 Q -12 -5 -6 -6 Q 0 -8 7 -6 Q 12 -5 13 0 Z', solid('rock-dark')), ...crystals(4, 0.22, 0)],
    [...seam, ...crystals(4, 0.3, 0.3)],
    [...seam, ...crystals(4, 0.5, 0.55)],
    [...seam, ...crystals(4, 0.7, 0.8)],
  ],
};

/** Every node type's looks, by node id. */
export const NODE_LOOKS: Readonly<Record<string, NodeLooks>> = { tree: TREE, rubble: BOULDER, reeds: REEDS, 'ley-vein': LEY_VEIN, 'rime-cluster': RIME_CLUSTER, 'ley-iron-seam': LEY_IRON_SEAM };

/** Every node frame, as vector sprites. */
export const NODE_SPRITES_VECTOR: readonly VectorSprite[] = Object.entries(NODE_LOOKS).flatMap(([id, looks]) => {
  const frames = NODE_SPRITES[id];
  if (!frames || looks.uses.length !== NODES[id]?.uses || frames.uses.length !== looks.uses.length)
    throw new Error(`Node '${id}' needs a look and a frame per use`);
  if (looks.regrow.length !== REGROW_STAGES + 1 || frames.regrow.length !== looks.regrow.length)
    throw new Error(`Node '${id}' needs bare remains and ${REGROW_STAGES} regrow stages`);
  const one = (key: string | undefined, shapes: readonly Shape[]): VectorSprite => ({
    key: key ?? '',
    size: looks.size,
    anchor: looks.anchor,
    frames: [shapes],
  });
  return [...looks.uses.map((s, i) => one(frames.uses[i], s)), ...looks.regrow.map((s, i) => one(frames.regrow[i], s))];
});

/** The patch of sun a grove's harvest tree stands in (018): an ellipse round its base, centred `rise` px above it. */
export const NODE_DAPPLE = { nodeId: 'tree', rx: 26, ry: 11, rise: 2, color: 'sun', alpha: 0.4 } as const;
