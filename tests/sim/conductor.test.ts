import { describe, expect, it } from 'vitest';
import { arenaOf, arenaOfAltar, CROWN_ARENA } from '../../src/data/arenas';
import { ENEMIES, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { CONDUCTOR_XP } from '../../src/data/leveling';
import { RING_SCALE } from '../../src/data/ringScale';
import { CROWN_SPIRE, standPoint } from '../../src/data/stormcrownSites';
import { stepAltars } from '../../src/sim/altar';
import { defOf } from '../../src/sim/champions';
import { NO_COMMAND } from '../../src/sim/input';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run } from './fight';
import { runIntro } from './introKit';
import { CONDUCTOR, spire, SPIRE_DOOR_OUT, SPIRE_MIDDLE } from './spire';

// The Conductor (064): the Stormcrown's boss in the Crown Spire. It wakes when the player enters the spire, stands
// at one of six rods facing them, and resets by the Forgewright's rules (at once: it never walks).

describe('the Conductor (data)', () => {
  it('is a boss with the spec’s starting values', () => {
    expect(ENEMIES.conductor).toBe(CONDUCTOR);
    expect(CONDUCTOR).toMatchObject({ kind: 'conductor', boss: true, maxHealth: 8000, homingRelock: true, shieldRods: 3, blinkInTicks: 30 });
    expect(CONDUCTOR.rods).toMatchObject({ health: 200, regrowTicks: 1200 });
    expect(CONDUCTOR.blink).toEqual({ everyTicks: 240, warnTicks: 45, minRods: 2 });
    expect(CONDUCTOR.lash).toMatchObject({ windupTicks: 45, damage: 50 });
    expect(CONDUCTOR.call).toMatchObject({ windupTicks: 60, damage: 40, count: 5, radius: 40, spread: 64 });
    expect(CONDUCTOR.chain).toMatchObject({ windupTicks: 60, activeTicks: 30, damage: 45 });
    expect(CONDUCTOR.enrage).toEqual({ below: 0.5, blinkTicks: 150 });
    expect(CONDUCTOR.xp).toBe(CONDUCTOR_XP);
    expect(CONDUCTOR_XP).toBe(800);
    expect(CONDUCTOR.drops.always).toEqual([
      { itemId: 'conductor-core', min: 1, max: 1 },
      { itemId: 'stormglass', min: 6, max: 8 },
      { itemId: 'storm-coil', min: 1, max: 2 },
    ]);
  });

  it('telegraphs every attack, and its blink, for at least MIN_TELEGRAPH_TICKS', () => {
    for (const w of [CONDUCTOR.lash.windupTicks, CONDUCTOR.call.windupTicks, CONDUCTOR.chain.windupTicks, CONDUCTOR.blink.warnTicks]) expect(w).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });

  it('keeps its own numbers in ring 5: the ring’s ×10 never applies', () => {
    const { c } = spire();
    expect(c.ring).toBe(5);
    expect(RING_SCALE[5]).toMatchObject({ health: 10, damage: 8 });
    expect(defOf(c)).toBe(CONDUCTOR);
    expect(c.health).toBe(8000);
  });

  it('has the Crown Spire as its arena, with an altar summoning it for 8 stormglass', () => {
    expect(arenaOf('conductor')).toBe(CROWN_ARENA);
    expect(arenaOfAltar('spire-altar')).toBe(CROWN_ARENA);
    expect(CROWN_ARENA.offering).toEqual({ stormglass: 8 });
    expect(CROWN_ARENA.door.unlock).toBe('stormcrown');
  });
});

