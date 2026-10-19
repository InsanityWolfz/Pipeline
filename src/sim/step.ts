import { equip, identifyAll, walkScale } from './armor';
import { stepArrows, type ArrowState } from './arrows';
import { steerArrows } from './homing';
import { stepBombs } from './bombs';
import { maskCommand, stepBuild } from './build';
import { stepClaims, stepPorts } from './claims';
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
import { stepNodes } from './nodes';
import { stepOrbs } from './orbs';
import { roomById, type SimState } from './state';
import { firingWalkScale, stepTube } from './tube';
import { stepObjectives } from './objectives';
import { stepGates, stepTubeStone } from './tutorial';
import { roomBodies } from './bodies';
import { stepPopulation } from './population';
import { applyStage } from './stages';

/** Each room's bodies, built once per tick on first use. */
function bodiesOf(state: SimState): (roomId: string) => RoomBodies {
  const cache = new Map<string, RoomBodies>();
  return (roomId) => {
    let bodies = cache.get(roomId);
    if (!bodies) {
      bodies = roomBodies(state, roomId);
      cache.set(roomId, bodies);
    }
    return bodies;
  };
}

/** Advances the sim by exactly one fixed tick. Game systems run from here; every room ticks. */
export function stepSim(state: SimState, input: Command = NO_COMMAND): void {
  clearEvents(state.events);
  state.tick += 1;
  // A dying player, or one held still while the tube attunes (019), takes no input but keeps their aim.
  const held = state.player.dying > 0 || state.link.attunePulse > 0;
  const cmd = held ? { ...NO_COMMAND, aimX: state.player.aimX, aimY: state.player.aimY } : maskCommand(state, input);
  const bodies = bodiesOf(state);
  const here = bodies(state.roomId);
  stepPlayer(state.player, here.room, cmd, here.obstacles, walkScale(state) * firingWalkScale(state));
  stepDoorways(state);
  stepLink(state);
  // Enemies act after the player moves, so a swipe lands on where the player stands now.
  stepPopulation(state);
  stepEnemies(state, bodies);
  stepNodes(state.nodes);
  // Before the tube, so fire this tick cancels a harvest in progress.
  // Build mode keeps E for hoppers and crates, not harvesting.
  const used = stepClaims(state, stepTubeStone(state, cmd));
  if (cmd.identify) identifyAll(state);
  if (cmd.equip) equip(state, cmd.equip.id);
  if (cmd.applyStage) applyStage(state, cmd.applyStage);
  stepHarvest(state, state.building ? { ...used, interact: false } : used);
  // Shots fired this tick stay at the muzzle until next tick's step.
  // Star shards (029) set off this tick join the flight after it, so they first move next tick.
  const shards: ArrowState[] = [];
  stepArrows(state.arrows, roomById, arrowHits(state, shards), steerArrows(state));
  state.arrows.push(...shards);
  stepBombs(state);
  stepOrbs(state);
  removeDead(state);
  stepTube(state, cmd);
  stepBuild(state, cmd);
  stepFoundryUse(state, cmd);
  stepFoundry(state.foundry, state.link.entrances, state.events, state.link.attuned);
  stepPorts(state, (to, from, item) => offerFromOutside(state.foundry, to, from, item));
  stepPickups(state);
  stepGates(state);
  stepObjectives(state);
  checkKo(state);
}
