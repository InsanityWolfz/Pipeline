import { describe, expect, it } from 'vitest';
import { createEvents } from '../../src/sim/events';
import { mergeEvents } from '../../src/render/eventLog';

describe('keeping events between draws', () => {
  it('appends every list and keeps flags and the KO lost list', () => {
    const kept = createEvents();
    const a = createEvents();
    a.hits.push({ target: 'player', x: 1, y: 2, damage: 3 });
    a.places.push({ id: 1, pieceId: 'conduit', tx: 0, ty: 0, facing: 'up' });
    a.tubeTaken = true;
    mergeEvents(kept, a);
    const b = createEvents();
    b.hits.push({ target: 'player', x: 4, y: 5, damage: 6 });
    b.ko = true;
    b.lost = { wood: 2 };
    mergeEvents(kept, b);
    expect(kept.hits).toHaveLength(2);
    expect(kept.places).toHaveLength(1);
    expect([kept.tubeTaken, kept.ko, kept.lost]).toEqual([true, true, { wood: 2 }]);
  });
});
