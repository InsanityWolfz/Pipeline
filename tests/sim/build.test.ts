import { describe, expect, it } from 'vitest';
import { arrivalTile } from '../../src/sim/doorways';
import { tileCentre } from '../../src/sim/tiles';
import { HALL, movePlayer, placeNode, run, runUntil } from './fight';
import { foundry } from './foundryKit';

describe('build mode', () => {
  it('toggles only in the foundry', () => {
    const s = foundry();
    run(s, 1, { toggleBuild: true });
    expect(s.building).toBe(true);
    run(s, 1, { toggleBuild: true });
    expect(s.building).toBe(false);
    s.roomId = HALL;
    run(s, 1, { toggleBuild: true });
    expect(s.building).toBe(false);
  });

  it('ends when the player walks out of the foundry', () => {
    const s = foundry();
    const inside = tileCentre(arrivalTile('foundry', 0));
    movePlayer(s, inside.x, inside.y);
    run(s, 1, { toggleBuild: true });
    runUntil(s, (x) => x.roomId === HALL, 60, { moveX: 1 });
    expect(s.building).toBe(false);
  });

  it('ignores fire, use, a slot pick and harvest, but not moving, rolling or building', () => {
    const s = foundry();
    run(s, 1, { toggleBuild: true });
    s.inventory.bomb = 2;
    placeNode(s, 'tree', s.player.x + 20, s.player.y, 'foundry');
    const selected = s.hotbar.selected;
    run(s, 1, { fire: true, use: true, aimX: s.player.x + 100, aimY: s.player.y, interact: true, selectSlot: 3 });
    expect(s.arrows).toEqual([]);
    expect(s.hotbar.selected).toBe(selected);
    expect(s.inventory.arrow).toBe(30);
    expect(s.harvest).toBeNull();
    const x = s.player.x;
    run(s, 1, { moveX: -1, dodge: true });
    expect(s.player.x).toBeLessThan(x);
    expect(s.player.rollTick).toBeGreaterThan(0);
    run(s, 1, { place: { pieceId: 'conduit', tx: 3, ty: 3, facing: 'up' } });
    run(s, 1, { pickUp: null, place: { pieceId: 'hopper', tx: 3, ty: 4, facing: 'up' } });
    expect(s.foundry.pieces.map((p) => p.pieceId)).toEqual(['conduit', 'hopper']);
    run(s, 1, { pickUp: { tx: 3, ty: 3 } });
    expect(s.foundry.pieces.map((p) => p.pieceId)).toEqual(['hopper']);
  });
});
