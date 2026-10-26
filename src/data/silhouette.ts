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
  alphaAtLeast: 128,
  /** What hides the player (and nothing else): ruin blocks and grove trees (tiles), tree nodes, the bench and machines. */
  nodes: ['tree'] as readonly string[],
  fixtures: ['bench'] as readonly string[],
} as const;
