import type { DamageType } from '../../data/ammo';
import { AMMO_FX, BOMBLET_FAMILY, PHYSICAL_FALLBACK, SHARD_FAMILY, type AmmoFxTables, type FlashFx, type FxBurst, type ImpactKind, type MarkFx, type ShockFx, type TrailKind } from '../../data/ammoFx';
import { DEPTHS } from '../../data/assets';
import { FX_LOOK, FX_QUALITY } from '../../data/fxQuality';
import type { PARTICLES } from '../../data/juice';
import type { Quality } from '../../data/settings';
import { TAGS } from '../../data/tags';

// 078: a round's look, composed from its rows in AMMO_FX (pure). The family sets the shape (trail kind, impact kind,
// muzzle and base colours), the tier the trail's core and edge and the glints added to impacts and the muzzle, the
// element the trail's colour, its shed bits and the colours added to impacts and blasts; a shape row changes the path
// (homing's long wake) or marks the extra pieces drawn elsewhere (the Split's star, the cluster's bomblets).

const SEP = '+';
const BLASTS: readonly ImpactKind[] = ['blast', 'mine-blast', 'mini-blast'];

export interface RoundLook {
  id: string;
  family: string;
  element: string | null;
  shape: string | null;
  /** `stone`, or the tier's id. */
  tier: string;
  trail: { kind: TrailKind; length: number; width: number; alpha: number; color: string; core: string; edge: string | null; additive: boolean; flicker: number; jitter: number };
  /** Soft bits shed in flight: each at the tier's trail-bit rate, or the fuse smoke's. */
  shed: { burst: FxBurst; rate: 'bits' | 'smoke' }[];
  impact: { kind: ImpactKind; bursts: FxBurst[]; ring?: FlashFx; tick?: FlashFx; star?: FlashFx; shock?: ShockFx & { core: string | null }; mark?: MarkFx; split: boolean; cluster: boolean };
  end: { bursts: readonly FxBurst[]; ring?: FlashFx; ringScale: number } | null;
  muzzle: FxBurst[];
  landing: FxBurst | null;
  /** Turns a second in flight (a landmine's tumble). */
  spin: number;
  /** A hit no round is matched to: today's hit burst for its element. */
  fallback: keyof typeof PARTICLES;
}

/** The look for a family, element, shape and tier. Throws for a row the tables don't have. */
export function composeFx(family: string, element: string | null, shape: string | null, tier: string, tables: AmmoFxTables = AMMO_FX, id = [family, tier, element, shape].filter((s) => s && s !== 'stone').join(SEP)): RoundLook {
  const f = tables.families[family];
  if (!f) throw new Error(`No ammo look for family '${family}'`);
  const e = element === null ? null : tables.elements[element];
  const s = shape === null ? null : tables.shapes[shape];
  const t = tier === 'stone' ? null : tables.tiers[tier];
  if (element !== null && !e) throw new Error(`No ammo look for element '${element}'`);
  if (shape !== null && !s) throw new Error(`No ammo look for shape '${shape}'`);
  if (tier !== 'stone' && !t) throw new Error(`No ammo look for tier '${tier}'`);
  const blast = BLASTS.includes(f.impact.kind);
  const smoke = blast && e?.blast.smoke;
  const familyBursts = f.impact.bursts.map((b) => (smoke && b.role === 'smoke' ? { ...b, colors: smoke } : b));
  const added = e ? (blast ? e.blast.add : e.impact) : [];
  const mark = (blast ? e?.blast.mark : e?.mark) ?? f.impact.mark;
  const star = !blast && e?.star ? e.star : undefined;
  return {
    id,
    family,
    element,
    shape,
    tier,
    trail: {
      ...f.trail,
      color: e?.trail.color ?? f.trail.color,
      core: t?.core ?? e?.trail.core ?? f.trail.core,
      edge: t?.edge ?? null,
      additive: e?.trail.additive ?? f.trail.additive,
      length: f.trail.length * (s?.trailScale ?? 1),
      flicker: e?.trail.flicker ?? 0,
      jitter: e?.trail.jitter ?? 0,
    },
    shed: [...(f.shed ? [{ burst: f.shed, rate: f.shedRate }] : []), ...(e?.shed ? [{ burst: e.shed, rate: 'bits' as const }] : [])],
    impact: {
      kind: f.impact.kind,
      bursts: [...familyBursts, ...added, ...(t?.impact ?? [])],
      ...(f.impact.ring ? { ring: f.impact.ring } : {}),
      ...(f.impact.tick ? { tick: f.impact.tick } : {}),
      ...(star ? { star } : {}),
      ...(f.impact.shock ? { shock: { ...f.impact.shock, core: t?.core ?? null } } : {}),
      ...(mark ? { mark } : {}),
      split: s?.split ?? false,
      cluster: s?.cluster ?? false,
    },
    end: f.end ? { bursts: f.end.bursts, ...(f.end.ring ? { ring: f.end.ring } : {}), ringScale: f.end.ringScale ?? 1 } : null,
    // The element's colour joins each spark's (not the launch smoke's).
    muzzle: [...f.muzzle.map((b) => (e && b.role !== 'smoke' ? { ...b, colors: [...b.colors, e.muzzle] } : b)), ...(t?.muzzle ?? [])],
    landing: f.landing ?? null,
    spin: f.spin ?? 0,
    fallback: e?.fallback ?? PHYSICAL_FALLBACK,
  };
}

