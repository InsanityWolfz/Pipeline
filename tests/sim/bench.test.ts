import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../src/data/claims';
import { FOUNDRY_ROOM, TILE } from '../../src/data/rooms';
import { fixtureInReach } from '../../src/sim/claims';
import { fixtureDef } from '../../src/sim/fixtures';
import { roomById } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { foundry } from './foundryKit';

// 052 (C.4): the identification bench sits just inside the foundry's door (Shaun: "move the identification bench over
// towards the door ... It's right when you walk in"), clear of every other fixture, and works from there.

const room = roomById(FOUNDRY_ROOM);
const door = room.doorways?.[0];
const arrive = room.spawn;

describe('the bench by the door', () => {
  it('stands on open floor beside where the player arrives through the door, against the door\'s wall', () => {
    const bench = fixtureDef('identification-bench');
    expect(door).toBeDefined();
    expect(room.rows[bench.ty]?.[bench.tx]).toBe(TILE.floor);
    expect(Math.abs(bench.tx - arrive.tx) + Math.abs(bench.ty - arrive.ty)).toBe(1);
    expect(bench.tx).toBe((door?.tx ?? 0) - 1);
    expect([bench.tx, bench.ty]).not.toEqual([arrive.tx, arrive.ty]);
    // Clear of every other fixture: not on, nor beside, another's tile.
    for (const f of FIXTURES.filter((f) => f.id !== bench.id)) expect(Math.abs(f.tx - bench.tx) + Math.abs(f.ty - bench.ty), f.id).toBeGreaterThan(1);
  });

  it('is in reach as the player walks in, and E there is the bench\'s, not the waystone\'s or the stash\'s', () => {
    const s = foundry();
    const by = tileCentre(arrive);
    movePlayer(s, by.x, by.y);
    expect(fixtureInReach(s, 'bench')).toBeDefined();
    expect(fixtureInReach(s, 'stash')).toBeUndefined();
    expect(fixtureInReach(s, 'waystone')).toBeUndefined();
    s.inventory['unidentified-armor'] = 1;
    run(s, 1, { identify: true });
    expect(s.inventory['unidentified-armor'] ?? 0).toBe(0);
  });
});
