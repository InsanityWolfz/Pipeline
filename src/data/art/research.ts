import { RESEARCH_ICONS, RESEARCH_SPRITES } from '../researchAssets';
import { LOGISTICS_ICONS } from '../foundryAssets';
import { ellipse, flat, line, path, rect, solid, trim, type Ink, type Shape, type ShapeStyle, type VectorSprite } from './types';

// Restoration's art (033), in the 020 vector style: the faint cyan linework of a
// lost part's diagram (over a cap, round the intake pipe, in a wall panel), the
// carved wall panel and its restored brass parts, the reservoir's brass collars, the
// sealed wing's door, the research items' icons, the splitter's build
// bar emblems, the schematic's ley-light pillar and its light. Wall pieces sit
// on a north-wall tile's face, world px round the tile's bottom centre.

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], frames: readonly (readonly Shape[])[]): VectorSprite => ({ key, size, anchor, frames });
const icon = (key: string, shapes: readonly Shape[]): VectorSprite => sprite(key, [16, 16], [8, 8], [shapes]);

/** Diagram linework: a thin cyan-glow stroke with a soft cyan glow, no fill. */
const ink: ShapeStyle = { stroke: { color: 'cyan-glow', width: 0.8 }, glow: { color: 'cyan', blur: 2 } };
const faint = (width = 0.6): ShapeStyle => ({ stroke: { color: { id: 'cyan', alpha: 0.85 }, width }, glow: { color: 'cyan', blur: 1.5 } });
const glowLine = (pts: readonly number[], width = 0.8, color: Ink = 'cyan-glow'): Shape => ({ ...line(pts, width, color), glow: { color: 'cyan', blur: 2 } });

