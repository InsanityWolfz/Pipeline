// The guided builds (058): the tutorial's two foundry steps, built piece by piece on ghosts, and the build lock around
// them. In a guided game (the real game's start), from the first foundry visit until the frost rune step is done,
// nothing can be placed, picked up or turned except the next ghost of the current guided step. Layouts from the plan
// (docs/plans/058-guided-tutorial.md, 058.5: the ley bolt line into the right entrance). Rules: src/sim/guided.ts.

export type GuidedId = 'ley-line' | 'frost-line';

type Facing = 'up' | 'down' | 'left' | 'right';

/** One step of a guided build: a piece to place on its tile and facing (a conduit's `inFrom` when it isn't its back), or a piece to remove. */
export type Ghost =
  | { kind: 'place'; piece: string; tx: number; ty: number; facing: Facing; inFrom?: Facing }
  | { kind: 'remove'; piece: string; tx: number; ty: number };

const place = (piece: string, tx: number, ty: number, facing: Facing, inFrom?: Facing): Ghost => ({ kind: 'place', piece, tx, ty, facing, ...(inFrom ? { inFrom } : {}) });

/** A straight run of conduits from (tx, ty), `n` tiles, stepping by (dx, dy), all facing `facing`. */
const run = (tx: number, ty: number, n: number, dx: number, dy: number, facing: Facing): Ghost[] =>
  Array.from({ length: n }, (_, k) => place('conduit', tx + k * dx, ty + k * dy, facing));

/**
 * Step 14: ley bolts into the right entrance. From the ley crystal port (1,10), east along row 10 through a grinder and
 * a focuser, up column 15 east of the example line, and along row 1 into (13,1), under the right mouth (13,0).
 */
const LEY_LINE: readonly Ghost[] = [
  ...run(2, 10, 2, 1, 0, 'right'),
  place('grinder', 4, 10, 'right'),
  place('focuser', 5, 10, 'right'),
  ...run(6, 10, 9, 1, 0, 'right'),
  place('conduit', 15, 10, 'up', 'left'),
  ...run(15, 9, 8, 0, -1, 'up'),
  place('conduit', 15, 1, 'left', 'down'),
  place('conduit', 14, 1, 'left'),
  place('conduit', 13, 1, 'up', 'right'),
];

/**
 * Step 19: the frost rune into the arrow line. The conduit leaving the assembler comes out, the frost rune goes in its
 * place, then a rimestone line from its port (1,12) north up column 3, under the ley line's conduit (3,10) by the
 * player's first underground pair, and east along row 2 into the rune's left side.
 */
const FROST_LINE: readonly Ghost[] = [
  { kind: 'remove', piece: 'conduit', tx: 12, ty: 2 },
  place('frost-rune', 12, 2, 'up'),
  place('conduit', 2, 12, 'right'),
  place('conduit', 3, 12, 'up', 'left'),
  place('underground-entrance', 3, 11, 'up'),
  place('underground-exit', 3, 9, 'up'),
  ...run(3, 8, 6, 0, -1, 'up'),
  place('conduit', 3, 2, 'right', 'down'),
  ...run(4, 2, 8, 1, 0, 'right'),
];

export const GUIDED_BUILDS: Readonly<Record<GuidedId, readonly Ghost[]>> = { 'ley-line': LEY_LINE, 'frost-line': FROST_LINE };

/** The guided step whose finishing lifts the build lock (Shaun: "building is locked until after you make the frost arrows"). */
export const LOCK_UNTIL: GuidedId = 'frost-line';

/** The words around the guided builds (058.2, 058.3, 058.6). */
export const GUIDED_TEXT = {
  /** A refused placement during a guided step. */
  ghost: 'Build on the glowing outline',
  /** A refused placement or pick-up while locked outside one. */
  locked: 'Not yet',
  /** A locked build-bar cell's hover line. */
  lockedCell: 'Unlocks as the tutorial goes on',
  /** Beside the arrow on the piece to remove. */
  remove: 'Right click to remove',
  /** The sub-line for the next ghost: "Place a grinder", or "Place conduits 3/7" for a run of the same piece. */
  place: (name: string, done: number, of: number): string => (of > 1 ? `Place ${plural(name)} ${done}/${of}` : `Place ${article(name)} ${name}`),
  /** The sub-line for a removal. */
  removeLine: (name: string): string => `Remove the ${name}`,
} as const;

function article(name: string): string {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

function plural(name: string): string {
  return name.endsWith('s') ? name : `${name}s`;
}

/** The short names the sub-lines use for pieces whose build-bar name is longer ("Ley conduit" reads "conduit"). */
export const GUIDED_NAMES: Readonly<Record<string, string>> = {
  conduit: 'conduit',
  grinder: 'grinder',
  focuser: 'focuser',
  'frost-rune': 'frost rune',
  'underground-entrance': 'underground entrance',
  'underground-exit': 'underground exit',
};

/** 058.5: during the tutorial the Warden core's entrance node fits only this cap, the right one (INTAKE.entrances' index). */
export const TUTORIAL_CAP = 2;
