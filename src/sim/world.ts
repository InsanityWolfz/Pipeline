import { STATIC_ROOMS, type Room } from '../data/rooms';
import { generateOverworld } from './overworldGen';

// Every room in the game (017): the rooms written out by hand (the foundry) and
// the overworld, generated once from its fixed seed.

const overworld = generateOverworld();

export const WORLD: Readonly<Record<string, Room>> = { ...STATIC_ROOMS, [overworld.id]: overworld };
