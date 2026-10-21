import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../src/data/claims';
import { TILE_SIZE } from '../../src/data/config';
import { HOLLOWS } from '../../src/data/hollows';
import { INTERACT_KINDS, INTERACT_PROMPTS, type InteractKind } from '../../src/data/interact';
import { landmarkDef } from '../../src/data/landmarks';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { FEET_BOX, TUTORIAL_START } from '../../src/data/player';
import { HOLLOWS_START } from '../../src/data/playtest';
import { interactTarget } from '../../src/sim/interactables';
import { diagrams } from '../../src/sim/research';
import { createSim, roomOf, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import type { CrateState } from '../../src/sim/pieces';
import { arena, movePlayer, placeNode, PLAYER_AT, run } from './fight';
import { DEF, forum } from './forum';
import { foundry, put, STAND } from './foundryKit';

// The in-reach E prompts (045): every interactable kind has a scene here that puts one in reach, and each must come
// back from interactTarget with a prompt in data, so a new kind can't ship without one (TypeScript holds SCENES to
// every kind in INTERACT_KINDS).

/** The player's feet just below a tile (the floor in front of a fixture or a wall piece). */
const below = (s: SimState, t: { tx: number; ty: number }) => {
  const at = tileCentre({ tx: t.tx, ty: t.ty + 1 });
  movePlayer(s, at.x, at.y);
};
const fixture = (kind: string) => {
  const f = FIXTURES.find((x) => x.kind === kind);
  if (!f) throw new Error(`no ${kind}`);
  return f;
};

const SCENES: Readonly<Record<InteractKind, () => SimState>> = {
  'tube-stone': () => {
    const s = createSim(3, { start: TUTORIAL_START });
    const stone = roomOf(s).tubeStone;
    if (!stone) throw new Error('no stone');
    below(s, stone);
    return s;
  },
  'arena-door': () => {
    const { s } = forum(160);
    run(s, 1);
    const seal = HOLLOWS.arena.door.tiles;
    const door = tileCentre(seal[Math.floor(seal.length / 2)] ?? { tx: 0, ty: 0 });
    movePlayer(s, door.x, door.y + TILE_SIZE / 2 + FEET_BOX.h / 2 + 1);
    s.enemies = s.enemies.filter((e) => e.enemyId === DEF.id);
    return s;
  },
  altar: () => {
    const s = createSim(5, { start: HOLLOWS_START });
    s.enemies = [];
    s.bossDefeats = [DEF.id];
    const a = HOLLOWS.arena.altar;
    const by = tileCentre({ tx: a.tx + 1, ty: a.ty });
    movePlayer(s, by.x, by.y);
    return s;
  },
  pylon: () => {
    const s = arena();
    const p = (roomOf(s).pylons ?? []).find((x) => x.wakes === undefined);
    if (!p) throw new Error('no pylon');
    below(s, p);
    return s;
  },
  waystone: () => {
    const s = foundry();
    s.claims = ['shrine'];
    // The shrine's claim stands the waystone up (032).
    if (!s.fixtures.some((f) => f.id === 'waystone')) s.fixtures.push({ id: 'waystone', item: null, timer: 0 });
    below(s, fixture('waystone'));
    return s;
  },
  stash: () => {
    const s = foundry();
    below(s, fixture('stash'));
    return s;
  },
  bench: () => {
    const s = foundry();
    const b = fixture('bench');
    const at = tileCentre({ tx: b.tx + 1, ty: b.ty });
    movePlayer(s, at.x, at.y);
    return s;
  },
  cache: () => {
    const def = landmarkDef('ruined-cache');
    const s = createSim(7);
    s.enemies = s.enemies.filter((e) => e.group !== def.id);
    s.roomId = OVERWORLD_ROOM;
    below(s, def.cache ?? { tx: 0, ty: 0 });
    return s;
  },
  diagram: () => {
    const s = foundry();
    const d = diagrams(s)[0];
    if (!d) throw new Error('no diagram');
    movePlayer(s, d.rect.x, d.rect.y + d.rect.h / 2 + FEET_BOX.h / 2 + 2);
    return s;
  },
  hopper: () => {
    const s = foundry();
    put(s, 'hopper', STAND.tx + 1, STAND.ty);
    return s;
  },
  crate: () => {
    const s = foundry();
    const c = put<CrateState>(s, 'crate', STAND.tx + 1, STAND.ty);
    c.contents = { wood: 2 };
    return s;
  },
  node: () => {
    const s = arena();
    placeNode(s, 'ley-vein', PLAYER_AT.x + FEET_BOX.w / 2 + 12, PLAYER_AT.y);
    return s;
  },
};

describe('the in-reach E prompts (045)', () => {
  it('every interactable kind has a scene and a prompt, and its scene puts it in reach', () => {
    expect(Object.keys(SCENES).sort()).toEqual([...INTERACT_KINDS].sort());
    for (const kind of INTERACT_KINDS) {
      expect(INTERACT_PROMPTS[kind], kind).toMatchObject({ key: 'E' });
      // Over its point, or beside it (052.9: the bench) at no less than its point's height.
      const { rise, beside } = INTERACT_PROMPTS[kind];
      if (beside === undefined) expect(rise, kind).toBeGreaterThan(0);
      else {
        expect(rise, kind).toBeGreaterThanOrEqual(0);
        expect(beside, kind).toBeGreaterThan(TILE_SIZE / 2);
      }
      expect(interactTarget(SCENES[kind]())?.kind, kind).toBe(kind);
    }
  });

  it('a ley crystal vein gets the same prompt as any other node (note 7)', () => {
    const s = SCENES.node();
    const t = interactTarget(s);
    expect(t).toEqual({ kind: 'node', x: s.nodes[s.nodes.length - 1]?.x, y: PLAYER_AT.y });
    for (const id of ['tree', 'rubble', 'reeds']) {
      const o = arena();
      placeNode(o, id, PLAYER_AT.x + FEET_BOX.w / 2 + 12, PLAYER_AT.y);
      expect(interactTarget(o)?.kind).toBe('node');
    }
  });

  it("the door's prompt floats over the middle of its tiles, from inside whether or not the fight is on (043.5, 055)", () => {
    const s = SCENES['arena-door']();
    const tiles = HOLLOWS.arena.door.tiles;
    const x0 = (tiles[0]?.tx ?? 0) * TILE_SIZE;
    const x1 = ((tiles[tiles.length - 1]?.tx ?? 0) + 1) * TILE_SIZE;
    const prompt = { kind: 'arena-door', x: (x0 + x1) / 2, y: ((tiles[0]?.ty ?? 0) + 0.5) * TILE_SIZE };
    expect(interactTarget(s)).toEqual(prompt);
    // 055: with the Bulwark gone, E still leaves.
    s.enemies = [];
    expect(interactTarget(s)).toEqual(prompt);
    // Outside a sealed door there's nothing to press (its hover says what opens it).
    const out = tileCentre(HOLLOWS.arena.door.leaveTo);
    movePlayer(s, out.x, out.y);
    s.gates.hollows = false;
    expect(interactTarget(s)).toBeNull();
    s.gates.hollows = true;
    expect(interactTarget(s)).toEqual(prompt);
  });

  it('no prompt where E would do nothing, or while a hold runs; an empty crate has one (047: E opens its screen)', () => {
    const empty = SCENES.crate();
    const crate = empty.foundry.pieces.find((p) => p.kind === 'crate') as CrateState;
    crate.contents = {};
    expect(interactTarget(empty)?.kind).toBe('crate');
    const lonely = SCENES.waystone();
    lonely.claims = [];
    expect(interactTarget(lonely)).toBeNull();
    const dim = SCENES.altar();
    dim.bossDefeats = [];
    expect(interactTarget(dim)).toBeNull();
    const harvesting = SCENES.node();
    run(harvesting, 1, { interact: true });
    expect(harvesting.harvest).not.toBeNull();
    expect(interactTarget(harvesting)).toBeNull();
    const building = SCENES.node();
    building.building = true;
    expect(interactTarget(building)).toBeNull();
    expect(interactTarget(arena())).toBeNull();
  });

  it('an opened cache has no prompt; a guarded one does (E says it is sealed)', () => {
    const s = SCENES.cache();
    s.caches = s.caches.map((c) => ({ ...c, openedAt: 1 }));
    expect(interactTarget(s)).toBeNull();
    const def = landmarkDef('ruined-cache');
    const guarded = createSim(7);
    guarded.roomId = OVERWORLD_ROOM;
    below(guarded, def.cache ?? { tx: 0, ty: 0 });
    expect(guarded.enemies.some((e) => e.group === def.id)).toBe(true);
    expect(interactTarget(guarded)?.kind).toBe('cache');
  });
});
