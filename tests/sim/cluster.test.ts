import { describe, expect, it } from 'vitest';
import { CLUSTER, roundName, TAGS, withTag } from '../../src/data/tags';
import { STAGES } from '../../src/data/stages';
import { ammoDef } from '../../src/data/ammo';
import { itemDef } from '../../src/data/items';
import { enemyDef, type BulwarkDef } from '../../src/data/enemies';
import { BLASTFLETCH, TALENT_START } from '../../src/data/talents';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { offerFromOutside } from '../../src/sim/flow';
import { fixtureDef } from '../../src/sim/fixtures';
import type { CrateState, MachineState } from '../../src/sim/pieces';
import { unlockedPieces } from '../../src/sim/placement';
import { applyStage } from '../../src/sim/stages';
import { playerStats } from '../../src/sim/stats';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, HALL, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

// The cluster stage (038): the Cluster die tags bombs `cluster` (a shape) for 1 ley-iron per
// 4 bombs. A cluster bomb bursts as a bomb, then 4 bomblets burst 12 ticks later, 40 px
// round the burst point, for 8 each in 20 px. Bomblets are lobbed bursts: shields never block them.

const DIE = STAGES['cluster-die'];
if (!DIE) throw new Error('no Cluster die');

function holdStill(e: EnemyState): EnemyState {
  e.mode = 'windup';
  e.modeTicks = -10_000;
  return e;
}

/** The meadow with cluster bombs carried and the bomb slot selected. */
function armed(talents: string[] = []): SimState {
  const s = arena();
  s.inventory = { 'bomb+cluster': 4 };
  s.talents = [TALENT_START, ...talents];
  run(s, 1, { selectAmmo: 'bomb' });
  return s;
}

describe('the cluster tag', () => {
  it('is a bomb shape, "Cluster", with its numbers in data', () => {
    expect(TAGS.cluster).toMatchObject({ slot: 'shape', appliesTo: 'bomb', prefix: 'Cluster', behaviour: 'cluster' });
    expect(CLUSTER).toEqual({ delayTicks: 12, count: 4, distance: 40, damage: 8, radius: 20 });
    expect(withTag('bomb', 'cluster')).toBe('bomb+cluster');
    expect(withTag('bomb+cluster', 'cluster')).toBeNull();
    expect(roundName('Bomb', 'bomb+cluster')).toBe('Cluster bomb');
    expect(itemDef('bomb+cluster')).toMatchObject({ name: 'Cluster bomb', kind: 'ammo', group: 'ammo' });
    expect(ammoDef('bomb+cluster')).toMatchObject({ kind: 'lob', base: 'bomb', tags: ['cluster'], burstDamage: 15, burstRadius: 48 });
  });
});

describe('the Cluster die', () => {
  it('makes 4 cluster bombs from 4 bombs and 1 ley-iron in 60 ticks, spending the ley-iron', () => {
    expect(DIE).toMatchObject({ name: 'Cluster die', tag: 'cluster', batch: 4, material: 'ley-iron', materialCount: 1, craftTicks: 60 });
    const s = foundry();
    const m = put<MachineState>(s, 'cluster-die', 6, 5, 'right');
    const crate = put<CrateState>(s, 'crate', 7, 5, 'right');
    m.buffer = { bomb: 4, 'ley-iron': 1 };
    run(s, 1);
    expect(m.crafting).toBe(true);
    const ticks = runUntil(s, (t) => t.events.made.length > 0, 100);
    expect(ticks).toBe(60);
    run(s, 4);
    expect(crate.contents).toEqual({ 'bomb+cluster': 4 });
    expect(m.buffer).toEqual({ bomb: 0, 'ley-iron': 0 });
  });

  it('refuses a cluster bomb (one shape per round) and anything but bombs and ley-iron', () => {
    const s = foundry();
    put<MachineState>(s, 'cluster-die', 6, 5, 'right');
    const offer = (item: string) => offerFromOutside(s.foundry, { tx: 6, ty: 5 }, { tx: 5, ty: 5 }, item);
    expect(offer('bomb+cluster')).toBe(false);
    expect(offer('arrow')).toBe(false);
    expect(offer('bomb')).toBe(true);
    expect(offer('ley-iron')).toBe(true);
  });

  it('sits in the Bombs group and unlocks by hand-applying it to bombs at the bench', () => {
    const s = foundry(false);
    const bench = fixtureDef('identification-bench');
    const at = tileCentre({ tx: bench.tx + 1, ty: bench.ty });
    movePlayer(s, at.x, at.y);
    s.claims.push('shrine');
    s.inventory = { bomb: 4, 'ley-iron': 1 };
    expect(unlockedPieces(s)).not.toContain('cluster-die');
    expect(applyStage(s, 'cluster-die')).toBe(true);
    expect(s.inventory).toMatchObject({ bomb: 0, 'ley-iron': 0, 'bomb+cluster': 4 });
    expect(unlockedPieces(s)).toContain('cluster-die');
    expect(summarize(s).stagesUnlocked).toContain('cluster-die');
  });
});

