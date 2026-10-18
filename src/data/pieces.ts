// Buildable foundry pieces. Starting values from spec 006; tune in playtest.

/** Tiles a piece covers: one, or three in a row across its facing (its tile is the middle one). */
export type Footprint = '1x1' | '3x1';

interface PieceBase {
  id: string;
  name: string;
  /** A line or two for the build bar's hover panel (015), in the pixel font's glyphs. */
  description: string;
  footprint: Footprint;
  /** At most this many can be on the grid at once. */
  limit?: number;
  /** Items placing it takes from the inventory; picking it up gives them back. */
  cost?: Readonly<Record<string, number>>;
}

/** Runs a hand-crafting recipe on its own, from items handed in. */
export interface MachineDef extends PieceBase {
  kind: 'machine';
  recipeId: string;
  craftTicks: number;
}

/**
 * Moves or holds items: conduits carry them, hoppers feed a line, crates collect
 * what it makes, the tube socket sends ammo into the tube's reservoir (007), and
 * a gravity stager facing the socket adds a stream to the tube's spread (008),
 * and a sorter sends one chosen item out its side (015).
 */
export interface LogisticsDef extends PieceBase {
  kind: 'conduit' | 'hopper' | 'crate' | 'socket' | 'stager' | 'sorter';
}

export type PieceDef = MachineDef | LogisticsDef;
export type PieceKind = PieceDef['kind'];

const machine = (id: string, name: string, recipeId: string, footprint: Footprint, craftTicks: number, description: string): MachineDef => ({
  kind: 'machine',
  id,
  name,
  description,
  recipeId,
  footprint,
  craftTicks,
});

const logistics = (kind: LogisticsDef['kind'], name: string, description: string, id: string = kind): LogisticsDef => ({
  kind,
  id,
  name,
  description,
  footprint: '1x1',
});

export const PIECES: Readonly<Record<string, PieceDef>> = {
  conduit: logistics('conduit', 'Ley conduit', 'Carries items toward its front. Drag to lay a run that bends.'),
  sorter: logistics('sorter', 'Sorter', 'Sends one chosen item out its side. E sets it, F flips the side.'),
  hopper: logistics('hopper', 'Hopper', 'Holds one kind of item, put in with E, and feeds it forward.'),
  crate: logistics('crate', 'Crate', 'Collects whatever reaches it from any side. E empties it.'),
  'tube-socket': {
    ...logistics('socket', 'Tube socket', 'Feeds the tube. It fires from here once carried rounds run out.', 'tube-socket'),
    limit: 1,
  },
  'gravity-stager': {
    ...logistics('stager', 'Gravity stager', 'Facing the socket, it adds a stream to the spread. E turns it.', 'gravity-stager'),
    cost: { 'warden-core': 1 },
  },
  cutter: machine('cutter', 'Cutter', 'shaft', '1x1', 60, 'Cuts wood into shafts.'),
  knapper: machine('knapper', 'Knapper', 'arrowhead', '1x1', 60, 'Chips stone into arrowheads.'),
  spinner: machine('spinner', 'Spinner', 'rope', '1x1', 60, 'Spins fiber into rope.'),
  assembler: machine('assembler', 'Assembler', 'arrow', '3x1', 90, 'Puts shafts, arrowheads and rope together into arrows.'),
  shaper: machine('shaper', 'Shaper', 'casing', '1x1', 60, 'Shapes stone into bomb casings.'),
  'fuse-maker': machine('fuse-maker', 'Fuse maker', 'fuse', '1x1', 60, 'Draws husk resin into fuses.'),
  grinder: machine('grinder', 'Grinder', 'ley-shard', '1x1', 60, 'Grinds ley crystal into shards.'),
  packer: machine('packer', 'Packer', 'bomb', '3x1', 90, 'Packs casings, fuses and shards into bombs.'),
  focuser: machine('focuser', 'Focuser', 'ley-bolt', '1x1', 60, 'Focuses ley shards into ley bolts.'),
};

/** The build bar's order: logistics first, then each ammo chain's machines. */
export const BUILD_BAR: readonly string[] = [
  'conduit',
  'sorter',
  'hopper',
  'crate',
  'tube-socket',
  'gravity-stager',
  'cutter',
  'knapper',
  'spinner',
  'assembler',
  'shaper',
  'fuse-maker',
  'grinder',
  'packer',
  'focuser',
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

/** Conduits can be walked over; every other piece blocks the player. */
export function isSolidPiece(id: string): boolean {
  const { kind } = pieceDef(id);
  // Conduits and sorters lie flat on the floor, so the player walks over them.
  return kind !== 'conduit' && kind !== 'sorter';
}