describe('waking and leaving', () => {
  it('stands at its start rod and wakes only when the player is inside the spire, then faces them', () => {
    const { s, c } = spire();
    expect(c.conductor.rod).toBe(CROWN_SPIRE.startRod);
    // On its start tile, by its start rod's stand point; it blinks to the stand points.
    expect({ x: c.x, y: c.y }).toEqual(tileCentre(CROWN_SPIRE.start));
    expect(Math.hypot(c.x - standPoint(CROWN_SPIRE.startRod).x, c.y - standPoint(CROWN_SPIRE.startRod).y)).toBeLessThan(16);
    movePlayer(s, SPIRE_DOOR_OUT.x, SPIRE_DOOR_OUT.y);
    run(s, 30);
    expect(c.mode).toBe('idle');
    movePlayer(s, SPIRE_MIDDLE.x, SPIRE_MIDDLE.y);
    runIntro(s);
    run(s, 1);
    expect(c.mode).not.toBe('idle');
    expect(c.angle).toBeCloseTo(Math.atan2(SPIRE_MIDDLE.y - c.y, SPIRE_MIDDLE.x - c.x), 5);
    expect(summarize(s).bosses).toEqual([expect.objectContaining({ enemyId: 'conductor', engaged: true, rod: CROWN_SPIRE.startRod, grounded: false, rods: CROWN_SPIRE.sockets.map(() => ({ health: 200, regrow: 0 })) })]);
  });

  it('resets at once after the player is out of the spire a while: home, healed, calm, rods whole, strikes gone', () => {
    const { s, c } = spire();
    run(s, 1);
    c.health = 900;
    c.conductor.rods[0] = { health: 0, regrow: 100 };
    c.conductor.rod = 2;
    c.enraged = true;
    c.conductor.blinkCooldown = 5;
    movePlayer(s, SPIRE_DOOR_OUT.x, SPIRE_DOOR_OUT.y + 64);
    run(s, CONDUCTOR.leashTicks + 1);
    expect(c.mode).toBe('idle');
    expect(c.health).toBe(CONDUCTOR.maxHealth);
    expect(c.conductor.rod).toBe(CROWN_SPIRE.startRod);
    expect(c.conductor.rods.every((r) => r.health === 200 && r.regrow === 0)).toBe(true);
    expect(c.enraged).toBe(false);
    expect(c.conductor.blinkCooldown).toBe(CONDUCTOR.blink.everyTicks);
    expect(s.strikes).toEqual([]);
  });

  it('resets at once when the player leaves by the door (055)', () => {
    const { s, c } = spire();
    run(s, 1);
    c.health = 1000;
    s.strikes.push({ ownerId: c.id, enemyId: c.enemyId, roomId: c.roomId, x: 0, y: 0, r: 40, damage: 40, knockback: 0, knockTicks: 0, delay: 30, delayTicks: 60 });
    const door = CROWN_ARENA.door.tiles[2] ?? CROWN_ARENA.door.enterTo;
    movePlayer(s, tileCentre(door).x, tileCentre(door).y - 32);
    run(s, 1, { interact: true });
    expect(s.events.arenaLeaves).toEqual([{ arena: 'crown-spire' }]);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
    expect(s.strikes).toEqual([]);
  });

  it('comes back on a KO before its first kill, and is gone for good after it, its altar awake', () => {
    const { s, c } = spire();
    run(s, 1);
    c.health = 100;
    die(s);
    expect(s.enemies.find((e) => e.enemyId === 'conductor')?.health).toBe(CONDUCTOR.maxHealth);
    const again = spire();
    run(again.s, 1);
    again.c.health = 0;
    run(again.s, 1);
    expect(again.s.events.bossDefeats).toEqual([{ boss: 'conductor' }]);
    expect(summarize(again.s).altars.find((a) => a.id === 'spire-altar')?.state).toBe('awake');
    die(again.s);
    run(again.s, 1);
    expect(again.s.enemies.some((e) => e.enemyId === 'conductor')).toBe(false);
  });
});

describe('its kill and the altar', () => {
  it('drops its core, 6–8 stormglass and 1–2 storm coils, and gives 800 XP on its first kill', () => {
    const { s, c } = spire();
    run(s, 1);
    c.health = 0;
    run(s, 1);
    const by = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
    expect(by('conductor-core')).toBe(1);
    expect(by('stormglass')).toBeGreaterThanOrEqual(6);
    expect(by('stormglass')).toBeLessThanOrEqual(8);
    expect(by('storm-coil')).toBeGreaterThanOrEqual(1);
    expect(by('storm-coil')).toBeLessThanOrEqual(2);
    expect(s.events.xp).toContainEqual({ amount: 800, source: 'boss' });
  });

  it('after its first kill, the altar summons it again for 8 stormglass, at its start rod', () => {
    const { s, c } = spire();
    run(s, 1);
    c.health = 0;
    run(s, 1);
    s.inventory = { stormglass: 8 };
    const altar = tileCentre({ tx: CROWN_ARENA.altar.tx + 1, ty: CROWN_ARENA.altar.ty });
    movePlayer(s, altar.x, altar.y);
    stepAltars(s, { ...NO_COMMAND, summon: CROWN_ARENA.altar.id });
    expect(s.inventory.stormglass).toBe(0);
    run(s, CROWN_ARENA.summonTicks + 1);
    const back = s.enemies.find((e) => e.enemyId === 'conductor');
    expect(back).toMatchObject({ health: CONDUCTOR.maxHealth, group: 'crown-spire', conductor: { rod: CROWN_SPIRE.startRod } });
    expect({ x: back?.x, y: back?.y }).toEqual(tileCentre(CROWN_SPIRE.start));
  });
});
