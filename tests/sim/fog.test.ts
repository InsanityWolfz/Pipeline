import { describe, expect, it } from 'vitest';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { OVERWORLD } from '../../src/data/overworld';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { TUTORIAL_START } from '../../src/data/player';
import { revealed } from '../../src/sim/fog';
import { makeEnvelope, readSave, snapshot } from '../../src/sim/save';
import { createSim } from '../../src/sim/state';
import { movePlayer, run, SEED } from './fight';

// 051 (B.5, 051.1): the minimap's fog of war. A tile is revealed once it has been on screen, for good, and saved.

const tile = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE });

describe('the fog of war (051)', () => {
  it('starts hidden; the first tick reveals the view round the player, and nothing far off', () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    const at = OVERWORLD.wake;
    expect(revealed(s.fog, at.tx, at.ty)).toBe(false);
    run(s, 1);
    expect(revealed(s.fog, at.tx, at.ty)).toBe(true);
    // The view is 20 x 11 tiles round the player: 9 tiles east is in it, 12 isn't.
    expect(revealed(s.fog, at.tx + 9, at.ty)).toBe(true);
    expect(revealed(s.fog, at.tx + Math.ceil(VIEW_WIDTH / TILE_SIZE / 2) + 2, at.ty)).toBe(false);
    expect(revealed(s.fog, at.tx, at.ty - Math.ceil(VIEW_HEIGHT / TILE_SIZE / 2) - 2)).toBe(false);
    expect(revealed(s.fog, OVERWORLD.shrine.pylon.tx, OVERWORLD.shrine.pylon.ty)).toBe(false);
  });

  it('a tile once seen stays revealed after the player leaves, and the foundry reveals nothing', () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    run(s, 1);
    const pylon = OVERWORLD.shrine.pylon;
    const p = tile(pylon);
    movePlayer(s, p.x, p.y + 3 * TILE_SIZE);
    run(s, 1);
    expect(revealed(s.fog, pylon.tx, pylon.ty)).toBe(true);
    const before = [...s.fog];
    s.roomId = FOUNDRY_ROOM;
    run(s, 5);
    expect(s.fog).toEqual(before);
    expect(revealed(s.fog, OVERWORLD.wake.tx, OVERWORLD.wake.ty)).toBe(true);
  });

  it('is saved', () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    run(s, 1);
    const read = readSave(JSON.stringify(makeEnvelope(snapshot(s), { build: 't', savedAt: '2026-10-21T00:00:00Z', endCardSeen: false })));
    expect(read.status).toBe('ok');
    if (read.status === 'ok') {
      expect(read.state.fog).toEqual(s.fog);
      expect(revealed(read.state.fog, OVERWORLD.wake.tx, OVERWORLD.wake.ty)).toBe(true);
    }
  });
});
