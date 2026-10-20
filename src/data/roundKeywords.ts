import { ammoDef, type AmmoDef, type DamageType } from './ammo';
import type { KeywordId } from './keywords';
import { roundTags, tagDef } from './tags';

// A round's keywords (039), derived from its data, never listed by hand: its family (its
// base), its delivery (from `kind`), Pierce, Knockback, Burst for anything lobbed or mined,
// its tags' keywords, and Physical without an element. Children carry their parent's family
// and damage type (039.3), and Shards its Knockback. What content reaches is decided by
// these sets: a line reaches an emission when its scope is one of them.

/** Each base ammo's family keyword. */
export const BASE_FAMILY: Readonly<Record<string, KeywordId>> = { arrow: 'arrow', bomb: 'bomb', 'ley-bolt': 'ley', landmine: 'landmine' };

const DELIVERY: Readonly<Record<AmmoDef['kind'], KeywordId>> = { straight: 'shot', lob: 'lob', mine: 'mine' };

/** A damage type's keyword (they share ids). */
const typeKeyword = (t: DamageType): KeywordId => t;

function familyOf(a: AmmoDef): KeywordId {
  const f = BASE_FAMILY[a.base];
  if (!f) throw new Error(`No family for '${a.base}'`);
  return f;
}

/** The keywords of a shape tag (Homing, Split, Cluster) a round carries; its element shows as its damage type. */
const shapeKeywords = (ammoId: string): KeywordId[] =>
  roundTags(ammoId)
    .map((t) => tagDef(t))
    .filter((t) => t.slot === 'shape')
    .map((t) => t.keyword);

/** A round's keywords in chip order: family, delivery, Pierce, Knockback, Burst, its shape, its damage type. */
export function roundKeywords(ammoId: string): KeywordId[] {
  const a = ammoDef(ammoId);
  const out: KeywordId[] = [familyOf(a), DELIVERY[a.kind]];
  if (a.kind === 'straight' && a.pierce) out.push('pierce');
  if (a.kind === 'straight' && a.knockback > 0) out.push('knockback');
  if (a.kind !== 'straight') out.push('burst');
  return [...out, ...shapeKeywords(ammoId), typeKeyword(a.damageType)];
}

/** A Shard's keywords (039.3): a small Shot of its parent's family and damage type, with its Knockback; a Split's Shards carry Split too. */
export function shardKeywords(parentAmmoId: string, fromSplit: boolean): KeywordId[] {
  const a = ammoDef(parentAmmoId);
  const knock = a.kind === 'straight' && a.knockback > 0 ? (['knockback'] as const) : [];
  return [familyOf(a), 'shot', ...knock, ...(fromSplit ? (['split'] as const) : []), typeKeyword(a.damageType)];
}

/** A Bomblet's keywords: a Burst of its cluster bomb's family and damage type. */
export function bombletKeywords(bombAmmoId: string): KeywordId[] {
  const a = ammoDef(bombAmmoId);
  return [familyOf(a), 'burst', 'cluster', typeKeyword(a.damageType)];
}

/** A Pool-burst's keywords: a Burst of its arrow's family and damage type (039.3: a Frost arrow's is Cold). */
export function poolBurstKeywords(arrowAmmoId: string): KeywordId[] {
  const a = ammoDef(arrowAmmoId);
  return [familyOf(a), 'burst', typeKeyword(a.damageType)];
}
