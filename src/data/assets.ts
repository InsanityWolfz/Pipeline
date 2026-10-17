// Asset keys. Render code loads and draws by these keys, never string literals.

/** The sprite atlas built by `npm run art` (assets/build/sprites.png + .json). */
export const ATLAS_KEY = 'sprites';

/** Frame names in the atlas, one per sprite grid in assets/sprites. */
export const SPRITES = {
  floorRune: 'floor-rune',
  leyCrystal: 'ley-crystal',
} as const;
