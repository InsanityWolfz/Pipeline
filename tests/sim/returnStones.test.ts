import { describe, expect, it } from 'vitest';
import { BOSS_ARENAS } from '../../src/data/arenas';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { SAVE_VERSION } from '../../src/data/save';
import { RETURN_STONE, RETURN_STONES, returnStoneDef } from '../../src/data/returnStones';
import { FOUNDRY_ROOM, SANDBOX_ROOM, WALKABLE } from '../../src/data/rooms';
import type { TilePos } from '../../src/data/tiles';
import { gapTo } from '../../src/sim/claims';
import { packGround } from '../../src/sim/population';
import { createSandboxSim } from '../../src/sim/sandbox';
import { makeEnvelope, readSave, snapshot } from '../../src/sim/save';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { insideTiles, tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { die, movePlayer, run, SEED } from './fight';
import { wokenStonesHere } from '../../src/sim/returnStones';

// 072: a return waystone just outside each boss arena's door, dormant until the player first walks within reach of it
// outside the arena, then woken for good.

const FORUM = returnStoneDef('sunken-forum-waystone');

/** The Hollows start (the shrine claimed), nobody about, the player standing on a tile. */
function hollowsAt(t: TilePos): SimState {
  const s = createSim(SEED, { start: HOLLOWS_START });
  s.enemies = [];
  const c = tileCentre(t);
  movePlayer(s, c.x, c.y);
  return s;
}

/** Tiles reachable on foot from `from` in a room's rows (a stone's own tile counts as solid). */
function reach(roomId: string, from: TilePos, solid: readonly TilePos[]): Set<string> {
  const rows = WORLD[roomId]?.rows ?? [];
  const key = (t: TilePos) => `${t.tx},${t.ty}`;
  const blocked = new Set(solid.map(key));
  const seen = new Set([key(from)]);
  const queue = [from];
  for (let i = 0; i < queue.length && i < 20000; i++) {
    const t = queue[i] ?? from;
    for (const n of [{ tx: t.tx + 1, ty: t.ty }, { tx: t.tx - 1, ty: t.ty }, { tx: t.tx, ty: t.ty + 1 }, { tx: t.tx, ty: t.ty - 1 }]) {
      const symbol = rows[n.ty]?.[n.tx];
      if (symbol === undefined || !WALKABLE.includes(symbol) || blocked.has(key(n)) || seen.has(key(n))) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return seen;
}

describe('return stones (072): data', () => {
  it('one stands outside each boss arena, named after it', () => {
    expect(RETURN_STONES.map((s) => [s.arena, s.name])).toEqual([
      ['sunken-forum', 'Sunken Forum door'],
      ['anvil-hall', 'Anvil Hall door'],
      ['crown-spire', 'Crown Spire door'],
    ]);
    expect(RETURN_STONES.map((s) => s.arena)).toEqual(BOSS_ARENAS.map((a) => a.id));
    for (const s of RETURN_STONES) expect(s.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('each stands on open ground outside its arena, in the overworld and the sandbox, reachable from its door', () => {
    for (const roomId of [OVERWORLD_ROOM, SANDBOX_ROOM]) {
      const room = WORLD[roomId];
      expect(room?.returnStones?.map((s) => s.id)).toEqual(RETURN_STONES.map((s) => s.id));
      for (const s of RETURN_STONES) {
        const arena = BOSS_ARENAS.find((a) => a.id === s.arena);
        if (!arena) throw new Error(`no arena ${s.arena}`);
        for (const t of [s, s.arrive]) {
          expect(WALKABLE).toContain(room?.rows[t.ty]?.[t.tx]);
          const inBounds = t.tx >= arena.bounds.x0 && t.tx <= arena.bounds.x1 && t.ty >= arena.bounds.y0 && t.ty <= arena.bounds.y1;
          expect(inBounds).toBe(false);
        }
        // Off the tiles straight out from the door.
        expect(arena.door.tiles.some((d) => d.tx === s.tx)).toBe(false);
        const seen = reach(roomId, arena.door.leaveTo, RETURN_STONES);
        expect(seen.has(`${s.arrive.tx},${s.arrive.ty}`)).toBe(true);
        // Beside the stone, so the door's outside is a short walk away.
        expect(Math.abs(s.tx - arena.door.leaveTo.tx) + Math.abs(s.ty - arena.door.leaveTo.ty)).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('return stones (072): waking', () => {
  it('is solid', () => {
    const s = hollowsAt({ tx: FORUM.tx - 2, ty: FORUM.ty });
    run(s, 60, { moveX: 1 });
    expect(s.player.x).toBeLessThan(tileCentre(FORUM).x - 16);
  });

  it('is dormant on a new game and wakes once when the player first comes within reach outside', () => {
    const s = hollowsAt({ tx: FORUM.tx, ty: FORUM.ty - 6 });
    run(s, 1);
    expect(s.returnStones).toEqual([]);
    expect(summarize(s).returnStones.find((r) => r.id === FORUM.id)).toMatchObject({ woken: false, name: 'Sunken Forum door' });
    // Walking down toward it: it wakes on the tick the feet come within the reach.
    let woke = -1;
    for (let i = 0; i < 200 && woke < 0; i++) {
      run(s, 1, { moveY: 1 });
      if (s.events.returnWakes.length > 0) woke = i;
    }
    expect(s.events.returnWakes).toEqual([{ id: FORUM.id }]);
    expect(gapTo(s, FORUM)).toBeLessThanOrEqual(RETURN_STONE.wakeReach);
    expect(s.returnStones).toEqual([FORUM.id]);
    // Once: no second event while standing there, and it stays woken walking away.
    run(s, 30);
    run(s, 60, { moveY: -1 });
    expect(s.returnStones).toEqual([FORUM.id]);
    expect(summarize(s).returnStones.find((r) => r.id === FORUM.id)?.woken).toBe(true);
  });

  it("the door's outside tile wakes it: walking out of the arena passes it", () => {
    for (const stone of RETURN_STONES) {
      const arena = BOSS_ARENAS.find((a) => a.id === stone.arena);
      if (!arena) throw new Error('no arena');
      const s = hollowsAt(arena.door.leaveTo);
      run(s, 1);
      expect(s.returnStones).toEqual([stone.id]);
    }
  });

  it('never wakes from inside the arena, even on the floor nearest it', () => {
    for (const stone of RETURN_STONES) {
      const arena = BOSS_ARENAS.find((a) => a.id === stone.arena);
      if (!arena) throw new Error('no arena');
      // The inside floor tile nearest the stone, across the wall.
      const tx = Math.min(Math.max(stone.tx, arena.inside.x0), arena.inside.x1);
      const ty = Math.min(Math.max(stone.ty, arena.inside.y0), arena.inside.y1);
      const s = hollowsAt({ tx, ty });
      expect(insideTiles(arena.inside, s.player.x, s.player.y)).toBe(true);
      expect(gapTo(s, stone)).toBeLessThanOrEqual(RETURN_STONE.wakeReach);
      run(s, 5);
      expect(s.returnStones).toEqual([]);
    }
  });

  it('stays woken through a KO and a save', () => {
    const s = hollowsAt(FORUM.arrive);
    run(s, 1);
    expect(s.returnStones).toEqual([FORUM.id]);
    die(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.returnStones).toEqual([FORUM.id]);
    const read = readSave(JSON.stringify(makeEnvelope(snapshot(s), { build: 'x', savedAt: 'now', endCardSeen: false })));
    if (read.status !== 'ok') throw new Error(read.status);
    expect(read.state.returnStones).toEqual([FORUM.id]);
    // SAVE_VERSION 23 (22 is 069's): main's version 22 save reads as too old, by Shaun's rule (no migration).
    expect(SAVE_VERSION).toBe(23);
    const v22 = readSave(JSON.stringify({ ...makeEnvelope(snapshot(s), { build: 'x', savedAt: 'now', endCardSeen: false }), version: 22 }));
    expect(v22.status).toBe('too-old');
  });

  it('the sandbox shows all three woken; a new game none', () => {
    const sb = createSandboxSim(SEED);
    expect(sb.returnStones).toEqual(RETURN_STONES.map((s) => s.id));
    expect(summarize(sb).returnStones.every((r) => r.woken)).toBe(true);
    expect(createSim(SEED).returnStones).toEqual([]);
  });
});

describe('return stones (072.9): the minimap marks the woken ones', () => {
  it("none while dormant; once woken, the Forum's in the overworld; none from the foundry; the sandbox's three", () => {
    const s = hollowsAt({ tx: FORUM.tx, ty: FORUM.ty - 6 });
    run(s, 1);
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    expect(wokenStonesHere(s)).toEqual([]);
    const at = tileCentre(FORUM.arrive);
    movePlayer(s, at.x, at.y);
    run(s, 1);
    expect(wokenStonesHere(s).map((r) => [r.id, r.name])).toEqual([[FORUM.id, 'Sunken Forum door']]);
    die(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(wokenStonesHere(s)).toEqual([]);
    const sb = createSandboxSim(SEED);
    expect(sb.roomId).toBe(SANDBOX_ROOM);
    expect(wokenStonesHere(sb)).toEqual(RETURN_STONES);
  });
});

describe('return stones (072): the spawn margin', () => {
  it('no pack spawns within the margin of a stone (data), so arriving is never an ambush', () => {
    const m = RETURN_STONE.packMargin;
    expect(m).toBeGreaterThan(0);
    for (const s of RETURN_STONES) {
      for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) expect(packGround(s.tx + dx, s.ty + dy), `${s.id} ${dx},${dy}`).toBe(false);
    }
  });

  it('a pack that spawns lands outside every margin', () => {
    const s = hollowsAt(FORUM.arrive);
    s.populated = true;
    s.gates.emberworks = true;
    s.gates.stormcrown = true;
    // Far from every stone's view, so their ground isn't kept out by the camera.
    s.roomId = FOUNDRY_ROOM;
    run(s, 2);
    const m = RETURN_STONE.packMargin * 32;
    const packs = s.enemies.filter((e) => e.group.startsWith('pop-'));
    expect(packs.length).toBeGreaterThan(0);
    for (const e of packs) for (const r of RETURN_STONES) expect(Math.max(Math.abs(e.homeX - tileCentre(r).x), Math.abs(e.homeY - tileCentre(r).y))).toBeGreaterThan(m);
  });
});
