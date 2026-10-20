import { describe, expect, it } from 'vitest';
import { SAVE_BUDGET_BYTES } from '../../src/data/save';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { TUTORIAL_START } from '../../src/data/player';
import { createSim, type SimState } from '../../src/sim/state';
import { createEvents } from '../../src/sim/events';
import { claim } from '../../src/sim/claims';
import { restore, snapshot, wakeInFoundry } from '../../src/sim/save';
import { lateGame, script } from './saveRun';

// 042: the save is the whole sim state as plain JSON; restoring it and stepping is exactly the original stepping.

/** Every value in `v` that isn't plain JSON, by path: undefined (in arrays too), NaN, Infinity, functions, Maps, Sets, class instances. */
function nonJson(v: unknown, path = 'state'): string[] {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return [];
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [`${path}: ${v}`];
  if (v === undefined) return [`${path}: undefined`];
  if (typeof v !== 'object') return [`${path}: ${typeof v}`];
  if (Array.isArray(v)) return v.flatMap((x, i) => nonJson(x, `${path}[${i}]`));
  const proto: unknown = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return [`${path}: ${(v as object).constructor.name} instance`];
  // An object key holding undefined is dropped by JSON, so it would come back missing: flag it too.
  return Object.entries(v).flatMap(([k, x]) => nonJson(x, `${path}.${k}`));
}

/** The state without its tick's events, for comparing runs. */
const settled = (s: SimState): SimState => ({ ...s, events: createEvents() });

const fresh = (): SimState => createSim(20261017, { start: TUTORIAL_START });

describe('save snapshot (042.3)', () => {
  it('is plain JSON for a fresh and a late-game state', () => {
    for (const s of [fresh(), lateGame()]) {
      expect(nonJson(settled(s))).toEqual([]);
      expect(nonJson(snapshot(s))).toEqual([]);
    }
  });

  it("holds the whole state with the tick's events emptied, and leaves the state alone", () => {
    const s = lateGame();
    expect(s.events.foundryArrivals).toHaveLength(1);
    const snap = snapshot(s);
    expect(snap.events).toEqual(createEvents());
    expect(s.events.foundryArrivals).toHaveLength(1);
    expect(settled(snap)).toEqual(JSON.parse(JSON.stringify(settled(s))));
  });

  it('keeps a late-game save under 1 MB of JSON', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot(lateGame()))).length;
    expect(bytes).toBeLessThan(SAVE_BUDGET_BYTES);
  });
});

describe('restore (042: determinism)', () => {
  it('stepping the restored JSON gives the same states as stepping the original', () => {
    const a = lateGame();
    const text = JSON.stringify(snapshot(a));
    const b = restore(JSON.parse(text));
    expect(settled(b)).toEqual(settled(a));
    script(a, 900);
    script(b, 900);
    expect(settled(b)).toEqual(settled(a));
  });

  it('a restore, the Continue wake and N ticks, run twice, give the same state', () => {
    const text = JSON.stringify(snapshot(lateGame()));
    const runs = [0, 1].map(() => {
      const s = restore(JSON.parse(text));
      wakeInFoundry(s);
      script(s, 600);
      return settled(s);
    });
    expect(runs[1]).toEqual(runs[0]);
  });
});

describe('Continue (042)', () => {
  it('wakes in the foundry with everything as of the save, nothing lost', () => {
    const s = lateGame();
    const snap = snapshot(s);
    const r = restore(JSON.parse(JSON.stringify(snap)));
    wakeInFoundry(r);
    expect(r.roomId).toBe(FOUNDRY_ROOM);
    expect(r.events.woke).toBe(true);
    expect(r.events.ko).toBe(false);
    // The haul was banked as the save was taken: the inventory is the banked haul.
    expect(r.inventory).toEqual(snap.banked);
    expect(r.banked).toEqual(snap.banked);
    for (const k of ['claims', 'research', 'foundry', 'link', 'gear', 'equipped', 'level', 'xp', 'talentPoints', 'talents', 'stash', 'discovered', 'caches', 'bossDefeats', 'killedBosses', 'objectives', 'crafted', 'found', 'carried', 'fixtures'] as const)
      expect(r[k], k).toEqual(snap[k]);
    expect(r.player.health).toBeGreaterThan(0);
  });

  it('loses anything done after the save: a claim, items, XP', () => {
    const s = lateGame();
    const text = JSON.stringify(snapshot(s));
    claim(s, 'quarry');
    s.inventory['ley-crystal'] = (s.inventory['ley-crystal'] ?? 0) + 5;
    s.xp += 100;
    const r = restore(JSON.parse(text));
    expect(s.claims).toContain('quarry');
    expect(r.claims).not.toContain('quarry');
    expect(r.inventory['ley-crystal']).toBe(JSON.parse(text).inventory['ley-crystal']);
    expect(r.xp).toBe(JSON.parse(text).xp);
  });
});
