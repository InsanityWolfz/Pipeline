import { NO_COMMAND, type Command } from './input';
import { stepPlayer } from './movement';
import { roomOf, type SimState } from './state';

/** Advances the sim by exactly one fixed tick. Game systems run from here. */
export function stepSim(state: SimState, cmd: Command = NO_COMMAND): void {
  state.tick += 1;
  stepPlayer(state.player, roomOf(state), cmd);
}
