import { GUIDED_BUILDS, LOCK_UNTIL, type Ghost, type GuidedId } from '../data/guidedBuilds';
import { OBJECTIVES } from '../data/objectives';
import { opposite } from './direction';
import { currentObjectiveDef } from './objectives';
import { pieceAt, type FoundryState, type PieceShape, type PlaceFail } from './pieces';
import type { Facing } from './player';
import type { SimState } from './state';

// The guided builds (058): in a guided game (the real game's start), building in the foundry is locked from the first
// visit until the frost rune step is done. During the ley bolt and frost rune steps, the only thing allowed is the
// step's next ghost: placing its piece on its tile, facing its way, or picking up the piece it says to remove. Which
// ghost is next is read off the foundry (the first not yet matched), so nothing extra is saved.

type Guided = Pick<SimState, 'start' | 'objectives' | 'sandbox'>;

/** The objective a guided build belongs to. */
export const guidedGoal = (id: GuidedId): number => OBJECTIVES.findIndex((o) => o.guided === id);

/** A guided game: the real game's start, never the sandbox. */
export const isGuidedGame = (state: Pick<SimState, 'start' | 'sandbox'>): boolean => state.start.guided === true && !state.sandbox;

/** True while the tutorial's build lock holds: a guided game whose frost rune step isn't done. */
export function buildLocked(state: Guided): boolean {
  return isGuidedGame(state) && state.objectives[guidedGoal(LOCK_UNTIL)] !== true;
}

/** The guided build that is the current goal, or null. */
export function currentGuided(state: SimState): GuidedId | null {
  if (!isGuidedGame(state)) return null;
  return currentObjectiveDef(state)?.guided ?? null;
}

/** Whether a ghost is already matched by the foundry: its piece placed there as it says, or the piece to remove gone. */
export function ghostDone(foundry: FoundryState, g: Ghost): boolean {
  const p = pieceAt(foundry, g.tx, g.ty);
  if (g.kind === 'remove') return p?.pieceId !== g.piece;
  return p !== undefined && p.pieceId === g.piece && p.tx === g.tx && p.ty === g.ty && p.facing === g.facing;
}

/** The current guided build's next ghost and its place in the build, or null with no guided build current (or all of it built). */
export function nextGhost(state: SimState): { id: GuidedId; index: number; ghost: Ghost } | null {
  const id = currentGuided(state);
  if (!id) return null;
  const ghosts = GUIDED_BUILDS[id];
  const index = ghosts.findIndex((g) => !ghostDone(state.foundry, g));
  const ghost = ghosts[index];
  return ghost ? { id, index, ghost } : null;
}

/** The ghosts still to build in the current guided build, the next first. */
export function ghostsLeft(state: SimState): Ghost[] {
  const next = nextGhost(state);
  return next ? GUIDED_BUILDS[next.id].slice(next.index).filter((g) => !ghostDone(state.foundry, g)) : [];
}

/** Why the lock refuses this placement (`ghost` during a guided step, `tutorial` otherwise), or null if it allows it. */
export function lockRefusal(state: SimState, pieceId: string, tx: number, ty: number, facing: Facing): PlaceFail | null {
  if (!buildLocked(state)) return null;
  const next = nextGhost(state);
  const g = next?.ghost;
  if (g?.kind === 'place' && g.piece === pieceId && g.tx === tx && g.ty === ty && g.facing === facing) return null;
  return currentGuided(state) ? 'ghost' : 'tutorial';
}

/** The shape a guided placement takes: a conduit takes the ghost's side (its back unless it says otherwise). */
export function guidedShape(state: SimState, shape: PieceShape): PieceShape {
  const g = buildLocked(state) ? nextGhost(state)?.ghost : undefined;
  if (g?.kind !== 'place' || g.piece !== 'conduit') return shape;
  return { ...shape, inFrom: g.inFrom ?? opposite(g.facing) };
}

/** Why the lock refuses picking up the piece on this tile, or null if it allows it (058.6: only the piece to remove). */
export function pickUpRefusal(state: SimState, tx: number, ty: number): PlaceFail | null {
  if (!buildLocked(state)) return null;
  const g = nextGhost(state)?.ghost;
  if (g?.kind === 'remove' && g.tx === tx && g.ty === ty) return null;
  return currentGuided(state) ? 'ghost' : 'tutorial';
}

/**
 * The guided step's sub-line (058.2): the next ghost's piece, whether it's placed or removed, and, for a run of the
 * same piece in a row, how many of the run are built and its length (1 for a lone piece).
 */
export function guidedSubLine(state: SimState): { pieceId: string; kind: Ghost['kind']; built: number; of: number } | null {
  const next = nextGhost(state);
  if (!next) return null;
  const ghosts = GUIDED_BUILDS[next.id];
  const same = (g: Ghost | undefined): boolean => g !== undefined && g.kind === next.ghost.kind && g.piece === next.ghost.piece;
  let start = next.index;
  while (same(ghosts[start - 1])) start -= 1;
  let end = next.index;
  while (same(ghosts[end + 1])) end += 1;
  return { pieceId: next.ghost.piece, kind: next.ghost.kind, built: next.index - start, of: end - start + 1 };
}

/** For getState() (058): whether the build lock holds, the current guided build, and its ghosts still to build (the next first). */
export function guidedSummary(state: SimState): { guided: { locked: boolean; build: GuidedId | null; ghosts: Ghost[] } } {
  return { guided: { locked: buildLocked(state), build: currentGuided(state), ghosts: ghostsLeft(state) } };
}
