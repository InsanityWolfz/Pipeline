import { describe, expect, it } from 'vitest';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { viewRect } from '../../src/sim/population';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run, SEED } from './fight';

// Discovery (032): a landmark is found the first tick any part of its area is in the
// camera's view (`viewRect`), recorded once ever, and never lost.

/** A spot in the meadow's west whose view takes in the Quarry's south edge and nothing else. */
const NEAR_QUARRY = tileCentre({ tx: 24, ty: 25 });

describe('discovery', () => {
  it('finds nothing from the wake tile, and the shrine and foundry are never landmarks', () => {
    const s = createSim(SEED);
    run(s, 5);
    expect(s.discovered).toEqual([]);
    expect(LANDMARK_LIST.map((l) => l.id)).not.toContain(SHRINE_SITE);
    expect(LANDMARK_LIST.map((l) => l.id)).not.toContain(FOUNDRY_ROOM);
  });

  it('records a landmark the first tick its area enters the view, with one event, once ever', () => {
    const s = createSim(SEED);
    s.enemies = [];
    movePlayer(s, NEAR_QUARRY.x, NEAR_QUARRY.y);
    const v = viewRect(s);
    const q = LANDMARK_LIST.find((l) => l.id === 'quarry')?.area;
    if (!q) throw new Error('no quarry');
    expect(v.y0 < (q.y1 + 1) * 32 && v.x0 < (q.x1 + 1) * 32).toBe(true);
    run(s, 1);
    expect(s.discovered).toEqual(['quarry']);
    expect(s.events.discoveries).toEqual([{ landmark: 'quarry' }]);
    run(s, 1);
    expect(s.events.discoveries).toEqual([]);
    // Away and back: no second sighting.
    movePlayer(s, tileCentre({ tx: 40, ty: 30 }).x, tileCentre({ tx: 40, ty: 30 }).y);
    run(s, 1);
    movePlayer(s, NEAR_QUARRY.x, NEAR_QUARRY.y);
    let again = 0;
    for (let t = 0; t < 5; t++) {
      run(s, 1);
      again += s.events.discoveries.length;
    }
    expect(again).toBe(0);
    expect(s.discovered).toEqual(['quarry']);
  });

  it('only counts the overworld: nothing is found from the foundry', () => {
    const s = createSim(SEED);
    s.roomId = FOUNDRY_ROOM;
    movePlayer(s, NEAR_QUARRY.x, NEAR_QUARRY.y);
    run(s, 1);
    expect(s.discovered).toEqual([]);
  });

  it('finds each landmark standing in its area', () => {
    const s = createSim(SEED);
    s.enemies = [];
    for (const l of LANDMARK_LIST) {
      const c = tileCentre({ tx: Math.round((l.area.x0 + l.area.x1) / 2), ty: Math.round((l.area.y0 + l.area.y1) / 2) });
      s.roomId = OVERWORLD_ROOM;
      movePlayer(s, c.x, c.y);
      run(s, 1);
      expect(s.discovered, l.id).toContain(l.id);
    }
    expect([...s.discovered].sort()).toEqual(LANDMARK_LIST.map((l) => l.id).sort());
  });

  it('is never lost: a death keeps it, like claims', () => {
    const s = createSim(SEED);
    s.enemies = [];
    movePlayer(s, NEAR_QUARRY.x, NEAR_QUARRY.y);
    run(s, 1);
    die(s);
    expect(s.discovered).toEqual(['quarry']);
  });

  it('reports `discovered` and each landmark as { id, discovered, claimed, opened }', () => {
    const s = createSim(SEED);
    s.enemies = [];
    movePlayer(s, NEAR_QUARRY.x, NEAR_QUARRY.y);
    run(s, 1);
    claim(s, SHRINE_SITE);
    claim(s, 'quarry');
    const sum = summarize(s);
    expect(sum.discovered).toEqual(['quarry']);
    expect(sum.landmarks.map((l) => l.id)).toEqual(LANDMARK_LIST.map((l) => l.id));
    expect(sum.landmarks.find((l) => l.id === 'quarry')).toEqual({ id: 'quarry', discovered: true, claimed: true, opened: false });
    expect(sum.landmarks.find((l) => l.id === 'ruined-cache')).toEqual({ id: 'ruined-cache', discovered: false, claimed: false, opened: false });
  });
});
