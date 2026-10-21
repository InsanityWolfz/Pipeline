import { describe, expect, it } from 'vitest';
import { ARENAS, FORUM_ARENA, SHRINE_ARENA, type ArenaDef } from '../../src/data/arenas';
import { TILE_SIZE } from '../../src/data/config';
import { enemyDef } from '../../src/data/enemies';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { TUTORIAL_START } from '../../src/data/player';
import { SANDBOX_START } from '../../src/data/sandbox';
import { SANDBOX_ROOM, TILE, WALKABLE } from '../../src/data/rooms';
import { arenaLocked, doorUnlocked } from '../../src/sim/arenaLock';
import { createEnemy } from '../../src/sim/enemies';
import { interactTarget } from '../../src/sim/interactables';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { insideTiles, tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run, SEED } from './fight';

// The boss doors (055, D.5): both arenas walled all round, each with one door in its wall. Sealed until its gate
// opens; then E at it from outside goes in. Inside, E at it leaves and the fight resets (043's lock).

const T = TILE_SIZE;
const W = SHRINE_ARENA;
const rows = (roomId: string): readonly string[] => WORLD[roomId]?.rows ?? [];
const at = (roomId: string, t: { tx: number; ty: number }): string | undefined => rows(roomId)[t.ty]?.[t.tx];
const mid = (a: ArenaDef) => a.door.tiles[Math.floor(a.door.tiles.length / 2)] ?? { tx: 0, ty: 0 };

/** The tutorial with the shrine's guards gone and the player just outside its door. */
function outsideShrine(open: boolean): SimState {
  const s = createSim(SEED, { start: TUTORIAL_START });
  s.roomId = OVERWORLD_ROOM;
  s.enemies = s.enemies.filter((e) => e.group !== W.id);
  s.gates.shrine = open;
  const out = tileCentre(W.door.leaveTo);
  movePlayer(s, out.x, out.y);
  return s;
}

/** The shrine open, the player inside by the door, the Warden awake and hurt. */
function wardenFight(): { s: SimState; warden: NonNullable<SimState['enemies'][number]> } {
  const s = createSim(SEED, { start: TUTORIAL_START });
  s.roomId = OVERWORLD_ROOM;
  s.gates.shrine = true;
  s.enemies = s.enemies.filter((e) => e.group !== W.id || e.enemyId === W.boss);
  const warden = s.enemies.find((e) => e.enemyId === W.boss);
  if (!warden) throw new Error('no Warden');
  const inside = tileCentre(W.door.enterTo);
  movePlayer(s, inside.x, inside.y);
  for (let t = 0; t < 120 && !arenaLocked(s, W); t++) {
    s.player.health = 100;
    run(s, 1);
  }
  expect(arenaLocked(s, W)).toBe(true);
  warden.health = Math.floor(warden.health / 2);
  // Back at the door for E.
  movePlayer(s, inside.x, inside.y);
  return { s, warden };
}

describe('the arenas are walled all round', () => {
  for (const a of ARENAS) {
    for (const room of a.rooms) {
      it(`${a.name} in ${room}: every tile of its bounds' outline is solid, its door tiles doors`, () => {
        const b = a.bounds;
        const outline: { tx: number; ty: number }[] = [];
        for (let tx = b.x0; tx <= b.x1; tx++) outline.push({ tx, ty: b.y0 }, { tx, ty: b.y1 });
        for (let ty = b.y0 + 1; ty < b.y1; ty++) outline.push({ tx: b.x0, ty }, { tx: b.x1, ty });
        for (const t of outline) expect(WALKABLE, `${t.tx},${t.ty}`).not.toContain(at(room, t));
        for (const t of a.door.tiles) expect(at(room, t)).toBe(TILE.arenaDoor);
        // Its door is in the wall: on the outline, in one row.
        for (const t of a.door.tiles) expect(outline).toContainEqual(t);
        expect(new Set(a.door.tiles.map((t) => t.ty)).size).toBe(1);
      });
    }

    it(`${a.name}: E puts the player on open floor just inside or just outside the door's middle`, () => {
      const m = mid(a);
      for (const room of a.rooms) {
        expect(WALKABLE).toContain(at(room, a.door.enterTo));
        expect(WALKABLE).toContain(at(room, a.door.leaveTo));
      }
      expect(Math.abs(a.door.enterTo.ty - m.ty) + Math.abs(a.door.enterTo.tx - m.tx)).toBe(1);
      expect(Math.abs(a.door.leaveTo.ty - m.ty) + Math.abs(a.door.leaveTo.tx - m.tx)).toBe(1);
      const c = (t: { tx: number; ty: number }) => tileCentre(t);
      expect(insideTiles(a.inside, c(a.door.enterTo).x, c(a.door.enterTo).y)).toBe(true);
      expect(insideTiles(a.inside, c(a.door.leaveTo).x, c(a.door.leaveTo).y)).toBe(false);
    });
  }

  it("the shrine's front wall and side walls have no gaps (Shaun found holes either side of the door), and its gate has no tiles", () => {
    expect(OVERWORLD.shrine.walls.length + W.door.tiles.length).toBe(2 * (W.bounds.x1 - W.bounds.x0 + 1) + 2 * (W.bounds.y1 - W.bounds.y0 - 1));
    expect((WORLD[OVERWORLD_ROOM]?.gateTiles ?? []).some((g) => g.gate === 'shrine')).toBe(false);
  });

  it('holds the Warden, its pack and the pylon inside the shrine, and the Bulwark inside the forum', () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    const shrine = s.enemies.filter((e) => e.group === W.id);
    expect(shrine.length).toBeGreaterThan(0);
    for (const e of shrine) expect(insideTiles(W.inside, e.x, e.y), e.enemyId).toBe(true);
    const p = tileCentre(OVERWORLD.shrine.pylon);
    expect(insideTiles(W.inside, p.x, p.y)).toBe(true);
    const b = tileCentre(FORUM_ARENA.door.enterTo);
    expect(insideTiles(FORUM_ARENA.inside, b.x, b.y)).toBe(true);
  });
});

