import { CHAMPIONS } from '../data/champions';
import type { EnemyDef } from '../data/enemies';
import { RING_SCALE, type Ring } from '../data/ringScale';

// An enemy's def as the sim reads it (041.3): its ring's health and damage multipliers,
// then a champion's (032), multiplied and rounded once at the end. A champion is also
// bigger and a little faster, its own movement (035: the charge, the tunnelling) speeding
// up with its walk; timings, reach, knockback, weight, drops and XP are its own. A boss is
// never scaled. Memoised by id, ring and champion, so the same def comes back each time.

/** Scaled defs by base def, at `ring * 2 + champion`. */
const memo = new Map<EnemyDef, EnemyDef[]>();

/** A def scaled for its ring and, if `champion`, as its champion. A boss, or ring ×1 without a champion, is the def itself. */
export function scaledDef(def: EnemyDef, ring: Ring, champion: boolean): EnemyDef {
  const r = RING_SCALE[ring];
  if (def.boss || (!champion && r.health === 1 && r.damage === 1)) return def;
  const slot = ring * 2 + (champion ? 1 : 0);
  let row = memo.get(def);
  if (!row) memo.set(def, (row = []));
  const hit = row[slot];
  if (hit) return hit;
  const health = r.health * (champion ? CHAMPIONS.health : 1);
  const damage = r.damage * (champion ? CHAMPIONS.damage : 1);
  const k = champion ? CHAMPIONS.scale : 1;
  const speed = champion ? CHAMPIONS.speed : 1;
  const base = {
    feetBox: { w: def.feetBox.w * k, h: def.feetBox.h * k },
    hurtbox: { w: def.hurtbox.w * k, h: def.hurtbox.h * k, offsetY: def.hurtbox.offsetY * k },
    maxHealth: Math.round(def.maxHealth * health),
    walkSpeed: def.walkSpeed * speed,
  };
  const out = scaleAttack(def, base, (n) => Math.round(n * damage), speed);
  row[slot] = out;
  return out;
}

/** A def with the base scaled, every attack's damage `dmg`'d and its own movement speeds (035: the charge) × `speed`. */
function scaleAttack(def: EnemyDef, base: Pick<EnemyDef, 'feetBox' | 'hurtbox' | 'maxHealth' | 'walkSpeed'>, dmg: (n: number) => number, speed: number): EnemyDef {
  switch (def.kind) {
    case 'melee':
      return { ...def, ...base, swipe: { ...def.swipe, damage: dmg(def.swipe.damage) } };
    case 'caster':
      return { ...def, ...base, cast: { ...def.cast, orbDamage: dmg(def.cast.orbDamage) } };
    case 'slammer':
      return { ...def, ...base, slam: { ...def.slam, damage: dmg(def.slam.damage) } };
    case 'bulwark':
      return { ...def, ...base, lob: { ...def.lob, damage: dmg(def.lob.damage) }, pound: { ...def.pound, damage: dmg(def.pound.damage) } };
    case 'forgewright':
      return { ...def, ...base, slam: { ...def.slam, damage: dmg(def.slam.damage) }, spray: { ...def.spray, damage: dmg(def.spray.damage) } };
    case 'charger':
      return { ...def, ...base, charge: { ...def.charge, damage: dmg(def.charge.damage), speed: def.charge.speed * speed } };
    case 'burrower':
      return { ...def, ...base, burrow: { ...def.burrow, damage: dmg(def.burrow.damage), speed: def.burrow.speed * speed } };
    case 'shardback':
      return { ...def, ...base, bash: { ...def.bash, damage: dmg(def.bash.damage) } };
    case 'sniper':
      return { ...def, ...base, snipe: { ...def.snipe, damage: dmg(def.snipe.damage) } };
    // 061: its pool's beats and its death burst scale as its burst does.
    case 'mote':
      return { ...def, ...base, swell: { ...def.swell, damage: dmg(def.swell.damage) }, pool: { ...def.pool, damage: dmg(def.pool.damage) }, deathBurst: { ...def.deathBurst, damage: dmg(def.deathBurst.damage) } };
    // 061: its heal scales as damage does (ring and champion), so it keeps pace with the health it repairs.
    case 'tender':
      return { ...def, ...base, beam: { ...def.beam, heal: dmg(def.beam.heal) } };
    case 'golem':
      return { ...def, ...base, slam: { ...def.slam, damage: dmg(def.slam.damage) } };
    case 'hound':
      return { ...def, ...base, dash: { ...def.dash, damage: dmg(def.dash.damage), speed: def.dash.speed * speed }, trail: { ...def.trail, damage: dmg(def.trail.damage) } };
  }
}
