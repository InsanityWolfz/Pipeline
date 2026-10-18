// Asset keys. Render code loads and draws by these keys, never string literals.

/** Vector frames drawn at boot (016): one texture of shelf-packed canvas pages, holding every sprite frame by name. */
export const VECTOR_KEY = 'vectors';

/** The wanderer's canvas, redrawn every frame (016). */
export const WANDERER_KEY = 'wanderer';

/** The overworld (017): standing sprites drawn from src/data/art/terrain.ts, its ground chunk textures, and the minimap. */
export const OVERWORLD_SPRITES = {
  trees: ['ow-tree-0', 'ow-tree-1', 'ow-tree-2'],
  rocks: ['ow-rock-0', 'ow-rock-1'],
  ruinStone: 'ow-ruin-stone',
  ruinWall: 'ow-ruin-wall',
  entrance: 'ow-entrance',
  column: 'ow-column',
} as const;
export const OVERWORLD_TEXTURES = { ground: 'ow-ground', safeGlow: 'ow-safe-glow', minimap: 'ow-minimap' } as const;

/** Frame names for single-frame sprites (vector shape data in src/data/art). */
export const SPRITES = {
  leyCrystal: 'ley-crystal',
  floor: 'floor-flag',
  wall: 'wall',
  ruinBlock: 'ruin-block',
  arrow: 'arrow',
  arrowShadow: 'arrow-shadow',
  crosshair: 'crosshair',
  /** The arrow pointer shown instead of the crosshair over menus and the build bar (021). */
  pointer: 'pointer',
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
  itemUnidentifiedArmor: 'item-unidentified-armor',
  iconArmorLight: 'icon-armor-light',
  iconArmorHeavy: 'icon-armor-heavy',
  emblemIdentify: 'emblem-identify',
  leyBolt: 'ley-bolt',
  leyBoltShadow: 'ley-bolt-shadow',
  bomb: 'bomb',
  bombShadow: 'bomb-shadow',
  craftPanel: 'craft-panel',
  craftRow: 'craft-row',
  craftRowHover: 'craft-row-hover',
  /** A menu row's look for a moment after it's pressed (020). */
  craftRowPress: 'craft-row-press',
  craftArrow: 'craft-arrow',
  hudAmmoCell: 'hud-ammo-cell',
  hudAmmoSelect: 'hud-ammo-select',
} as const;

/**
 * A node type's vector frames (018): `uses[i]` with i + 1 uses left, and `regrow[0]` the bare remains,
 * then each regrow stage. The counts match NODES' uses and REGROW_STAGES (src/data/art/nodes.ts checks).
 */
const nodeFrames = (id: string, uses: number, stages: number) => ({
  uses: Array.from({ length: uses }, (_, i) => `node-${id}-${i + 1}`),
  regrow: Array.from({ length: stages + 1 }, (_, i) => `node-${id}-regrow-${i}`),
});

/** Gathering node frames by node id. */
export const NODE_SPRITES: Readonly<Record<string, { uses: readonly string[]; regrow: readonly string[] }>> = {
  tree: nodeFrames('tree', 3, 3),
  rubble: nodeFrames('rubble', 3, 3),
  reeds: nodeFrames('reeds', 3, 3),
  'ley-vein': nodeFrames('ley-vein', 3, 3),
};

/** Hotbar slot layout, px from the slot's top-left. */
export const HUD_SLOT_LAYOUT = {
  icon: { x: 4, y: 4 },
  /** The count: carried rounds, or the reservoir's once none are carried. */
  count: { x: 25, y: 9 },
  /** Gap below the slot to the bottom of the screen. */
  margin: 6,
  /** Palette id: the slot tint while a dry fire shows. */
  dryFireTint: 'rust',
} as const;

/** An animation: the sprite grid `key` with `frames` frames (`key/0`..), or a single frame `key`. */
export interface AnimDef {
  key: string;
  frames: number;
  /** Frames per second. */
  frameRate: number;
  loop: boolean;
}

const WALK_FRAMES = 4;

/** Enemy animations. `side` faces right; left is drawn flipped. Death has one view. `recover` is optional: without it, a recovering enemy shows idle. */
export type EnemyAnim = `${'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit'}-${'down' | 'up' | 'side'}` | 'death';

/** An enemy's animations: every pose but `recover` is required. */
export type EnemyAnims = Readonly<Record<Exclude<EnemyAnim, `recover-${string}`>, AnimDef>> &
  Readonly<Partial<Record<`recover-${'down' | 'up' | 'side'}`, AnimDef>>>;

const ENEMY_WALK_FPS = 6;
const SWIPE_FPS = 20;
const DEATH_FPS = 8;

function enemyAnims(prefix: string, recover = false): EnemyAnims {
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
    if (recover) out[`recover-${v}`] = anim(`recover-${v}`, 1, 1, true);
  }
  return out as EnemyAnims;
}

/** Animation sets by the `anims` key in src/data/enemies.ts. */
export const ENEMY_ANIMS: Readonly<Record<string, EnemyAnims>> = {
  husk: enemyAnims('husk'),
  wisp: enemyAnims('wisp'),
  warden: enemyAnims('warden', true),
};

/** The sparkle played where an item is picked up. */
export const PICKUP_SPARKLE: AnimDef = { key: 'pickup-sparkle', frames: 4, frameRate: 16, loop: false };

