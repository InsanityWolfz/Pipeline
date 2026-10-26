import { ammoDef } from '../data/ammo';
import { TICK_RATE } from '../data/config';
import { bombletKeywords, poolBurstKeywords, roundKeywords, shardKeywords } from '../data/roundKeywords';
import type { ArrowState } from './arrows';
import { isShard } from './arrows';
import { roundTier } from '../data/tags';
import { statOf, type Emission, type Statted } from './statResolve';

// Emissions (039): what the ammo systems read their stats for, each by its keywords, so
// content reaches it by scope. Children carry their parent's family and damage type. 062: a round, a Split's Shard
// and a Bomblet carry their round's material tier, whose ×damage applies once there; what derives from an
// already-resolved hit (a Pool-burst, Shatter's Shards, burn) never carries it again.

/** The tier field an emission of this round carries: none for stone. */
const tierOf = (ammoId: string): Pick<Emission, 'tier'> => {
  const tier = roundTier(ammoId);
  return tier === 'stone' ? {} : { tier };
};

/** A round from the tube. */
export const roundEmission = (ammoId: string): Emission => ({ keywords: roundKeywords(ammoId), ammo: true, ...tierOf(ammoId) });

/** A shot in flight, round or Shard, by the keywords it carries. */
export const shotEmission = (a: Pick<ArrowState, 'keywords' | 'ammoId'>): Emission => ({ keywords: a.keywords, ammo: true, ...(isShard(a) ? { shard: true as const } : {}) });

/** A Shard from a round (039.3): its family, damage type and Knockback, and Split if a Split made it. */
export const shardEmissionOf = (parentAmmoId: string, fromSplit: boolean): Emission => ({ keywords: shardKeywords(parentAmmoId, fromSplit), ammo: true, shard: true, ...(fromSplit ? tierOf(parentAmmoId) : {}) });

/** A cluster bomb's Bomblet. */
export const bombletEmission = (bombAmmoId: string): Emission => ({ keywords: bombletKeywords(bombAmmoId), ammo: true, ...tierOf(bombAmmoId) });

/** A pooled arrow's Pool-burst (037's Blastfletch). */
export const poolBurstEmission = (arrowAmmoId: string): Emission => ({ keywords: poolBurstKeywords(arrowAmmoId), ammo: true });

/** A round's fire rate, shots a second: its fireTicks' rate with every fire-rate change (and a ramp at its height). */
export const fireRate = (state: Statted, ammoId: string): number => statOf(state, 'fire-rate', roundEmission(ammoId), TICK_RATE / ammoDef(ammoId).fireTicks);

/** Ticks between shots of a round: TICK_RATE over its fire rate. */
export const fireInterval = (state: Statted, ammoId: string): number => TICK_RATE / fireRate(state, ammoId);
