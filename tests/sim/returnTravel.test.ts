import { describe, expect, it } from 'vitest';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { RETURN_STONES, returnStoneDef } from '../../src/data/returnStones';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import type { TilePos } from '../../src/data/tiles';
import { travelDestinations } from '../../src/sim/claims';
import { fixtureDef } from '../../src/sim/fixtures';
import { interactTarget } from '../../src/sim/interactables';
import { stepReturnStones } from '../../src/sim/returnStones';
import { createSandboxSim } from '../../src/sim/sandbox';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { command, movePlayer, run, SEED } from './fight';

// 072: a woken return stone is a fast travel destination, from the foundry's waystone and from every claimed pylon's
// menu, named after its arena; E at it offers "Travel to foundry". No deposit: travel to it banks nothing.

const FORUM = returnStoneDef('sunken-forum-waystone');
const ANVIL = returnStoneDef('anvil-hall-waystone');
const SHRINE_PYLON = WORLD[OVERWORLD_ROOM]?.pylons?.find((p) => p.site === SHRINE_SITE) ?? { tx: 0, ty: 0 };
const WAYSTONE = fixtureDef('waystone');

/** The Hollows start (the shrine claimed, so the foundry has its waystone), nobody about, these stones woken. */
function game(woken: readonly string[] = [FORUM.id]): SimState {
  const s = createSim(SEED, { start: HOLLOWS_START });
  s.enemies = [];
  s.returnStones = [...woken];
  return s;
}

/** Stands the player at a tile's centre in a room. */
function standAt(s: SimState, roomId: string, t: TilePos): void {
  s.roomId = roomId;
  const c = tileCentre(t);
  movePlayer(s, c.x, c.y);
}

const at = (s: SimState) => ({ room: s.roomId, x: s.player.x, y: s.player.y });

describe('return stones (072): the travel list', () => {
  it('lists the claimed pylons, then the woken stones in the order they woke, by name', () => {
    expect(travelDestinations(game([])).map((d) => d.name)).toEqual(['Shrine']);
    const s = game([ANVIL.id, FORUM.id]);
    expect(travelDestinations(s).map((d) => [d.id, d.name])).toEqual([
      [SHRINE_SITE, 'Shrine'],
      [ANVIL.id, 'Anvil Hall door'],
      [FORUM.id, 'Sunken Forum door'],
    ]);
    expect(travelDestinations(s)[2]).toMatchObject({ roomId: OVERWORLD_ROOM, tile: FORUM.arrive });
  });
});

describe("return stones (072): from the foundry's waystone", () => {
  it('a claimed pylon and a woken stone: E opens the menu (travels nowhere); its row travels to the stone, banking nothing', () => {
    const s = game();
    standAt(s, FOUNDRY_ROOM, { tx: WAYSTONE.tx, ty: WAYSTONE.ty + 1 });
    run(s, 1, { interact: true });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(interactTarget(s)?.kind).toBe('waystone');
    s.inventory = { stone: 4 };
    s.banked = {};
    stepSim(s, command({ travel: FORUM.id }));
    expect(at(s)).toEqual({ room: OVERWORLD_ROOM, ...tileCentre(FORUM.arrive) });
    expect(s.events.travels).toEqual([{ from: FOUNDRY_ROOM, to: OVERWORLD_ROOM }]);
    expect(s.events.banks).toEqual([]);
    expect(s.banked).toEqual({});
  });

  it("a dormant stone's id travels nowhere", () => {
    const s = game();
    standAt(s, FOUNDRY_ROOM, { tx: WAYSTONE.tx, ty: WAYSTONE.ty + 1 });
    stepSim(s, command({ travel: ANVIL.id }));
    expect(s.roomId).toBe(FOUNDRY_ROOM);
  });
});

