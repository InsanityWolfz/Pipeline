// 070: the player's silhouette, shown while a prop in front of them hides them. Tuning values; tune by eye.

export const PLAYER_SILHOUETTE = {
  /** The body's fill: its colour (palette id) and alpha, drawn over the props in front. */
  tint: 'cyan',
  alpha: 0.4,
  /** The pale outline round it: colour, alpha, and how far out it reaches, px. */
  rim: { color: 'ink', alpha: 0.55, px: 1.2 },
  /** The body box the cover test samples, px: `w` wide, `h` tall, standing on the feet point; a `cols` × `rows` grid of points. */
  body: { w: 14, h: 30 },
  samples: { cols: 3, rows: 5 },
  /** The share of those points that props in front must cover (drawn pixels at least `alphaAtLeast` of 255) to hide the player. */
  cover: 0.3,
  /** Props standing farther than this from the feet, px either way, are never tested (the tallest props' height). */
  reach: 96,
  alphaAtLeast: 128,
  /** What hides the player (and nothing else): ruin blocks and grove trees (tiles), tree nodes, the bench, machines and (077) the set pieces. */
  nodes: ['tree'] as readonly string[],
  fixtures: ['bench'] as readonly string[],
  /** 077: the set pieces hide the player too (their still base; a loop or swaying part never changes the cover test's key). */
  setPieces: true,
} as const;
