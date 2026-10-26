import { describe, expect, it } from 'vitest';
import { CROWN_ARENA } from '../../src/data/arenas';
import { LIGHTNING_ROUNDS } from '../../src/data/objectives';
import { SANDBOX_ROOM, TILE, WALKABLE } from '../../src/data/rooms';
import { KIT_COUNT, REGION_RINGS, SANDBOX, SANDBOX_ARENAS } from '../../src/data/sandbox';
import { STORMCROWN } from '../../src/data/stormcrown';
import { arenaLocked } from '../../src/sim/arenaLock';
import { hitRod } from '../../src/sim/conductorRods';
import { createSandboxSim, SPAWN_GROUP, type SandboxCommand } from '../../src/sim/sandbox';
import { roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { CONDUCTOR } from './spire';

// 064 in the sandbox (044): the Crown Spire at its Stormcrown tiles with the Conductor waiting in it, its reset, the
// new items and every Lightning round in the kit, the Conductor in the spawn panel, and ring 5 offered.

const once = (s: SimState, sandbox: SandboxCommand): void => run(s, 1, { sandbox });
const conductors = (s: SimState) => s.enemies.filter((e) => e.roomId === SANDBOX_ROOM && e.enemyId === 'conductor');

describe('the sandbox’s Stormcrown (064)', () => {
  it('has the Crown Spire at its Stormcrown tiles, its door open, the Conductor at its start', () => {
    const s = createSandboxSim(1);
    expect(SANDBOX_ARENAS.map((a) => a.boss)).toContain('conductor');
    expect(CROWN_ARENA.rooms).toContain(SANDBOX_ROOM);
    const rows = roomById(SANDBOX_ROOM).rows;
    for (const t of CROWN_ARENA.walls) expect(rows[t.ty]?.[t.tx]).toBe(t.symbol);
    for (const t of CROWN_ARENA.door.tiles) expect(rows[t.ty]?.[t.tx]).toBe(TILE.arenaDoor);
    expect(WALKABLE).toContain(rows[CROWN_ARENA.door.leaveTo.ty]?.[CROWN_ARENA.door.leaveTo.tx]);
    // Its floor clear inside: no pen or other arena overlaps it.
    for (let ty = CROWN_ARENA.inside.y0; ty <= CROWN_ARENA.inside.y1; ty++) for (let tx = CROWN_ARENA.inside.x0; tx <= CROWN_ARENA.inside.x1; tx++) expect(rows[ty]?.[tx]).toBe(TILE.floor);
    expect(conductors(s).map((e) => ({ x: e.x, y: e.y }))).toEqual([tileCentre(CROWN_ARENA.start)]);
    expect(summarize(s).arenas.find((a) => a.id === 'crown-spire')).toMatchObject({ unlocked: true, inside: false });
  });

  it('wakes and locks the spire as in the Stormcrown, and its reset brings it back whole', () => {
    const s = createSandboxSim(1);
    const inside = tileCentre(CROWN_ARENA.middle);
    movePlayer(s, inside.x, inside.y);
    once(s, { kind: 'god', on: true });
    run(s, 2);
    expect(arenaLocked(s, CROWN_ARENA, SANDBOX_ROOM)).toBe(true);
    const c = conductors(s)[0];
    if (!c) throw new Error('no Conductor');
    c.health = 1200;
    hitRod(s, c, 0, 500, { knock: 0, flash: true, damageType: 'physical' });
    once(s, { kind: 'reset', boss: 'conductor' });
    const again = conductors(s)[0];
    expect(again).toMatchObject({ health: CONDUCTOR.maxHealth, mode: 'idle' });
    expect(again?.conductor.rods.every((r) => r.health === 200 && r.regrow === 0)).toBe(true);
  });

  it('carries the new items and every Lightning round', () => {
    const s = createSandboxSim(1);
    for (const id of ['stormglass', 'conductor-core', 'storm-coil', ...LIGHTNING_ROUNDS]) expect(s.inventory[id], id).toBe(KIT_COUNT);
  });

  it('offers ring 5, the Stormcrown’s, and spawns the Conductor at its own numbers there', () => {
    expect(REGION_RINGS[STORMCROWN.region]).toBe(5);
    expect(SANDBOX.rings).toContain(5);
    const s = createSandboxSim(1);
    once(s, { kind: 'spawn', enemyId: 'conductor', ring: 5, champion: false, count: 1 });
    const spawned = s.enemies.filter((e) => e.group === SPAWN_GROUP);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]).toMatchObject({ enemyId: 'conductor', ring: 5, health: CONDUCTOR.maxHealth });
  });
});
