import { describe, expect, it } from 'vitest';
import { FORUM_ARENA, SHRINE_ARENA } from '../../src/data/arenas';
import { BOSS_INTRO } from '../../src/data/bossIntro';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { inAggroBox } from '../../src/sim/aiCommon';
import { playerInside } from '../../src/sim/arenaLock';
import { damageEnemy, type EnemyState } from '../../src/sim/enemies';
import { layPool } from '../../src/sim/floodPools';
import { callStrike } from '../../src/sim/strikes';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { entered } from './introKit';
import { shrine } from './bossWake';
import { hold, movePlayer, run, runUntil } from './fight';
import { forum } from './forum';
import { hall } from './hall';
import { spire } from './spire';

// 080: the intro's rules round it: the player safe, the altar's short intro, the restarts and cuts, the edge cases, and
// how it sits with 073's arena rule (073.5) and 067's shrine.

const FULL = BOSS_INTRO.fullTicks;
const SHORT = BOSS_INTRO.shortTicks;

type Arena = typeof FORUM_ARENA | typeof SHRINE_ARENA;

/** The tile beside the door's middle, inside (toward `enterTo`) or outside (toward `leaveTo`): in the door's reach. */
function byDoor(a: Arena, side: 'in' | 'out'): { x: number; y: number } {
  const mid = a.door.tiles[Math.floor(a.door.tiles.length / 2)] ?? a.door.enterTo;
  const to = side === 'in' ? a.door.enterTo : a.door.leaveTo;
  return tileCentre({ tx: mid.tx, ty: mid.ty + Math.sign(to.ty - mid.ty) });
}
const outside = (a: Arena) => tileCentre(a.door.leaveTo);

/** E at the arena's door from the side the player is on (in, or out with the fight reset): they step to it first. */
function useDoor(s: SimState, a: Arena = FORUM_ARENA): void {
  const at = byDoor(a, playerInside(s, a) ? 'in' : 'out');
  movePlayer(s, at.x, at.y);
  run(s, 1, { interact: true });
}

/** The forum with the player just inside its door, its intro not yet started. */
function atForumDoor(): { s: SimState; b: EnemyState } {
  const { s, b } = forum(160, 11, false);
  const at = byDoor(FORUM_ARENA, 'in');
  movePlayer(s, at.x, at.y);
  return { s, b };
}

