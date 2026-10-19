import { CHAMPIONS } from '../data/champions';
import { enemyDef, type EnemyDef } from '../data/enemies';
import type { EnemyState } from './enemies';
import { nextFloat, nextInt, type RngState } from './rng';

// Champions (032): a rule over enemy data, so any non-boss enemy, including ones added
// later, can be one with no new code. The sim reads an enemy's def through `defOf`,
// which scales a champion's size, health, damage and speed; timings and reach stay its own,
// so every attack still reads and dodges the same. Its own movement (035: the Charger's
// charge, the Burrower's tunnelling) speeds up with its walk.

const scaled = new Map<string, EnemyDef>();

/** A def as its champion: 1.5× feet box and hurtbox, more health, harder hits, a little faster. Memoised by id. */
export function championDef(def: EnemyDef): EnemyDef {
  const hit = scaled.get(def.id);
  if (hit) return hit;
  const k = CHAMPIONS.scale;
  const dmg = (n: number) => Math.round(n * CHAMPIONS.damage);
  const base = {
    feetBox: { w: def.feetBox.w * k, h: def.feetBox.h * k },
    hurtbox: { w: def.hurtbox.w * k, h: def.hurtbox.h * k, offsetY: def.hurtbox.offsetY * k },
    maxHealth: Math.round(def.maxHealth * CHAMPIONS.health),
    walkSpeed: def.walkSpeed * CHAMPIONS.speed,
  };
  const out = scaleAttack(def, base, dmg);
  scaled.set(def.id, out);
  return out;
}

/** A def with the base scaled, every attack's damage `dmg`'d and its own movement speeds (035: the charge) sped up like its walk. */
function scaleAttack(def: EnemyDef, base: Pick<EnemyDef, 'feetBox' | 'hurtbox' | 'maxHealth' | 'walkSpeed'>, dmg: (n: number) => number): EnemyDef {
  switch (def.kind) {
    case 'melee':
      return { ...def, ...base, swipe: { ...def.swipe, damage: dmg(def.swipe.damage) } };
    case 'caster':
      return { ...def, ...base, cast: { ...def.cast, orbDamage: dmg(def.cast.orbDamage) } };
    case 'slammer':
      return { ...def, ...base, slam: { ...def.slam, damage: dmg(def.slam.damage) } };
    case 'bulwark':
      return { ...def, ...base, lob: { ...def.lob, damage: dmg(def.lob.damage) }, pound: { ...def.pound, damage: dmg(def.pound.damage) } };
    case 'charger':
      return { ...def, ...base, charge: { ...def.charge, damage: dmg(def.charge.damage), speed: def.charge.speed * CHAMPIONS.speed } };
  }
}

/** The def the sim reads for an enemy: its champion's for a champion. */
export function defOf(e: Pick<EnemyState, 'enemyId' | 'champion'>): EnemyDef {
  const def = enemyDef(e.enemyId);
  return e.champion ? championDef(def) : def;
}

/** Makes an enemy a champion, named from its list with the RNG, at its champion's full health. */
export function makeChampion(rng: RngState, e: EnemyState): void {
  const names = CHAMPIONS.names[e.enemyId] ?? [enemyDef(e.enemyId).name];
  e.champion = { name: names[nextInt(rng, 0, names.length - 1)] ?? enemyDef(e.enemyId).name };
  e.health = championDef(enemyDef(e.enemyId)).maxHealth;
}

/**
 * A pack spawning in `ring` rolls once against the ring's chance; on a hit, one member that isn't a boss, picked by
 * the RNG, becomes a champion. Returns it, or null.
 */
export function rollChampions(rng: RngState, members: readonly EnemyState[], ring: number): EnemyState | null {
  const chance = CHAMPIONS.chanceByRing[ring] ?? 0;
  // An empty pack (a spring's, a claimed site's) or one of only bosses draws nothing.
  if (chance <= 0 || !members.some((e) => !enemyDef(e.enemyId).boss) || nextFloat(rng) >= chance) return null;
  const able = members.filter((e) => !enemyDef(e.enemyId).boss);
  const pick = able[nextInt(rng, 0, able.length - 1)];
  if (!pick) return null;
  makeChampion(rng, pick);
  return pick;
}

/** How many times a champion's drop table is rolled: 2 or 3, with the RNG. */
export const championDropRolls = (rng: RngState): number => nextInt(rng, CHAMPIONS.dropRolls[0], CHAMPIONS.dropRolls[1]);
