import { FOUNDRY_ROOM } from '../data/rooms';
import { stepArrows } from './arrows';
import { stepBombs } from './bombs';
import { maskCommand, stepBuild } from './build';
import { stepClaims, stepPorts } from './claims';
import { fixtureRects, tileRect } from './fixtures';
import { stepBurns } from './burn';
import { arrowHits, removeDead } from './combat';
import { stepDoorways } from './doorways';
import { stepPickups } from './drops';
import type { RoomBodies } from './enemies';
import { clearEvents } from './events';
import { offerFromOutside, stepFoundry } from './flow';
import { stepFoundryUse } from './foundryUse';
import { stepHarvest } from './harvest';
import { stepLink } from './link';
import { checkKo } from './health';
import { stepEnemies } from './enemyAi';
import { NO_COMMAND, type Command } from './input';
import { stepPlayer } from './movement';
import { nodeRects, stepNodes } from './nodes';
import { stepOrbs } from './orbs';
import { solidRects } from './pieces';
import { roomById, type SimState } from './state';
import { stepTube } from './tube';

/** Each room's tiles and solid things (nodes, pylons, and solid pieces and fixtures in the foundry), built once per tick on first use. */
function bodiesOf(state: SimState): (roomId: string) => RoomBodies {
  const cache = new Map<string, RoomBodies>();
  return (roomId) => {
    let bodies = cache.get(roomId);
    if (!bodies) {
      const room = roomById(roomId);
      const pieces = roomId === FOUNDRY_ROOM ? [...solidRects(state.foundry), ...fixtureRects(state.fixtures)] : [];
      const pylon = room.pylon ? [tileRect(room.pylon)] : [];
      bodies = { room, obstacles: [...nodeRects(state.nodes, roomId), ...pieces, ...pylon] };
      cache.set(roomId, bodies);
    }
    return bodies;
  };
}

/** Advances the sim by exactly one fixed tick. Game systems run from here; every room ticks. */
export function stepSim(state: SimState, input: Command = NO_COMMAND): void {
  clearEvents(state.events);
  state.tick += 1;
  const cmd = maskCommand(state, input);
  const bodies = bodiesOf(state);
  const here = bodies(state.roomId);
  stepPlayer(state.player, here.room, cmd, here.obstacles);
  stepDoorways(state);
  stepLink(state);
  // Enemies act after the player moves, so a swipe lands on where the player stands now.
  stepEnemies(state, bodies);
  stepNodes(state.nodes);
  // Before the tube, so fire this tick cancels a harvest in progress.
  // Build mode keeps E for hoppers and crates, not harvesting.
  const used = stepClaims(state, cmd);
  stepHarvest(state, state.building ? { ...used, interact: false } : used);
  // Shots fired this tick stay at the muzzle until next tick's step.
  stepArrows(state.arrows, roomById, arrowHits(state));
  stepBurns(state);
  stepBombs(state);
  stepOrbs(state);
  removeDead(state);
  stepTube(state, cmd);
  stepBuild(state, cmd);
  stepFoundryUse(state, cmd);
  stepFoundry(state.foundry, state.link.reservoir, state.events.refills);
  stepPorts(state, (to, from, item) =>
    offerFromOutside(state.foundry, state.link.reservoir, state.events.refills, to, from, item),
  );
  stepPickups(state);
  checkKo(state);
}
