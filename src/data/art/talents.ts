import { TALENT_SPRITES } from '../talentAssets';
import { ICON_ARROW, ICON_BOMB, ICON_LEY_BOLT } from './items';
import { FIRE_DURATION_ICON, FIRE_SPREAD_ICON } from './fire';
import { LIGHTNING_CHAINS_ICON, LIGHTNING_RANGE_ICON } from './lightning';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// The talent tree's art (037) in the 016 vector style: the panel's carved node sockets,
// the keystones' larger rune-stones and the centre's ley rose, the glow and ring that
// mark taken and available nodes, the lanes' and keystones' icons, the HUD's pip, the
// level-up ring, and the keystones' effects (Pool, the ice burst and its
// shards, the tube's heat). Icons are 16x16 round the centre; light from the top left.

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });
const icon = (key: string, shapes: readonly Shape[]): VectorSprite => sprite(key, [16, 16], [8, 8], shapes);
const glowDot = (x: number, y: number, r: number, color: string): Shape => ellipse(x, y, r, r, { fill: color, glow: { color, blur: 2 } });

/** A regular polygon's path round (0, 0), `n` corners at radius `r`, the first at angle `turn`. */
function polygon(n: number, r: number, turn: number): string {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / n;
    return `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  });
  return `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(' ')} Z`;
}

/** A star of `points` points between radius `r` and `r * inner`. */
function star(r: number, inner: number, points: number, turn = -Math.PI / 2): string {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const a = turn + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : r * inner;
    return `${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)}`;
  });
  return `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(' ')} Z`;
}

const stone = (r: number) => ({ linear: [-r, -r, r, r] as const, stops: [{ at: 0, color: 'rock-pale' }, { at: 0.45, color: 'rock-light' }, { at: 1, color: 'rock-dark' }] });

// A minor node: a round carved socket with a brass rim and a dark well for its icon.
const NODE: Shape[] = [
  ellipse(0, 0, 8.4, 8.4, { fill: stone(8.4), outline: true }),
  ellipse(0, 0, 8.4, 8.4, trim('brass', 0.8)),
  ellipse(0.3, 0.4, 6.2, 6.2, flat({ id: 'ink', alpha: 0.55 })),
  ellipse(-3.4, -4.6, 1.8, 0.8, flat({ id: 'snow', alpha: 0.45 })),
];

// A keystone: an octagonal rune-stone, carved runes at four corners, a gold-trimmed well.
const KEYSTONE: Shape[] = [
  path(polygon(8, 12.4, Math.PI / 8), { fill: { linear: [-12, -12, 12, 12], stops: [{ at: 0, color: 'carve-light' }, { at: 0.5, color: 'carve' }, { at: 1, color: 'carve-dark' }] }, outline: true }),
  path(polygon(8, 12.4, Math.PI / 8), trim('gold-trim', 1)),
  ellipse(0.3, 0.4, 8.2, 8.2, flat({ id: 'ink', alpha: 0.6 })),
  ellipse(0, 0, 8.2, 8.2, trim('brass-dark', 0.6)),
  ...[[-8.6, -8.6], [8.6, -8.6], [8.6, 8.6], [-8.6, 8.6]].map(([x, y]) => ({ ...line([(x ?? 0) - 1, (y ?? 0) - 1.2, (x ?? 0) + 0.4, (y ?? 0), (x ?? 0) - 0.6, (y ?? 0) + 1.2], 0.6, 'cyan'), glow: { color: 'cyan', blur: 1.5 } })),
];

// The centre start: a carved disc with a ley rose of five points, one per lane.
const START: Shape[] = [
  ellipse(0, 0, 10.4, 10.4, { fill: stone(10.4), outline: true }),
  ellipse(0, 0, 10.4, 10.4, trim('gold-trim', 0.9)),
  ellipse(0.3, 0.4, 8, 8, flat({ id: 'ink', alpha: 0.5 })),
  path(star(7, 0.38, 5), { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 3 } }),
  glowDot(0, 0, 1.6, 'snow'),
];

// A taken node's glow: a soft cyan halo round it.
const HALO: Shape[] = [
  ellipse(0, 0, 14, 14, { fill: { radial: [0, 0, 14], stops: [{ at: 0.5, color: { id: 'cyan', alpha: 0 } }, { at: 0.72, color: { id: 'cyan-glow', alpha: 0.75 } }, { at: 1, color: { id: 'cyan', alpha: 0 } }] } }),
];

// An available node's bright outline.
const RING: Shape[] = [{ ...ellipse(0, 0, 10.6, 10.6, trim('snow', 1.2)), glow: { color: 'snow', blur: 1.5 } }];

// Survival: a leaf-green heart with a vein.
const SURVIVAL: Shape[] = [
  path('M 0 6.4 Q -7 1.4 -6.4 -2.6 Q -5.6 -6.4 -2.4 -6 Q -0.6 -5.6 0 -3.6 Q 0.6 -5.6 2.4 -6 Q 5.6 -6.4 6.4 -2.6 Q 7 1.4 0 6.4 Z', {
    fill: { linear: [-5, -6, 5, 6], stops: [{ at: 0, color: 'leaf-light' }, { at: 1, color: 'leaf-dark' }] },
    outline: true,
  }),
  path('M 0 -3.4 Q 0.4 1 0 5', trim('leaf-pale', 0.6)),
  ellipse(-3.4, -3.4, 1.2, 0.8, flat({ id: 'snow', alpha: 0.6 })),
];

/** A band across the tube's barrel (081) at `t` along its axis from the breech (-4.2, 4.2) to the mouth (5, -5). */
const band = (t: number, half: number, width: number, color: string): Shape => {
  const cx = -4.2 + 9.2 * t;
  const cy = 4.2 - 9.2 * t;
  return line([cx - half, cy - half, cx + half, cy + half], width, color, true);
};

// The Tube (081): the relic tube in three-quarter view, pointing up-right like the ammo icons: a ringed cyan barrel,
// brass bands at the breech and a flared brass mouth. (It was side on, and read as a battery.)
const TUBE: Shape[] = [
  line([-4.4, 4.4, 3.4, -3.4], 5.2, 'iron', true),
  line([-4.8, 3.8, 2.6, -3.6], 1.4, { id: 'iron-light', alpha: 0.8 }),
  band(0.05, 2.2, 1.6, 'brass'),
  band(0.2, 2.2, 1.2, 'brass-dark'),
  ...[0.42, 0.62].map((t) => ({ ...band(t, 2, 1.1, 'cyan'), glow: { color: 'cyan', blur: 1.5 } })),
  path('M 1.6 -4.4 L 2.4 -7.6 L 7.6 -2.4 L 4.4 -1.6 Z', { fill: { linear: [2, -7, 7, -2], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  path('M 3 -7 L 7 -3 L 6.4 -2.8 L 2.8 -6.4 Z', flat('ink')),
  { ...line([3.2, -6.4, 6.4, -3.2], 0.5, 'cyan-glow'), glow: { color: 'cyan', blur: 2 } },
];

// Blastfletch: an arrow through a cinder burst.
const BLASTFLETCH_ICON: Shape[] = [
  path(star(6.6, 0.45, 8, 0), { fill: 'cinder-light', glow: { color: 'cinder', blur: 2.5 } }),
  ellipse(0, 0, 2.4, 2.4, flat('snow')),
  ...ICON_ARROW,
];

// Shatterpoint: an ice crystal cracking apart, a ley spark at its heart.
const SHATTERPOINT_ICON: Shape[] = [
  path('M 0 -7 L 3.2 -1.6 L 2 6.4 L -2 6.4 L -3.2 -1.6 Z', { fill: { linear: [0, -7, 0, 6], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'foam' }, { at: 1, color: 'water-light' }] }, outline: true, glow: { color: 'foam', blur: 2 } }),
  path('M -0.4 -5 L 1 -1 L -1 1.6 L 0.8 5', trim('water', 0.7)),
  ...[[-6, -3], [6, -2], [-5.6, 4], [5.8, 4.6]].map(([x, y]) => path(`M ${x} ${y} L ${(x ?? 0) * 0.8 + 0.6} ${(y ?? 0) - 1} L ${(x ?? 0) * 0.8} ${(y ?? 0) + 0.8} Z`, { fill: 'foam', outline: true })),
  glowDot(0, 0.4, 1.3, 'cyan-glow'),
];

// Overpressure: a brass gauge on a pipe, its needle pegged in the red.
const OVERPRESSURE_ICON: Shape[] = [
  rect(-7, 3, 14, 3.4, 1.4, solid('iron')),
  ellipse(0, -1, 5.8, 5.8, { fill: { linear: [-5, -6, 5, 4], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  ellipse(0, -1, 4.2, 4.2, flat('snow')),
  path('M 1.4 -4.6 Q 3.6 -3.4 4 -1', trim('hit-red', 1.2)),
  line([0, -1, 3, -3.6], 0.9, 'ink'),
  glowDot(0, -1, 0.8, 'cinder'),
];

// The HUD's pip: a small cyan diamond, lit.
const PIP: Shape[] = [path('M 0 -3 L 3 0 L 0 3 L -3 0 Z', { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 2 } })];

// The level-up ring: a cyan ring of ley light on the ground round the player, a fainter wash inside.
const LEVEL_RING: Shape[] = [
  ellipse(0, 0, 26, 13, { fill: { radial: [0, 0, 26], stops: [{ at: 0, color: { id: 'cyan', alpha: 0 } }, { at: 0.8, color: { id: 'cyan-glow', alpha: 0.25 } }, { at: 1, color: { id: 'cyan', alpha: 0 } }] } }),
  { ...ellipse(0, 0, 26, 13, trim('cyan-glow', 2)), glow: { color: 'cyan', blur: 4 } },
  ...[[-18, -9], [20, -7], [-6, -13], [10, 11], [-22, 5]].map(([x, y]) => glowDot(x ?? 0, y ?? 0, 0.9, 'snow')),
];

// Blastfletch's Pool: an ember-lit circle with a crackling rim, drawn at the blast's radius.
const BLAST_CHARGE: Shape[] = [
  ellipse(0, 0, 24, 24, { fill: { radial: [0, 0, 24], stops: [{ at: 0, color: { id: 'cinder-light', alpha: 0.06 } }, { at: 0.75, color: { id: 'cinder', alpha: 0.16 } }, { at: 1, color: { id: 'cinder-light', alpha: 0.4 } }] } }),
  { ...ellipse(0, 0, 23, 23, { stroke: { color: 'cinder-light', width: 1, dash: [3, 2.4] } }), glow: { color: 'cinder', blur: 2 } },
  ...[[-12, -14], [15, -9], [-17, 8], [6, 17], [18, 6], [-4, -20]].map(([x, y]) => glowDot(x ?? 0, y ?? 0, 0.8, 'cinder-light')),
];

// Shatterpoint's ice burst: pale spikes thrown out round a white flash.
const ICE_BURST: Shape[] = [
  ellipse(0, 0, 13, 13, { fill: { radial: [0, 0, 13], stops: [{ at: 0, color: { id: 'water-light', alpha: 0.8 } }, { at: 1, color: { id: 'water', alpha: 0 } }] } }),
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const r1 = i % 2 === 0 ? 14 : 10;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return path(`M ${(c * 3 - s * 1.8).toFixed(2)} ${(s * 3 + c * 1.8).toFixed(2)} L ${(c * r1).toFixed(2)} ${(s * r1).toFixed(2)} L ${(c * 3 + s * 1.8).toFixed(2)} ${(s * 3 - c * 1.8).toFixed(2)} Z`, {
      fill: { linear: [0, 0, c * r1, s * r1], stops: [{ at: 0, color: 'water' }, { at: 0.6, color: 'water-light' }, { at: 1, color: 'foam' }] },
      outline: true,
      glow: { color: 'water-light', blur: 2 },
    });
  }),
  glowDot(0, 0, 2.4, 'snow'),
];

// A Cold Shard in flight: a pale sliver of rime, pointing right.
const ICE_SHARD: Shape[] = [
  { ...line([-6, 0, -1, 0], 1.2, { id: 'foam', alpha: 0.6 }), glow: { color: 'foam', blur: 2 } },
  path('M 3.6 0 L -0.6 -1.5 L -1.8 0 L -0.6 1.5 Z', { fill: 'snow', outline: true, glow: { color: 'water-light', blur: 2 } }),
];

// Overpressure's heat: wavering lines of hot air rising from the tube's mouth.
const HEAT: Shape[] = [
  ellipse(0, -6, 6, 8, { fill: { radial: [0, -6, 8], stops: [{ at: 0, color: { id: 'cinder-light', alpha: 0.35 } }, { at: 1, color: { id: 'cinder', alpha: 0 } }] } }),
  ...[-3, 0, 3].map((x) => ({ ...path(`M ${x} 0 Q ${x - 2} -4 ${x} -8 Q ${x + 2} -12 ${x} -16`, { stroke: { color: { id: 'cinder-light', alpha: 0.7 }, width: 0.9 } }), glow: { color: 'cinder', blur: 1.5 } })),
];

// 054: a burning arrow's flame, pointing right round its head at (0, 0): a cinder glow and tongues streaming back.
const BURNING_TIP: Shape[] = [
  ellipse(-1, 0, 6, 4, { fill: { radial: [-1, 0, 6], stops: [{ at: 0, color: { id: 'cinder-light', alpha: 0.8 } }, { at: 1, color: { id: 'cinder', alpha: 0 } }] } }),
  { ...path('M 3 0 Q 0 -3.2 -8 -1.4 Q -4 -0.4 -5 0 Q -4 0.4 -8 1.4 Q 0 3.2 3 0 Z', { fill: { linear: [3, 0, -8, 0], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.5, color: 'cinder' }, { at: 1, color: { id: 'flame-dark', alpha: 0 } }] } }), glow: { color: 'cinder', blur: 3 } },
  ellipse(1, 0, 1.6, 1, flat('snow')),
];

// 054: where a burning arrow hits: a small ember flash, a hot core with sparks thrown out.
const BURNING_FLASH: Shape[] = [
  ellipse(0, 0, 9, 9, { fill: { radial: [0, 0, 9], stops: [{ at: 0, color: { id: 'cinder-light', alpha: 0.9 } }, { at: 1, color: { id: 'cinder', alpha: 0 } }] } }),
  ...Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    return { ...line([Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * 8, Math.sin(a) * 8], 1, 'cinder-light'), glow: { color: 'cinder', blur: 2 } };
  }),
  glowDot(0, 0, 2.2, 'snow'),
];

export const TALENT_SPRITES_VECTOR: readonly VectorSprite[] = [
  sprite(TALENT_SPRITES.node, [18, 18], [9, 9], NODE),
  sprite(TALENT_SPRITES.keystone, [26, 26], [13, 13], KEYSTONE),
  sprite(TALENT_SPRITES.start, [22, 22], [11, 11], START),
  sprite(TALENT_SPRITES.halo, [30, 30], [15, 15], HALO),
  sprite(TALENT_SPRITES.ring, [24, 24], [12, 12], RING),
  icon(TALENT_SPRITES.laneArrows, ICON_ARROW),
  icon(TALENT_SPRITES.laneBombs, ICON_BOMB),
  icon(TALENT_SPRITES.laneLey, ICON_LEY_BOLT),
  icon(TALENT_SPRITES.laneSurvival, SURVIVAL),
  icon(TALENT_SPRITES.laneTube, TUBE),
  icon(TALENT_SPRITES.blastfletch, BLASTFLETCH_ICON),
  icon(TALENT_SPRITES.shatterpoint, SHATTERPOINT_ICON),
  icon(TALENT_SPRITES.overpressure, OVERPRESSURE_ICON),
  icon(TALENT_SPRITES.fireDuration, FIRE_DURATION_ICON),
  icon(TALENT_SPRITES.fireSpread, FIRE_SPREAD_ICON),
  icon(TALENT_SPRITES.lightningChains, LIGHTNING_CHAINS_ICON),
  icon(TALENT_SPRITES.lightningRange, LIGHTNING_RANGE_ICON),
  sprite(TALENT_SPRITES.pip, [8, 8], [4, 4], PIP),
  sprite(TALENT_SPRITES.levelRing, [60, 34], [30, 17], LEVEL_RING),
  sprite(TALENT_SPRITES.pool, [52, 52], [26, 26], BLAST_CHARGE),
  sprite(TALENT_SPRITES.iceBurst, [34, 34], [17, 17], ICE_BURST),
  sprite(TALENT_SPRITES.coldShard, [12, 6], [7, 3], ICE_SHARD),
  sprite(TALENT_SPRITES.heatShimmer, [18, 24], [9, 20], HEAT),
  sprite(TALENT_SPRITES.burningTip, [16, 10], [10, 5], BURNING_TIP),
  sprite(TALENT_SPRITES.burningFlash, [20, 20], [10, 10], BURNING_FLASH),
];
