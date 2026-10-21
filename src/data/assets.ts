// Asset keys. Render code loads and draws by these keys, never string literals.
import { enemyAnims, type EnemyAnims } from './enemyAnims';
import { HOLLOWS_ENEMY_ANIMS } from './hollowsEnemyAssets';

/** Vector frames drawn at boot (016): one texture of shelf-packed canvas pages, holding every sprite frame by name. */
export const VECTOR_KEY = 'vectors';

/** The wanderer's canvas, redrawn every frame (016). */
export const WANDERER_KEY = 'wanderer';

/** The title screen's painted scene (042), drawn once at the screen's scale. */
export const TITLE_SCENE_KEY = 'title-scene';

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
  /** The fist the tube slot shows when the next press is a punch (025). */
  hudFist: 'hud-fist',
  iconArrow: 'icon-arrow',
  itemHuskResin: 'item-husk-resin',
  itemWood: 'item-wood',
  itemStone: 'item-stone',
  itemFiber: 'item-fiber',
  itemShadow: 'item-shadow',
  /** The HP bar's carved frame (031: bottom-left, larger), its healing glow, the shield by the armor value and the at-risk mark. */
  hudHealth: 'hud-health',
  hudHealthGlow: 'hud-health-glow',
  hudShield: 'hud-shield',
  hudWarn: 'hud-warn',
  /** The inventory panel's tablet and title card (031). */
  /** 039: the panel's tablet in two halves, left and right, so each fits a texture page at the largest scale. */
  inventoryTitle: 'inventory-title',
  iconBomb: 'icon-bomb',
  iconLeyBolt: 'icon-ley-bolt',
  itemLeyCrystal: 'item-ley-crystal',
  itemShaft: 'item-shaft',
  itemArrowhead: 'item-arrowhead',
  itemRope: 'item-rope',
  itemCasing: 'item-casing',
  itemFuse: 'item-fuse',
  itemLeyDust: 'item-ley-dust',
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
  /** The crafting menu's own rows (026): taller, for a name under each icon. */
  craftRecipeRow: 'craft-recipe-row',
  craftRecipeRowHover: 'craft-recipe-row-hover',
  craftRecipeRowPress: 'craft-recipe-row-press',
  craftArrow: 'craft-arrow',
  hudAmmoCell: 'hud-ammo-cell',
  hudAmmoSelect: 'hud-ammo-select',
  /** The gold ring that pulses over a build-bar cell the current objective names (027). */
  buildPulse: 'build-pulse',
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
  'rime-outcrop': nodeFrames('rime-outcrop', 3, 3),
  'ley-iron-seam': nodeFrames('ley-iron-seam', 3, 3),
  'resin-seep': nodeFrames('resin-seep', 3, 3),
};

/** The tube slot's frame (025) by how many rounds it shows: one for a carried round or the fist, up to one per intake entrance for a volley. */
export const TUBE_SLOT_FRAMES = ['hud-tube-slot-1', 'hud-tube-slot-2', 'hud-tube-slot-3'] as const;

/** The tube slot frame for `units` rounds (clamped to the frames there are). */
export function tubeSlotFrame(units: number): string {
  const i = Math.min(Math.max(units, 1), TUBE_SLOT_FRAMES.length) - 1;
  return TUBE_SLOT_FRAMES[i] ?? TUBE_SLOT_FRAMES[0];
}

/** An animation: the sprite grid `key` with `frames` frames (`key/0`..), or a single frame `key`. */
export interface AnimDef {
  key: string;
  frames: number;
  /** Frames per second. */
  frameRate: number;
  loop: boolean;
}

// Enemy animation sets are built in enemyAnims.ts (their poses, views and frame counts).
export type { EnemyAnim, EnemyAnims, ExtraPose } from './enemyAnims';