describe('a cluster bomb', () => {
  it('bursts as a bomb, then 4 bomblets burst 12 ticks later, 40 px round it, the first along its flight', () => {
    const s = armed();
    const at = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    run(s, 1, fireAt(at.x, at.y));
    runUntil(s, (t) => t.events.bursts.length > 0, 100);
    expect(s.events.bursts).toEqual([{ x: at.x, y: at.y, radius: 48 }]);
    expect(s.mines.bomblets).toHaveLength(4);
    run(s, 11);
    expect(s.events.bombletBursts).toEqual([]);
    run(s, 1);
    const spots = s.events.bombletBursts.map((b) => ({ x: Math.round(b.x - at.x), y: Math.round(b.y - at.y), radius: b.radius }));
    expect(spots).toEqual([
      { x: 40, y: 0, radius: 20 },
      { x: 0, y: 40, radius: 20 },
      { x: -40, y: 0, radius: 20 },
      { x: 0, y: -40, radius: 20 },
    ]);
    expect(s.mines.bomblets).toEqual([]);
  });

  it('bomblets hit for 8 within 20 px of where they land, and nothing farther', () => {
    const s = armed();
    const at = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    // Outside the bomb's own 48 px, inside the east bomblet's 20 px; one between two bomblets, outside both.
    const hit = holdStill(placeHusk(s, at.x + 58, at.y));
    const miss = holdStill(placeHusk(s, at.x + 45, at.y + 45));
    run(s, 1, fireAt(at.x, at.y));
    runUntil(s, (t) => t.events.bombletBursts.length > 0, 120);
    expect(hit.health).toBe(HUSK.maxHealth - 8);
    expect(miss.health).toBe(HUSK.maxHealth);
  });

  it("bomblets land through a shield's front", () => {
    const s = armed();
    const at = { x: PLAYER_AT.x + 100, y: PLAYER_AT.y };
    const def = enemyDef('bulwark') as BulwarkDef;
    const e = createEnemy(s.nextEnemyId++, 'bulwark', { x: at.x + 40, y: at.y }, HALL);
    e.angle = Math.PI;
    e.frozen = 10_000;
    s.enemies.push(e);
    run(s, 1, fireAt(at.x, at.y));
    runUntil(s, (t) => t.events.bombletBursts.length > 0, 120);
    // The bomb's own 15 and the east bomblet's 8, both from the front side.
    expect(e.health).toBe(def.maxHealth - 15 - 8);
    expect(s.events.blocked).toEqual([]);
  });

  it("take the bomb lane's damage and Wide Casing's radius, through playerStats", () => {
    const s = armed(['b1', 'b2']);
    expect(playerStats(s).ammo.bombletRadius).toBe(Math.round(CLUSTER.radius * 1.15));
    const at = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    run(s, 1, fireAt(at.x, at.y));
    runUntil(s, (t) => t.events.bombletBursts.length > 0, 120);
    expect(s.events.bombletBursts[0]?.radius).toBe(23);
    expect(s.mines.bomblets).toEqual([]);
    const t = armed(['b1']);
    const e = holdStill(placeHusk(t, at.x + 58, at.y));
    run(t, 1, fireAt(at.x, at.y));
    runUntil(t, (x) => x.events.bombletBursts.length > 0, 120);
    expect(e.health).toBeCloseTo(HUSK.maxHealth - 8 * 1.1);
  });

  it("charges Blastfletch's ground once, from its own burst", () => {
    const s = armed(['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'k1']);
    run(s, 1, fireAt(PLAYER_AT.x + 120, PLAYER_AT.y));
    runUntil(s, (t) => t.events.bombletBursts.length > 0, 120);
    expect(s.nextPoolId).toBe(1);
    expect(BLASTFLETCH.poolTicks).toBeGreaterThan(0);
  });
});