/** A bomb's fire burst, drawn scaled to the burst's real radius. */
export const FIRE_BURST: AnimDef = { key: 'fire-burst', frames: 4, frameRate: 14, loop: false };

/** Ley light spiralling off the player as a pylon sends the haul home (009). */
export const DEPOSIT_SWIRL: AnimDef = { key: 'deposit-swirl', frames: 4, frameRate: 10, loop: false };

/**
 * After a KO (011): the wake-up text shows once the KO fade has played, holds for
 * `holdMs`, then fades over `fadeMs`. `top` is its first line's offset from the
 * screen's centre and `lineStep` the gap between lines, px; it sits on a stone tablet `pad` px round it (020). `title` and
 * `lostTitle` are the words shown.
 */
export const WAKE_TEXT = { holdMs: 3000, fadeMs: 400, top: -24, lineStep: 10, pad: 8, title: 'You wake in the foundry', lostTitle: 'Lost' } as const;

/** A ley burst at the tube's mouth for each projectile fired (008). */
export const MUZZLE_FLASH: AnimDef = { key: 'muzzle-flash', frames: 2, frameRate: 20, loop: false };

/** The flame over a burning enemy. */
export const BURN_FLAME: AnimDef = { key: 'burn-flame', frames: 3, frameRate: 10, loop: true };

/** Frame names for an animation. */
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
  fillColor: 'rust',
} as const;

export const HUD_MATERIALS_LAYOUT = {
  x: 6,
  y: 18,
  /** Vertical step between rows (one item icon tall). */
  rowStep: 16,
  /** Where the count starts, relative to the row's icon. */
  count: { x: 18, y: 6 },
  /** How wide a row counts as HUD for clicks (icon and a two-digit count), px (015). */
  rowWidth: 30,
} as const;

/** Enemy effects drawn in the world. Colours are palette ids. */
export const ENEMY_FX = {
  /** Fill colour of a hit flash (the palette's white). */
  flashColor: 'snow',
  /** The swipe telegraph: a faint arc of the full reach, filling in with the wind-up. */
  telegraphColor: 'rust',
  telegraphAlpha: 0.25,
  telegraphFillAlpha: 0.55,
  /** The Wisp's cast telegraph: a ley ring tightening on it and a faint line along its locked aim (009). */
  castColor: 'cyan',
  castRing: { from: 22, to: 10, width: 2, alphaFrom: 0.4 },
  castLine: { length: 64, width: 2, alpha: 0.5 },
  /** Health bar over a damaged enemy: size, and gap above the sprite's top. */
  healthBar: { w: 20, h: 3, gap: 2, border: 1 },
  healthBarColor: 'rust',
  healthBarBack: 'ink',
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
  flashColor: 'snow',
} as const;

/** The "+1 [icon]" popup on pickup, and the KO fade. */
export const PICKUP_POPUP = { rise: 16, durationMs: 700, gap: 2, stack: 10, startHeight: 44 } as const;
export const KO_FADE_MS = 250;

/** A ground item's sprite bottom sits this far below its ground point, so it rests on its shadow, px. */
export const GROUND_ITEM_LIFT = 3;

/** Textures drawn at runtime (014): the soft glow and the vignette. */
export const FX_TEXTURES = { glow: 'fx-glow', vignette: 'fx-vignette' } as const;

/** Render depths. World sprites sort by the bottom of their footprint (px); these sit around that. */
export const DEPTHS = {
  /** Flat floor tiles, under everything. */
  floor: -1,
  /** Ground shadows, above the floor and under anything sorted by feet. */
  shadow: 0,
  /** Ground decals like the swipe telegraph, above shadows. */
  groundFx: 0.5,
  /** Nudge that puts a tutorial seal just in front of its door. */
  tubeNudge: 0.01,
  /** Nudge that puts a burn flame just in front of the enemy it's on. */
  flameNudge: 0.01,
  /** Health bars, sparkles and popups over the world. */
  worldUi: 100_000,
  /** The mouse-over name (015), over a piece's readout. */
  hoverName: 100_012,
  /** The build bar's hover panel (015), over the bar. */
  buildTip: 1_000_005,
  /** Tutorial key prompts, over other world UI. */
  prompt: 100_005,
  /** The claimed pylon's tendril and the motes on the ley line (018): over everything standing in the world, under world UI. */
  supplyLine: 99_990,
  /** Build mode's spread fans from the stagers facing the intake, just under the build arrows. */
  spreadFan: 99_998,
  /** Soft ley light pooled on the floor (014), over shadows and under anything standing. */
  glow: 0.25,
  /** Drifting motes, over the world. */
  motes: 99_000,
  /** A room's dusk tint and vignette, over the world and under the HUD. */
  mood: 500_000,
  /** The HUD, above the world. */
  hud: 1_000_000,
  /** The crafting menu, above the HUD. */
  menu: 2_000_000,
  /** The crosshair and the menu pointer (021), above every menu and HUD layer. Nothing draws over them. */
  cursor: 3_000_000,
} as const;

/** Bombs draw this far above their arc height, so they leave the hand at tube height, px. */
export const BOMB_LIFT = 10;

/** The flame over a burning enemy sits this far above its feet, px. */
export const BURN_FLAME_HEIGHT = 30;

