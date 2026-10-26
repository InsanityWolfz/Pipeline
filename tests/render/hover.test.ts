import { ARENAS, FORUM_ARENA, SHRINE_ARENA } from '../../src/data/arenas';
import { ARENA_DOOR_LOOK } from '../../src/data/arenaAssets';
import { TUTORIAL_START } from '../../src/data/player';
import { landmarkDef } from '../../src/data/landmarks';
import { describe, expect, it } from 'vitest';
import { WORLD_NAMES } from '../../src/data/hudLayout';
import { FIXTURES } from '../../src/data/claims';
import { DESCRIPTIONS } from '../../src/data/descriptions';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { OVERWORLD } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { arrowSpots, wrapText } from '../../src/render/foundryLayout';
import { splitterLook } from '../../src/render/flatPieces';
import { splitSideOf } from '../../src/sim/pieces';
import { fixtureDef } from '../../src/sim/fixtures';
import { nameAt } from '../../src/render/hoverNames';
import { createSim } from '../../src/sim/state';
import { HALL, placeHusk, SEED } from '../sim/fight';
import { foundry, put } from '../sim/foundryKit';

const centre = (tx: number, ty: number) => ({ x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 });

describe('world names on mouse-over', () => {
  it('names a foundry piece and a fixture', () => {
    const s = foundry();
    put(s, 'splitter', 5, 5);
    const at = centre(5, 5);
    expect(nameAt(s, 'foundry', at.x, at.y)?.name).toBe('Splitter');
    const def = fixtureDef('identification-bench');
    const bench = centre(def.tx, def.ty);
    expect(nameAt(s, 'foundry', bench.x, bench.y)?.name).toBe('Identification bench');
  });

  it('names an enemy by its body, a node and a ground item', () => {
    const s = createSim(SEED, { roomId: HALL });
    s.enemies = [];
    const e = placeHusk(s, 300, 300);
    expect(nameAt(s, HALL, e.x, e.y - 12)?.name).toBe('Husk');
    const n = s.nodes.find((x) => x.roomId === HALL);
    if (!n) throw new Error('no node');
    expect(nameAt(s, HALL, n.x, n.y - 10)?.name).toBeTruthy();
    s.groundItems.push({ id: 99, itemId: 'wood', roomId: HALL, x: 500, y: 500 });
    expect(nameAt(s, HALL, 500, 498)?.name).toBe('Wood');
  });

  it('names the pylon and the tube stone, and nothing on bare ground (017: both in the overworld)', () => {
    const s = createSim(SEED, { roomId: HALL });
    const outside = WORLD[HALL];
    const shrine = outside?.pylons?.find((x) => x.site === 'shrine');
    if (!outside || !shrine) throw new Error('no pylon');
    const p = centre(shrine.tx, shrine.ty);
    expect(nameAt(s, HALL, p.x, p.y)?.name).toBe(WORLD_NAMES.pylon);
    const stone = outside.tubeStone;
    if (!stone) throw new Error('no stone');
    const t = centre(stone.tx, stone.ty);
    expect(nameAt(s, HALL, t.x, t.y)?.name).toBe(WORLD_NAMES.tubeStone);
    s.hasTube = false;
    expect(nameAt(s, HALL, t.x, t.y)?.name).toBe(WORLD_NAMES.dormantTube);
    s.enemies = [];
    s.nodes = [];
    const field = centre(OVERWORLD.field.tx, OVERWORLD.field.ty);
    expect(nameAt(s, HALL, field.x, field.y)).toBeNull();
  });

  it('says where materials come from over the pylon and a ley line (018), and what each port sends (028)', () => {
    const s = createSim(SEED, { roomId: HALL });
    s.enemies = [];
    s.nodes = [];
    const pylon = centre(OVERWORLD.shrine.pylon.tx, OVERWORLD.shrine.pylon.ty);
    expect(nameAt(s, HALL, pylon.x, pylon.y)?.description).toBe(DESCRIPTIONS.pylonDormant);
    claim(s, SHRINE_SITE);
    expect(nameAt(s, HALL, pylon.x, pylon.y)?.description).toBe(DESCRIPTIONS.pylon);
    // Halfway along the shrine's ley line, between two of its points.
    const [a, b] = OVERWORLD.leyLines.shrine.slice(2, 4);
    if (!a || !b) throw new Error('short ley line');
    const seam = { x: ((a.tx + b.tx) / 2 + 0.5) * 32, y: ((a.ty + b.ty) / 2 + 0.5) * 32 };
    expect(nameAt(s, HALL, seam.x, seam.y)).toMatchObject({ name: WORLD_NAMES.leyLine, description: DESCRIPTIONS.leyLine });
    const port = FIXTURES.find((f) => f.kind === 'port' && f.raw === 'stone');
    if (!port) throw new Error('no port');
    const at = centre(port.tx, port.ty);
    expect(nameAt(s, 'foundry', at.x, at.y)).toMatchObject({ name: 'Stone port', description: '×1 pylon · 15/min' });
    // A refused raw waiting in the port says so.
    const held = s.fixtures.find((f) => f.id === port.id);
    if (!held) throw new Error('no stone port');
    held.item = 'stone';
    expect(nameAt(s, 'foundry', at.x, at.y)?.description).toBe('×1 pylon · 15/min · waiting');
  });
});