describe("return stones (072): from a claimed pylon's menu", () => {
  it("travels to a woken stone; a dormant one's id, or away from the pylon, does nothing", () => {
    const s = game();
    standAt(s, OVERWORLD_ROOM, { tx: SHRINE_PYLON.tx, ty: SHRINE_PYLON.ty + 1 });
    stepSim(s, command({ travel: ANVIL.id }));
    expect(at(s)).toEqual({ room: OVERWORLD_ROOM, ...tileCentre({ tx: SHRINE_PYLON.tx, ty: SHRINE_PYLON.ty + 1 }) });
    stepSim(s, command({ travel: FORUM.id }));
    expect(at(s)).toEqual({ room: OVERWORLD_ROOM, ...tileCentre(FORUM.arrive) });
    expect(s.events.banks).toEqual([]);
    const away = game();
    standAt(away, OVERWORLD_ROOM, { tx: SHRINE_PYLON.tx, ty: SHRINE_PYLON.ty + 6 });
    const before = at(away);
    stepSim(away, command({ travel: FORUM.id }));
    expect(at(away)).toEqual(before);
  });
});

describe('return stones (072): E at a stone', () => {
  it('a woken stone takes E (its prompt shows, not the door\'s) and "Travel to foundry" goes home, banking there', () => {
    for (const stone of RETURN_STONES) {
      const w = game([stone.id]);
      standAt(w, OVERWORLD_ROOM, stone.arrive);
      run(w, 1);
      expect(interactTarget(w), stone.id).toMatchObject({ kind: 'return-stone', ...tileCentre(stone) });
    }
    const s = game();
    standAt(s, OVERWORLD_ROOM, FORUM.arrive);
    run(s, 1);
    s.inventory = { stone: 4 };
    s.banked = {};
    stepSim(s, command({ travel: FOUNDRY_ROOM }));
    expect(at(s)).toEqual({ room: FOUNDRY_ROOM, ...tileCentre(roomById(FOUNDRY_ROOM).spawn) });
    expect(s.events.foundryArrivals).toEqual([{ via: 'travel' }]);
    expect(s.banked).toEqual({ stone: 4 });
  });

  it('a dormant stone has no prompt, takes no E and travels nowhere (it wakes as the player comes by, before E)', () => {
    const s = game([]);
    standAt(s, OVERWORLD_ROOM, ANVIL.arrive);
    // Stood straight onto its tile (no tick yet): it hasn't woken.
    expect(interactTarget(s)?.kind).not.toBe('return-stone');
    const e = command({ interact: true });
    expect(stepReturnStones(s, e)).toBe(e);
    stepReturnStones(s, command({ travel: FOUNDRY_ROOM }));
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    // A tick there wakes it (the wake runs after the player moves, before E is taken).
    run(s, 1);
    expect(s.returnStones).toEqual([ANVIL.id]);
    expect(stepReturnStones(s, e).interact).toBe(false);
  });

  it('out of reach, nothing', () => {
    const s = game();
    standAt(s, OVERWORLD_ROOM, { tx: FORUM.tx, ty: FORUM.ty + 3 });
    run(s, 1);
    expect(interactTarget(s)?.kind).not.toBe('return-stone');
    stepSim(s, command({ travel: FOUNDRY_ROOM }));
    expect(s.roomId).toBe(OVERWORLD_ROOM);
  });

  it('in the sandbox, its stones stand woken but travel nowhere: it has no way to the foundry', () => {
    const s = createSandboxSim(SEED);
    const room = s.roomId;
    const c = tileCentre(FORUM.arrive);
    movePlayer(s, c.x, c.y);
    run(s, 1);
    expect(interactTarget(s)?.kind).not.toBe('return-stone');
    stepSim(s, command({ travel: FOUNDRY_ROOM }));
    expect(s.roomId).toBe(room);
  });

  it('replays identically', () => {
    const play = () => {
      const s = game();
      standAt(s, OVERWORLD_ROOM, { tx: SHRINE_PYLON.tx, ty: SHRINE_PYLON.ty + 1 });
      stepSim(s, command({ travel: FORUM.id }));
      stepSim(s, command({ travel: FOUNDRY_ROOM }));
      run(s, 30);
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
