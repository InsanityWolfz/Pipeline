import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { itemDef } from '../../src/data/items';
import { STAGE_ROWS } from '../../src/data/stages';
import { TAGS, withTag } from '../../src/data/tags';
import { TALENT_START } from '../../src/data/talents';
import { createArrow } from '../../src/sim/arrows';
import type { EnemyState } from '../../src/sim/enemies';
import { roundEmission } from '../../src/sim/emissions';
import { fixtureDef } from '../../src/sim/fixtures';
import { leavePool } from '../../src/sim/keystones';
import { unlockedPieces } from '../../src/sim/placement';
import { taggedKnown } from '../../src/sim/stages';
import { craft } from '../../src/sim/crafting';
import { offerFromOutside } from '../../src/sim/flow';
import type { MachineState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, fireAt, hold, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

// Elements on every family (039, Q12): the frost tag takes any round without an element,
// so Frost bombs, cluster bombs, ley bolts and landmines exist from data alone; shapes stay
// per family. Children carry their parent's damage type (039.3): a Cold Burst chills every
// enemy it hits, a Frost ley bolt's Shards chill, a Frost arrow's Pool-burst is Cold.

const taking = (s: SimState, ...ids: string[]): SimState => {
  s.talents = [TALENT_START, ...ids];
  return s;
};

/** A Husk held where it stands, its health topped up so a Freeze can land. */
function still(s: SimState, x: number, y: number): EnemyState {
  const e = placeHusk(s, x, y);
  e.mode = 'windup';
  e.modeTicks = -10_000;
  e.health = 10_000;
  return e;
}

describe('the frost tag on every family', () => {
  it('takes arrows, bombs, ley bolts and landmines; shapes stay per family', () => {
    expect(TAGS.frost?.appliesTo).toEqual(['arrow', 'bomb', 'ley-bolt', 'landmine']);
    expect(TAGS.homing?.appliesTo).toEqual(['ley-bolt']);
    expect(TAGS.split?.appliesTo).toEqual(['ley-bolt']);
    expect(TAGS.cluster?.appliesTo).toEqual(['bomb']);
    expect(withTag('bomb+cluster', 'frost')).toBe('bomb+frost+cluster');
    expect(withTag('ley-bolt+homing', 'split')).toBeNull();
    expect(withTag('landmine', 'cluster')).toBeNull();
  });

  it('derives the six new rounds, named from their tags and cold', () => {
    const names = { 'bomb+frost': 'Frost bomb', 'bomb+frost+cluster': 'Frost Cluster bomb', 'ley-bolt+frost': 'Frost ley bolt', 'ley-bolt+frost+homing': 'Frost Homing ley bolt', 'ley-bolt+frost+split': 'Frost Split ley bolt', 'landmine+frost': 'Frost landmine' };
    for (const [id, name] of Object.entries(names)) {
      expect(itemDef(id).name, id).toBe(name);
      expect(ammoDef(id).damageType, id).toBe('cold');
    }
  });
});

describe('Cold on every family', () => {
  it('a Frost bomb’s Burst adds 1 Chill to every enemy it hits', () => {
    const s = arena();
    s.inventory = { 'bomb+frost': 2 };
    const a = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const b = still(s, PLAYER_AT.x + 100, PLAYER_AT.y + 20);
    hold(s, 'bomb');
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y + 10));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect([a.chill, b.chill]).toEqual([1, 1]);
    expect(s.events.bursts[0]?.damageType).toBe('cold');
  });

  it('a Frost cluster bomb’s Bomblets and a Frost landmine’s Burst are Cold too', () => {
    const s = arena();
    s.inventory = { 'bomb+frost+cluster': 2 };
    const near = still(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    hold(s, 'bomb');
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(s, () => s.events.bombletBursts.length > 0, 120);
    expect(s.events.bombletBursts.every((b) => b.damageType === 'cold')).toBe(true);
    expect(near.chill).toBeGreaterThan(0);
    const m = arena();
    m.inventory = { 'landmine+frost': 2 };
    const on = still(m, PLAYER_AT.x + 100, PLAYER_AT.y);
    hold(m, 'landmine');
    run(m, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(m, () => m.events.mineBursts.length > 0, 400);
    expect(m.events.mineBursts[0]?.damageType).toBe('cold');
    expect(on.chill).toBe(1);
  });

  it('a Frost ley bolt’s Split Shards are Cold and chill; a plain bolt’s stay Physical', () => {
    const shards = (round: string) => {
      const s = arena();
      s.inventory = { [round]: 2 };
      still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      hold(s, 'ley-bolt');
      run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
      runUntil(s, () => s.arrows.some((a) => a.ammoId === 'shard'), 60);
      return s.arrows.filter((a) => a.ammoId === 'shard');
    };
    for (const sh of shards('ley-bolt+frost+split')) expect(sh).toMatchObject({ damageType: 'cold', keywords: ['ley', 'shot', 'knockback', 'split', 'cold'] });
    for (const sh of shards('ley-bolt+split')) expect(sh.damageType).toBe('physical');
    // A Cold Shard chills what it hits.
    const s = arena();
    s.inventory = { 'ley-bolt+frost+split': 2 };
    still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const beyond = still(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    hold(s, 'ley-bolt');
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    runUntil(s, () => beyond.chill > 0, 60);
  });

  it('Shatterpoint’s Shards from a Frost ley bolt are Cold; from a plain one, Physical', () => {
    const shatter = (round: string) => {
      const s = taking(arena(), 'k2');
      const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      e.frozen = 60;
      s.arrows.push(createArrow(s.nextArrowId++, round, s.roomId, PLAYER_AT.x + 40, PLAYER_AT.y, 1, 0));
      runUntil(s, () => s.events.shatters.length > 0, 30);
      return s.arrows.filter((a) => a.ammoId === 'shard').map((a) => a.damageType);
    };
    expect(shatter('ley-bolt+frost')).toEqual(['cold', 'cold', 'cold', 'cold']);
    expect(shatter('ley-bolt')).toEqual(['physical', 'physical', 'physical', 'physical']);
  });

  it('changed: a Frost arrow’s Pool-burst is Cold (it was always Physical)', () => {
    const s = taking(arena(), 'k1');
    leavePool(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 }, roundEmission('bomb'));
    still(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const beside = still(s, PLAYER_AT.x + 160, PLAYER_AT.y + 20);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+frost', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => s.events.poolBursts.length > 0, 40);
    expect(s.events.poolBursts[0]?.damageType).toBe('cold');
    expect(beside.chill).toBe(1);
  });

  it('is deterministic with the new rounds', () => {
    const go = () => {
      const s = arena();
      s.inventory = { 'bomb+frost+cluster': 20, 'ley-bolt+frost+split': 20 };
      for (let i = 0; i < 6; i++) still(s, PLAYER_AT.x + 80 + i * 20, PLAYER_AT.y + (i % 2) * 16);
      hold(s, 'bomb');
      run(s, 200, fireAt(PLAYER_AT.x + 120, PLAYER_AT.y));
      hold(s, 'ley-bolt');
      run(s, 200, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
  });
});

describe('stages on every family (039.12)', () => {
  it('the bench has a row per stage and family: Frost rune × Arrow, Bomb, Ley bolt, Landmine; Ley guide; Prism lens; Cluster die', () => {
    expect(STAGE_ROWS.map((r) => r.id)).toEqual(['frost-rune-arrow', 'frost-rune-bomb', 'frost-rune-ley-bolt', 'frost-rune-landmine', 'ley-guide-ley-bolt', 'prism-lens-ley-bolt', 'cluster-die-bomb']);
    expect(STAGE_ROWS.find((r) => r.id === 'frost-rune-bomb')?.recipe).toEqual({ id: 'frost-rune-bomb', inputs: { bomb: 4, rimestone: 1 }, output: { itemId: 'bomb+frost', count: 4 } });
  });

  it('crafting Frost bombs (047) makes them and unlocks the rune; the landmine row shows once ley-iron is found', () => {
    const s = foundry(false);
    const bench = fixtureDef('identification-bench');
    const at = tileCentre({ tx: bench.tx - 1, ty: bench.ty });
    movePlayer(s, at.x, at.y);
    s.claims.push('shrine');
    s.inventory = { bomb: 4, rimestone: 1 };
    const landmineRow = STAGE_ROWS.find((r) => r.id === 'frost-rune-landmine');
    if (!landmineRow) throw new Error('no landmine row');
    expect(taggedKnown(s, landmineRow)).toBe(false);
    expect(craft(s, 'frost-rune-bomb')).toBe(true);
    expect(s.inventory).toMatchObject({ bomb: 0, rimestone: 0, 'bomb+frost': 4 });
    expect(unlockedPieces(s)).toContain('frost-rune');
    s.found.push('ley-iron');
    expect(taggedKnown(s, landmineRow)).toBe(true);
  });

  it('the frost rune machine takes any round without an element, of any family, and frosts it', () => {
    for (const round of ['bomb', 'ley-bolt+homing', 'landmine', 'bomb+cluster']) {
      const s = foundry();
      const m = put<MachineState>(s, 'frost-rune', 6, 5, 'right');
      expect(offerFromOutside(s.foundry, { tx: 6, ty: 5 }, { tx: 5, ty: 5 }, round), round).toBe(true);
      expect(m.made).toBe(withTag(round, 'frost'));
    }
    const s = foundry();
    put<MachineState>(s, 'frost-rune', 6, 5, 'right');
    expect(offerFromOutside(s.foundry, { tx: 6, ty: 5 }, { tx: 5, ty: 5 }, 'ley-bolt+frost')).toBe(false);
  });
});
