import { describe, expect, it } from 'vitest';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { atRiskCounts, itemRisks } from '../../src/sim/banking';
import { claim } from '../../src/sim/claims';
import { craft } from '../../src/sim/crafting';
import { layItem } from '../../src/sim/drops';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { arena, atEntrance, atPylon, command, die, run, runUntil, SEED } from './fight';
import { bodyPiece, wear } from '../fixtures/gear';

// What a death would take (031): per carried item, safe = min(held, banked) and at risk = the rest.
// The inventory panel and getState().atRisk read the same helper, and a death keeps and loses exactly that.

/** Lays `n` of an item at the player's feet and steps until they're all picked up. */
function pickUp(s: SimState, itemId: string, n: number): void {
  for (let i = 0; i < n; i++) layItem(s, itemId, s.roomId, s.player.x, s.player.y);
  runUntil(s, (x) => !x.groundItems.some((g) => g.roomId === x.roomId), 120);
}

/** Into the foundry by its stairs, banking what's carried, and back out so the tests run in the meadow. */
function bankAtFoundry(s: SimState): void {
  atEntrance(s);
  runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
}

describe('the at-risk helper (031)', () => {
  it('right after entering the foundry, nothing is at risk', () => {
    const s = arena();
    s.inventory = { arrow: 12, wood: 4, 'warden-core': 1 };
    bankAtFoundry(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(itemRisks(s)).toEqual({
      arrow: { held: 12, safe: 12, atRisk: 0 },
      wood: { held: 4, safe: 4, atRisk: 0 },
      'warden-core': { held: 1, safe: 1, atRisk: 0 },
    });
    expect(atRiskCounts(s)).toEqual({});
    expect(summarize(s).atRisk).toEqual({});
  });

  it('right after a pylon deposit, nothing is carried', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    atPylon(s);
    s.inventory = { stone: 5, arrow: 3 };
    stepSim(s, command({ pylon: 'deposit' }));
    expect(itemRisks(s)).toEqual({});
    expect(summarize(s).atRisk).toEqual({});
    expect(s.stash).toMatchObject({ stone: 5, arrow: 3 });
  });

  it('picking up 3 wood after banking 10 gives 10 safe and 3 at risk', () => {
    const s = arena();
    s.inventory = { wood: 10 };
    bankAtFoundry(s);
    pickUp(s, 'wood', 3);
    expect(s.inventory.wood).toBe(13);
    expect(itemRisks(s).wood).toEqual({ held: 13, safe: 10, atRisk: 3 });
    expect(atRiskCounts(s)).toEqual({ wood: 3 });
    expect(summarize(s).atRisk).toEqual({ wood: 3 });
  });

  it('spending carried items takes the at-risk count down first, then the safe count', () => {
    const s = arena();
    s.inventory = { wood: 2 };
    bankAtFoundry(s);
    pickUp(s, 'wood', 2);
    expect(itemRisks(s).wood).toEqual({ held: 4, safe: 2, atRisk: 2 });
    craft(s, 'shaft');
    expect(itemRisks(s).wood).toEqual({ held: 3, safe: 2, atRisk: 1 });
    craft(s, 'shaft');
    expect(itemRisks(s).wood).toEqual({ held: 2, safe: 2, atRisk: 0 });
    craft(s, 'shaft');
    expect(itemRisks(s).wood).toEqual({ held: 1, safe: 1, atRisk: 0 });
    // What the crafts made was never banked: all of it is at risk.
    expect(itemRisks(s).shaft).toEqual({ held: 12, safe: 0, atRisk: 12 });
    expect(atRiskCounts(s)).toEqual({ shaft: 12 });
  });

  it('lists only carried items: none held reads as nothing, whatever was banked', () => {
    const s = arena();
    s.inventory = { wood: 0, stone: 2 };
    s.banked = { wood: 5, fiber: 3 };
    expect(itemRisks(s)).toEqual({ stone: { held: 2, safe: 0, atRisk: 2 } });
  });

  it('a death loses exactly the at-risk counts and keeps exactly the safe counts', () => {
    const s = arena();
    s.inventory = { wood: 10, arrow: 20, 'unidentified-armor': 1, 'warden-core': 1 };
    bankAtFoundry(s);
    // Spend some arrows, and pick up more of a mix.
    run(s, 1);
    s.inventory.arrow = 15;
    pickUp(s, 'wood', 3);
    pickUp(s, 'stone', 4);
    pickUp(s, 'unidentified-armor', 2);
    const risks = itemRisks(s);
    const expectKept = Object.fromEntries(Object.entries(risks).flatMap(([id, r]) => (r.safe > 0 ? [[id, r.safe]] : [])));
    const expectLost = Object.fromEntries(Object.entries(risks).flatMap(([id, r]) => (r.atRisk > 0 ? [[id, r.atRisk]] : [])));
    expect(expectLost).toEqual({ wood: 3, stone: 4, 'unidentified-armor': 2 });
    expect(atRiskCounts(s)).toEqual(expectLost);
    let lost: Record<string, number> = {};
    s.player.health = 0;
    runUntil(s, (x) => {
      if (x.events.ko) lost = { ...x.events.lost };
      return x.events.ko;
    }, 200);
    expect(s.inventory).toEqual(expectKept);
    expect(lost).toEqual(expectLost);
    expect(atRiskCounts(s)).toEqual({});
  });

  it('identified gear is never in the carried list, so a death never takes it', () => {
    const s = arena();
    wear(s, bodyPiece(1, 'light', 2));
    s.inventory = { wood: 1 };
    s.banked = {};
    expect(atRiskCounts(s)).toEqual({ wood: 1 });
    die(s);
    expect(s.gear).toHaveLength(1);
    expect(s.equipped.body).toBe(1);
  });
});
