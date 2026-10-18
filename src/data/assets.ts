// Asset keys. Render code loads and draws by these keys, never string literals.

/** The sprite atlas built by `npm run art` (assets/build/sprites.png + .json). */
export const ATLAS_KEY = 'sprites';

/** Frame names in the atlas for single-frame sprites, one per sprite grid in assets/sprites. */
export const SPRITES = {
  leyCrystal: 'ley-crystal',
  floor: 'floor-rune',
  wall: 'wall',
  ruinBlock: 'ruin-block',
  arrow: 'arrow',
  arrowShadow: 'arrow-shadow',
  crosshair: 'crosshair',
  hudSlot: 'hud-slot',
  /** Ley rim over the hotbar slot while it fires from the reservoir (007). */
  hudSlotGlow: 'hud-slot-glow',
  iconArrow: 'icon-arrow',
  itemHuskResin: 'item-husk-resin',
  itemWood: 'item-wood',
  itemStone: 'item-stone',
  itemFiber: 'item-fiber',
  itemShadow: 'item-shadow',
  hudHealth: 'hud-health',
  iconBomb: 'icon-bomb',
  iconLeyBolt: 'icon-ley-bolt',
  itemLeyCrystal: 'item-ley-crystal',
  itemShaft: 'item-shaft',
  itemArrowhead: 'item-arrowhead',
  itemRope: 'item-rope',
  itemCasing: 'item-casing',
  itemFuse: 'item-fuse',
  itemLeyShard: 'item-ley-shard',
  itemWardenCore: 'item-warden-core',
  leyBolt: 'ley-bolt',
  leyBoltShadow: 'ley-bolt-shadow',
  bomb: 'bomb',
  bombShadow: 'bomb-shadow',
  craftPanel: 'craft-panel',
  craftRow: 'craft-row',
  craftRowHover: 'craft-row-hover',
  craftArrow: 'craft-arrow',
  hudAmmoCell: 'hud-ammo-cell',
  hudAmmoSelect: 'hud-ammo-select',
} as const;

/** Gathering node sprites by node id: full, and depleted. */
export const NODE_SPRITES: Readonly<Record<string, { full: string; depleted: string }>> = {
  tree: { full: 'node-tree', depleted: 'node-tree-depleted' },
  rubble: { full: 'node-rubble', depleted: 'node-rubble-depleted' },
  reeds: { full: 'node-reeds', depleted: 'node-reeds-depleted' },
  'ley-vein': { full: 'node-ley-vein', depleted: 'node-ley-vein-depleted' },
};

/** The tube held by the player, by direction. `side` points right; left is drawn flipped. */
export const TUBE_SPRITES = {
  down: 'tube-down',
  up: 'tube-up',
  side: 'tube-side',
} as const;

/** The tube's attuning pulse (007), drawn over the tube in the same spot: 2-frame loops by direction. */
export const TUBE_ATTUNE = {
  down: { key: 'tube-attune-down', frames: 2, frameRate: 8, loop: true },
  up: { key: 'tube-attune-up', frames: 2, frameRate: 8, loop: true },
  side: { key: 'tube-attune-side', frames: 2, frameRate: 8, loop: true },
} as const satisfies Record<keyof typeof TUBE_SPRITES, AnimDef>;

/**
 * Where the tube's top-left corner sits relative to the player's feet (the bottom
 * centre of the player sprite), px, for the right-facing side; left mirrors it.
 * `behind` draws it under the player.
 */
export const TUBE_GRIP: Readonly<Record<keyof typeof TUBE_SPRITES, { x: number; y: number; behind: boolean }>> = {
  down: { x: -5, y: -24, behind: false },
  up: { x: 3, y: -37, behind: true },
  side: { x: 2, y: -22, behind: true },
};

/** The HUD number font: frames `hud-digits/0`..`/9`, then `/` as frame 10, `+` as frame 11 and `-` as frame 12. */
export const HUD_DIGITS = { key: 'hud-digits', glyphs: '0123456789/+-', advance: 4 } as const;

/** Atlas frame for one HUD font character. */
export function digitFrame(ch: string): string {
  const index = HUD_DIGITS.glyphs.indexOf(ch);
  if (index < 0) throw new Error(`No HUD glyph for '${ch}'`);
  return `${HUD_DIGITS.key}/${index}`;
}

