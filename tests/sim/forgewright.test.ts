import { describe, expect, it } from 'vitest';
import { ANVIL_ARENA, arenaOf, arenaOfAltar } from '../../src/data/arenas';
import { ENEMIES, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { FORGEWRIGHT_XP } from '../../src/data/leveling';
import { RING_SCALE } from '../../src/data/ringScale';
import { blastArea } from '../../src/sim/blast';
import { defOf } from '../../src/sim/champions';
import { damageEnemy } from '../../src/sim/enemies';
import { bellowsBox, bellowsPoint, hitPart, partAt, plated } from '../../src/sim/forgewrightParts';
import { punch } from '../../src/sim/melee';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { lines } from './builds';
import { die, movePlayer, run, volleyAt } from './fight';
import { FORGE, hall, HALL_START, topUp } from './hall';

// The Forgewright (060): a plated smith construct in the Anvil Hall. Its plating blocks every hit on its body until
// it vents; its two bellows, 2 tiles out each side square to its facing, are parts with their own health; both broken
// at once (or one then the other within the 4 s patch) vents it for 6 s, every hit landing.

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

describe('the Forgewright (data)', () => {
  it('is a boss with the spec’s starting values', () => {
    expect(ENEMIES.forgewright).toBe(FORGE);
    expect(FORGE).toMatchObject({ kind: 'forgewright', boss: true, maxHealth: 4000, ventTicks: 360, heat: { max: 100, fillTicks: 1800 } });
    expect(FORGE.bellows).toMatchObject({ offset: 64, health: 150, patchTicks: 240 });
    expect(FORGE.flood).toMatchObject({ windupTicks: 90, floodTicks: 300, damage: 20, everyTicks: 60 });
    expect(FORGE.slam).toMatchObject({ windupTicks: 54, damage: 45 });
    expect(FORGE.spray).toMatchObject({ count: 7, coneDegrees: 45, speed: 120, damage: 20, windupTicks: 45 });
    expect(FORGE.enrage).toEqual({ below: 0.5, heatRate: 1.5 });
    expect(FORGE.xp).toBe(FORGEWRIGHT_XP);
    expect(FORGEWRIGHT_XP).toBe(500);
    expect(FORGE.drops.always).toEqual([
      { itemId: 'forgewright-core', min: 1, max: 1 },
      { itemId: 'cinderite', min: 6, max: 8 },
      { itemId: 'forge-rivet', min: 1, max: 2 },
    ]);
  });

  it('telegraphs every attack for at least MIN_TELEGRAPH_TICKS', () => {
    for (const w of [FORGE.slam.windupTicks, FORGE.spray.windupTicks, FORGE.flood.windupTicks]) expect(w).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });

  it('keeps its own numbers in ring 4: the ring’s ×4 never applies', () => {
    const { f } = hall();
    expect(f.ring).toBe(4);
    expect(RING_SCALE[4]).toMatchObject({ health: 4, damage: 4 });
    expect(defOf(f)).toBe(FORGE);
    expect(f.health).toBe(4000);
  });

  it('has the Anvil Hall as its arena, with an altar summoning it for 8 cinderite', () => {
    expect(arenaOf('forgewright')).toBe(ANVIL_ARENA);
    expect(arenaOfAltar('anvil-altar')).toBe(ANVIL_ARENA);
    expect(ANVIL_ARENA.offering).toEqual({ cinderite: 8 });
    expect(arenaOf('bulwark')?.id).toBe('sunken-forum');
    expect(arenaOf('pylon-warden')).toBeUndefined();
  });
});

describe('waking and leaving', () => {
  it('stands at its start and wakes only when the player is inside the hall', () => {
    const { s, f } = hall();
    expect({ x: f.x, y: f.y }).toEqual(HALL_START);
    movePlayer(s, tileCentre(ANVIL_ARENA.door.leaveTo).x, tileCentre(ANVIL_ARENA.door.leaveTo).y);
    run(s, 30);
    expect(f.mode).toBe('idle');
    movePlayer(s, HALL_START.x, HALL_START.y + 160);
    run(s, 1);
    expect(f.mode).toBe('chase');
    expect(summarize(s).bosses).toEqual([expect.objectContaining({ enemyId: 'forgewright', engaged: true, plated: true, heat: expect.any(Number), bellows: [{ health: 150, patch: 0 }, { health: 150, patch: 0 }] })]);
  });

  it('walks home and heals after the player is out of the hall a while, its fight reset', () => {
    const { s, f } = hall();
    run(s, 1);
    f.health = 900;
    f.heat = 50;
    f.bellows[0] = { health: 0, patch: 100 };
    const out = tileCentre(ANVIL_ARENA.door.leaveTo);
    movePlayer(s, out.x, out.y + 64);
    run(s, FORGE.leashTicks + 1);
    expect(f.mode).toBe('return');
    run(s, 2000, () => ({}));
    expect(f.mode).toBe('idle');
    expect(f.health).toBe(FORGE.maxHealth);
    expect(f.heat).toBe(0);
    expect(f.bellows).toEqual([{ health: 150, patch: 0 }, { health: 150, patch: 0 }]);
  });

  it('resets at once when the player leaves by the door (055), its pools dried', () => {
    const { s, f } = hall();
    run(s, 1);
    f.health = 1000;
    f.heat = 80;
    s.floodPools.push({ ownerId: f.id, enemyId: f.enemyId, roomId: f.roomId, shape: 'rect', x0: 0, y0: 0, x1: 1, y1: 1, r: 0, damage: FORGE.flood.damage, everyTicks: FORGE.flood.everyTicks, age: 0, ticks: 100 });
    const door = ANVIL_ARENA.door.tiles[2] ?? ANVIL_ARENA.door.enterTo;
    movePlayer(s, tileCentre(door).x, tileCentre(door).y - 32);
    run(s, 1, { interact: true });
    expect(s.events.arenaLeaves).toEqual([{ arena: 'anvil-hall' }]);
    expect(f.health).toBe(FORGE.maxHealth);
    expect(f.heat).toBe(0);
    expect({ x: f.x, y: f.y }).toEqual(HALL_START);
    expect(s.floodPools).toEqual([]);
  });

  it('comes back on a KO before its first kill, and is gone for good after it, its altar awake', () => {
    const { s, f } = hall();
    run(s, 1);
    f.health = 100;
    die(s);
    expect(s.enemies.find((e) => e.enemyId === 'forgewright')?.health).toBe(FORGE.maxHealth);
    const again = hall();
    run(again.s, 1);
    again.f.vent = 10;
    again.f.health = 0;
    run(again.s, 1);
    expect(again.s.events.bossDefeats).toEqual([{ boss: 'forgewright' }]);
    expect(again.s.bossDefeats).toContain('forgewright');
    expect(summarize(again.s).altars.find((a) => a.id === 'anvil-altar')?.state).toBe('awake');
    die(again.s);
    run(again.s, 1);
    expect(again.s.enemies.some((e) => e.enemyId === 'forgewright')).toBe(false);
  });
});

describe('the plating', () => {
  it('blocks every hit on its body while it isn’t vented: a hit, a Burst, a punch and a burn’s beat, each a block', () => {
    const { s, f } = hall(40);
    run(s, 1);
    expect(plated(f)).toBe(true);
    damageEnemy(s, f, 50, 0, 1);
    blastArea(s, f.roomId, f.x, f.y, 30, 50, 'physical');
    damageEnemy(s, f, 50, 0, 0, { knock: 0, flash: false, damageType: 'fire', burn: true });
    expect(f.health).toBe(FORGE.maxHealth);
    expect(s.events.blocked).toHaveLength(3);
    expect(f.burnTicks).toBe(0);
    s.tube.meleeCooldown = 0;
    s.tube.fireCooldown = 0;
    movePlayer(s, f.x, f.y + 24);
    punch(s, 0, -1);
    expect(f.health).toBe(FORGE.maxHealth);
    expect(s.events.blocked).toHaveLength(4);
  });

  it('blocks a straight shot at its body, which glances off and flies on if it pierces', () => {
    const { s, f } = hall(140);
    lines(s, 'arrow');
    run(s, 1);
    let blocks = 0;
    run(s, 60, () => {
      blocks += s.events.blocked.length;
      return volleyAt(f.x, f.y - 20);
    });
    expect(blocks).toBeGreaterThan(0);
    expect(f.health).toBe(FORGE.maxHealth);
  });

  it('lets every hit land while it vents', () => {
    const { s, f } = hall(40);
    run(s, 1);
    f.vent = 100;
    expect(plated(f)).toBe(false);
    damageEnemy(s, f, 50, 0, 1);
    expect(f.health).toBe(FORGE.maxHealth - 50);
  });
});

describe('the bellows', () => {
  it('sit 2 tiles out each side, square to its facing, and turn with it', () => {
    const { f } = hall();
    f.angle = Math.PI / 2;
    expect(bellowsPoint(f, FORGE, 0)).toEqual({ x: f.x + 64, y: f.y + 64 * Math.cos(Math.PI / 2) * -1 });
    expect(bellowsPoint(f, FORGE, 1).x).toBeCloseTo(f.x - 64);
    f.angle = 0;
    expect(bellowsPoint(f, FORGE, 0).y).toBeCloseTo(f.y - 64);
    expect(bellowsPoint(f, FORGE, 1).y).toBeCloseTo(f.y + 64);
    const box = bellowsBox(f, FORGE, 1);
    expect(partAt(f, box.x, box.y)).toBe(1);
    expect(partAt(f, f.x, f.y)).toBeNull();
  });

  it('take a hit on themselves, and pass a Cold hit’s chill and a Fire hit’s burn to it', () => {
    const { s, f } = hall();
    run(s, 1);
    hitPart(s, f, 0, 20, PHYSICAL);
    expect(f.bellows[0]?.health).toBe(130);
    expect(f.health).toBe(FORGE.maxHealth);
    hitPart(s, f, 1, 10, { knock: 0, flash: true, damageType: 'cold' });
    expect(f.chill).toBeGreaterThan(0);
    hitPart(s, f, 1, 20, { knock: 0, flash: true, damageType: 'fire' });
    expect(f.burnTicks).toBeGreaterThan(0);
    expect(f.burnDps).toBeCloseTo(5);
    expect(s.events.hits.filter((h) => h.target === 'enemy' && h.part !== undefined)).toHaveLength(3);
  });

  it('take a Burst in reach, each', () => {
    const { s, f } = hall();
    run(s, 1);
    const p = bellowsPoint(f, FORGE, 0);
    blastArea(s, f.roomId, p.x, p.y, 20, 30, 'physical');
    expect(f.bellows.map((b) => b.health)).toEqual([120, 150]);
  });

  it('break at 0 and patch back to full after 240 ticks', () => {
    const { s, f } = hall();
    run(s, 1);
    hitPart(s, f, 0, 200, PHYSICAL);
    expect(f.bellows[0]).toEqual({ health: 0, patch: FORGE.bellows.patchTicks });
    expect(s.events.bellowsBreaks).toEqual([expect.objectContaining({ id: f.id, part: 0 })]);
    run(s, FORGE.bellows.patchTicks - 1, () => {
      topUp(s);
      return {};
    });
    expect(f.bellows[0]?.patch).toBe(1);
    run(s, 1);
    expect(f.bellows[0]).toEqual({ health: 150, patch: 0 });
    expect(s.events.bellowsPatches).toEqual([{ id: f.id, part: 0 }]);
  });

  it('both broken at once vent it: a 360-tick stagger, heat to 0, every hit landing; then both come back whole', () => {
    const { s, f } = hall();
    run(s, 1);
    f.heat = 70;
    hitPart(s, f, 0, 200, PHYSICAL);
    hitPart(s, f, 1, 200, PHYSICAL);
    expect(s.events.vents).toEqual([expect.objectContaining({ id: f.id })]);
    expect(f).toMatchObject({ mode: 'vent', vent: FORGE.ventTicks, heat: 0 });
    const x = f.x;
    run(s, FORGE.ventTicks - 1, () => {
      topUp(s);
      return {};
    });
    expect(f.mode).toBe('vent');
    expect(f.x).toBe(x);
    expect(f.heat).toBe(0);
    expect(f.cooldown).toBe(0);
    run(s, 1);
    expect(f.vent).toBe(0);
    expect(plated(f)).toBe(true);
    expect(f.mode).not.toBe('vent');
    expect(f.bellows).toEqual([{ health: 150, patch: 0 }, { health: 150, patch: 0 }]);
    expect(s.events.ventEnds).toEqual([{ id: f.id }]);
  });

  it('one then the other within the 4 s patch vents it; past it, it doesn’t', () => {
    const quick = hall();
    run(quick.s, 1);
    hitPart(quick.s, quick.f, 0, 200, PHYSICAL);
    run(quick.s, FORGE.bellows.patchTicks - 2, () => (topUp(quick.s), {}));
    hitPart(quick.s, quick.f, 1, 200, PHYSICAL);
    expect(quick.f.mode).toBe('vent');
    const slow = hall();
    run(slow.s, 1);
    hitPart(slow.s, slow.f, 0, 200, PHYSICAL);
    run(slow.s, FORGE.bellows.patchTicks, () => (topUp(slow.s), {}));
    hitPart(slow.s, slow.f, 1, 200, PHYSICAL);
    expect(slow.f.mode).not.toBe('vent');
    expect(slow.f.bellows[0]?.health).toBe(150);
  });

  it('a three-lane fan from about 7.5 tiles, face-on, breaks both and vents it', () => {
    const { s, f } = hall(0, 11, -240);
    lines(s, 'arrow', 'arrow', 'arrow');
    let vented = false;
    run(s, 300, () => {
      topUp(s);
      // Held face-on (facing the player, west of it) where it stands.
      Object.assign(f, { x: HALL_START.x, y: HALL_START.y, angle: Math.PI });
      vented ||= s.events.vents.length > 0;
      return volleyAt(f.x, f.y - 24);
    });
    expect(vented).toBe(true);
  });

  it('a piercing arrow along a line through both hits each once', () => {
    const { s, f } = hall(150);
    lines(s, 'arrow');
    run(s, 1);
    // Side-on (facing west, the player south of it): its bellows lie along the line from the player through it.
    let hits = 0;
    run(s, 40, () => {
      topUp(s);
      Object.assign(f, { x: HALL_START.x, y: HALL_START.y, angle: Math.PI });
      hits += s.events.hits.filter((h) => h.target === 'enemy' && h.part !== undefined).length;
      return volleyAt(f.x, f.y - 100);
    });
    expect(f.bellows[0]?.health).toBeLessThan(150);
    expect(f.bellows[1]?.health).toBeLessThan(150);
    // Each arrow hits each bellows once: the two never more than an arrow apart.
    const taken = f.bellows.map((b) => 150 - b.health);
    expect(Math.abs((taken[0] ?? 0) - (taken[1] ?? 0))).toBeLessThanOrEqual(14);
    expect(hits).toBe(((taken[0] ?? 0) + (taken[1] ?? 0)) / 14);
  });
});