/** Animation sets by the `anims` key in src/data/enemies.ts. */
export const ENEMY_ANIMS: Readonly<Record<string, EnemyAnims>> = {
  husk: enemyAnims('husk'),
  wisp: enemyAnims('wisp'),
  warden: enemyAnims('warden', true),
  bulwark: enemyAnims('bulwark', true, ['turn', 'lob', 'throw', 'block', 'roar', 'brace', 'stomp']),
  ...HOLLOWS_ENEMY_ANIMS,
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

/** Frame names for an animation. */
export function animFrames(anim: AnimDef): string[] {
  return anim.frames === 1 ? [anim.key] : Array.from({ length: anim.frames }, (_, i) => `${anim.key}/${i}`);
}

/** Enemy effects drawn in the world. Colours are palette ids. */
export const ENEMY_FX = {
  /** Fill colour of a hit flash (the palette's white). */
  flashColor: 'snow',
  /** 042.10: with Flashes off, a hit flash is this short multiply tint instead of white. */
  dimFlashColor: 'rock-light',
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

/**
 * The punch's swoosh (023): a pale slice from the feet at the punch's real reach
 * and arc, with a brighter rim, drawn over the player and anything in reach, fading
 * out over `ms`. Colours are palette ids.
 */
export const MELEE_SWOOSH = {
  color: 'rock-pale',
  fillAlpha: 0.3,
  rimWidth: 2,
  rimAlpha: 0.9,
  ms: 180,
} as const;

/** Player hit feedback, in sim ticks of hit invulnerability. */
export const PLAYER_HIT_FX = {
  /** The hit pose shows for the first this-many ticks of a hit. */
  poseTicks: 8,
  /** While invulnerable the player flashes white and back every this-many ticks, starting white. */
  flickerTicks: 4,
  flashColor: 'snow',
} as const;

/**
 * The foundry tutorial's "+ shaft" (027) when a machine first makes its part: its text before the item's name
 * (in lower case), how far above the machine's top it starts, how far it rises and how long it lasts. 031: one that
 * would overlap a live popup starts `stackGap` px above its top, and the same machine and item within `mergeMs`
 * merge into one popup with a count (`countPrefix` before it: "+ shaft ×2"). Each popup keeps room for a count up to
 * `reserveCount`, so a merge never widens it onto a neighbour.
 */
export const MADE_POPUP = { prefix: '+ ', above: 2, rise: 12, durationMs: 1200, stackGap: 2, mergeMs: 1500, countPrefix: ' ×', reserveCount: 99 } as const;

/** The KO fade, each way, ms. */
export const KO_FADE_MS = 250;

/** A ground item's sprite bottom sits this far below its ground point, so it rests on its shadow, px. */
export const GROUND_ITEM_LIFT = 3;

/** Textures drawn at runtime (014): the soft glow and the vignette; the low-HP edges (031), white to be tinted. */
export const FX_TEXTURES = { glow: 'fx-glow', vignette: 'fx-vignette', lowHp: 'fx-low-hp' } as const;

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
  /** Nudge that puts an overlay (a Husk's resin, the Warden's core, the ice on a frozen enemy) just in front of the enemy it's on. */
  overlayNudge: 0.01,
  /** Health bars, sparkles and popups over the world. */
  worldUi: 100_000,
  /** The mouse-over name (015), over a piece's readout. */
  hoverName: 100_012,
  /** 045: a cache's item bursting out, over everything standing (the player too), under its name and the slide-ins. */
  burstItem: 99_996,
  /** 045: a bursting item's name, over the bursting items. */
  burstName: 99_997,
  /** A picked-up item sliding into the player (021): under the pickup sparkle at worldUi - 1 and the "+1" popup. */
  slideItem: 99_998,
  /** Tutorial key prompts, over other world UI. */
  prompt: 100_005,
  /** The claimed pylon's tendril and the motes on the ley line (018): over everything standing in the world, under world UI. */
  supplyLine: 99_990,
  /** Soft ley light pooled on the floor (014), over shadows and under anything standing. */
  glow: 0.25,
  /** Drifting motes, over the world. */
  motes: 99_000,
  /** A room's dusk tint and vignette, over the world and under the HUD. */
  mood: 500_000,
  /** The low-HP red screen edges (031), over the mood and under the HUD and menus. */
  lowHp: 900_000,
  /** The HUD, above the world. */
  hud: 1_000_000,
  /** The crafting menu, above the HUD. */
  menu: 2_000_000,
  /** 042's title screen, under the menu rows: its painted scene, the pipe's glow, the motes, the logo's glow, the logo. */
  titleScene: 1_999_990,
  titlePipe: 1_999_991,
  titleMotes: 1_999_992,
  titleGlow: 1_999_993,
  titleLogo: 1_999_994,
  /** 042's flow screens over the game, bottom to top: the end card, Settings, a confirm or farewell card, the note, a notice. */
  flowEndCard: 2_000_006,
  flowSettings: 2_000_010,
  flowCard: 2_000_020,
  flowNote: 2_000_030,
  flowNotice: 2_000_040,
  /** The crosshair and the menu pointer (021), above every menu and HUD layer. Nothing draws over them. */
  cursor: 3_000_000,
} as const;

/** Bombs draw this far above their arc height, so they leave the hand at tube height, px. */
export const BOMB_LIFT = 10;


