import { describe, expect, it } from 'vitest';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { claim } from '../../src/sim/claims';
import { createSim, type SimState } from '../../src/sim/state';
import { TUTORIAL_START } from '../../src/data/player';
import { arena, atEntrance, atPylon, die, run, runUntil } from './fight';

// 042.2: the game saves on entering the foundry, by any way in: the door, fast travel, and waking there after a KO.
// The sim reports each entry once, as a `foundryArrivals` event; render writes the save on that tick.

/** Every arrival event over `ticks` ticks of `cmd`, stopping once the player is in the foundry. */
function arrivals(s: SimState, ticks: number, cmd: Parameters<typeof run>[2] = {}): { via: string }[] {
  const seen: { via: string }[] = [];
  for (let i = 0; i < ticks; i++) {
    run(s, 1, cmd);
    seen.push(...s.events.foundryArrivals);
  }
  return seen;
}

describe('saving triggers (042.2)', () => {
  it('walking through the door emits one arrival, on the tick the haul is banked', () => {
    const s = arena();
    atEntrance(s);
    s.inventory = { wood: 3 };
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
    expect(s.events.foundryArrivals).toEqual([{ via: 'door' }]);
    expect(s.banked).toEqual({ wood: 3 });
    expect(arrivals(s, 30)).toEqual([]);
  });

  it('fast travel from a claimed pylon emits one arrival', () => {
    const s = arena();
    claim(s, 'shrine');
    atPylon(s);
    const seen = arrivals(s, 1, { pylon: 'travel' });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(seen).toEqual([{ via: 'travel' }]);
  });

  it('waking in the foundry after a KO emits one arrival', () => {
    const s = arena();
    s.gates.foundry = true;
    die(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.events.foundryArrivals).toEqual([{ via: 'wake' }]);
    expect(s.events.woke).toBe(true);
  });

  it('waking at the start stone before the foundry opens is no arrival', () => {
    const s = createSim(7, { start: TUTORIAL_START });
    die(s);
    expect(s.roomId).not.toBe(FOUNDRY_ROOM);
    expect(s.events.foundryArrivals).toEqual([]);
  });

  it('a pylon deposit banks but is no arrival', () => {
    const s = arena();
    claim(s, 'shrine');
    atPylon(s);
    s.inventory = { wood: 2 };
    const seen = arrivals(s, 1, { pylon: 'deposit' });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    expect(s.events.stashDeposits.length + s.events.banks.length).toBeGreaterThan(0);
    expect(seen).toEqual([]);
  });
});
