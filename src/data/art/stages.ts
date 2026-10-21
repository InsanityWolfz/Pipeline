import { ROUND_ICONS, STAGE_SPRITES } from '../stageAssets';
import { ROUNDS, roundBase, roundTags } from '../tags';
import { ICON_ARROW, ICON_ARROW_HEAD, ICON_BOMB, ICON_LEY_BOLT } from './items';
import { ICON_LANDMINE } from './mines';
import type { NodeLooks } from './nodes';
import { shadow } from './terrain';
import { ellipse, flat, line, path, solid, trim, type Shape, type ShapeStyle, type VectorSprite } from './types';

// 029's art, in the 020 style: the rimestone and the rime outcrop it's chipped
// from, each tagged round's icon (its base's icon with its tag's badge), the Shard
// in flight and its burst, and the ice round a frozen enemy.

const icon = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [16, 16], anchor: [8, 8], frames: [shapes] });

/** A rime crystal: a pale blue-white spike, `h` tall and `w` wide at its foot, leaning by `lean`. */
function rime(x: number, y: number, h: number, w: number, lean: number, alpha = 1): Shape[] {
  return [
    path(`M ${x - w} ${y} L ${x - w * 0.7 + lean * 0.5} ${y - h * 0.7} L ${x + lean} ${y - h} L ${x + w * 0.7 + lean * 0.5} ${y - h * 0.7} L ${x + w} ${y} Z`, {
      fill: { linear: [x, y, x + lean, y - h], stops: [{ at: 0, color: 'water-light' }, { at: 0.55, color: 'foam' }, { at: 1, color: 'snow' }] },
      outline: true,
      glow: { color: 'foam', blur: 2 },
      alpha,
    }),
    path(`M ${x - w * 0.25} ${y - 0.6} L ${x - w * 0.2 + lean * 0.5} ${y - h * 0.68}`, { ...trim('snow', 0.6), alpha }),
    path(`M ${x + w * 0.35} ${y - 0.6} L ${x + w * 0.2 + lean * 0.6} ${y - h * 0.6}`, { ...trim('water', 0.4), alpha: 0.6 * alpha }),
  ];
}

// The rimestone: three chips of rime ice on a crust of frost.
const RIME_SHARD: Shape[] = [
  ellipse(0, 5, 6, 1.6, flat({ id: 'foam', alpha: 0.7 })),
  ...rime(-3, 5.4, 7.5, 2, -1.4),
  ...rime(3.4, 5.4, 6.5, 1.8, 1.6),
  ...rime(0.2, 5.6, 11, 2.6, 0.4),
];

// Rime outcrops: rime spikes rising from frosted rock in the Grotto; fewer and smaller as shards are chipped off,
// then a bare crust of frost that slowly grows spikes again.
const crust: Shape[] = [
  shadow(14, 3, -1),
  path('M -14 0 Q -13 -5 -6 -6 Q 1 -8 8 -6 Q 13 -5 14 0 Z', solid('rock-light')),
  path('M -13 -1 Q -10 -5 -4 -5.4 Q 2 -6.8 8 -5 Q 12 -4 13 -1', { fill: { id: 'foam', alpha: 0.85 } }),
  ellipse(-6, -4.4, 2.2, 0.8, flat('snow')),
];
const SPIKES: readonly (readonly [x: number, h: number, w: number, lean: number])[] = [
  [0, 20, 3.8, 0.6],
  [-6.5, 14, 3, -2.6],
  [6.5, 13, 2.9, 2.6],
  [-2.6, 9, 2.3, -1.2],
];
const spikes = (count: number, scale: number, alpha = 1): Shape[] => SPIKES.slice(0, count).flatMap(([x, h, w, lean]) => rime(x, -3.5, h * scale, w, lean * scale, alpha));

export const RIME_CLUSTER: NodeLooks = {
  size: [38, 36],
  anchor: [19, 32],
  uses: [
    [...crust, ...spikes(2, 0.6)],
    [...crust, ...spikes(3, 0.8)],
    [...crust, ...spikes(4, 1)],
  ],
  regrow: [
    [...crust, ...spikes(4, 0.2, 0.5)],
    [...crust, ...spikes(4, 0.32, 0.7)],
    [...crust, ...spikes(4, 0.5, 0.85)],
    [...crust, ...spikes(4, 0.72, 1)],
  ],
};

