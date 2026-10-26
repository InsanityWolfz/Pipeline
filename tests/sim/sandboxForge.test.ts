import { describe, expect, it } from 'vitest';
import { ANVIL_ARENA, arenaOf } from '../../src/data/arenas';
import { FIRE_ROUNDS } from '../../src/data/objectives';
import { SANDBOX_ROOM, TILE, WALKABLE } from '../../src/data/rooms';
import { KIT_COUNT, REGION_RINGS, SANDBOX, SANDBOX_ARENAS } from '../../src/data/sandbox';
import { arenaLocked } from '../../src/sim/arenaLock';
import { createSandboxSim, SPAWN_GROUP, type SandboxCommand } from '../../src/sim/sandbox';
import { roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { FORGE } from './hall';

// 060 in the sandbox (044): the Anvil Hall at its Emberworks tiles with the Forgewright waiting in it, its reset, the
// new items and every Fire round in the kit, the Forgewright in the spawn panel, and ring 4 offered.

const once = (s: SimState, sandbox: SandboxCommand): void => run(s, 1, { sandbox });
const forge = (s: SimState) => s.enemies.filter((e) => e.roomId === SANDBOX_ROOM && e.enemyId === 'forgewright');

describe('the sandbox’s Emberworks (060)', () => {
  it('has the Anvil Hall at its Emberworks tiles, its door open, the Forgewright at its start', () => {
    const s = createSandboxSim(1);
    expect(SANDBOX_ARENAS.map((a) => a.boss)).toContain('forgewright');
    expect(ANVIL_ARENA.rooms).toContain(SANDBOX_ROOM);
    const rows = roomById(SANDBOX_ROOM).rows;
    for (const t of ANVIL_ARENA.walls) expect(rows[t.ty]?.[t.tx]).toBe(t.symbol);
    for (const t of ANVIL_ARENA.door.tiles) expect(rows[t.ty]?.[t.tx]).toBe(TILE.arenaDoor);
    expect(WALKABLE).toContain(rows[ANVIL_ARENA.door.leaveTo.ty]?.[ANVIL_ARENA.door.leaveTo.tx]);
    expect(SANDBOX.width).toBeGreaterThan(ANVIL_ARENA.bounds.x1 + 1);
    expect(forge(s).map((e) => ({ x: e.x, y: e.y }))).toEqual([tileCentre(ANVIL_ARENA.start)]);
    expect(summarize(s).arenas.find((a) => a.id === 'anvil-hall')).toMatchObject({ unlocked: true, inside: false });
  });

  it('wakes and locks the hall as in the Emberworks, and its reset brings it back whole', () => {
    const s = createSandboxSim(1);
    const inside = tileCentre({ tx: ANVIL_ARENA.start.tx, ty: ANVIL_ARENA.start.ty + 4 });
    movePlayer(s, inside.x, inside.y);
    once(s, { kind: 'god', on: true });
    run(s, 2);
    expect(arenaLocked(s, ANVIL_ARENA, SANDBOX_ROOM)).toBe(true);
    const f = forge(s)[0];
    if (!f) throw new Error('no Forgewright');
    Object.assign(f, { heat: 60, health: 1200 });
    f.bellows[0] = { health: 0, patch: 100 };
    once(s, { kind: 'reset', boss: 'forgewright' });
    const again = forge(s)[0];
    expect(again).toMatchObject({ health: FORGE.maxHealth, heat: 0, mode: 'idle', bellows: [{ health: 150, patch: 0 }, { health: 150, patch: 0 }] });
  });

  it('carries the new items and every Fire round', () => {
    const s = createSandboxSim(1);
    for (const id of ['cinderite', 'forgewright-core', 'forge-rivet', ...FIRE_ROUNDS]) expect(s.inventory[id], id).toBe(KIT_COUNT);
  });

  it('offers ring 4, the Emberworks’, and spawns the Forgewright at its own numbers there', () => {
    expect(REGION_RINGS[3]).toBe(4);
    // 064: and the Stormcrown's 5 (tests/sim/sandboxStorm.test.ts).
    expect(SANDBOX.rings).toEqual([1, 2, 3, 4, 5]);
    const s = createSandboxSim(1);
    once(s, { kind: 'spawn', enemyId: 'forgewright', ring: 4, champion: false, count: 1 });
    const spawned = s.enemies.filter((e) => e.group === SPAWN_GROUP);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]).toMatchObject({ enemyId: 'forgewright', ring: 4, health: FORGE.maxHealth });
    expect(arenaOf('forgewright')).toBe(ANVIL_ARENA);
  });
});
