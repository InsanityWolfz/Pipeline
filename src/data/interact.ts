import { TILE_SIZE } from './config';

// The in-reach E prompts (045, note 7 and 043.5): every kind of thing E acts on, and the key prompt each shows over
// itself while the player is in reach and E would do something. A new interactable is a new kind here, and a test
// holds every kind to a prompt (tests/sim/interactables.test.ts).

/** Every kind of thing E acts on, in the order the sim takes an E press (src/sim/step.ts). */
export const INTERACT_KINDS = [
  'tube-stone',
  'arena-seal',
  'altar',
  'pylon',
  'waystone',
  'stash',
  'bench',
  'cache',
  'diagram',
  'hopper',
  'crate',
  'node',
] as const;
export type InteractKind = (typeof INTERACT_KINDS)[number];

/** A kind's prompt: its key (a default letter, shown as the bound key, 042) and how far above its point the cap's bottom sits, px. */
export interface InteractPrompt {
  key: 'E';
  rise: number;
}

/** The objective prompt's height (012): a tile over the thing's centre. */
const OVER = TILE_SIZE;

export const INTERACT_PROMPTS: Readonly<Record<InteractKind, InteractPrompt>> = {
  'tube-stone': { key: 'E', rise: OVER },
  // The seal's point is the door's middle at its row; the curtain stands about a tile tall over it.
  'arena-seal': { key: 'E', rise: OVER },
  altar: { key: 'E', rise: OVER },
  pylon: { key: 'E', rise: OVER + TILE_SIZE / 2 },
  waystone: { key: 'E', rise: OVER },
  stash: { key: 'E', rise: OVER },
  bench: { key: 'E', rise: OVER },
  cache: { key: 'E', rise: OVER },
  diagram: { key: 'E', rise: OVER },
  hopper: { key: 'E', rise: OVER },
  crate: { key: 'E', rise: OVER },
  // A node's point is its feet; the same height as the gathering objective's prompt (012).
  node: { key: 'E', rise: OVER },
};
