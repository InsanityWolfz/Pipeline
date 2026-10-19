import { describe, expect, it } from 'vitest';
import { FIXTURES, portPerMinute, portPylons, portTicks, SITE_SUPPLY, SUPPLY_TICKS } from '../../src/data/claims';
import { SHRINE_SITE } from '../../src/data/rooms';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { claim } from '../../src/sim/claims';
import { fixtureDef, portFront } from '../../src/sim/fixtures';
import type { ConduitState, CrateState } from '../../src/sim/pieces';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { command, die, run, SEED } from './fight';
import { foundry, put } from './foundryKit';

// 028: one fixed supply port per raw on the foundry's west wall. A port stands once
// a claimed site supplies its raw, and pushes one of it every round(SUPPLY_TICKS / N)
// ticks, N being how many claimed sites supply it.

const RAWS = ['wood', 'stone', 'fiber', 'ley-crystal'] as const;
const TILES: Record<string, [number, number]> = { wood: [1, 4], stone: [1, 6], fiber: [1, 8], 'ley-crystal': [1, 10] };

const portOf = (raw: string) => {
  const def = FIXTURES.find((f) => f.kind === 'port' && f.raw === raw);
  if (!def) throw new Error(`no ${raw} port`);
  return def;
};

describe('the port data', () => {
  it('is one port per raw on the west wall, facing into the room, and the bench stays at (1, 12)', () => {
    for (const raw of RAWS) {
      const def = portOf(raw);
      expect([def.tx, def.ty], raw).toEqual(TILES[raw]);
      expect(def.facing).toBe('right');
      expect(def.claim).toBeUndefined();
    }
    expect(FIXTURES.filter((f) => f.kind === 'port')).toHaveLength(4);
    expect(FIXTURES.some((f) => f.id === 'supply-port')).toBe(false);
    const bench = fixtureDef('identification-bench');
    expect([bench.tx, bench.ty]).toEqual([1, 12]);
  });

  it('the shrine sends all four raws; SUPPLY_TICKS is 240, 15 a minute per pylon', () => {
    expect(SITE_SUPPLY[SHRINE_SITE]).toEqual(['wood', 'stone', 'fiber', 'ley-crystal']);
    expect(SUPPLY_TICKS).toBe(240);
    expect(portPerMinute(1)).toBe(15);
  });

  it('portTicks gives 240, 120 and 80 ticks for 1, 2 and 3 pylons, counting each supplying claim', () => {
    const table = { shrine: ['wood', 'stone'], grove: ['wood'], quarry: ['wood', 'stone'] };
    expect(portPylons(['shrine'], 'wood', table)).toBe(1);
    expect(portPylons(['shrine', 'grove'], 'wood', table)).toBe(2);
    expect(portPylons(['shrine', 'grove', 'quarry'], 'wood', table)).toBe(3);
    expect(portPylons(['shrine', 'grove', 'quarry'], 'stone', table)).toBe(2);
    expect(portPylons(['grove'], 'fiber', table)).toBe(0);
    expect([1, 2, 3].map(portTicks)).toEqual([240, 120, 80]);
    expect([1, 2, 3].map(portPerMinute)).toEqual([15, 30, 45]);
  });
});

describe('supply ports', () => {
  it('none stand before a claim', () => {
    const s = createSim(SEED);
    expect(s.fixtures.some((f) => fixtureDef(f.id).kind === 'port')).toBe(false);
    expect(summarize(s).ports).toEqual([]);
  });

  it('the shrine claim adds all four at ×1, with the waystone', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    expect(summarize(s).ports).toEqual(
      RAWS.map((raw) => ({ id: portOf(raw).id, raw, tx: TILES[raw]?.[0], ty: TILES[raw]?.[1], pylons: 1, perMinute: 15, waiting: false })),
    );
    expect(s.fixtures.some((f) => f.id === 'waystone')).toBe(true);
  });

  it('a claim clears any piece standing on a port tile into the inventory', () => {
    const s = foundry();
    put(s, 'crate', 1, 6);
    claim(s, SHRINE_SITE);
    expect(s.foundry.pieces).toEqual([]);
    expect(s.fixtures.some((f) => f.id === portOf('stone').id)).toBe(true);
  });

  it('each pushes only its own raw, every SUPPLY_TICKS, even while the player is out', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    const crates = RAWS.map((raw) => {
      const front = portFront({ id: portOf(raw).id });
      return put<CrateState>(s, 'crate', front.tx, front.ty);
    });
    s.roomId = OVERWORLD_ROOM;
    const at: Record<string, number[]> = {};
    for (let t = 0; t < SUPPLY_TICKS * 3 + 5; t++) {
      run(s, 1);
      for (const e of s.events.supplies) (at[e.itemId] ??= []).push(s.tick);
    }
    for (const [i, raw] of RAWS.entries()) {
      expect(Object.keys(crates[i]?.contents ?? {}), raw).toEqual([raw]);
      expect(crates[i]?.contents[raw], raw).toBe(3);
      const ticks = at[raw] ?? [];
      expect(ticks.slice(1).map((t, k) => t - (ticks[k] ?? 0)), raw).toEqual([SUPPLY_TICKS, SUPPLY_TICKS]);
    }
  });

  it('a raw the next piece refuses waits in its port, and the line backs up', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    const wood = s.fixtures.find((f) => f.id === portOf('wood').id);
    if (!wood) throw new Error('no wood port');
    const front = portFront(wood);
    const c = put<ConduitState>(s, 'conduit', front.tx, front.ty, 'right');
    // A grinder takes only ley crystal: the first wood sticks at the end of the conduit, the next waits in the port.
    put(s, 'grinder', front.tx + 1, front.ty, 'right');
    run(s, SUPPLY_TICKS * 3);
    expect(c.item).toBe('wood');
    expect(wood.item).toBe('wood');
    expect(summarize(s).ports.find((p) => p.raw === 'wood')?.waiting).toBe(true);
    expect(summarize(s).ports.find((p) => p.raw === 'stone')?.waiting).toBe(true);
  });

  it('records each item a piece takes from a port', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    const front = portFront({ id: portOf('fiber').id });
    put(s, 'crate', front.tx, front.ty);
    run(s, SUPPLY_TICKS - 1);
    expect(s.events.portDeliveries).toEqual([]);
    run(s, 1);
    expect(s.events.portDeliveries).toEqual([{ id: portOf('fiber').id, itemId: 'fiber' }]);
  });

  it('stay through a KO', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    die(s);
    expect(summarize(s).ports.map((p) => p.raw)).toEqual([...RAWS]);
  });

  it('replay identically', () => {
    const play = () => {
      const s = foundry();
      claim(s, SHRINE_SITE);
      put(s, 'crate', 2, 4);
      stepSim(s, command());
      run(s, SUPPLY_TICKS * 2 + 3);
      return summarize(s);
    };
    const a = play();
    expect(a.ports).toHaveLength(4);
    expect(a).toEqual(play());
  });
});
