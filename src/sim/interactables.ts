import type { InteractKind, InteractLabel } from '../data/interact';
import { SANDBOX } from '../data/sandbox';
import { SANDBOX_ROOM } from '../data/rooms';
import { altarInReach, altarState } from './altar';
import { arenaLocked, doorInReach, doorUse } from './arenaLock';
import { cacheInReach, isOpened } from './cache';
import { travelDestinations, dormant, fixtureInReach, isClaimed, occupied, pylonInReach } from './claims';
import { fixtureDef } from './fixtures';
import { usableInReach } from './foundryUse';
import { nodeInReach } from './harvest';
import { pieceRect } from './pieces';
import { diagramInReach } from './research';
import { roomOf, type SimState } from './state';
import { tileCentre } from './tiles';
import { stoneInReach } from './tutorial';
import { usableStoneInReach } from './returnStones';

// What E would act on right now (045): the thing in reach that takes an E press, in the order the sim takes one
// (src/sim/step.ts), and the world point its prompt floats over. Nothing while a harvest, claim or cache hold runs
// (018: the prompt never sits on a hold's bar), or where E would do nothing: a dormant or guarded pylon, a dim altar, an opened
// cache, an empty crate, the waystone with no pylon claimed, a dormant return stone (072), and in build mode a node (E there is for pieces).

export interface InteractTarget {
  kind: InteractKind;
  x: number;
  y: number;
  /** Words its prompt shows beside the key (src/data/interact.ts), if any. */
  label?: InteractLabel;
}

const at = (kind: InteractKind, p: { x: number; y: number }): InteractTarget => ({ kind, x: p.x, y: p.y });

/** The target in reach that E would act on this tick, or null. */
export function interactTarget(state: SimState): InteractTarget | null {
  if (state.harvest || state.claimHold || state.cacheHold || state.player.dying > 0) return null;
  const room = roomOf(state);
  if (room.tubeStone && stoneInReach(state)) return at('tube-stone', tileCentre(room.tubeStone));
  // 055: an arena's door, while E there goes in or out (a sealed door, from outside, has no prompt: its hover says why).
  const door = doorInReach(state);
  if (door && doorUse(state, door)) {
    const first = door.door.tiles[0];
    const last = door.door.tiles[door.door.tiles.length - 1];
    if (first && last) {
      const target = at('arena-door', tileCentre({ tx: (first.tx + last.tx) / 2, ty: first.ty }));
      // fix-bulwark-ease: from inside while its boss fights, the prompt says E leaves and resets the fight (043's lock).
      return arenaLocked(state, door, state.roomId) ? { ...target, label: 'leaveFight' } : target;
    }
  }
  const altar = altarInReach(state);
  if (altar) return altarState(state, altar.id) === 'dim' ? null : at('altar', tileCentre(altar));
  const pylon = pylonInReach(state);
  // fix-playtest-ui (Shaun: "Should only show E if it needs cleared"): a pylon whose guards live has none; its hover says why.
  if (pylon) return dormant(state, pylon) || (!isClaimed(state, pylon.site) && occupied(state, pylon.site)) ? null : at('pylon', tileCentre(pylon));
  for (const kind of ['waystone', 'stash', 'bench'] as const) {
    const f = fixtureInReach(state, kind);
    if (!f) continue;
    if (kind === 'waystone' && travelDestinations(state).length === 0) return null;
    return at(kind, state.sandbox && state.roomId === SANDBOX_ROOM ? tileCentre(SANDBOX.bench) : tileCentre(fixtureDef(f.id)));
  }
  // 072: a woken return stone (a dormant one, and the sandbox's, take no E).
  const stone = usableStoneInReach(state);
  if (stone) return at('return-stone', tileCentre(stone));
  const cache = cacheInReach(state);
  if (cache) return isOpened(state, cache.id) ? null : at('cache', tileCentre(cache));
  const diagram = diagramInReach(state);
  if (diagram) return at('diagram', diagram.rect);
  const piece = usableInReach(state);
  // 047: E opens a crate's screen even when it's empty (stacks can go in), so an empty crate has its prompt too.
  if (piece) return at(piece.kind, pieceRect(piece));
  const node = state.building ? undefined : nodeInReach(state);
  return node ? at('node', node) : null;
}