/** A cog's outline (or solid) at (x, y): a ring of `teeth` short spokes round a rim of radius `r`. */
function cog(x: number, y: number, r: number, teeth: number, style: 'diagram' | 'brass'): Shape[] {
  const spokes = Array.from({ length: teeth }, (_, i) => {
    const a = (i / teeth) * Math.PI * 2;
    const pts = [x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + 1.6), y + Math.sin(a) * (r + 1.6)];
    return style === 'diagram' ? glowLine(pts, 0.7) : line(pts, 1.6, 'brass-dark', true);
  });
  if (style === 'diagram') return [...spokes, ellipse(x, y, r, r, ink), ellipse(x, y, r * 0.35, r * 0.35, faint())];
  return [...spokes, ellipse(x, y, r, r, { fill: { radial: [x - 1, y - 1, r + 1], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass' }] }, outline: true }), ellipse(x, y, r * 0.35, r * 0.35, solid('brass-dark'))];
}

/** A chevron at (x, y) pointing along (dx, dy). */
const chev = (x: number, y: number, dx: number, dy: number, color: Ink = 'cyan-glow', s = 1.8): Shape =>
  glowLine([x - dx * s - dy * s, y - dy * s + dx * s, x + dx * s * 0.6, y + dy * s * 0.6, x - dx * s + dy * s, y - dy * s - dx * s], 0.8, color);

/** The carved stone frame every wall diagram sits in, on the wall face under its brass band. */
const PANEL: Shape[] = [
  rect(-11, -23, 22, 20, 1.6, { fill: { linear: [0, -23, 0, -3], stops: [{ at: 0, color: 'carve-dark' }, { at: 1, color: 'carve' }] } }),
  rect(-9.4, -21.4, 18.8, 16.8, 1, { fill: { linear: [0, -21, 0, -5], stops: [{ at: 0, color: 'carve' }, { at: 1, color: 'carve-light' }] } }),
  line([-9.4, -21.2, 9.4, -21.2], 0.8, { id: 'carve-dark', alpha: 0.8 }),
  ...[-9.6, 9.6].flatMap((x) => [ellipse(x, -22, 0.8, 0.8, flat('brass')), ellipse(x, -4, 0.8, 0.8, flat('brass'))]),
];

/** The restored parts in brass: the cog train, on its panel. */
const brassBack = rect(-8.6, -20.6, 17.2, 15.2, 1, { fill: { id: 'ink', alpha: 0.25 } });
const RESTORED_SPEED: Shape[] = [...PANEL, brassBack, ...cog(-3, -14.5, 3.6, 8, 'brass'), ...cog(3.8, -9.6, 2.6, 6, 'brass')];

/**
 * 063's Blueprint table: a drafting table seen from the front, its board tilted up toward the viewer. As a diagram, its
 * outline, a pinned sheet, a T-square and a compass in cyan linework; restored, a wooden board on brass legs holding a
 * deep-blue vellum sheet with its own ley drawing, a brass straightedge and compass.
 */
const BOARD = 'M -8 -8.6 L -6.4 -20 L 6.4 -20 L 8 -8.6 Z';
const DIAGRAM_TABLE: Shape[] = [
  path(BOARD, ink),
  path('M -5.2 -11 L -4.2 -18 L 4.2 -18 L 5.2 -11 Z', { stroke: { color: 'cyan-glow', width: 0.6, dash: [1.2, 0.9] }, glow: { color: 'cyan', blur: 1.5 } }),
  glowLine([-6.6, -7.6, -6.6, -4.8], 0.8),
  glowLine([6.6, -7.6, 6.6, -4.8], 0.8),
  glowLine([-7.4, -12.6, 6, -12.6], 0.7),
  glowLine([1.6, -17, 0, -12.4, 3.2, -12.4], 0.6),
];
const RESTORED_TABLE: Shape[] = [
  ...PANEL,
  line([-6.6, -8, -6.6, -4.6], 1.4, 'brass-dark', true),
  line([6.6, -8, 6.6, -4.6], 1.4, 'brass-dark', true),
  path(BOARD, { fill: { linear: [0, -20, 0, -8.6], stops: [{ at: 0, color: 'wood-light' }, { at: 1, color: 'wood' }] }, outline: true }),
  path('M -5.4 -10.4 L -4.4 -18.4 L 4.4 -18.4 L 5.4 -10.4 Z', { fill: { linear: [0, -18, 0, -10], stops: [{ at: 0, color: 'water-deep' }, { at: 1, color: 'cyan-deep' }] } }),
  { ...line([-3.4, -16.4, 2.6, -16.4, 2.6, -12.6], 0.6, 'cyan-glow'), glow: { color: 'cyan', blur: 1.5 } },
  rect(-2.6, -15.4, 3, 2, 0.3, trim({ id: 'cyan-glow', alpha: 0.8 }, 0.5)),
  line([-7.6, -12.4, 5.8, -12.4], 1, 'brass', true),
  line([1.6, -17.4, 0.2, -12.8], 0.7, 'brass-light'),
  line([1.6, -17.4, 3, -12.8], 0.7, 'brass-light'),
  ellipse(1.6, -17.6, 0.8, 0.8, flat('brass')),
];
/** A capped entrance's diagram: the open inlet and its collar, as faint linework over the brass cap. */
const DIAGRAM_CAP: Shape[] = [
  ellipse(0, 0.4, 14, 5.4, { stroke: { color: 'cyan-glow', width: 1.1 }, glow: { color: 'cyan', blur: 3 } }),
  ellipse(0, -0.6, 7.4, 2.4, faint(0.8)),
  path('M -11.5 -1 Q -11.5 -11 0 -11.6 Q 11.5 -11 11.5 -1', { stroke: { color: 'cyan-glow', width: 0.9, dash: [1.8, 1.2] }, glow: { color: 'cyan', blur: 2 } }),
  glowLine([-3.4, -5.6, 3.4, -5.6], 1),
  glowLine([0, -9, 0, -2.2], 1),
];

/** The reservoir's diagram round the pipe: a wider tank, its bands and its fill marks. Px from the pipe's anchor (the mouth's middle). */
const DIAGRAM_PIPE: Shape[] = [
  path('M -27 -26 L -27 -58 Q -27 -63 -22 -63 L 22 -63 Q 27 -63 27 -58 L 27 -26 Q 27 -21 22 -21 L -22 -21 Q -27 -21 -27 -26 Z', ink),
  ...[-52, -42, -32].map((y) => ({ ...line([-27, y, 27, y], 0.6, { id: 'cyan', alpha: 0.6 }), glow: { color: 'cyan', blur: 1.5 } })),
  ...[-55, -45, -35, -25].map((y) => glowLine([24, y, 27, y], 0.7)),
  chev(-31, -42, 0, -1),
  chev(31, -42, 0, -1),
];

/** The reservoir restored: brass collars round the pipe, a second pair for the second tier. */
const collars = (ys: readonly number[]): Shape[] =>
  ys.flatMap((y) => [rect(-23, y, 46, 4, 1, { fill: { linear: [0, y, 0, y + 4], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass-dark' }] }, outline: true }), ...[-19, 19].map((x) => ellipse(x, y + 2, 0.8, 0.8, flat('brass-dark')))]);

/** The sealed wing's door, two tiles wide in the north wall's notch: a carved arch, its stone leaves, brass bars and a ley seal. */
const WING_DOOR: Shape[] = [
  path('M -28 0 L -28 -26 Q -28 -42 0 -42 Q 28 -42 28 -26 L 28 0 Z', { fill: { linear: [0, -42, 0, 0], stops: [{ at: 0, color: 'carve-light' }, { at: 1, color: 'carve' }] }, outline: true }),
  path('M -22 0 L -22 -24 Q -22 -36 0 -36 Q 22 -36 22 -24 L 22 0 Z', { fill: { linear: [0, -36, 0, 0], stops: [{ at: 0, color: 'rock-dark' }, { at: 1, color: 'ink' }] }, outline: true }),
  line([0, -36, 0, 0], 1, 'carve-dark'),
  ...[-26, -14].map((y) => rect(-22, y, 44, 2.6, 0.6, solid('brass-dark'))),
  ellipse(0, -18, 7, 7, { fill: 'cyan-deep', outline: true, glow: { color: 'cyan', blur: 4 } }),
  ellipse(0, -18, 4.6, 4.6, { stroke: { color: 'cyan-glow', width: 0.9 }, glow: { color: 'cyan', blur: 3 } }),
  path('M -2 -21 L 1 -18.5 L -1.4 -17.6 L 2 -15', trim('cyan-glow', 0.9)),
  path('M -26 -27 Q -26 -40 0 -40', trim({ id: 'snow', alpha: 0.35 }, 0.9)),
];

const ANCIENT_GEAR: Shape[] = [
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return line([Math.cos(a) * 4.6, Math.sin(a) * 4.6, Math.cos(a) * 6.6, Math.sin(a) * 6.6], 2.2, 'brass-dark', true);
  }),
  ellipse(0, 0, 5, 5, { fill: { radial: [-1.4, -1.6, 6], stops: [{ at: 0, color: 'brass-light' }, { at: 0.6, color: 'brass' }, { at: 1, color: 'gold-shade' }] }, outline: true }),
  ellipse(0, 0, 1.8, 1.8, solid('moss-tuft')),
  path('M -3.6 2.4 Q -2 3.6 0.4 3.6', trim({ id: 'leaf-dark', alpha: 0.7 }, 0.9)),
  { ...line([-0.8, -3.2, 0.8, -3.2], 0.6, 'cyan'), glow: { color: 'cyan', blur: 2 } },
];

const AQUEDUCT_VALVE: Shape[] = [
  rect(-2, 0, 4, 6.4, 0.8, solid('rock')),
  ellipse(0, -1, 6, 6, { stroke: { color: 'brass-dark', width: 2.4 } }),
  ellipse(0, -1, 6, 6, { stroke: { color: 'brass', width: 1.2 } }),
  line([-5.4, -1, 5.4, -1], 1.4, 'brass', true),
  line([0, -6.4, 0, 4.4], 1.4, 'brass', true),
  ellipse(0, -1, 1.8, 1.8, { fill: 'water-light', outline: true }),
];

const BULWARK_CORE: Shape[] = [
  path('M 0 -6.6 L 5.6 -3 L 5.6 3.4 L 0 6.8 L -5.6 3.4 L -5.6 -3 Z', { fill: { linear: [-5, -6, 5, 6], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock-dark' }] }, outline: true }),
  path('M -5.6 -3 L 0 0 L 5.6 -3 M 0 0 L 0 6.8', trim({ id: 'rock-dark', alpha: 0.8 }, 0.7)),
  ellipse(0, 0.4, 2, 2, { fill: 'gold-trim', glow: { color: 'gold-trim', blur: 5 } }),
];

/** A rolled schematic: a parchment sheet curling at both ends; known, it shows its cyan diagram; unknown, a sealed ley swirl. */
const scroll = (known: boolean): Shape[] => [
  rect(-5.6, -5, 11.2, 10, 1, { fill: { linear: [0, -5, 0, 5], stops: [{ at: 0, color: 'robe' }, { at: 1, color: 'straw-light' }] }, outline: true }),
  ...[-5.6, 5.6].map((x) => ellipse(x, 0, 1.6, 5.6, { fill: 'straw', outline: true })),
  ...(known
    ? [glowLine([-3, -2, 3, -2], 0.7, 'cyan'), glowLine([-3, 0.6, 1, 0.6, 1, 3], 0.7, 'cyan'), ellipse(2.6, 2.6, 1, 1, faint(0.6))]
    : [path('M 0 -2.8 Q 3 -2.6 2.4 0 Q 1.8 2.4 -0.6 1.8 Q -2.4 1 -1.4 -0.6 Q -0.4 -1.6 0.8 -0.6', { stroke: { color: 'cyan', width: 0.9 }, glow: { color: 'cyan', blur: 3 } })]),
  rect(-1.4, 3.2, 2.8, 2.4, 0.6, solid('rust')),
];

/** The splitter's build bar emblem: a stone channel and its two cyan exits. */
const SPLITTER_EMBLEM: Shape[] = [
  rect(-7, -3.6, 14, 7.2, 1.6, solid('rock-light')),
  rect(-7, -2, 14, 4, 0.8, { fill: 'cyan-deep', glow: { color: 'cyan', blur: 2 } }),
  rect(-2, 0, 4, 7.2, 0.8, solid('rock-light')),
  rect(-1.2, 0, 2.4, 7.2, 0.6, { fill: 'cyan-deep', glow: { color: 'cyan', blur: 2 } }),
  path('M 2 -1.8 L 5.6 0 L 2 1.8', trim('cyan-glow', 1.1)),
  path('M -1.8 3.2 L 0 5.6 L 1.8 3.2', trim('cyan-glow', 1)),
  ellipse(0, 0, 2.2, 2.2, solid('brass')),
];

/** The schematic's pillar of ley light, white for render to tint: brightest at its foot, fading up. */
const PILLAR: Shape[] = [
  rect(-7, -118, 14, 118, 6, { fill: { linear: [0, -118, 0, 0], stops: [{ at: 0, color: { id: 'snow', alpha: 0 } }, { at: 0.6, color: { id: 'snow', alpha: 0.35 } }, { at: 1, color: { id: 'snow', alpha: 0.7 } }] } }),
  rect(-2.4, -110, 4.8, 110, 2.4, { fill: { linear: [0, -110, 0, 0], stops: [{ at: 0, color: { id: 'snow', alpha: 0 } }, { at: 1, color: 'snow' }] } }),
  ellipse(0, 0, 9, 3, { fill: { id: 'snow', alpha: 0.5 } }),
];

const W = RESEARCH_SPRITES;
const wall = (key: string, shapes: readonly Shape[]): VectorSprite => sprite(key, [26, 26], [13, 25], [shapes]);

export const RESEARCH_SPRITES_VECTOR: readonly VectorSprite[] = [
  sprite(W.diagramCap, [32, 20], [16, 14], [DIAGRAM_CAP]),
  sprite(W.diagramPipe, [72, 50], [36, 67], [DIAGRAM_PIPE]),
  wall(W.panel, PANEL),
  wall(W.diagramWall.machineSpeed, [...cog(-3, -14.5, 3.6, 8, 'diagram'), ...cog(3.8, -9.6, 2.6, 6, 'diagram')]),
  wall(W.restoredWall.machineSpeed, RESTORED_SPEED),
  wall(W.diagramWall.blueprintTable, DIAGRAM_TABLE),
  wall(W.restoredWall.blueprintTable, RESTORED_TABLE),
  sprite(W.restoredPipe[0], [52, 50], [26, 67], [collars([-58, -27])]),
  sprite(W.restoredPipe[1], [52, 50], [26, 67], [collars([-58, -47, -37, -27])]),
  sprite(W.wingDoor, [60, 46], [30, 44], [WING_DOOR]),
  sprite(W.pillar, [20, 124], [10, 120], [PILLAR]),
  icon(RESEARCH_ICONS.ancientGear, ANCIENT_GEAR),
  icon(RESEARCH_ICONS.aqueductValve, AQUEDUCT_VALVE),
  icon(RESEARCH_ICONS.bulwarkCore, BULWARK_CORE),
  icon(RESEARCH_ICONS.schematicUnknown, scroll(false)),
  icon(RESEARCH_ICONS.schematic, scroll(true)),
  icon(LOGISTICS_ICONS.splitter ?? 'emblem-splitter', SPLITTER_EMBLEM),
];