/** A round id's family, element, shape and tier, read against the tables' rows (so a new row needs no code). */
function parse(id: string, tables: AmmoFxTables): { family: string; element: string | null; shape: string | null; tier: string } {
  const [family = id, ...rest] = id.split(SEP);
  let element: string | null = null;
  let shape: string | null = null;
  let tier = 'stone';
  for (const seg of rest) {
    if (tables.tiers[seg]) tier = seg;
    else if (tables.elements[seg]) element = seg;
    else if (tables.shapes[seg]) shape = seg;
    else throw new Error(`No ammo look for '${seg}' in '${id}'`);
  }
  return { family, element, shape, tier };
}

const CACHE = new Map<string, RoundLook>();

/** A round's look by its ammo id (cached for the game's tables). */
export function roundFx(id: string, tables: AmmoFxTables = AMMO_FX): RoundLook {
  const cached = tables === AMMO_FX ? CACHE.get(id) : undefined;
  if (cached) return cached;
  const p = parse(id, tables);
  const look = composeFx(p.family, p.element, p.shape, p.tier, tables, id);
  if (tables === AMMO_FX) CACHE.set(id, look);
  return look;
}

/** 054: a burning arrow's look from the tick it caught fire: its round's, with the fire element's trail and embers. */
export function burningFx(id: string): RoundLook {
  const key = `burning|${id}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const p = parse(id, AMMO_FX);
  const look = composeFx(p.family, 'fire', p.shape, p.tier, AMMO_FX, key);
  CACHE.set(key, look);
  return look;
}

/** The element row a damage type comes from (a Cold Shard is frost's), or none for physical. */
export function elementOfDamage(damageType: DamageType): string | null {
  return Object.values(TAGS).find((t) => t.slot === 'element' && t.damageType === damageType)?.id ?? null;
}

/** A Split's Shard: its parent's element (its damage type) and tier. */
export function shardFx(damageType: DamageType, tier: string): RoundLook {
  const element = elementOfDamage(damageType);
  const key = `${SHARD_FAMILY}|${element ?? ''}|${tier}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const look = composeFx(SHARD_FAMILY, element, null, tier, AMMO_FX, key);
  CACHE.set(key, look);
  return look;
}

/** A cluster bomb's bomblet: its bomb's element and tier. */
export function bombletFx(clusterAmmoId: string): RoundLook {
  const key = `${BOMBLET_FAMILY}|${clusterAmmoId}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const p = parse(clusterAmmoId, AMMO_FX);
  const look = composeFx(BOMBLET_FAMILY, p.element, null, p.tier, AMMO_FX, key);
  CACHE.set(key, look);
  return look;
}

/** A burst's count on a tier: Low ×0.5 rounded down (an impact keeps 1), Medium as given, High ×1.25 rounded. */
export function fxCount(count: number, quality: Quality, impact: boolean): number {
  const k = FX_QUALITY[quality].scale;
  const n = k < 1 ? Math.floor(count * k) : Math.round(count * k);
  return impact && count > 0 ? Math.max(1, n) : n;
}

const OFF = new Map<RoundLook, RoundLook>();

/** The look as drawn: with Flashes off (042.10), no 078 flash (ring, tick, star), no flicker and no crackle. */
export function shownLook(look: RoundLook, flashes: boolean): RoundLook {
  if (flashes) return look;
  const cached = OFF.get(look);
  if (cached) return cached;
  const impact = { ...look.impact };
  delete impact.ring;
  delete impact.tick;
  delete impact.star;
  const off: RoundLook = { ...look, trail: { ...look.trail, flicker: 0, jitter: 0 }, impact, end: look.end ? { bursts: look.end.bursts, ringScale: look.end.ringScale } : null };
  OFF.set(look, off);
  return off;
}

/** A burst that outlives a spark lingers: it draws under the telegraphs. */
export const lingers = (b: FxBurst): boolean => b.lifeMs[1] > FX_LOOK.sparkMs;

/** Where a burst draws: lingering bits at `shotTrail`; sparks just behind the enemy struck, else at their ground point. */
export function burstDepth(b: FxBurst, groundY: number, struckDepth: number | null): number {
  if (lingers(b)) return DEPTHS.shotTrail;
  return struckDepth === null ? groundY : struckDepth - FX_LOOK.behind;
}
