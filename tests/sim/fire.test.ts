import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { itemDef } from '../../src/data/items';
import { ammoDef } from '../../src/data/ammo';
import { REVEALING_ITEMS } from '../../src/data/recipes';
import { STAGE_ROWS, STAGES } from '../../src/data/stages';
import { FIRE, TAGS, withTag } from '../../src/data/tags';
import { TALENT_START } from '../../src/data/talents';
import { createArrow } from '../../src/sim/arrows';
import { craft } from '../../src/sim/crafting';
import { damageEnemy, type EnemyState } from '../../src/sim/enemies';
import { roundEmission } from '../../src/sim/emissions';
import { igniteEnemy } from '../../src/sim/fire';
import { fixtureDef } from '../../src/sim/fixtures';
import { leavePool } from '../../src/sim/keystones';
import { unlockedPieces } from '../../src/sim/placement';
import { taggedKnown } from '../../src/sim/stages';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, fireAt, hold, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';
import { foundry } from './foundryKit';

// Fire (060): any round can carry the fire tag. Each fire hit (a round's, a Shard's, a Burst's,
// a Bomblet's, a mine's, a Pool-burst's) sets the enemy burning for FIRE.burnTicks, dealing
// FIRE.burnShare of that hit a second; a new hit restarts it at the stronger burn, never stacking.
// A burning enemy that dies passes its burn to every living enemy within FIRE.spreadRadius.

const FIRE_HIT = { knock: 0, flash: false, damageType: 'fire' } as const;

/** A Husk held where it stands, with health enough to burn for a while. */
function still(s: SimState, x: number, y: number, health = 10_000): EnemyState {
  const e = placeHusk(s, x, y);
  e.mode = 'windup';
  e.modeTicks = -10_000;
  e.health = health;
  return e;
}

const burnHits = (s: SimState) => s.events.hits.filter((h) => h.target === 'enemy' && h.burn);

describe('the fire tag', () => {
  it('is an element for every family, its numbers in data', () => {
    expect(TAGS.fire).toMatchObject({ id: 'fire', slot: 'element', prefix: 'Fire', appliesTo: ['arrow', 'bomb', 'ley-bolt', 'landmine'], keyword: 'fire', damageType: 'fire' });
    expect(FIRE).toEqual({ burnTicks: 180, burnShare: 0.25, spreadRadius: 64 });
  });

  it('makes seven rounds, named and typed from the tag; a round is frost or fire, never both', () => {
    const names = {
      'arrow+fire': 'Fire arrow',
      'bomb+fire': 'Fire bomb',
      'bomb+fire+cluster': 'Fire Cluster bomb',
      'ley-bolt+fire': 'Fire ley bolt',
      'ley-bolt+fire+homing': 'Fire Homing ley bolt',
      'ley-bolt+fire+split': 'Fire Split ley bolt',
      'landmine+fire': 'Fire landmine',
    };
    for (const [id, name] of Object.entries(names)) {
      expect(itemDef(id).name, id).toBe(name);
      expect(ammoDef(id).damageType, id).toBe('fire');
    }
    expect(withTag('arrow+frost', 'fire')).toBeNull();
    expect(withTag('bomb+fire', 'frost')).toBeNull();
    expect(withTag('bomb+cluster', 'fire')).toBe('bomb+fire+cluster');
  });
});