/** The frost badge: a snowflake on a water disc, centred at (x, 4.2). */
function snowflake(x: number): Shape[] {
  return [
    ellipse(x, 4.2, 3.4, 3.4, solid('water')),
    ...[0, 60, 120].map((a) => {
      const r = (a * Math.PI) / 180;
      const dx = Math.cos(r) * 2.4;
      const dy = Math.sin(r) * 2.4;
      return line([x - dx, 4.2 - dy, x + dx, 4.2 + dy], 0.7, 'snow');
    }),
  ];
}

/**
 * Each tag's mark on a tagged round's icon (029): a small badge in its lower-right corner, and optionally a new look
 * for its base icon's head (a frost arrow's head is pale ice).
 */
const TAG_ART: Readonly<Record<string, { badge: readonly Shape[]; pairedBadge?: readonly Shape[]; head?: ShapeStyle }>> = {
  // A snowflake, and a head of ice.
  frost: {
    badge: snowflake(4.2),
    // 039: beside a shape's badge, the element's sits in the lower-left corner.
    pairedBadge: snowflake(-4.2),
    head: { fill: 'foam', outline: true, glow: { color: 'water-light', blur: 2 } },
  },
  // A bending arrow.
  homing: {
    badge: [
      ellipse(4.2, 4.2, 3.4, 3.4, solid('cyan-deep')),
      path('M 2.2 6 Q 2.2 2.4 5.4 2.4', trim('cyan-glow', 0.9)),
      path('M 4.6 1.2 L 6.4 2.4 L 4.6 3.6 Z', flat('cyan-glow')),
    ],
  },
  // A five-point star.
  split: {
    badge: [
      ellipse(4.2, 4.2, 3.4, 3.4, solid('cyan-deep')),
      path(starPath(4.2, 4.2, 2.6, 0.45), { fill: 'snow', glow: { color: 'cyan-glow', blur: 2 } }),
    ],
  },
  // Four small bomblets round a centre (038).
  cluster: {
    badge: [
      ellipse(4.2, 4.2, 3.4, 3.4, solid('cinder')),
      ellipse(4.2, 4.2, 0.9, 0.9, flat('cinder-light')),
      ...[0, 1, 2, 3].map((k) => ellipse(4.2 + Math.cos((k * Math.PI) / 2) * 2.2, 4.2 + Math.sin((k * Math.PI) / 2) * 2.2, 0.8, 0.8, flat('ink'))),
    ],
  },
};

/** A five-point Split round (x, y), points `r` out and its waist `r * inner`, one point up. */
function starPath(x: number, y: number, r: number, inner: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * inner;
    return `${(x + Math.cos(a) * rad).toFixed(2)} ${(y + Math.sin(a) * rad).toFixed(2)}`;
  });
  return `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(' ')} Z`;
}

/** Each base ammo's icon, and the shape in it that is its head, if a tag can recolour one. */
const BASE_ICONS: Readonly<Record<string, { shapes: readonly Shape[]; head?: Shape }>> = {
  arrow: { shapes: ICON_ARROW, head: ICON_ARROW_HEAD },
  bomb: { shapes: ICON_BOMB },
  'ley-bolt': { shapes: ICON_LEY_BOLT },
  landmine: { shapes: ICON_LANDMINE },
};

/** A tagged round's icon: its base's, its head restyled by any tag that restyles heads, then each tag's badge. */
function roundIcon(round: string): VectorSprite {
  const base = BASE_ICONS[roundBase(round)] ?? { shapes: [] };
  const art = roundTags(round).flatMap((t) => (TAG_ART[t] ? [TAG_ART[t]] : []));
  const head = art.find((a) => a.head)?.head;
  const shapes = base.shapes.map((sh) => (head && sh === base.head ? ({ ...sh, ...head } as Shape) : sh));
  const badges = art.flatMap((a) => (art.length > 1 && a.pairedBadge ? a.pairedBadge : a.badge));
  return icon(ROUND_ICONS[round] ?? '', [...shapes, ...badges]);
}

