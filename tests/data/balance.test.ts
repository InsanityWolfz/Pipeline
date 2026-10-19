import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef, lobAmmo, mineAmmo, straightAmmo } from '../../src/data/ammo';
import { AFFIXES, MIN_DAMAGE_SHARE, MOVE_BONUS_CAP, ROLL_COOLDOWN_FLOOR, SLOT_BASE } from '../../src/data/gear';
import { HEALING, HIT_INVULN_TICKS, INVULN_TICKS, MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, ROLL_TICKS } from '../../src/data/player';
import { RELICS } from '../../src/data/relics';
import { roundBase } from '../../src/data/tags';
import { CLUSTER, COLD, SPLIT } from '../../src/data/tags';
import { SHATTERPOINT, TALENTS } from '../../src/data/talents';

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

  it('children and Frost are unchanged (041.1): a Shard 4, a Bomblet 8, Shatterpoint’s Shards half the bolt; 4 Chill to Freeze, 90 ticks, a boss 45', () => {
    expect(SPLIT.damage).toBe(4);
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
