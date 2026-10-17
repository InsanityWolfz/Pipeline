import { stepArrows } from './arrows';
import { NO_COMMAND, type Command } from './input';
import { stepPlayer } from './movement';
import { roomOf, type SimState } from './state';
import { stepTube } from './tube';

/** Advances the sim by exactly one fixed tick. Game systems run from here. */
export function stepSim(state: SimState, cmd: Command = NO_COMMAND): void {
  const room = roomOf(state);
  state.tick += 1;
  stepPlayer(state.player, room, cmd);
  // Arrows fired this tick stay at the muzzle until next tick's step.
  stepArrows(state.arrows, room);
  stepTube(state, cmd);
}
