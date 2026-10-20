import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../../src/data/save';
import { TUTORIAL_START } from '../../src/data/player';
import { createSim } from '../../src/sim/state';
import { makeEnvelope, readSave, snapshot } from '../../src/sim/save';

// 046: version 2 → 3. The Splitter left research (it's on the bar from the start), so a version 2 save's splitter
// node and any Splitter schematic are dropped; nothing is refunded (046.5).

const META = { build: 'test', savedAt: '2026-10-20T12:00:00.000Z', endCardSeen: false };

/** A version 2 save of a tutorial-start sim, its state edited by `edit` as a version 2 save could hold it. */
function v2(edit: (state: Record<string, unknown>) => void): string {
  const s = createSim(5, { start: TUTORIAL_START });
  const state = snapshot(s) as unknown as Record<string, unknown>;
  edit(state);
  return JSON.stringify({ ...makeEnvelope(state as never, META), version: 2 });
}

describe('version 2 → 3 (046)', () => {
  it('is the current version', () => {
    expect(SAVE_VERSION).toBe(3);
  });

  it("drops the splitter node and every Splitter schematic: carried, banked, at home, at the start and on the ground", () => {
    const text = v2((state) => {
      state.research = { ...(state.research as object), splitter: 'revealed' };
      state.inventory = { 'schematic-splitter': 1, wood: 2 };
      state.banked = { 'schematic-splitter': 1 };
      state.stash = { 'schematic-splitter': 1, stone: 3 };
      state.groundItems = [
        { id: 1, itemId: 'schematic-splitter', roomId: 'overworld', x: 10, y: 10 },
        { id: 2, itemId: 'wood', roomId: 'overworld', x: 12, y: 10 },
      ];
    });
    const read = readSave(text);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(read.envelope.version).toBe(3);
    expect(read.state.research).not.toHaveProperty('splitter');
    expect(read.state.inventory).toEqual({ wood: 2 });
    expect(read.state.banked).toEqual({});
    expect(read.state.stash).toEqual({ stone: 3 });
    expect(read.state.groundItems.map((g) => g.itemId)).toEqual(['wood']);
  });
});