/** Hotbar slot layout, px from the slot's top-left. */
export const HUD_SLOT_LAYOUT = {
  icon: { x: 4, y: 4 },
  /** The count: carried rounds, or the reservoir's once none are carried. */
  count: { x: 25, y: 9 },
  /** Gap below the slot to the bottom of the screen. */
  margin: 6,
  /** Palette id: the slot tint while a dry fire shows. */
  dryFireTint: 'ember',
} as const;

/** An animation: the sprite grid `key` with `frames` frames (`key/0`..), or a single frame `key`. */
export interface AnimDef {
  key: string;
  frames: number;
  /**
   * Frames per second, or 'roll' to stretch the frames over exactly one roll.
   * The roll rate is computed in src/render/PlayerView.ts, since this file can't
   * import tuning (the art build loads it on its own).
   */
  frameRate: number | 'roll';
  loop: boolean;
}

/** Player animations. `side` faces right; left is drawn flipped. */
export type PlayerAnim =
  | 'idle-down'
  | 'idle-up'
  | 'idle-side'
  | 'walk-down'
  | 'walk-up'
  | 'walk-side'
  | 'fire-down'
  | 'fire-up'
  | 'fire-side'
  | 'hit-down'
  | 'hit-up'
  | 'hit-side'
  | 'roll';

const WALK_FPS = 8;
const WALK_FRAMES = 4;
const ROLL_FRAMES = 4;

const playerAnim = (name: PlayerAnim, frames: number, frameRate: AnimDef['frameRate'], loop: boolean): AnimDef => ({
  key: `player-${name}`,
  frames,
  frameRate,
  loop,
});

export const PLAYER_ANIMS: Readonly<Record<PlayerAnim, AnimDef>> = {
  'idle-down': playerAnim('idle-down', 1, 1, true),
  'idle-up': playerAnim('idle-up', 1, 1, true),
  'idle-side': playerAnim('idle-side', 1, 1, true),
  'walk-down': playerAnim('walk-down', WALK_FRAMES, WALK_FPS, true),
  'walk-up': playerAnim('walk-up', WALK_FRAMES, WALK_FPS, true),
  'walk-side': playerAnim('walk-side', WALK_FRAMES, WALK_FPS, true),
  'fire-down': playerAnim('fire-down', 1, 1, true),
  'fire-up': playerAnim('fire-up', 1, 1, true),
  'fire-side': playerAnim('fire-side', 1, 1, true),
  'hit-down': playerAnim('hit-down', 1, 1, true),
  'hit-up': playerAnim('hit-up', 1, 1, true),
  'hit-side': playerAnim('hit-side', 1, 1, true),
  roll: playerAnim('roll', ROLL_FRAMES, 'roll', false),
};

/** Enemy animations. `side` faces right; left is drawn flipped. Death has one view. */
export type EnemyAnim = `${'idle' | 'walk' | 'windup' | 'swipe' | 'hit'}-${'down' | 'up' | 'side'}` | 'death';

const ENEMY_WALK_FPS = 6;
const SWIPE_FPS = 20;
const DEATH_FPS = 8;

function enemyAnims(prefix: string): Readonly<Record<EnemyAnim, AnimDef>> {
  const anim = (name: EnemyAnim, frames: number, frameRate: number, loop: boolean): AnimDef => ({
    key: `${prefix}-${name}`,
    frames,
    frameRate,
    loop,
  });
  const views = ['down', 'up', 'side'] as const;
  const out: Partial<Record<EnemyAnim, AnimDef>> = { death: anim('death', 4, DEATH_FPS, false) };
  for (const v of views) {
    out[`idle-${v}`] = anim(`idle-${v}`, 1, 1, true);
    out[`walk-${v}`] = anim(`walk-${v}`, WALK_FRAMES, ENEMY_WALK_FPS, true);
    out[`windup-${v}`] = anim(`windup-${v}`, 1, 1, true);
    out[`swipe-${v}`] = anim(`swipe-${v}`, 2, SWIPE_FPS, false);
    out[`hit-${v}`] = anim(`hit-${v}`, 1, 1, true);
  }
  return out as Record<EnemyAnim, AnimDef>;
}

/** Animation sets by the `anims` key in src/data/enemies.ts. */
export const ENEMY_ANIMS: Readonly<Record<string, Readonly<Record<EnemyAnim, AnimDef>>>> = {
  husk: enemyAnims('husk'),
  wisp: enemyAnims('wisp'),
  warden: enemyAnims('warden'),
};

/** The sparkle played where an item is picked up. */
export const PICKUP_SPARKLE: AnimDef = { key: 'pickup-sparkle', frames: 4, frameRate: 16, loop: false };