/** A Shard in flight (029), pointing right: a small ley crystal (054: bigger and brighter, so a star shot reads). */
const SHARD: Shape[] = [
  { ...line([-8, 0, -1, 0], 1.6, { id: 'cyan', alpha: 0.6 }), glow: { color: 'cyan', blur: 3 } },
  path('M 5 0 L -0.4 -2.2 L -2.4 0 L -0.4 2.2 Z', { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 4 } }),
  ellipse(1, -0.5, 1, 0.5, flat('snow')),
];

/** The Split's flash: a five-point star of ley light. */
const SPLIT_FLASH_SHAPES: Shape[] = [
  ellipse(0, 0, 9, 9, { fill: { radial: [0, 0, 9], stops: [{ at: 0, color: { id: 'snow', alpha: 0.9 } }, { at: 1, color: { id: 'cyan', alpha: 0 } }] } }),
  path(starPath(0, 0, 11, 0.32), { fill: 'cyan-glow', glow: { color: 'cyan', blur: 6 } }),
  ellipse(0, 0, 2.6, 2.6, flat('snow')),
];

/** Ice round a frozen enemy, `w` x `h` px over its feet: clear blocks with pale facets, cracked before it breaks. */
function iceCase(w: number, h: number, cracked: boolean): Shape[] {
  const x = w / 2;
  const facet = (pts: string, alpha: number): Shape => path(pts, { fill: { id: 'foam', alpha }, stroke: { color: { id: 'snow', alpha: 0.7 }, width: 0.8 } });
  return [
    path(`M ${-x} -1 L ${-x - 2} ${-h * 0.55} L ${-x * 0.5} ${-h} L ${x * 0.6} ${-h - 2} L ${x + 2} ${-h * 0.5} L ${x} -1 Z`, {
      fill: { linear: [0, -h, 0, 0], stops: [{ at: 0, color: { id: 'snow', alpha: 0.4 } }, { at: 1, color: { id: 'water-light', alpha: 0.3 } }] },
      outline: true,
      glow: { color: 'foam', blur: 3 },
    }),
    facet(`M ${-x * 0.6} ${-h * 0.2} L ${-x * 0.8} ${-h * 0.62} L ${-x * 0.2} ${-h * 0.82} Z`, 0.35),
    facet(`M ${x * 0.3} ${-h * 0.35} L ${x * 0.85} ${-h * 0.55} L ${x * 0.5} ${-h * 0.9} Z`, 0.3),
    path(`M ${-x * 0.75} ${-h * 0.75} L ${-x * 0.35} ${-h * 0.92}`, trim('snow', 1.2)),
    ...(cracked
      ? [
          path(`M ${-x * 0.1} ${-h} L ${x * 0.05} ${-h * 0.7} L ${-x * 0.25} ${-h * 0.5} L ${x * 0.1} ${-h * 0.2}`, trim('ink', 0.9)),
          path(`M ${x * 0.05} ${-h * 0.7} L ${x * 0.55} ${-h * 0.62}`, trim('ink', 0.7)),
          path(`M ${-x * 0.25} ${-h * 0.5} L ${-x * 0.7} ${-h * 0.4}`, trim('ink', 0.7)),
        ]
      : []),
  ];
}

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

export const STAGE_SPRITES_VECTOR: readonly VectorSprite[] = [
  icon(STAGE_SPRITES.itemRimestone, RIME_SHARD),
  ...ROUNDS.map(roundIcon),
  sprite(STAGE_SPRITES.shard, [16, 8], [10, 4], SHARD),
  sprite(STAGE_SPRITES.shardShadow, [8, 4], [4, 2], [ellipse(0, 0, 3, 1, { fill: { id: 'ground-shade', alpha: 0.35 } })]),
  sprite(STAGE_SPRITES.splitFlash, [28, 28], [14, 14], SPLIT_FLASH_SHAPES),
  sprite(STAGE_SPRITES.iceCase, [38, 50], [19, 46], iceCase(28, 40, false)),
  sprite(STAGE_SPRITES.iceCaseCracked, [38, 50], [19, 46], iceCase(28, 40, true)),
  sprite(STAGE_SPRITES.iceCaseLarge, [64, 80], [32, 74], iceCase(50, 66, false)),
  sprite(STAGE_SPRITES.iceCaseLargeCracked, [64, 80], [32, 74], iceCase(50, 66, true)),
];