describe('the fire rune', () => {
  it('costs 1 cinderite per 4 rounds, with a row per family', () => {
    expect(STAGES['fire-rune']).toEqual({ id: 'fire-rune', name: 'Fire rune', tag: 'fire', batch: 4, material: 'cinderite', materialCount: 1, craftTicks: 60, shownAfter: 'cinderite' });
    expect(STAGE_ROWS.filter((r) => r.stage === 'fire-rune').map((r) => r.id)).toEqual(['fire-rune-arrow', 'fire-rune-bomb', 'fire-rune-ley-bolt', 'fire-rune-landmine']);
    expect(STAGE_ROWS.find((r) => r.id === 'fire-rune-bomb')?.recipe).toEqual({ id: 'fire-rune-bomb', inputs: { bomb: 4, cinderite: 1 }, output: { itemId: 'bomb+fire', count: 4 } });
  });

  it('its rows show once cinderite has been carried, and crafting a fire round by hand unlocks the rune', () => {
    expect(REVEALING_ITEMS).toContain('cinderite');
    const s = foundry(false);
    const bench = fixtureDef('identification-bench');
    const at = tileCentre({ tx: bench.tx - 1, ty: bench.ty });
    movePlayer(s, at.x, at.y);
    s.claims.push('shrine');
    const row = STAGE_ROWS.find((r) => r.id === 'fire-rune-arrow');
    if (!row) throw new Error('no fire arrow row');
    const frost = STAGE_ROWS.find((r) => r.id === 'frost-rune-arrow');
    if (!frost) throw new Error('no frost arrow row');
    expect(taggedKnown(s, frost)).toBe(true);
    expect(taggedKnown(s, row)).toBe(false);
    s.inventory = { arrow: 4, cinderite: 1 };
    expect(craft(s, 'fire-rune-arrow')).toBe(false);
    run(s, 1);
    expect(s.found).toContain('cinderite');
    expect(taggedKnown(s, row)).toBe(true);
    expect(unlockedPieces(s)).not.toContain('fire-rune');
    expect(craft(s, 'fire-rune-arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ arrow: 0, cinderite: 0, 'arrow+fire': 4 });
    expect(unlockedPieces(s)).toContain('fire-rune');
  });
});

describe('burn', () => {
  it('a fire hit burns for 3 s at 25% of the hit each second, as small burn hits once a second', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    expect(e.health).toBe(10_000 - 20);
    expect([e.burnTicks, e.burnDps]).toEqual([FIRE.burnTicks, 5]);
    run(s, TICK_RATE - 1);
    expect(e.health).toBe(9980);
    run(s, 1);
    expect(e.health).toBe(9975);
    expect(burnHits(s)).toEqual([{ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: 5, damageType: 'fire', burn: true }]);
    run(s, TICK_RATE * 2);
    expect(e.health).toBe(9965);
    expect([e.burnTicks, e.burnDps]).toEqual([0, 0]);
    run(s, TICK_RATE * 2);
    expect(e.health).toBe(9965);
  });

  it('a new fire hit restarts the timer and keeps the stronger burn; burns never stack', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 40, 0, 0, FIRE_HIT);
    run(s, 100);
    expect(e.health).toBe(10_000 - 40 - 10);
    // A weaker hit: the timer restarts, the burn stays at 10 a second.
    damageEnemy(s, e, 8, 0, 0, FIRE_HIT);
    expect([e.burnTicks, e.burnDps]).toEqual([FIRE.burnTicks, 10]);
    // A stronger one: 15 a second, still one burn.
    damageEnemy(s, e, 60, 0, 0, FIRE_HIT);
    expect([e.burnTicks, e.burnDps]).toEqual([FIRE.burnTicks, 15]);
    const before = e.health;
    // The once-a-second beat keeps its phase: the next one is 20 ticks on, then 80 and 140.
    run(s, 20);
    expect(e.health).toBe(before - 15);
    run(s, FIRE.burnTicks - 20);
    expect(e.burnTicks).toBe(0);
    // The burn's last 40 ticks, after the 140th, deal their two thirds of a second as it ends.
    expect(burnHits(s).at(-1)?.damage).toBe(10);
    expect(e.health).toBe(before - 15 * 3 - 10);
    run(s, 1);
    expect(e.health).toBe(before - 55);
  });

  it('burn ticks never re-ignite, flash, knock or count as a fire hit', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    run(s, TICK_RATE);
    expect(burnHits(s)).toHaveLength(1);
    expect(e.burnTicks).toBe(FIRE.burnTicks - TICK_RATE);
    expect([e.flash, e.knockTicks]).toEqual([0, 0]);
    expect(s.events.ignites).toEqual([]);
  });

  it('physical and cold hits never burn; a first burn records an ignite, a refresh doesn’t', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0);
    damageEnemy(s, e, 20, 0, 0, { ...FIRE_HIT, damageType: 'cold' });
    expect(e.burnTicks).toBe(0);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    expect(s.events.ignites).toEqual([{ id: e.id, x: e.x, y: e.y }]);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    expect(s.events.ignites).toHaveLength(1);
  });

  it('an immune enemy (a Burrower underground) takes no burn damage while it lasts', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    e.underground = true;
    run(s, TICK_RATE);
    expect(e.health).toBe(9980);
    e.underground = false;
    run(s, TICK_RATE);
    expect(e.health).toBe(9975);
  });
});

