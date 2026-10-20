import { STATIC_ROOMS, type Room } from '../data/rooms';
import { generateOverworld } from './overworldGen';
import { buildSandboxRoom } from './sandboxRoom';

// Every room in the game (017): the rooms written out by hand (the foundry), the
// overworld, generated once from its fixed seed, and the sandbox's room (044), built
// from its layout. Only `?sandbox` ever enters it; it holds nothing until then.

const overworld = generateOverworld();

const sandbox = buildSandboxRoom();

export const WORLD: Readonly<Record<string, Room>> = { ...STATIC_ROOMS, [overworld.id]: overworld, [sandbox.id]: sandbox };
