// Buildable foundry pieces. Starting values from spec 006; tune in playtest.

/** Tiles a piece covers: one, or three in a row across its facing (its tile is the middle one). */
export type Footprint = '1x1' | '3x1';

interface PieceBase {
  id: string;
  name: string;
  footprint: Footprint;
}

/** Runs a hand-crafting recipe on its own, from items handed in. */
export interface MachineDef extends PieceBase {
  kind: 'machine';
  recipeId: string;
  craftTicks: number;
}

/** Moves or holds items: conduits carry them, hoppers feed a line, crates collect what it makes. */
export interface LogisticsDef extends PieceBase {
  kind: 'conduit' | 'hopper' | 'crate';
}

export type PieceDef = MachineDef | LogisticsDef;
export type PieceKind = PieceDef['kind'];

const machine = (id: string, name: string, recipeId: string, footprint: Footprint, craftTicks: number): MachineDef => ({
  kind: 'machine',
  id,
  name,
  recipeId,
  footprint,
  craftTicks,
});

const logistics = (kind: LogisticsDef['kind'], name: string): LogisticsDef => ({ kind, id: kind, name, footprint: '1x1' });

export const PIECES: Readonly<Record<string, PieceDef>> = {
  conduit: logistics('conduit', 'Ley conduit'),
  hopper: logistics('hopper', 'Hopper'),
  crate: logistics('crate', 'Crate'),
  cutter: machine('cutter', 'Cutter', 'shaft', '1x1', 60),
  knapper: machine('knapper', 'Knapper', 'arrowhead', '1x1', 60),
  spinner: machine('spinner', 'Spinner', 'rope', '1x1', 60),
  assembler: machine('assembler', 'Assembler', 'arrow', '3x1', 90),
  shaper: machine('shaper', 'Shaper', 'casing', '1x1', 60),
  'fuse-maker': machine('fuse-maker', 'Fuse maker', 'fuse', '1x1', 60),
  grinder: machine('grinder', 'Grinder', 'ley-shard', '1x1', 60),
  packer: machine('packer', 'Packer', 'bomb', '3x1', 90),
  focuser: machine('focuser', 'Focuser', 'ley-bolt', '1x1', 60),
};

/** The build bar's order: logistics first, then each ammo chain's machines. */
export const BUILD_BAR: readonly string[] = [
  'conduit',
  'hopper',
  'crate',
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
  return pieceDef(id).kind !== 'conduit';
}
