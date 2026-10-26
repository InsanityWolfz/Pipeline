import { HOLLOWS_SPRITES } from './hollowsAssets';
import { MINE_SPRITES } from './mineAssets';
import { SPRITES } from './assets';

// Asset keys for 062's material tiers: the tier parts' icons. Render draws by these keys.

export const TIER_SPRITES = {
  itemLeySteel: HOLLOWS_SPRITES.itemLeyIron,
  itemLeyGlass: SPRITES.itemLeyDust,
  itemSteelArrowhead: SPRITES.itemArrowhead,
  itemSteelCasing: SPRITES.itemCasing,
  itemSteelPlate: MINE_SPRITES.itemIronPlate,
} as const;
