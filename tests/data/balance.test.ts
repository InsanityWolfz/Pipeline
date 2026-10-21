import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef, lobAmmo, mineAmmo, straightAmmo } from '../../src/data/ammo';
import { BULWARK } from '../../src/data/bulwark';
import { enemyDef, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { AFFIXES, MIN_DAMAGE_SHARE, MOVE_BONUS_CAP, ROLL_COOLDOWN_FLOOR, SLOT_BASE } from '../../src/data/gear';
import { HEALING, HIT_INVULN_TICKS, INVULN_TICKS, MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, ROLL_TICKS } from '../../src/data/player';
import { RELICS } from '../../src/data/relics';
import { RING_SCALE } from '../../src/data/ringScale';
import { roundBase } from '../../src/data/tags';
import { CLUSTER, COLD, SPLIT } from '../../src/data/tags';
import { SHATTERPOINT, TALENTS } from '../../src/data/talents';
import { defOf } from '../../src/sim/champions';
import { WORLD } from '../../src/sim/world';

// 041's balance pass as data: per-hit damage in the target order (landmine > arrow >
// ley bolt ≈ bomb) at unchanged fire rates, children and Frost untouched, and the
// player's survival numbers exactly as before.

describe('per-hit damage (041)', () => {
  it('arrow 14, ley bolt 9, bomb 12, landmine 60', () => {
    expect(straightAmmo('arrow').damage).toBe(14); // was 10
    expect(straightAmmo('ley-bolt').damage).toBe(9); // was 14
    expect(lobAmmo('bomb').burstDamage).toBe(12); // was 15
    expect(mineAmmo('landmine').damage).toBe(60);
  });

  it('every tagged round follows its base', () => {
    const hit = (id: string): number => {
      const d = ammoDef(id);
      return d.kind === 'lob' ? d.burstDamage : d.damage;
    };
    const tagged = Object.keys(AMMO).filter((id) => id.includes('+'));
    expect(tagged.length).toBeGreaterThan(0);
    for (const id of tagged) expect(hit(id), id).toBe(hit(roundBase(id)));
    expect(hit('arrow+frost')).toBe(14);
    expect(hit('bomb+frost')).toBe(12);
    expect(hit('bomb+cluster')).toBe(12);
    expect(hit('ley-bolt+homing')).toBe(9);
    expect(hit('ley-bolt+split')).toBe(9);
    expect(hit('landmine+frost')).toBe(60);
  });

  it('fire rates are unchanged: 15, 20, 40 and 40 ticks', () => {
    expect([ammoDef('arrow').fireTicks, ammoDef('ley-bolt').fireTicks, ammoDef('bomb').fireTicks, ammoDef('landmine').fireTicks]).toEqual([15, 20, 40, 40]);
  });

  it('children and Frost (041.1): a Split Shard half the bolt (054, was 4), a Bomblet 8, Shatterpoint’s Shards half the bolt; 4 Chill to Freeze, 90 ticks, a boss 45', () => {
    expect(SPLIT.damageShare).toBe(0.5);
    expect(CLUSTER.damage).toBe(8);
    expect(SHATTERPOINT.shardScale).toBe(0.5);
    expect(COLD).toEqual({ chillPerHit: 1, slowPerStack: 0.15, stacksToFreeze: 4, stackTicks: 120, freezeTicks: 90, bossFreezeTicks: 45, refreezeTicks: 120 });
  });
});

describe('survival is unchanged (041)', () => {
  it('the player: 100 HP, the roll and its i-frames, the hit invulnerability and the healing rates', () => {
    expect(MAX_HEALTH).toBe(100);
    expect({ ROLL_DISTANCE, ROLL_TICKS, INVULN_TICKS, ROLL_COOLDOWN_TICKS, HIT_INVULN_TICKS }).toEqual({ ROLL_DISTANCE: 96, ROLL_TICKS: 18, INVULN_TICKS: 12, ROLL_COOLDOWN_TICKS: 30, HIT_INVULN_TICKS: 30 });
    expect(HEALING).toEqual({ foundry: 50, pylon: 10, spring: 10, fieldRegen: 0, afterHitDelay: 0 });
  });

  it('gear: base armor, every affix range, the caps and the damage floor', () => {
    expect(SLOT_BASE).toEqual({
      helm: { min: 1, max: 2 },
      boots: { min: 1, max: 2 },
      trinket: { min: 0, max: 0 },
      body: { light: { min: 5, max: 7, walkScale: 1 }, heavy: { min: 10, max: 13, walkScale: 0.85 } },
    });
    expect(AFFIXES).toEqual({
      'max-health': { stat: 'max-health', op: 'flat', min: 8, max: 20, step: 1 },
      armor: { stat: 'armor', op: 'flat', min: 1, max: 3, step: 1 },
      regen: { stat: 'field-regen', op: 'flat', min: 3, max: 8, step: 0.1 },
      'move-speed': { stat: 'move-speed', op: 'add', min: 3, max: 6, step: 0.01 },
      'roll-cooldown': { stat: 'roll-cooldown', op: 'add', min: -20, max: -10, step: 0.01 },
      'roll-distance': { stat: 'roll-distance', op: 'add', min: 8, max: 16, step: 0.01 },
    });
    expect({ MOVE_BONUS_CAP, ROLL_COOLDOWN_FLOOR, MIN_DAMAGE_SHARE }).toEqual({ MOVE_BONUS_CAP: 0.15, ROLL_COOLDOWN_FLOOR: -0.5, MIN_DAMAGE_SHARE: 0.25 });
  });

  it('the survival talents and the relics’ lines', () => {
    expect(['s1', 's2', 's3', 's4', 't2'].map((id) => TALENTS[id]?.lines)).toEqual([
      [{ scope: 'you', stat: 'max-health', op: 'flat', value: 15 }],
      [{ scope: 'you', stat: 'field-regen', op: 'flat', value: 0.5 }],
      [{ scope: 'you', stat: 'armor', op: 'flat', value: 3 }],
      [{ scope: 'you', stat: 'move-speed', op: 'add', value: 0.05 }],
      [{ scope: 'you', stat: 'firing-walk', op: 'add', value: 0.1 }],
    ]);
    expect(RELICS.map((r) => [r.id, r.lines])).toEqual([
      ['rollbreaker-greaves', [{ scope: 'you', rule: 'roll-stun', creates: 'stun', params: { duration: 40 } }]],
      ['wardstone-circlet', [{ scope: 'you', rule: 'ward', params: { ward: 360 } }]],
      [
        'featherplate',
        [
          { scope: 'you', rule: 'no-heavy-slow', params: { walk: 1 } },
          { scope: 'you', stat: 'roll-distance', op: 'mul', value: 0.75 },
        ],
      ],
      ['last-ember', [{ scope: 'you', rule: 'last-stand', params: { health: 1, invuln: 60 } }]],
    ]);
  });
});

describe('ring scaling (041)', () => {
  /** Max health and the one attack's damage, through the def function, for a ring and champion. */
  const row = (enemyId: string, ring: 0 | 1 | 2 | 3, champion = false): [number, number] => {
    const d = defOf({ enemyId, ring, champion: champion ? { name: 'x' } : null });
    const hit = d.kind === 'melee' ? d.swipe.damage : d.kind === 'caster' ? d.cast.orbDamage : d.kind === 'charger' ? d.charge.damage : d.kind === 'burrower' ? d.burrow.damage : d.kind === 'shardback' ? d.bash.damage : d.kind === 'sniper' ? d.snipe.damage : NaN;
    return [d.maxHealth, hit];
  };

  it('RING_SCALE: ×1, ×1, ×1.6, ×2.5 on health and damage, separate fields', () => {
    expect(RING_SCALE).toEqual({ 0: { health: 1, damage: 1 }, 1: { health: 1, damage: 1 }, 2: { health: 1.6, damage: 1.6 }, 3: { health: 2.5, damage: 2.5 } });
  });

  it('gives the spec’s table, champion column included', () => {
    const table: [string, 0 | 1 | 2 | 3, [number, number], [number, number]][] = [
      ['husk', 1, [40, 20], [60, 26]],
      ['husk', 2, [64, 32], [96, 42]],
      ['wisp', 2, [32, 19], [48, 25]],
      ['charger', 3, [125, 63], [188, 81]],
      ['burrower', 3, [88, 55], [131, 72]],
      ['shardback', 3, [175, 50], [263, 65]],
      ['sniper', 3, [75, 70], [113, 91]],
    ];
    for (const [id, ring, plain, champ] of table) {
      expect(row(id, ring), `${id} ring ${ring}`).toEqual(plain);
      expect(row(id, ring, true), `${id} ring ${ring} champion`).toEqual(champ);
    }
  });

  it('bosses keep their own numbers in any ring, and are never champions', () => {
    for (const id of ['pylon-warden', 'bulwark']) for (const ring of [0, 1, 2, 3] as const) expect(defOf({ enemyId: id, ring, champion: null }), id).toBe(enemyDef(id));
  });
});

describe('the Bulwark (041)', () => {
  const B = BULWARK;

  it('has 3,800 HP (041.16: under its raised ceiling of about 5,000); its lob and pound are as before', () => {
    expect(B.maxHealth).toBe(3800); // was 900
    expect(B.lob).toMatchObject({ cooldownTicks: 240, windupTicks: 30, count: 3, damage: 25 });
    expect(B.pound).toMatchObject({ windupTicks: 60, damage: 35, cooldownTicks: 300 });
  });

  it('enrages below 30%, punishes circling with a rear stomp, and calls a Shardback and a Charger at 50%', () => {
    // 041.7 tuning: the enrage turns 110°/s (spec 70) and the stomp comes after 120 ticks behind (spec 180).
    expect(B.enrage).toMatchObject({ below: 0.3, roarTicks: 60, turnDegPerSec: 110, lobCooldownTicks: 160, rollProofLobs: true });
    // 041.12 (Shaun): the pound's shockwave and the enraged lobs ignore a roll's i-frames.
    expect(B.pound.rollProof).toBe(true);
    expect(B.stomp).toEqual({ range: 160, behindTicks: 120, behindDecay: 2, windupTicks: 40, swipeTicks: 8, radius: 96, arcDegrees: 180, damage: 30, knockback: 40, knockTicks: 8, recoverTicks: 40, cooldownTicks: 360 });
    // 041.16 (Shaun): a new pair about every 20 s after the first (25 s, tuned).
    expect(B.adds).toEqual({ below: 0.5, enemies: ['shardback', 'charger'], riseTicks: 60, minDistance: 96, everyTicks: 1500, maxAlive: 4 });
    for (const id of B.adds.enemies) expect(enemyDef(id).boss, id).toBe(false);
  });

  it('every one of its attacks (lob, pound, stomp, back wave) winds up at least MIN_TELEGRAPH_TICKS, enraged too (041.16)', () => {
    for (const windup of [B.lob.windupTicks, B.pound.windupTicks, B.stomp.windupTicks, B.wave.windupTicks]) expect(windup).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
    for (const [k, windup] of Object.entries(B.enrage.windups)) expect(windup, k).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
    // Enraged, each is shorter or as short (never longer).
    const w = B.enrage.windups;
    expect([w.pound <= B.pound.windupTicks, w.lob <= B.lob.windupTicks, w.stomp <= B.stomp.windupTicks, w.wave <= B.wave.windupTicks, w.fuse <= B.lob.fuseTicks]).toEqual([true, true, true, true, true]);
  });

  it('its add tiles are open floor inside the arena, the first two either side of its start, more than a pair (041.17)', () => {
    const A = HOLLOWS.arena;
    const rows = WORLD[OVERWORLD_ROOM]?.rows ?? [];
    expect(A.addTiles.length).toBeGreaterThan(B.adds.enemies.length);
    for (const t of A.addTiles) {
      expect(t.tx >= A.inside.x0 && t.tx <= A.inside.x1 && t.ty >= A.inside.y0 && t.ty <= A.inside.y1, `${t.tx},${t.ty}`).toBe(true);
      expect(WALKABLE.includes(rows[t.ty]?.[t.tx] ?? TILE.wall), `${t.tx},${t.ty}`).toBe(true);
    }
    expect(A.addTiles.slice(0, 2).map((t) => Math.sign(t.tx - A.start.tx)).sort()).toEqual([-1, 1]);
  });
});