describe('every fire source ignites', () => {
  it('a Fire arrow', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+fire', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => e.burnTicks > 0, 30);
    expect(e.burnDps).toBeCloseTo(14 * FIRE.burnShare, 9);
  });

  it('a Fire bomb’s Burst, a Fire cluster bomb’s Bomblets and a Fire landmine’s Burst', () => {
    const s = arena();
    s.inventory = { 'bomb+fire': 2 };
    const a = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const b = still(s, PLAYER_AT.x + 100, PLAYER_AT.y + 20);
    hold(s, 'bomb');
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y + 10));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect(s.events.bursts[0]?.damageType).toBe('fire');
    // Lit this tick, before the tick's burns beat: a tick of it has run.
    expect([a.burnTicks, b.burnTicks]).toEqual([FIRE.burnTicks - 1, FIRE.burnTicks - 1]);
    expect(a.burnDps).toBeCloseTo(12 * FIRE.burnShare, 9);

    const c = arena();
    c.inventory = { 'bomb+fire+cluster': 2 };
    const near = still(c, PLAYER_AT.x + 140, PLAYER_AT.y);
    hold(c, 'bomb');
    run(c, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(c, () => c.events.bombletBursts.length > 0, 120);
    expect(c.events.bombletBursts.every((x) => x.damageType === 'fire')).toBe(true);
    expect(near.burnTicks).toBeGreaterThan(0);

    const m = arena();
    m.inventory = { 'landmine+fire': 2 };
    const on = still(m, PLAYER_AT.x + 100, PLAYER_AT.y);
    hold(m, 'landmine');
    run(m, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(m, () => m.events.mineBursts.length > 0, 400);
    expect(on.burnDps).toBeCloseTo(60 * FIRE.burnShare, 9);
  });

  it('a Fire Split ley bolt’s Shards', () => {
    const s = arena();
    s.inventory = { 'ley-bolt+fire+split': 2 };
    still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const beyond = still(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    hold(s, 'ley-bolt');
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.some((a) => a.ammoId === 'shard'), 60);
    expect(s.arrows.filter((a) => a.ammoId === 'shard').every((a) => a.damageType === 'fire')).toBe(true);
    runUntil(s, () => beyond.burnTicks > 0, 60);
  });

  it('a Fire arrow’s Pool-burst (Blastfletch)', () => {
    const s = arena();
    s.talents = [TALENT_START, 'k1'];
    leavePool(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 }, roundEmission('bomb'));
    still(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const beside = still(s, PLAYER_AT.x + 160, PLAYER_AT.y + 20);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+fire', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => s.events.poolBursts.length > 0, 40);
    expect(s.events.poolBursts[0]?.damageType).toBe('fire');
    expect(beside.burnTicks).toBe(FIRE.burnTicks - 1);
  });
});

describe('spread on death', () => {
  it('a burning enemy that dies passes its burn, at its damage a second and for the full time, to every living enemy within 64 px', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 30);
    const near = still(s, PLAYER_AT.x + 200 + 60, PLAYER_AT.y);
    const diagonal = still(s, PLAYER_AT.x + 200 - 40, PLAYER_AT.y + 40);
    const far = still(s, PLAYER_AT.x + 200, PLAYER_AT.y + 70);
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, TICK_RATE);
    expect(dying.health).toBe(5);
    expect(near.burnTicks).toBe(0);
    run(s, TICK_RATE);
    expect(s.events.deaths.map((d) => d.id)).toEqual([dying.id]);
    expect([near.burnTicks, near.burnDps]).toEqual([FIRE.burnTicks, 5]);
    expect([diagonal.burnTicks, diagonal.burnDps]).toEqual([FIRE.burnTicks, 5]);
    expect(far.burnTicks).toBe(0);
    expect(s.events.spreads).toEqual([{ from: dying.id, to: [near.id, diagonal.id], x: dying.x, y: dying.y }]);
  });

  it('a catch keeps a stronger burn the enemy already has', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
    const near = still(s, PLAYER_AT.x + 240, PLAYER_AT.y);
    damageEnemy(s, near, 80, 0, 0, FIRE_HIT);
    run(s, 30);
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect([near.burnTicks, near.burnDps]).toEqual([FIRE.burnTicks, 20]);
  });

  it('chains: one that caught it and dies passes it on in turn', () => {
    const s = arena();
    const first = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
    const second = still(s, PLAYER_AT.x + 250, PLAYER_AT.y, 6);
    const third = still(s, PLAYER_AT.x + 300, PLAYER_AT.y);
    damageEnemy(s, first, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect(s.events.deaths.map((d) => d.id)).toEqual([first.id]);
    expect(second.burnDps).toBe(5);
    // The catch never reaches the third, 100 px from the first.
    expect(third.burnTicks).toBe(0);
    runUntil(s, () => s.events.deaths.some((d) => d.id === second.id), TICK_RATE * 2 + 1);
    expect([third.burnTicks, third.burnDps]).toEqual([FIRE.burnTicks, 5]);
  });

  it('a killing fire hit sets the enemy burning as it dies, so its burn spreads', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 10);
    const near = still(s, PLAYER_AT.x + 230, PLAYER_AT.y);
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect(near.burnDps).toBe(5);
  });

  it('spreads only to its own room, and never to the dead', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
    const other = placeHusk(s, PLAYER_AT.x + 220, PLAYER_AT.y, 'foundry');
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect(other.burnTicks).toBe(0);
  });

  it('igniteEnemy is the one rule a catch and a hit share', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    igniteEnemy(s, e, 7);
    expect([e.burnTicks, e.burnDps]).toEqual([FIRE.burnTicks, 7]);
    igniteEnemy(s, e, 3);
    expect(e.burnDps).toBe(7);
  });

  it('is deterministic, and the summary shows a burn', () => {
    const go = () => {
      const s = arena();
      s.inventory = { 'bomb+fire': 20 };
      for (let i = 0; i < 6; i++) still(s, PLAYER_AT.x + 80 + i * 20, PLAYER_AT.y + (i % 2) * 16, 40);
      hold(s, 'bomb');
      run(s, 300, fireAt(PLAYER_AT.x + 120, PLAYER_AT.y));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    expect(summarize(s).enemies[0]).toMatchObject({ burn: FIRE.burnTicks });
  });
});
