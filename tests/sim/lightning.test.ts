import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { itemDef } from '../../src/data/items';
import { REVEALING_ITEMS } from '../../src/data/recipes';
import { STAGE_ROWS, STAGES } from '../../src/data/stages';
import { LIGHTNING, TAGS, withTag } from '../../src/data/tags';
import { createArrow } from '../../src/sim/arrows';
import { craft } from '../../src/sim/crafting';
import { fixtureDef } from '../../src/sim/fixtures';
import { unlockedPieces } from '../../src/sim/placement';
import { taggedKnown } from '../../src/sim/stages';
import { tileCentre } from '../../src/sim/tiles';
import { arena, fireAt, hold, movePlayer, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';
import { foundry } from './foundryKit';

// Lightning (064): any round can carry the lightning tag. Each lightning hit (a round's, each Shard's, and each Burst's
// or Bomblet's from the enemy nearest its centre) arcs to the nearest living enemy within LIGHTNING.chainRange that the
// chain hasn't hit, for LIGHTNING.chainShare of the hit's damage, then on from there, up to LIGHTNING.chains arcs.
// The chain's own rules (skips, Shields, arc hits) are in lightningChain.test.ts.

const arcHits = (s: ReturnType<typeof arena>) => s.events.hits.flatMap((h) => (h.target === 'enemy' && h.arc ? [h] : []));

describe('the lightning tag', () => {
  it('is an element for every family, its numbers in data', () => {
    expect(TAGS.lightning).toMatchObject({ id: 'lightning', slot: 'element', prefix: 'Lightning', appliesTo: ['arrow', 'bomb', 'ley-bolt', 'landmine'], keyword: 'lightning', damageType: 'lightning' });
    expect(LIGHTNING).toEqual({ chainRange: 96, chainShare: 0.5, chains: 2 });
  });

  it('makes seven stone rounds, named and typed from the tag; a round holds one element', () => {
    const names = {
      'arrow+lightning': 'Lightning arrow',
      'bomb+lightning': 'Lightning bomb',
      'bomb+lightning+cluster': 'Lightning Cluster bomb',
      'ley-bolt+lightning': 'Lightning ley bolt',
      'ley-bolt+lightning+homing': 'Lightning Homing ley bolt',
      'ley-bolt+lightning+split': 'Lightning Split ley bolt',
      'landmine+lightning': 'Lightning landmine',
    };
    for (const [id, name] of Object.entries(names)) {
      expect(itemDef(id).name, id).toBe(name);
      expect(ammoDef(id).damageType, id).toBe('lightning');
    }
    expect(withTag('arrow+fire', 'lightning')).toBeNull();
    expect(withTag('arrow+steel', 'lightning')).toBe('arrow+steel+lightning');
    expect(itemDef('arrow+steel+lightning').name).toBe('Steel Lightning arrow');
  });
});

describe('the lightning rune', () => {
  it('costs 1 stormglass per 4 rounds, with a row per family', () => {
    expect(STAGES['lightning-rune']).toEqual({ id: 'lightning-rune', name: 'Lightning rune', tag: 'lightning', batch: 4, material: 'stormglass', materialCount: 1, craftTicks: 60, shownAfter: 'stormglass' });
    expect(STAGE_ROWS.filter((r) => r.stage === 'lightning-rune').map((r) => r.id)).toEqual(['lightning-rune-arrow', 'lightning-rune-bomb', 'lightning-rune-ley-bolt', 'lightning-rune-landmine']);
  });

  it('its rows show once stormglass has been carried, and crafting a lightning round by hand unlocks the rune', () => {
    expect(REVEALING_ITEMS).toContain('stormglass');
    const s = foundry(false);
    const bench = fixtureDef('identification-bench');
    const at = tileCentre({ tx: bench.tx - 1, ty: bench.ty });
    movePlayer(s, at.x, at.y);
    s.claims.push('shrine');
    const row = STAGE_ROWS.find((r) => r.id === 'lightning-rune-arrow');
    if (!row) throw new Error('no lightning arrow row');
    expect(taggedKnown(s, row)).toBe(false);
    s.inventory = { arrow: 4, stormglass: 1 };
    run(s, 1);
    expect(s.found).toContain('stormglass');
    expect(taggedKnown(s, row)).toBe(true);
    expect(unlockedPieces(s)).not.toContain('lightning-rune');
    expect(craft(s, 'lightning-rune-arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ arrow: 0, stormglass: 0, 'arrow+lightning': 4 });
    expect(unlockedPieces(s)).toContain('lightning-rune');
  });
});

describe('the chain', () => {
  it('a lightning arrow’s hit arcs to the nearest enemy within 3 tiles, then on from there, for half the hit each, two arcs', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const far = still(s, PLAYER_AT.x + 60 + 90, PLAYER_AT.y);
    const near = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 64);
    const last = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 64 + 80);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+lightning', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => s.events.arcs.length > 0, 30);
    // The direct hit: 14; the nearest (64 px) is hit first, then the one nearest it (80 px), not the farther one.
    expect(a.health).toBe(10_000 - 14);
    expect(near.health).toBe(10_000 - 7);
    expect(last.health).toBe(10_000 - 7);
    expect(far.health).toBe(10_000);
    expect(s.events.arcs.map((x) => x.to)).toEqual([near.id, last.id]);
    expect(s.events.arcs[0]).toMatchObject({ from: a.id, fromX: a.x, fromY: a.y, toX: near.x, toY: near.y });
    expect(arcHits(s).map((h) => [h.id, h.damage, h.damageType])).toEqual([
      [near.id, 7, 'lightning'],
      [last.id, 7, 'lightning'],
    ]);
  });

  it('stops with no enemy in range, and never at more than 96 px', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const out = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + LIGHTNING.chainRange + 2);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+lightning', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => a.health < 10_000, 30);
    expect(out.health).toBe(10_000);
    expect(s.events.arcs).toEqual([]);
  });

  it('never hits an enemy twice: a pair arcs once, back to nothing', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const b = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 40);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+lightning', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => s.events.arcs.length > 0, 30);
    expect(s.events.arcs).toHaveLength(1);
    expect([a.health, b.health]).toEqual([10_000 - 14, 10_000 - 7]);
  });

  it('a lightning bomb’s Burst chains once, from the enemy nearest its centre, on to the nearest the chain hasn’t hit', () => {
    const s = arena();
    s.inventory = { 'bomb+lightning': 2 };
    const centre = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    const mid = still(s, centre.x + 2, centre.y);
    const side = still(s, centre.x + 18, centre.y);
    // Out of the Burst's reach, within 96 px of the side one. The chain hasn't hit the side one (the Burst has): it
    // arcs there first, the nearest, then on to the outer one.
    const outer = still(s, centre.x + 18, centre.y + 80);
    hold(s, 'bomb');
    run(s, 1, fireAt(centre.x, centre.y));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect(s.events.bursts[0]?.damageType).toBe('lightning');
    expect(s.events.arcs.map((x) => [x.from, x.to])).toEqual([
      [mid.id, side.id],
      [side.id, outer.id],
    ]);
    expect(outer.health).toBeLessThan(10_000);
  });
});