describe("the Warden's door", () => {
  it('is sealed until the shrine gate opens: E outside does nothing, and no E prompt shows', () => {
    const s = outsideShrine(false);
    const before = { x: s.player.x, y: s.player.y };
    expect(interactTarget(s)).toBeNull();
    run(s, 1, { interact: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual(before);
    expect(s.events.arenaEnters).toEqual([]);
    expect(summarize(s).arenas.find((a) => a.id === W.id)).toMatchObject({ unlocked: false, locked: false, inside: false });
  });

  it('opens with the shrine gate (012: the first line fills the tube): E outside goes in', () => {
    const s = outsideShrine(true);
    expect(doorUnlocked(s, W)).toBe(true);
    const m = mid(W);
    expect(interactTarget(s)).toEqual({ kind: 'arena-door', x: (m.tx + 0.5) * T, y: (m.ty + 0.5) * T });
    run(s, 1, { interact: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(W.door.enterTo));
    expect(s.events.arenaEnters).toEqual([{ arena: W.id }]);
    expect(summarize(s).arenas.find((a) => a.id === W.id)).toMatchObject({ unlocked: true, inside: true });
  });

  it('never lets feet through, open or sealed', () => {
    for (const open of [false, true]) {
      const s = outsideShrine(open);
      run(s, 60, { moveY: -1 });
      expect(s.player.y).toBeGreaterThan((mid(W).ty + 1) * T);
    }
  });

  it('stops shots: an arrow from outside never reaches a Husk inside', () => {
    const s = outsideShrine(true);
    const husk = createEnemy(s.nextEnemyId++, 'husk', tileCentre({ tx: W.door.enterTo.tx, ty: W.door.enterTo.ty - 2 }), OVERWORLD_ROOM);
    husk.frozen = 10_000;
    s.enemies.push(husk);
    const max = husk.health;
    run(s, 60, { use: true, aimX: husk.x, aimY: husk.y - 12 });
    expect(husk.health).toBe(max);
  });

  it('inside, E leaves, and leaving mid-fight resets the Warden at once (043): home, full health, idle', () => {
    const { s, warden } = wardenFight();
    const def = enemyDef(W.boss);
    run(s, 1, { interact: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(W.door.leaveTo));
    expect(s.events.arenaLeaves).toEqual([{ arena: W.id }]);
    expect(warden).toMatchObject({ x: warden.homeX, y: warden.homeY, health: def.maxHealth, mode: 'idle' });
    expect(arenaLocked(s, W)).toBe(false);
  });

  it('inside, E leaves even while the door is sealed (leaving needs no unlock)', () => {
    const s = outsideShrine(false);
    const inside = tileCentre(W.door.enterTo);
    movePlayer(s, inside.x, inside.y);
    expect(interactTarget(s)?.kind).toBe('arena-door');
    run(s, 1, { interact: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(W.door.leaveTo));
  });

  it('is deterministic: a fight with a leave, run twice, ends the same', () => {
    const go = (): string => {
      const { s } = wardenFight();
      run(s, 200, (st) => ({ moveX: st.tick % 60 < 30 ? 1 : -1, use: true, aimX: st.player.x, aimY: st.player.y - 120 }));
      movePlayer(s, tileCentre(W.door.enterTo).x, tileCentre(W.door.enterTo).y);
      run(s, 1, { interact: true });
      run(s, 60);
      const sum = summarize(s);
      return JSON.stringify({ player: sum.player, arenas: sum.arenas, enemies: s.enemies.map((e) => [e.x, e.y, e.health, e.mode]) });
    };
    expect(go()).toBe(go());
  });
});

describe("the forum's door in the sandbox (044)", () => {
  it('is always open there: E outside goes in', () => {
    const s = createSim(SEED, { start: SANDBOX_START });
    expect(s.roomId).toBe(SANDBOX_ROOM);
    expect(s.gates.hollows).toBe(false);
    expect(doorUnlocked(s, FORUM_ARENA, SANDBOX_ROOM)).toBe(true);
    const out = tileCentre(FORUM_ARENA.door.leaveTo);
    movePlayer(s, out.x, out.y);
    run(s, 1, { interact: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(FORUM_ARENA.door.enterTo));
  });
});
