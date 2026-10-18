import { stepArrows } from './arrows';
import { arrowHits, removeDead } from './combat';
import { stepPickups } from './drops';
import { clearEvents } from './events';
import { checkKo } from './health';
import { stepEnemies } from './huskAi';
import { NO_COMMAND, type Command } from './input';
import { stepPlayer } from './movement';
import { roomOf, type SimState } from './state';
import { stepTube } from './tube';

/** Advances the sim by exactly one fixed tick. Game systems run from here. */
export function stepSim(state: SimState, cmd: Command = NO_COMMAND): void {
  const room = roomOf(state);
  clearEvents(state.events);
  state.tick += 1;
  stepPlayer(state.player, room, cmd);
  // Enemies act after the player moves, so a swipe lands on where the player stands now.
  stepEnemies(state, room);
  // Arrows fired this tick stay at the muzzle until next tick's step.
  stepArrows(state.arrows, room, arrowHits(state));
  removeDead(state);
  stepTube(state, cmd);
  stepPickups(state);
  checkKo(state);
}