/** A bomb's fire burst, drawn scaled to the burst's real radius. */
export const FIRE_BURST: AnimDef = { key: 'fire-burst', frames: 4, frameRate: 14, loop: false };

/** A ley burst at the tube's mouth for each projectile fired (008). */
export const MUZZLE_FLASH: AnimDef = { key: 'muzzle-flash', frames: 2, frameRate: 20, loop: false };

/** The flame over a burning enemy. */
export const BURN_FLAME: AnimDef = { key: 'burn-flame', frames: 3, frameRate: 10, loop: true };

/** Atlas frame names for an animation. */
export function animFrames(anim: AnimDef): string[] {
  return anim.frames === 1 ? [anim.key] : Array.from({ length: anim.frames }, (_, i) => `${anim.key}/${i}`);
}

/** HUD health bar (the `hud-health` frame) and the material column under it, px from the screen's top-left. */
export const HUD_HEALTH_LAYOUT = {
  x: 6,
  y: 6,
  /** The well the fill is drawn in, relative to the frame. */
  fill: { x: 2, y: 2, w: 48, h: 4 },
  /** Palette id of the fill. */
  fillColor: 'ember',
} as const;

export const HUD_MATERIALS_LAYOUT = {
  x: 6,
  y: 18,
  /** Vertical step between rows (one item icon tall). */
  rowStep: 16,
  /** Where the count starts, relative to the row's icon. */
  count: { x: 18, y: 6 },
} as const;

/** Enemy effects drawn in the world. Colours are palette ids. */
export const ENEMY_FX = {
  /** Fill colour of a hit flash (the palette's white). */
  flashColor: 'white',
  /** The swipe telegraph: a faint arc of the full reach, filling in with the wind-up. */
  telegraphColor: 'ember',
  telegraphAlpha: 0.25,
  telegraphFillAlpha: 0.55,
  /** The Wisp's cast telegraph: a ley ring tightening on it and a faint line along its locked aim (009). */
  castColor: 'ley-cyan',
  castRing: { from: 22, to: 10, width: 2 },
  castLine: 48,
  /** Health bar over a damaged enemy: size, and gap above the sprite's top. */
  healthBar: { w: 20, h: 3, gap: 2, border: 1 },
  healthBarColor: 'ember',
  healthBarBack: 'outline',
  /** A corpse lingers this long after its death animation, then fades over `corpseFadeMs`. */
  corpseLingerMs: 600,
  corpseFadeMs: 600,
} as const;

/** Player hit feedback, in sim ticks of hit invulnerability. */
export const PLAYER_HIT_FX = {
  /** The hit pose shows for the first this-many ticks of a hit. */
  poseTicks: 8,
  /** While invulnerable the player flashes white and back every this-many ticks, starting white. */
  flickerTicks: 4,
  flashColor: 'white',
} as const;

/** The "+1 [icon]" popup on pickup, and the KO fade. */
export const PICKUP_POPUP = { rise: 16, durationMs: 700, gap: 2, stack: 10, startHeight: 44 } as const;
export const KO_FADE_MS = 250;

/** A ground item's sprite bottom sits this far below its ground point, so it rests on its shadow, px. */
export const GROUND_ITEM_LIFT = 3;

/** Render depths. World sprites sort by the bottom of their footprint (px); these sit around that. */
export const DEPTHS = {
  /** Flat floor tiles, under everything. */
  floor: -1,
  /** Ground shadows, above the floor and under anything sorted by feet. */
  shadow: 0,
  /** Ground decals like the swipe telegraph, above shadows. */
  groundFx: 0.5,
  /** Nudge that puts the tube just in front of or behind the player. */
  tubeNudge: 0.01,
  /** Nudge that puts the attuning pulse just in front of the tube. */
  attuneNudge: 0.005,
  /** Nudge that puts a burn flame just in front of the enemy it's on. */
  flameNudge: 0.01,
  /** Health bars, sparkles and popups over the world. */
  worldUi: 100_000,
  /** Build mode's spread fan over the tube socket, just under the build arrows. */
  spreadFan: 99_998,
  /** The HUD, above the world. */
  hud: 1_000_000,
  /** The crafting menu, above the HUD. */
  menu: 2_000_000,
} as const;

/** A node's sprite bottom sits this far below its position (the centre of its feet box), px. */
export const NODE_SPRITE_DROP = 5;

/** Bombs draw this far above their arc height, so they leave the hand at tube height, px. */
export const BOMB_LIFT = 10;

/** The flame over a burning enemy sits this far above its feet, px. */
export const BURN_FLAME_HEIGHT = 30;

