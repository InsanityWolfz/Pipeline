// Research as restoration (033): the foundry's lost parts, each a node shown as a
// faint diagram on the foundry itself. Walk up to one, press E and pay its cost in
// boss cores, machine parts and schematics, and that part comes back for good.
// Starting values from spec 033; tune in playtest. Rules are in src/sim/research.ts.

import { ENTRANCE_CAPS } from './foundry';

/** Every machine's `craftTicks` is multiplied by this once `machine-speed` is restored, rounded up to whole ticks. */
export const MACHINE_SPEED_MULT = 0.75;

/**
 * Where a node's diagram shows: over a capped intake entrance (whichever the player restores at), on the intake
 * pipe, on a wall panel at a foundry wall tile, or on the sealed wing's door.
 */
export type ResearchAnchor =
  | { kind: 'entrance' }
  | { kind: 'pipe' }
  | { kind: 'wall'; tx: number; ty: number; where: string }
  /** The wing's door spans `w` tiles east from (tx, ty). */
  | { kind: 'wing'; tx: number; ty: number; w: number };

/**
 * What restoring a node does: opens the capped entrance it's restored at; raises every entrance's cap to
 * `ENTRANCE_CAPS[tier]`; scales every machine's craft time by `MACHINE_SPEED_MULT`; adds a piece to the build bar;
 * unlocks saving and placing blueprints (063).
 * The sealed wing (`wing`) can't be restored in this spec: the Bulwark's first kill unseals it (034).
 */
export type ResearchEffect =
  | { kind: 'entrance' }
  | { kind: 'reservoir'; tier: number }
  | { kind: 'machineSpeed' }
  | { kind: 'unlockPiece'; piece: string }
  /** 063: saving and placing blueprints. */
  | { kind: 'blueprints' }
  | { kind: 'wing' };

export interface ResearchNode {
  id: string;
  name: string;
  /** Its one-line effect, for the restore panel and the list. */
  description: string;
  anchor: ResearchAnchor;
  /** Item id to count, spent from the carried inventory: boss cores, machine parts and schematics only. */
  cost: Readonly<Record<string, number>>;
  /** Nodes restored first. */
  requires: readonly string[];
  /** `start`: its diagram shows from the beginning; else the schematic item whose banking reveals it. */
  reveal: 'start' | string;
  effect: ResearchEffect;
}

/** The foundry's north wall, where the room already shows its stone panels (y 0); the wing's door is in its notch (y 1). */
const WALL_Y = 0;

