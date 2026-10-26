import { SPRITES } from './assets';
import { MINE_SPRITES } from './mineAssets';

// Asset keys for 062's material tiers: the tier parts' icons, and each plain tiered round's projectile in flight (and
// the steel landmine lying armed), recoloured from its stone one (src/data/art/tiers.ts). A tiered round's icon is
// ROUND_ICONS' (src/data/stageAssets.ts). Render draws by these keys.

export const TIER_SPRITES = {
  itemLeySteel: 'item-ley-steel',
  itemLeyGlass: 'item-ley-glass',
  itemSteelArrowhead: 'item-steel-arrowhead',
  itemSteelCasing: 'item-steel-casing',
  itemSteelPlate: 'item-steel-plate',
  arrowSteel: 'arrow-steel',
  bombSteel: 'bomb-steel',
  landmineSteel: 'landmine-steel',
  landmineArmedSteel: 'landmine-armed-steel',
  leyBoltGlass: 'ley-bolt-glass',
  // 066: the storm tiers' projectiles and the stormsteel landmine lying armed.
  arrowStormsteel: 'arrow-stormsteel',
  bombStormsteel: 'bomb-stormsteel',
  landmineStormsteel: 'landmine-stormsteel',
  landmineArmedStormsteel: 'landmine-armed-stormsteel',
  leyBoltStormGlass: 'ley-bolt-storm-glass',
} as const;

/** A sprite in a tier's colours: its key, and the stone sprite it's recoloured from. */
export interface TierSprite {
  key: string;
  from: string;
}

/** Each plain tiered round's projectile in flight, by its id; its tagged rounds fly as it does (their tag's tint over it). */
export const TIER_PROJECTILES: Readonly<Record<string, TierSprite>> = {
  'arrow+steel': { key: TIER_SPRITES.arrowSteel, from: SPRITES.arrow },
  'bomb+steel': { key: TIER_SPRITES.bombSteel, from: SPRITES.bomb },
  'landmine+steel': { key: TIER_SPRITES.landmineSteel, from: MINE_SPRITES.landmine },
  'ley-bolt+glass': { key: TIER_SPRITES.leyBoltGlass, from: SPRITES.leyBolt },
  'arrow+stormsteel': { key: TIER_SPRITES.arrowStormsteel, from: SPRITES.arrow },
  'bomb+stormsteel': { key: TIER_SPRITES.bombStormsteel, from: SPRITES.bomb },
  'landmine+stormsteel': { key: TIER_SPRITES.landmineStormsteel, from: MINE_SPRITES.landmine },
  'ley-bolt+storm-glass': { key: TIER_SPRITES.leyBoltStormGlass, from: SPRITES.leyBolt },
};

/** The steel (066: and stormsteel) landmine lying armed, by its plain tiered id. */
export const TIER_ARMED: Readonly<Record<string, TierSprite>> = {
  'landmine+steel': { key: TIER_SPRITES.landmineArmedSteel, from: MINE_SPRITES.armed },
  'landmine+stormsteel': { key: TIER_SPRITES.landmineArmedStormsteel, from: MINE_SPRITES.armed },
};
