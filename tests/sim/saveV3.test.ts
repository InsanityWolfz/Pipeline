import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../../src/data/save';
import { TUTORIAL_START } from '../../src/data/player';
import { OBJECTIVES } from '../../src/data/objectives';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { makeEnvelope, readSave, SAVE_MIGRATIONS, snapshot } from '../../src/sim/save';

// 046: version 2 → 3. The Splitter left research (it's on the bar from the start), so a version 2 save's splitter
// node and any Splitter schematic are dropped; nothing is refunded (046.5). 047 made SAVE_VERSION 4 with no
// migration (Shaun's rule), so these read with version 3 as the target, as the game did before 047.

/** Reading as the game did at version 3. */
const V3 = { version: 3, migrations: SAVE_MIGRATIONS };

const META = { build: 'test', savedAt: '2026-10-20T12:00:00.000Z', endCardSeen: false };

/** A version 2 save of a tutorial-start sim, its state edited by `edit` as a version 2 save could hold it. */
function v2(edit: (state: Record<string, unknown>) => void): string {
  const s = createSim(5, { start: TUTORIAL_START });
  const state = snapshot(s) as unknown as Record<string, unknown>;
  edit(state);
  return JSON.stringify({ ...makeEnvelope(state as never, META), version: 2 });
}

describe('version 2 → 3 (046)', () => {
  it('is no longer the current version (047: 4, then 5 for 047.9, 6 for 049, 7 for 050, 8 for 051, 9 for 052, 10 for 053, 11 for 055, 12 for 058, 13 for 060, 14 for 061, 15 for 063, 16 for 062 (a machine stall counter), 17 for 064, 18 for 065, 19 for 063 merged onto main, 20 for 067, with no migration)', () => {
    expect(SAVE_VERSION).toBe(20);
    expect(SAVE_MIGRATIONS[3]).toBeUndefined();
  });

  it("drops the splitter node and every Splitter schematic: carried, banked, at home, at the start and on the ground", () => {
    const text = v2((state) => {
      state.research = { ...(state.research as object), splitter: 'revealed' };
      state.inventory = { 'schematic-splitter': 1, wood: 2 };
      state.banked = { 'schematic-splitter': 1 };
      state.stash = { 'schematic-splitter': 1, stone: 3 };
      state.start = { ...(state.start as Record<string, unknown>), inventory: { 'schematic-splitter': 1 } };
      state.groundItems = [
        { id: 1, itemId: 'schematic-splitter', roomId: 'overworld', x: 10, y: 10 },
        { id: 2, itemId: 'wood', roomId: 'overworld', x: 12, y: 10 },
      ];
    });
    const read = readSave(text, V3);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(read.envelope.version).toBe(3);
    expect(read.state.research).not.toHaveProperty('splitter');
    expect(read.state.inventory).toEqual({ wood: 2 });
    expect(read.state.banked).toEqual({});
    expect(read.state.stash).toEqual({ stone: 3 });
    expect(read.state.start.inventory).toEqual({});
    expect(read.state.groundItems.map((g) => g.itemId)).toEqual(['wood']);
  });
});

describe('version 2 → 3 objectives (046)', () => {
  /** Version 2's goal list length (027's seven steps included). */
  const V2_LENGTH = 31;
  const v2Done = (done: number[]): string =>
    v2((state) => {
      state.objectives = Array.from({ length: V2_LENGTH }, (_, i) => done.includes(i));
    });

  it("maps the done goals by text: 027's steps drop out, the rest keep their state", () => {
    // Done in version 2: the tube (0), entering the foundry (4), a build step (8), filling the tube (13), identifying
    // (14) and claiming the shrine (15).
    const read = readSave(v2Done([0, 4, 8, 13, 14, 15]), V3);
    if (read.status !== 'ok') throw new Error(read.reason);
    const done = OBJECTIVES.filter((_, i) => read.state.objectives[i]).map((o) => o.text);
    expect(read.state.objectives).toHaveLength(OBJECTIVES.length);
    // 058 dropped "Fill the tube from your line" (now "Wait for the tube to fill with arrows"); 067 dropped "Enter the
    // foundry" and reworded the shrine's goal ("Claim the shrine's pylon (E)").
    expect(done).toEqual(['Pick up the tube (E)', 'Identify your armor at the bench (E)']);
  });

  it('maps a filled hopper (027 step 2) to nothing now 067 dropped the refill goal; 058 dropped the second-line goal', () => {
    const read = readSave(v2Done([7, 17]), V3);
    if (read.status !== 'ok') throw new Error(read.reason);
    const done = OBJECTIVES.filter((_, i) => read.state.objectives[i]).map((o) => o.text);
    expect(done).toEqual([]);
  });

  it('never gives a save from before 046 the example line (046.1), even on its first foundry entry', () => {
    const text = v2((state) => {
      const start = { ...(state.start as Record<string, unknown>) };
      delete start.exampleLine;
      state.start = start;
    });
    const read = readSave(text, V3);
    if (read.status !== 'ok') throw new Error(read.reason);
    const s = read.state;
    // 067: no start has the example line any more; the old flag, read from an old save, lays nothing.
    s.roomId = FOUNDRY_ROOM;
    stepSim(s);
    expect(s.link.attuned).toBe(true);
    expect(s.foundry.pieces).toEqual([]);
  });
});