export const RESEARCH_NODES: readonly ResearchNode[] = [
  {
    id: 'entrance-2',
    name: 'Second entrance',
    description: 'Opens one more intake entrance.',
    anchor: { kind: 'entrance' },
    cost: { 'warden-core': 1 },
    requires: [],
    reveal: 'start',
    effect: { kind: 'entrance' },
  },
  {
    id: 'entrance-3',
    name: 'Third entrance',
    description: 'Opens one more intake entrance.',
    anchor: { kind: 'entrance' },
    cost: { 'bulwark-core': 1 },
    requires: ['entrance-2'],
    reveal: 'start',
    effect: { kind: 'entrance' },
  },
  {
    // 060: the Forgewright's core restores the fourth.
    id: 'entrance-4',
    name: 'Fourth entrance',
    description: 'Opens one more intake entrance.',
    anchor: { kind: 'entrance' },
    cost: { 'forgewright-core': 1 },
    requires: ['entrance-3'],
    reveal: 'start',
    effect: { kind: 'entrance' },
  },
  {
    // 064: the Conductor's core restores the fifth and last.
    id: 'entrance-5',
    name: 'Fifth entrance',
    description: 'Opens one more intake entrance.',
    anchor: { kind: 'entrance' },
    cost: { 'conductor-core': 1 },
    requires: ['entrance-4'],
    reveal: 'start',
    effect: { kind: 'entrance' },
  },
  {
    id: 'reservoir-1',
    name: 'Reservoir I',
    description: `Each entrance holds ${ENTRANCE_CAPS[1]} rounds.`,
    anchor: { kind: 'pipe' },
    cost: { 'ancient-gear': 4 },
    requires: [],
    reveal: 'start',
    effect: { kind: 'reservoir', tier: 1 },
  },
  {
    id: 'reservoir-2',
    name: 'Reservoir II',
    description: `Each entrance holds ${ENTRANCE_CAPS[2]} rounds.`,
    anchor: { kind: 'pipe' },
    cost: { 'schematic-reservoir-2': 1, 'aqueduct-valve': 4, 'bulwark-core': 1 },
    requires: ['reservoir-1'],
    reveal: 'schematic-reservoir-2',
    effect: { kind: 'reservoir', tier: 2 },
  },
  {
    id: 'machine-speed',
    name: 'Machine speed',
    description: `Every machine crafts in ${MACHINE_SPEED_MULT * 100}% of the time.`,
    anchor: { kind: 'wall', tx: 6, ty: WALL_Y, where: 'north wall, west' },
    cost: { 'schematic-machine-speed': 1, 'ancient-gear': 3 },
    requires: [],
    reveal: 'schematic-machine-speed',
    effect: { kind: 'machineSpeed' },
  },
  {
    // 063: on the north wall's east side, between the east banner (16) and brazier (20), clear of the guided ley line.
    id: 'blueprint-table',
    name: 'Blueprint table',
    description: 'Save a dragged area as a blueprint and place it again.',
    anchor: { kind: 'wall', tx: 18, ty: WALL_Y, where: 'north wall, east' },
    cost: { 'ancient-gear': 4, 'aqueduct-valve': 2 },
    requires: [],
    reveal: 'start',
    effect: { kind: 'blueprints' },
  },
  {
    id: 'sealed-wing',
    name: 'Sealed wing',
    description: "Sealed. The Bulwark's first kill unseals it.",
    anchor: { kind: 'wing', tx: 9, ty: WALL_Y + 1, w: 2 },
    cost: {},
    requires: [],
    reveal: 'start',
    effect: { kind: 'wing' },
  },
];

/** How close the player's feet box must be to a diagram's tile for E to use it, px (the nearest in reach wins). */
export const RESEARCH_REACH = 16;

/** The research list's groups (J), in order, and which anchors each holds. */
export const RESEARCH_GROUPS: readonly { id: string; label: string; anchors: readonly ResearchAnchor['kind'][] }[] = [
  { id: 'intake', label: 'Intake', anchors: ['entrance', 'pipe'] },
  { id: 'walls', label: 'Walls', anchors: ['wall'] },
  { id: 'wing', label: 'Sealed wing', anchors: ['wing'] },
];

/** Where a node's diagram is, as the list says it. */
export function whereOf(anchor: ResearchAnchor): string {
  if (anchor.kind === 'entrance') return 'on an intake cap';
  if (anchor.kind === 'pipe') return 'on the intake pipe';
  if (anchor.kind === 'wing') return 'the sealed door';
  return anchor.where;
}

/** The list row's name while a node is hidden. */
export const LOST_SCHEMATIC = 'Lost schematic';

export function researchNode(id: string): ResearchNode {
  const node = RESEARCH_NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown research node '${id}'`);
  return node;
}

/** The node a schematic item reveals, if any. */
export const nodeOfSchematic = (itemId: string): ResearchNode | undefined => RESEARCH_NODES.find((n) => n.reveal === itemId);

/** The most cost items any node has (Reservoir II's three): the restore panel and the list keep room for this many. */
export const MAX_COST_ITEMS = Math.max(...RESEARCH_NODES.map((n) => Object.keys(n.cost).length));

/** The pieces restoring unlocks (033): hidden from the build bar until their node is restored. */
export const RESEARCH_PIECES: readonly string[] = RESEARCH_NODES.flatMap((n) => (n.effect.kind === 'unlockPiece' ? [n.effect.piece] : []));