describe('build bar descriptions', () => {
  // 040: the tip is the legibility tablet, which wraps any length to its width (BUILD_TIP's 34-character, 2-line limit is gone).
  it('every buildable piece has one', () => {
    for (const id of BUILD_BAR) expect(PIECES[id]?.description.length, id).toBeGreaterThan(0);
  });

  it('wrap at spaces within the width', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four']);
  });
});

describe('the splitter on screen', () => {
  it('splits right of its facing, or left mirrored, matching its sprite turns', () => {
    expect(splitSideOf('right', false)).toBe('down');
    expect(splitSideOf('right', true)).toBe('up');
    expect(splitSideOf('down', false)).toBe('left');
    expect(splitSideOf('up', false)).toBe('right');
    expect(splitterLook('left', false)).toMatchObject({ flipX: true, flipY: true });
    expect(splitterLook('down', true)).toMatchObject({ flipX: true, flipY: false });
  });

  it('has an input arrow on its back and outputs on its front and side', () => {
    const spots = arrowSpots({ pieceId: 'splitter', tx: 5, ty: 5, facing: 'right', mirrored: true });
    expect(spots.map((s) => `${s.kind}:${s.edge}`)).toEqual(['in:left', 'out:right', 'out:up']);
  });
});

describe('landmark hovers (032)', () => {
  it("names a resource site's pylon by its landmark and what it sends: dormant, awake, claimed", () => {
    const s = createSim(SEED, { roomId: HALL });
    s.enemies = [];
    const pylon = landmarkDef('quarry').pylon;
    if (!pylon) throw new Error('no pylon');
    const p = centre(pylon.tx, pylon.ty);
    expect(nameAt(s, HALL, p.x, p.y)?.description).toBe('Quarry pylon: dormant until the shrine is claimed.');
    claim(s, SHRINE_SITE);
    expect(nameAt(s, HALL, p.x, p.y)?.description).toBe('Quarry pylon: claim it to send stone home.');
    claim(s, 'quarry');
    expect(nameAt(s, HALL, p.x, p.y)?.description).toBe('Quarry pylon: sends stone home.');
  });

  it('says to kill all enemies over a pylon whose guards remain (fix-playtest-ui)', () => {
    const s = createSim(SEED, { roomId: HALL });
    claim(s, SHRINE_SITE);
    const pylon = landmarkDef('quarry').pylon;
    if (!pylon) throw new Error('no pylon');
    expect(s.enemies.some((e) => e.group === 'quarry')).toBe(true);
    const p = centre(pylon.tx, pylon.ty);
    expect(nameAt(s, HALL, p.x, p.y)?.description).toBe(DESCRIPTIONS.pylonGuarded);
    s.enemies = s.enemies.filter((e) => e.group !== 'quarry');
    expect(nameAt(s, HALL, p.x, p.y)?.description).toBe('Quarry pylon: claim it to send stone home.');
  });

  it('names the Ruined Cache: sealed while a guard lives, ready, then empty once opened', () => {
    const s = createSim(SEED, { roomId: HALL });
    const at = landmarkDef('ruined-cache').cache;
    if (!at) throw new Error('no cache');
    const c = centre(at.tx, at.ty);
    expect(nameAt(s, HALL, c.x, c.y)).toMatchObject({ name: 'Ruined Cache', description: DESCRIPTIONS.cacheSealed });
    s.enemies = s.enemies.filter((e) => e.group !== 'ruined-cache');
    expect(nameAt(s, HALL, c.x, c.y)?.description).toBe(DESCRIPTIONS.cacheReady);
    const cache = s.caches.find((x) => x.id === 'ruined-cache');
    if (cache) cache.openedAt = s.tick;
    expect(nameAt(s, HALL, c.x, c.y)?.description).toBe(DESCRIPTIONS.cacheEmpty);
  });

  it("names a champion by its own name", () => {
    const s = createSim(SEED, { roomId: HALL });
    s.enemies = [];
    const e = placeHusk(s, 300, 300);
    e.champion = { name: 'Mossjaw' };
    expect(nameAt(s, HALL, e.x, e.y - 12)?.name).toBe('Mossjaw');
  });
});

describe('arena door hovers (055.1, 059)', () => {
  it("names each door, with a plain Sealed while sealed and no description once open, over its sprite's height too", () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    s.enemies = [];
    for (const a of ARENAS) {
      const t = a.door.tiles[0];
      if (!t) throw new Error('no door tile');
      s.gates[a.door.unlock] = false;
      const low = nameAt(s, OVERWORLD.id, (t.tx + 0.5) * 32, (t.ty + 0.9) * 32);
      expect(low).toMatchObject({ name: a.door.name, description: a.door.sealed });
      expect(nameAt(s, OVERWORLD.id, (t.tx + 0.5) * 32, (t.ty + 1) * 32 - ARENA_DOOR_LOOK.height + 4)?.name).toBe(a.door.name);
      s.gates[a.door.unlock] = true;
      const open = nameAt(s, OVERWORLD.id, (t.tx + 0.5) * 32, (t.ty + 0.9) * 32);
      expect(open?.name).toBe(a.door.name);
      expect(open?.description).toBeUndefined();
    }
    expect(SHRINE_ARENA.door.sealed).toBe('Sealed');
    expect(FORUM_ARENA.door.sealed).toBe('Sealed');
  });
});
