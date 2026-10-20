import type { InteractKind } from '../data/interact';
import { SANDBOX } from '../data/sandbox';
import { SANDBOX_ROOM } from '../data/rooms';
import { altarInReach, altarState } from './altar';
import { sealInReach } from './arenaLock';
import { cacheInReach, isOpened } from './cache';
import { claimedPylons, dormant, fixtureInReach, pylonInReach } from './claims';
import { fixtureDef } from './fixtures';
import { usableInReach } from './foundryUse';
import { nodeInReach } from './harvest';
import { pieceRect } from './pieces';
import { diagramInReach } from './research';
import { roomOf, type SimState } from './state';
import { tileCentre } from './tiles';
import { stoneInReach } from './tutorial';

// What E would act on right now (045): the thing in reach that takes an E press, in the order the sim takes one
// (src/sim/step.ts), and the world point its prompt floats over. Nothing while a harvest, claim or cache hold runs
// (018: the prompt never sits on a hold's bar), or where E would do nothing: a dormant pylon, a dim altar, an opened
// cache, an empty crate, the waystone with no pylon claimed, and in build mode a node (E there is for pieces).

export interface InteractTarget {
  kind: InteractKind;
  x: number;
  y: number;
}

const at = (kind: InteractKind, p: { x: number; y: number }): InteractTarget => ({ kind, x: p.x, y: p.y });

/** The target in reach that E would act on this tick, or null. */
export function interactTarget(state: SimState): InteractTarget | null {
  if (state.harvest || state.claimHold || state.cacheHold || state.player.dying > 0) return null;
  const room = roomOf(state);
  if (room.tubeStone && stoneInReach(state)) return at('tube-stone', tileCentre(room.tubeStone));
  const seal = sealInReach(state);
  if (seal) {
    const first = seal.seal.tiles[0];
    const last = seal.seal.tiles[seal.seal.tiles.length - 1];
    if (first && last) return at('arena-seal', tileCentre({ tx: (first.tx + last.tx) / 2, ty: first.ty }));
  }
  const altar = altarInReach(state);
  if (altar) return altarState(state, altar.id) === 'dim' ? null : at('altar', tileCentre(altar));
  const pylon = pylonInReach(state);
  if (pylon) return dormant(state, pylon) ? null : at('pylon', tileCentre(pylon));
  if (fixtureInReach(state, 'waystone')) return claimedPylons(state).length > 0 ? fixtureAt('waystone', state) : null;
  for (const kind of ['stash', 'bench'] as const) if (fixtureInReach(state, kind)) return fixtureAt(kind, state);
  const cache = cacheInReach(state);
  if (cache) return isOpened(state, cache.id) ? null : at('cache', tileCentre(cache));
  const diagram = diagramInReach(state);
  if (diagram) return at('diagram', diagram.rect);
  const piece = usableInReach(state);
  if (piece) {
    if (piece.kind === 'crate' && Object.keys(piece.contents).length === 0) return null;
    return at(piece.kind, pieceRect(piece));
  }
  const node = state.building ? undefined : nodeInReach(state);
  return node ? at('node', node) : null;
}

/** A fixture's tile centre (044: the sandbox's bench stands at its own tile). */
function fixtureAt(kind: 'waystone' | 'stash' | 'bench', state: SimState): InteractTarget | null {
  if (state.sandbox && state.roomId === SANDBOX_ROOM) return kind === 'bench' ? at(kind, tileCentre(SANDBOX.bench)) : null;
  const f = fixtureInReach(state, kind);
  return f ? at(kind, tileCentre(fixtureDef(f.id))) : null;
}