describe('080: the player during an intro', () => {
  it('moves, rolls and fires, and loses no health to a pool, a strike or anything else inside', () => {
    const { s, f } = (() => {
      const h = hall(160, 11, 0, false);
      return { s: h.s, f: h.f };
    })();
    s.inventory.arrow = 999;
    hold(s, 'arrow');
    run(s, 1);
    expect(f.mode).toBe('intro');
    const p = s.player;
    // A leftover pool under the player and a strike falling on them.
    layPool(s, f, 'circle', { x0: p.x, y0: p.y, x1: p.x, y1: p.y, r: 60 }, { ticks: 400, damage: 25, everyTicks: 10 });
    callStrike(s, f, p.x, p.y, 40, 40, 5);
    const x0 = p.x;
    run(s, 20, { moveX: 1 });
    expect(p.x).toBeGreaterThan(x0);
    run(s, 1, { dodge: true, moveX: -1 });
    expect(p.rollTick).toBeGreaterThan(0);
    run(s, 20);
    run(s, 5, { use: true, aimX: f.x, aimY: f.y });
    expect(s.arrows.length).toBeGreaterThan(0);
    // Back on the pool for the rest of the intro.
    movePlayer(s, f.x, f.y + 160);
    const pool = s.floodPools[0];
    if (pool) Object.assign(pool, { x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    run(s, FULL - 47);
    expect(f.mode).toBe('intro');
    expect(p.health).toBe(100);
    expect(s.events.hits.filter((h) => h.target === 'player')).toEqual([]);
    // Once the fight starts, the pool bites.
    runUntil(s, () => p.health < 100, 30);
  });
});

describe('080: the altar re-fight', () => {
  it('raises the boss after the 120-tick crack, then plays the short intro (60 ticks) and fights', () => {
    const s = createSim(5, { start: HOLLOWS_START });
    s.enemies = s.enemies.filter((e) => e.enemyId === 'bulwark');
    const by = tileCentre({ tx: HOLLOWS.arena.altar.tx + 1, ty: HOLLOWS.arena.altar.ty });
    movePlayer(s, by.x, by.y);
    s.inventory = { 'ley-iron': 8 };
    const first = s.enemies[0];
    if (!first) throw new Error('no Bulwark');
    first.health = 0;
    run(s, 1);
    expect(s.bossDefeats).toEqual(['bulwark']);
    s.groundItems = [];
    run(s, 1, { summon: HOLLOWS.arena.altar.id });
    run(s, HOLLOWS.arena.summonTicks - 1);
    const b = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('not risen');
    expect(b.mode).toBe('idle');
    run(s, 1);
    expect({ mode: b.mode, modeTicks: b.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
    expect(s.events.bossIntros).toEqual([{ id: b.id, enemyId: 'bulwark', short: true }]);
    run(s, SHORT - 1);
    expect({ mode: b.mode, modeTicks: b.modeTicks }).toEqual({ mode: 'intro', modeTicks: SHORT });
    run(s, 1);
    expect(b.mode).toBe('chase');
  });
});

describe('080: the intro plays again only when the fight restarts', () => {
  it('after leaving by the door: back in, the full intro plays again', () => {
    const { s, b } = atForumDoor();
    run(s, FULL + 30);
    expect(b.mode).not.toBe('intro');
    useDoor(s);
    expect(playerInside(s, FORUM_ARENA)).toBe(false);
    expect(b.mode).toBe('idle');
    useDoor(s);
    run(s, 1);
    expect({ mode: b.mode, modeTicks: b.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
    expect(s.events.bossIntros[0]?.short).toBe(false);
  });

  it('after a KO and the wake: the rebuilt boss plays the full intro', () => {
    const { s } = forum(160, 11, true);
    run(s, 30);
    s.player.health = 0;
    runUntil(s, (x) => x.events.woke, 400);
    s.roomId = OVERWORLD_ROOM;
    movePlayer(s, tileCentre(HOLLOWS.arena.start).x, tileCentre(HOLLOWS.arena.start).y + 160);
    run(s, 1);
    const b = s.enemies.find((e) => e.enemyId === 'bulwark');
    expect({ mode: b?.mode, modeTicks: b?.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
  });

  it('after a leash home to idle; but not for a boss met again while still walking home', () => {
    const { s, b } = forum(160, 11, true);
    run(s, 40);
    const out = outside(FORUM_ARENA);
    movePlayer(s, out.x, out.y);
    // Out of its arena past its leash: it turns for home.
    runUntil(s, () => b.mode === 'return', 600);
    const back = { x: b.homeX, y: b.homeY + 160 };
    if (Math.hypot(b.x - b.homeX, b.y - b.homeY) > 4) {
      movePlayer(s, back.x, back.y);
      run(s, 1);
      expect(b.mode).not.toBe('intro');
      expect(s.events.bossIntros).toEqual([]);
      movePlayer(s, out.x, out.y);
      runUntil(s, () => b.mode === 'return', 600);
    }
    runUntil(s, () => b.mode === 'idle', 900);
    movePlayer(s, back.x, back.y);
    run(s, 1);
    expect({ mode: b.mode, modeTicks: b.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
  });

  it('a boss woken from outside its arena (a hit over the wall) fights with no intro, and the next fresh wake plays it', () => {
    const { s, b } = forum(160, 11, false);
    const out = outside(FORUM_ARENA);
    movePlayer(s, out.x, out.y);
    damageEnemy(s, b, 5, 0, 1);
    expect(b.mode).toBe('chase');
    run(s, 1);
    expect(s.events.bossIntros).toEqual([]);
    runUntil(s, () => b.mode === 'idle', 1200);
    useDoor(s);
    run(s, 1);
    expect(b.mode).toBe('intro');
  });
});

describe('080: leaving and a KO during an intro', () => {
  it('leaving by the door mid-intro resets it; coming back plays the full intro from its start', () => {
    const { s, b } = atForumDoor();
    run(s, 50);
    expect(b.modeTicks).toBe(50);
    useDoor(s);
    expect(b.mode).toBe('idle');
    run(s, 10);
    expect(b.mode).toBe('idle');
    useDoor(s);
    run(s, 1);
    expect({ mode: b.mode, modeTicks: b.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
  });

  it("leaving the shrine mid-intro sends the Warden and its pack back to idle at their posts", () => {
    const { s, w } = shrine();
    run(s, 40);
    const group = s.enemies.filter((e) => e.group === SHRINE_ARENA.id);
    for (const e of group) expect(e.mode).toBe('intro');
    useDoor(s, SHRINE_ARENA);
    expect(playerInside(s, SHRINE_ARENA)).toBe(false);
    run(s, 1);
    for (const e of group) expect({ mode: e.mode, x: e.x, y: e.y }).toEqual({ mode: 'idle', x: e.homeX, y: e.homeY });
    expect(w.mode).toBe('idle');
  });

  it('a KO mid-intro cuts it: the boss stands idle; after the wake its fight starts fresh', () => {
    const { s, b } = forum(160, 11, false);
    run(s, 20);
    s.player.health = 0;
    run(s, 2);
    expect(s.player.dying).toBeGreaterThan(0);
    expect(b.mode).toBe('idle');
    runUntil(s, (x) => x.events.woke, 400);
    expect(s.enemies.find((e) => e.enemyId === 'bulwark')?.mode).toBe('idle');
  });

  it('the Conductor in its intro neither blinks nor leashes', () => {
    const { s, c } = spire(0, 11, 0, false);
    run(s, FULL);
    expect(c.mode).toBe('intro');
    expect(c.conductor.blinkTo).toBe(-1);
    expect({ x: c.x, y: c.y }).toEqual({ x: c.homeX, y: c.homeY });
  });
});

describe("080 with 073's arena rule and 067's shrine", () => {
  it("073.5: the shrine's off-screen pack holds through the intro, then wakes and stays in the fight off screen", () => {
    const { s, w } = shrine();
    const far = s.enemies.filter((e) => e !== w && !inAggroBox(e, s.player));
    expect(far.length).toBeGreaterThan(0);
    run(s, FULL);
    for (const e of far) expect({ mode: e.mode, offScreenTicks: e.offScreenTicks }).toEqual({ mode: 'intro', offScreenTicks: 0 });
    // After the intro they wake by the boss rules, on screen or not, and never leash inside past the 1 s grace.
    run(s, 1);
    for (const e of far) expect(e.mode).not.toBe('intro');
    for (let t = 0; t < 120; t++) {
      run(s, 1);
      s.player.health = 100;
      s.player.hurtTicks = 0;
      for (const e of far) if (e.health > 0) expect(['idle', 'return']).not.toContain(e.mode);
    }
  });

  it('067: the open shrine door from outside starts the Warden\'s intro, and its kill after the fight counts as before', () => {
    const s = createSim(7);
    const out = outside(SHRINE_ARENA);
    movePlayer(s, out.x, out.y);
    expect(s.gates.shrine).toBe(true);
    useDoor(s, SHRINE_ARENA);
    expect(playerInside(s, SHRINE_ARENA)).toBe(true);
    const w = s.enemies.find((e) => e.enemyId === SHRINE_ARENA.boss);
    if (!w) throw new Error('no Warden');
    run(s, 1);
    expect(w.mode).toBe('intro');
    run(s, FULL);
    expect(w.mode).not.toBe('intro');
    damageEnemy(s, w, w.health, 0, 1);
    run(s, 1);
    expect(s.killedBosses).toContain(SHRINE_ARENA.boss);
  });
});

describe('080: determinism', () => {
  it('the same seed and commands give the same state through an intro', () => {
    const go = (): string => {
      const { s } = entered('conductor');
      run(s, FULL + 120, (x) => ({ moveX: x.tick % 40 < 20 ? 1 : -1 }));
      return JSON.stringify(s);
    };
    expect(go()).toBe(go());
  });
});
