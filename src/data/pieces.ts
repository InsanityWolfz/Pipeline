import { stageBase, STAGES, type StageDef } from './stages';

// Buildable foundry pieces. Starting values from spec 006; tune in playtest.

/** Tiles a piece covers: one, or three in a row across its facing (its tile is the middle one). */
export type Footprint = '1x1' | '3x1';

/** The build bar's groups (026): logistics, then one per ammo chain. */
export type PieceCategory = 'logistics' | 'arrows' | 'bombs' | 'ley';

/** The build bar's groups in order, left to right, each with the label shown over it (026). */
export const PIECE_CATEGORIES: readonly { id: PieceCategory; label: string }[] = [
  { id: 'logistics', label: 'Logistics' },
  { id: 'arrows', label: 'Arrows' },
  { id: 'bombs', label: 'Bombs' },
  { id: 'ley', label: 'Ley' },
];

interface PieceBase {
  id: string;
  name: string;
  /** Which build bar group it sits in (026). */
  category: PieceCategory;
  /** A line or two for the build bar's hover panel (015), in the pixel font's glyphs. */
  description: string;
  footprint: Footprint;
}

/**
 * Runs a hand-crafting recipe on its own, from items handed in. A stage machine (029) runs its stage's recipe
 * (`recipeId` is the stage id, and `stage` says so): it adds its tag to finished rounds.
 */
export interface MachineDef extends PieceBase {
  kind: 'machine';
  recipeId: string;
  craftTicks: number;
  stage?: string;
}

/**
 * Moves or holds items: conduits carry them, hoppers feed a line, crates collect
 * what it makes, a sorter sends one chosen item out its side (015), a splitter
 * deals items out its front and side in turn, and a merger joins three inputs into
 * one (033: both restored, never crafted).
 */
export interface LogisticsDef extends PieceBase {
  kind: 'conduit' | 'hopper' | 'crate' | 'sorter' | 'splitter' | 'merger';
}

export type PieceDef = MachineDef | LogisticsDef;
export type PieceKind = PieceDef['kind'];

const machine = (
  id: string,
  name: string,
  category: PieceCategory,
  recipeId: string,
  footprint: Footprint,
  craftTicks: number,
  description: string,
): MachineDef => ({
  kind: 'machine',
  id,
  name,
  category,
  description,
  recipeId,
  footprint,
  craftTicks,
});

const logistics = (kind: LogisticsDef['kind'], name: string, description: string): LogisticsDef => ({
  kind,
  id: kind,
  name,
  category: 'logistics',
  description,
  footprint: '1x1',
});

/** Each base ammo's build bar group, for its stages (029). */
const AMMO_CATEGORY: Readonly<Record<string, PieceCategory>> = { arrow: 'arrows', bomb: 'bombs', 'ley-bolt': 'ley' };

/** A stage as a machine (029): 1×1, in its base ammo's group, running its own recipe. */
function stageMachine(st: StageDef): MachineDef {
  const category = AMMO_CATEGORY[stageBase(st)];
  if (!category) throw new Error(`No build bar group for stage '${st.id}'`);
  return { ...machine(st.id, st.name, category, st.id, '1x1', st.craftTicks, st.description), stage: st.id };
}

export const PIECES: Readonly<Record<string, PieceDef>> = {
  conduit: logistics('conduit', 'Ley conduit', 'Carries items toward its front. Drag to lay a run that bends.'),
  sorter: logistics('sorter', 'Sorter', 'Sends one chosen item out its side. E sets it, F flips the side.'),
  splitter: logistics('splitter', 'Splitter', 'Sends items out its front and side in turn. F flips the side.'),
  merger: logistics('merger', 'Merger', 'Takes items from its back and both sides in turn, out its front.'),
  hopper: logistics('hopper', 'Hopper', 'Holds one kind of item, put in with E, and feeds it forward.'),
  crate: logistics('crate', 'Crate', 'Collects whatever reaches it from any side. E empties it.'),
  cutter: machine('cutter', 'Cutter', 'arrows', 'shaft', '1x1', 60, 'Cuts wood into shafts.'),
  knapper: machine('knapper', 'Knapper', 'arrows', 'arrowhead', '1x1', 60, 'Chips stone into arrowheads.'),
  spinner: machine('spinner', 'Spinner', 'arrows', 'rope', '1x1', 60, 'Spins fiber into rope.'),
  assembler: machine('assembler', 'Assembler', 'arrows', 'arrow', '3x1', 90, 'Puts shafts, arrowheads and rope together into arrows.'),
  shaper: machine('shaper', 'Shaper', 'bombs', 'casing', '1x1', 60, 'Shapes stone into bomb casings.'),
  'fuse-maker': machine('fuse-maker', 'Fuse maker', 'bombs', 'fuse', '1x1', 60, 'Draws husk resin into fuses.'),
  grinder: machine('grinder', 'Grinder', 'ley', 'ley-shard', '1x1', 60, 'Grinds ley crystal into shards.'),
  packer: machine('packer', 'Packer', 'bombs', 'bomb', '3x1', 90, 'Packs casings, fuses and shards into bombs.'),
  focuser: machine('focuser', 'Focuser', 'ley', 'ley-bolt', '1x1', 60, 'Focuses ley shards into ley bolts.'),
  ...Object.fromEntries(Object.values(STAGES).map((st) => [st.id, stageMachine(st)])),
};

/** The build bar's order, group by group (026): logistics, then each ammo chain's machines. */
export const BUILD_BAR: readonly string[] = [
  'conduit',
  'sorter',
  'splitter',
  'merger',
  'hopper',
  'crate',
  'cutter',
  'knapper',
  'spinner',
  'assembler',
  'frost-rune',
  'shaper',
  'fuse-maker',
  'packer',
  'grinder',
  'focuser',
  'ley-guide',
  'shatter-lens',
];

export function pieceDef(id: string): PieceDef {
  const def = PIECES[id];
  if (!def) throw new Error(`Unknown piece '${id}'`);
  return def;
}

export function machineDef(id: string): MachineDef {
  const def = pieceDef(id);
  if (def.kind !== 'machine') throw new Error(`Piece '${id}' is not a machine`);
  return def;
}

/** Pieces that lie flat on the floor (conduits, sorters, and 033's splitter and merger): the player walks over them. */
export const isFlatKind = (kind: PieceKind): boolean => kind === 'conduit' || kind === 'sorter' || kind === 'splitter' || kind === 'merger';

/** Flat pieces can be walked over; every other piece blocks the player. */
export function isSolidPiece(id: string): boolean {
  return !isFlatKind(pieceDef(id).kind);
}
