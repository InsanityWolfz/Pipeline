import { TUNNEL_REACH } from './foundry';
import { stageText } from './rulesText';
import { stageBase, STAGES, type StageDef } from './stages';

// Buildable foundry pieces. Starting values from spec 006; tune in playtest.

/** Tiles a piece covers: one, or three in a row across its facing (its tile is the middle one). */
export type Footprint = '1x1' | '3x1';

/** The build bar's groups (026): logistics, then one per ammo chain. */
export type PieceCategory = 'logistics' | 'arrows' | 'bombs' | 'ley' | 'mines';

/** The build bar's groups in order, left to right, each with the label shown over it (026). */
export const PIECE_CATEGORIES: readonly { id: PieceCategory; label: string }[] = [
  { id: 'logistics', label: 'Logistics' },
  { id: 'arrows', label: 'Arrows' },
  { id: 'bombs', label: 'Bombs' },
  { id: 'ley', label: 'Ley' },
  { id: 'mines', label: 'Mines' },
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
 * what it makes, a splitter deals items out its front and side in turn (033;
 * there from the start, 046), and an underground entrance sends items under the
 * floor to its exit (052).
 */
export interface LogisticsDef extends PieceBase {
  kind: 'conduit' | 'hopper' | 'crate' | 'splitter' | 'tunnel-in' | 'tunnel-out';
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

const logistics = (kind: LogisticsDef['kind'], name: string, description: string, id: string = kind): LogisticsDef => ({
  kind,
  id,
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
  // Its build tip is its generated line and cost (039): "Cold: added to any round · 1 rimestone per 4".
  return { ...machine(st.id, st.name, category, st.id, '1x1', st.craftTicks, stageText(st)), stage: st.id };
}

export const PIECES: Readonly<Record<string, PieceDef>> = {
  conduit: logistics('conduit', 'Ley conduit', 'Carries items toward its front. Drag to lay a run that bends.'),
  splitter: logistics('splitter', 'Splitter', 'Sends items out its front and side in turn. G flips the side.'),
  'underground-entrance': logistics('tunnel-in', 'Underground entrance', `Takes items from its back and sends them under the floor to its exit, up to ${TUNNEL_REACH} tiles ahead.`, 'underground-entrance'),
  'underground-exit': logistics('tunnel-out', 'Underground exit', 'Brings up what its entrance sends, out its front. Place it in line ahead, facing the same way.', 'underground-exit'),
  hopper: logistics('hopper', 'Hopper', 'Holds one kind of item, put in with E, and feeds it forward.'),
  crate: logistics('crate', 'Crate', 'Collects whatever reaches it from any side. E empties it.'),
  cutter: machine('cutter', 'Cutter', 'arrows', 'shaft', '1x1', 60, 'Cuts wood into shafts.'),
  knapper: machine('knapper', 'Knapper', 'arrows', 'arrowhead', '1x1', 60, 'Chips stone into arrowheads.'),
  spinner: machine('spinner', 'Spinner', 'arrows', 'rope', '1x1', 60, 'Spins fiber into rope.'),
  assembler: machine('assembler', 'Assembler', 'arrows', 'arrow', '3x1', 90, 'Puts shafts, arrowheads and rope together into arrows.'),
  shaper: machine('shaper', 'Shaper', 'bombs', 'casing', '1x1', 60, 'Shapes stone into bomb casings.'),
  'fuse-maker': machine('fuse-maker', 'Fuse maker', 'bombs', 'fuse', '1x1', 60, 'Draws husk resin into fuses.'),
  grinder: machine('grinder', 'Grinder', 'ley', 'ley-dust', '1x1', 60, 'Grinds ley crystal into dust.'),
  packer: machine('packer', 'Packer', 'bombs', 'bomb', '3x1', 90, 'Packs casings, fuses and ley dust into bombs.'),
  focuser: machine('focuser', 'Focuser', 'ley', 'ley-bolt', '1x1', 60, 'Focuses ley dust into ley bolts.'),
  // 038.1: the plate press as the cutter, the mine packer as the bomb packer (three inputs into a 3x1).
  'plate-press': machine('plate-press', 'Plate press', 'mines', 'iron-plate', '1x1', 60, 'Presses ley-iron into iron plates.'),
  'mine-packer': machine('mine-packer', 'Mine packer', 'mines', 'landmine', '3x1', 90, 'Packs iron plates, fuses and ley dust into landmines.'),
  ...Object.fromEntries(Object.values(STAGES).map((st) => [st.id, stageMachine(st)])),
};

/** The underground pair's pieces (052): placing one selects the other next, as Factorio's underground belts. */
export const TUNNEL_PIECES = { in: 'underground-entrance', out: 'underground-exit' } as const;

/** The build bar's order, group by group (026): logistics, then each ammo chain's machines. */
export const BUILD_BAR: readonly string[] = [
  'conduit',
  'splitter',
  'underground-entrance',
  'underground-exit',
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
  'cluster-die',
  'grinder',
  'focuser',
  'ley-guide',
  'prism-lens',
  'plate-press',
  'mine-packer',
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

/** Pieces that lie flat on the floor (conduits, 033's splitter and 052's underground pair): the player walks over them. */
export const isFlatKind = (kind: PieceKind): boolean => kind === 'conduit' || kind === 'splitter' || kind === 'tunnel-in' || kind === 'tunnel-out';

/** Flat pieces can be walked over; every other piece blocks the player. */
export function isSolidPiece(id: string): boolean {
  return !isFlatKind(pieceDef(id).kind);
}
