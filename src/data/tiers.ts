// Material tiers (062): a round is stone (today's rounds) or made from a better material, which hits harder and is
// otherwise the stone round. A tier is a third slot on a round beside its element and shape, never a tag: it gives no
// keyword, so talents, keywords and relics reach a tiered round by its family, as they reach the stone one. Its id is
// a `+` segment straight after the base (`arrow+steel`, `arrow+steel+frost`). Numbers are proposals; tune in playtest.

/** A material tier past stone. */
export type TierId = 'steel' | 'glass';

/** A round's tier: stone, or a material tier. */
export type Tier = 'stone' | TierId;

export interface TierDef {
  id: TierId;
  /** Put before the round's name: "Steel arrow", "Glass ley bolt". */
  prefix: string;
  /** The base ammo it applies to. */
  appliesTo: readonly string[];
}

export const TIERS: Readonly<Record<TierId, TierDef>> = {
  steel: { id: 'steel', prefix: 'Steel', appliesTo: ['arrow', 'bomb', 'landmine'] },
  glass: { id: 'glass', prefix: 'Glass', appliesTo: ['ley-bolt'] },
};

/** A tiered round's damage, × its stone version's, on every hit it makes (direct hits, Shards, Bursts, Bomblets, mines). */
export const TIER_DAMAGE: Readonly<Record<TierId, number>> = { steel: 1.6, glass: 1.6 };

/** Whether an id segment is a material tier. */
export const isTierId = (id: string): id is TierId => Object.hasOwn(TIERS, id);
