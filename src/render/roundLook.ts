import { TintModes, type GameObjects } from 'phaser';
import type { DamageType } from '../data/ammo';
import { BURST_TINTS, ROUND_LOOKS } from '../data/stageAssets';
import { roundTags } from '../data/tags';
import { colorOf } from './color';

// How a tagged round and an element's Burst look (029, 039.15): a round takes its tags'
// tint (a Frost bomb, ley bolt or landmine is pale ice, as a frost arrow is), and a Cold
// Burst's flash is tinted frost. No new sprites: the base's art, recoloured.

/** A round's tint from its tags (the last tag with one), or null for none. Shards and unknown ids have none. */
export function roundTint(ammoId: string): number | null {
  const tag = [...roundTags(ammoId)].reverse().find((t) => ROUND_LOOKS[t]?.tint);
  const tint = tag ? ROUND_LOOKS[tag]?.tint : undefined;
  return tint ? colorOf(tint) : null;
}

/** A Burst's flash tint by its damage type, or null to draw it as it is. */
export function burstTint(damageType: DamageType): number | null {
  const tint = BURST_TINTS[damageType];
  return tint ? colorOf(tint) : null;
}

/** Recolours a Burst's flash for its element: screened toward its tint, so a fire-lit flash turns pale frost, not dark. */
export function tintBurst<T extends GameObjects.Image | GameObjects.Sprite>(obj: T, tint: number | null): T {
  if (tint !== null) obj.setTint(tint).setTintMode(TintModes.SCREEN);
  return obj;
}
