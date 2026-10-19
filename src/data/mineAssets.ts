// Asset keys and look numbers for 038's art: the landmine in flight, armed on the
// ground and bursting, its icon and the iron plate's, and the cluster bomb's bomblets.
// Render draws by these keys; the shapes are in src/data/art/mines.ts. Times ms, sizes
// world px, alphas 0..1, colours palette ids. No runtime imports (ammo.ts and items.ts import it).

export const MINE_SPRITES = {
  /** The landmine in flight, and its shadow on the ground path. */
  landmine: 'landmine',
  landmineShadow: 'landmine-shadow',
  /** Lying armed on the ground: flat, its ley pip lit. */
  armed: 'landmine-armed',
  iconLandmine: 'icon-landmine',
  itemIronPlate: 'item-iron-plate',
  /** A cluster bomb's bomblet arcing out, and its shadow. */
  bomblet: 'bomblet',
  bombletShadow: 'bomblet-shadow',
  /** A mine's burst: a tight bright flash with iron shards, drawn scaled to its radius. */
  mineFlash: 'mine-flash',
  /** A bomblet's pop, drawn scaled to its radius. */
  bombletFlash: 'bomblet-flash',
} as const;

/** How mines and bomblets look live (038). */
export const MINE_LOOK = {
  /**
   * The fuse ring round an armed mine: a faint track `radius` px out, and over it an arc filling clockwise from the top
   * as the fuse burns, in `color`, turning `lateColor` over its last `lateTicks`; `width` px wide.
   */
  fuse: { radius: 9, width: 1.5, track: 0.3, alpha: 0.95, color: 'cyan-glow', lateColor: 'danger', lateTicks: 60 },
  /** The armed mine's pip blinks faster in its last `lateTicks`: on for half of every `blinkMs` (render clock). */
  pip: { blinkMs: 500, lateBlinkMs: 160 },
  /** Bomblets arc out from the burst over their delay to this peak, px. */
  bombletArc: 14,
  /** Burst flashes: grow from `from` to `to` of the radius and fade over `ms`. */
  mineFlash: { ms: 320, from: 0.5, to: 1.15 },
  bombletFlash: { ms: 220, from: 0.4, to: 1.1 },
  /** The flash sprites' own radius, px: render scales them to the burst's. */
  flashRadius: 24,
} as const;
