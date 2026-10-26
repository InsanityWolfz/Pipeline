import { TILE_SIZE } from './config';

// The in-reach E prompts (045, note 7 and 043.5): every kind of thing E acts on, and the key prompt each shows over
// itself while the player is in reach and E would do something. A new interactable is a new kind here, and a test
// holds every kind to a prompt (tests/sim/interactables.test.ts).

/** Every kind of thing E acts on, in the order the sim takes an E press (src/sim/step.ts). */
export const INTERACT_KINDS = [
  'tube-stone',
  'arena-door',
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

/**
 * A kind's prompt: its key (a default letter, shown as the bound key, 042) and how far above its point the cap's bottom
 * sits, px. With `beside`, the cap sits that far to one side of the point instead, on the side away from the player,
 * so it never covers them.
 */
export interface InteractPrompt {
  key: 'E';
  rise: number;
  beside?: number;
}

/**
 * Words some prompts show beside their key cap (fix-bulwark-ease, Shaun: "make sure you can run from him"): from inside
 * an arena while its boss fights, E at the door leaves and the fight starts over, and the prompt says so.
 */
export const INTERACT_LABELS = {
  leaveFight: 'Leave (resets the fight)',
} as const;
export type InteractLabel = keyof typeof INTERACT_LABELS;

/** The objective prompt's height (012): a tile over the thing's centre. */
const OVER = TILE_SIZE;

export const INTERACT_PROMPTS: Readonly<Record<InteractKind, InteractPrompt>> = {
  'tube-stone': { key: 'E', rise: OVER },
  // 055: an arena's door (043's seal before it): its point is the door's middle at its row.
  'arena-door': { key: 'E', rise: OVER },
  altar: { key: 'E', rise: OVER },
  pylon: { key: 'E', rise: OVER + TILE_SIZE / 2 },
  waystone: { key: 'E', rise: OVER },
  stash: { key: 'E', rise: OVER },
  // 052.9: the bench is in reach on the tile the player arrives on, right above it, so its prompt sits beside it, at
  // its middle's height, on the side away from the player (in the foundry, on the door's wall below the doorway),
  // never on the player's chest.
  bench: { key: 'E', rise: 0, beside: TILE_SIZE * 0.75 },
  cache: { key: 'E', rise: OVER },
  diagram: { key: 'E', rise: OVER },
  hopper: { key: 'E', rise: OVER },
  crate: { key: 'E', rise: OVER },
  // A node's point is its feet; the same height as the gathering objective's prompt (012).
  node: { key: 'E', rise: OVER },
};
