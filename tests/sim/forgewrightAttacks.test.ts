import { describe, expect, it } from 'vitest';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { TICK_RATE } from '../../src/data/config';
import { COLD } from '../../src/data/tags';
import { stepAltars } from '../../src/sim/altar';
import { floodRect, heatFull } from '../../src/sim/forgewrightAi';
import { hitPart } from '../../src/sim/forgewrightParts';
import { NO_COMMAND } from '../../src/sim/input';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run, runUntil } from './fight';
import { FORGE, hall, HALL_START, topUp } from './hall';

// The Forgewright's attacks (060): its heat filling over 30 s (slowed by Chill, faster enraged) toward the Forge Flood
// on the player's half of the hall; its hammer slam up close; its ember spray at range. Then its drops, XP and altar.

/** Keeps the player topped up and still, `ticks` ticks. */
const hold = (s: Parameters<typeof topUp>[0], ticks: number): void =>
  run(s, ticks, () => {
    topUp(s);
    return {};
  });

describe('heat', () => {
  it('fills from 0 to 100 over 1,800 ticks while it fights', () => {
    const { s, f } = hall(150);
    run(s, 1);
    // Out of every attack's way: the spray and slam held off.
    const calm = () => {
      topUp(s);
      f.lobCooldown = 10;
      f.cooldown = 10;
      return {};
    };
    run(s, FORGE.heat.fillTicks - 2, calm);
    expect(heatFull(f, FORGE)).toBe(false);
    expect(f.heat).toBeCloseTo((100 * (FORGE.heat.fillTicks - 1)) / FORGE.heat.fillTicks, 3);
    run(s, 1, calm);
    expect(heatFull(f, FORGE)).toBe(true);
  });

  it('slows by Chill’s slowPerStack a stack, and fills 1.5× as fast below half health', () => {
    const { s, f } = hall(150);
    run(s, 1);
    const before = f.heat;
    f.chill = 2;
    f.chillTicks = 1000;
    f.lobCooldown = 100;
    run(s, 60);
    expect(f.heat - before).toBeCloseTo((100 / 1800) * 60 * (1 - 2 * COLD.slowPerStack), 3);
    const e = hall(150);
    run(e.s, 1);
    e.f.health = 1900;
    e.f.lobCooldown = 100;
    const at = e.f.heat;
    run(e.s, 60);
    expect(e.f.enraged).toBe(true);
    expect(e.f.heat - at).toBeCloseTo((100 / 1800) * 60 * 1.5, 1);
  });
});

describe('the Forge Flood', () => {
  it('at full heat raises its hammer 90 ticks over the player’s half, then pools cover it 300 ticks at 20 a second; then heat resets', () => {
    const { s, f } = hall(100, 11, 150);
    run(s, 1);
    f.heat = 100;
    f.lobCooldown = 500;
    f.cooldown = 500;
    run(s, 1);
    expect(f.mode).toBe('flood-windup');
    expect(f.floodSide).toBe(1);
    expect(s.events.floodStarts).toEqual([{ id: f.id }]);
    const start = s.tick;
    runUntil(s, () => s.floodPools.length > 0, FORGE.flood.windupTicks + 2, {});
    expect(s.tick - start).toBe(FORGE.flood.windupTicks);
    const east = floodRect(ANVIL_ARENA, 1);
    // Its first beat came on the tick it spread.
    expect(s.floodPools[0]).toMatchObject({ ...east, ticks: FORGE.flood.floodTicks - 1 });
    expect(east.x0).toBeCloseTo(HALL_START.x);
    expect(s.events.floods).toEqual([{ id: f.id, ...east }]);
    // Standing in it: a beat on its first tick and every second after.
    let hits = s.events.hits.filter((h) => h.target === 'player' && h.damage === FORGE.flood.damage).length;
    for (let i = 0; i < FORGE.flood.floodTicks; i++) {
      s.player.health = 100;
      f.cooldown = 500;
      f.lobCooldown = 500;
      run(s, 1);
      hits += s.events.hits.filter((h) => h.target === 'player' && h.damage === FORGE.flood.damage).length;
    }
    expect(hits).toBe(FORGE.flood.floodTicks / TICK_RATE);
    expect(s.floodPools).toEqual([]);
    expect(f.heat).toBeLessThan(1);
  });

  it('never hurts a player on the other half', () => {
    const { s, f } = hall(100, 11, 150);
    run(s, 1);
    f.heat = 100;
    run(s, FORGE.flood.windupTicks + 1, () => (topUp(s), { }));
    movePlayer(s, HALL_START.x - 150, HALL_START.y + 100);
    const hp = s.player.health;
    run(s, 120, () => {
      f.cooldown = 500;
      f.lobCooldown = 500;
      s.player.hurtTicks = 0;
      return {};
    });
    expect(s.player.health).toBe(hp);
  });

  it('a vent drops a flood’s wind-up but keeps the heat (068): it floods again once the vent ends', () => {
    const { s, f } = hall(100);
    run(s, 1);
    f.heat = 100;
    run(s, 10, () => (topUp(s), {}));
    expect(f.mode).toBe('flood-windup');
    // Both broken at once.
    hitPart(s, f, 0, FORGE.bellows.health, { knock: 0, flash: true, damageType: 'physical' });
    hitPart(s, f, 1, FORGE.bellows.health, { knock: 0, flash: true, damageType: 'physical' });
    expect(f.mode).toBe('vent');
    expect(heatFull(f, FORGE)).toBe(true);
    hold(s, FORGE.flood.windupTicks);
    expect(s.floodPools).toEqual([]);
    hold(s, FORGE.ventTicks - FORGE.flood.windupTicks + 1);
    expect(f.mode).toBe('flood-windup');
  });
});

describe('the hammer slam', () => {
  it('up close: a 54-tick wind-up (a circle ahead of it), then 45 damage with knockback on feet inside', () => {
    const { s, f } = hall(60);
    f.angle = Math.PI / 2;
    runUntil(s, () => f.mode === 'windup', 60, {});
    const start = s.tick;
    expect(f.swipeDirY).toBeCloseTo(1, 1);
    s.player.health = 100;
    runUntil(s, () => s.events.slams.length > 0, FORGE.slam.windupTicks + 2, {});
    expect(s.tick - start).toBe(FORGE.slam.windupTicks);
    const slam = s.events.slams[0];
    expect(slam?.radius).toBe(FORGE.slam.radius);
    expect(Math.hypot((slam?.x ?? 0) - f.x, (slam?.y ?? 0) - f.y)).toBeCloseTo(FORGE.slam.reach);
    expect(s.player.health).toBe(100 - FORGE.slam.damage);
    expect(s.player.knockTicks).toBeGreaterThan(0);
  });
});

describe('the ember spray', () => {
  it('at range: 7 slow embers fanned over 45° toward the player after a 45-tick wind-up', () => {
    const { s, f } = hall(150);
    run(s, 1);
    runUntil(s, () => f.mode === 'spray-windup', FORGE.spray.cooldownTicks + 5, {});
    const start = s.tick;
    runUntil(s, () => s.orbs.length > 0, FORGE.spray.windupTicks + 2, {});
    expect(s.tick - start).toBe(FORGE.spray.windupTicks);
    expect(s.orbs).toHaveLength(7);
    const angles = s.orbs.map((o) => (Math.atan2(o.dy, o.dx) * 180) / Math.PI).sort((a, b) => a - b);
    expect((angles[6] ?? 0) - (angles[0] ?? 0)).toBeCloseTo(45);
    const aim = (Math.atan2(s.player.y - f.y, s.player.x - f.x) * 180) / Math.PI;
    expect(angles[3]).toBeCloseTo(aim, 0);
    expect(s.events.sprays).toEqual([expect.objectContaining({ id: f.id, count: 7 })]);
    const o = s.orbs[0];
    const was = { x: o?.x ?? 0, y: o?.y ?? 0 };
    run(s, 1);
    expect(Math.hypot((o?.x ?? 0) - was.x, (o?.y ?? 0) - was.y)).toBeCloseTo(120 / TICK_RATE);
  });

  it('an ember hits the player for 20', () => {
    const { s, f } = hall(150);
    run(s, 1);
    s.player.health = 100;
    let hit = 0;
    run(s, FORGE.spray.cooldownTicks + FORGE.spray.windupTicks + 120, () => {
      f.cooldown = 500;
      hit += s.events.hits.filter((h) => h.target === 'player').reduce((n, h) => n + h.damage, 0);
      return {};
    });
    expect(hit).toBeGreaterThanOrEqual(FORGE.spray.damage);
  });
});

describe('its kill and the altar', () => {
  it('drops its core, 6–8 cinderite and 1–2 forge rivets, and gives 500 XP on its first kill', () => {
    const { s, f } = hall();
    run(s, 1);
    const xp = s.xp;
    const level = s.level;
    f.vent = 10;
    f.health = 0;
    run(s, 1);
    const by = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
    expect(by('forgewright-core')).toBe(1);
    expect(by('cinderite')).toBeGreaterThanOrEqual(6);
    expect(by('cinderite')).toBeLessThanOrEqual(8);
    expect(by('forge-rivet')).toBeGreaterThanOrEqual(1);
    expect(by('forge-rivet')).toBeLessThanOrEqual(2);
    expect(s.events.xp).toContainEqual({ amount: 500, source: 'boss' });
    expect(s.level > level || s.xp > xp).toBe(true);
  });

  it('after its first kill, the altar summons it again for 8 cinderite', () => {
    const { s, f } = hall();
    run(s, 1);
    f.vent = 10;
    f.health = 0;
    run(s, 1);
    s.inventory = { cinderite: 8 };
    const altar = tileCentre({ tx: ANVIL_ARENA.altar.tx + 1, ty: ANVIL_ARENA.altar.ty });
    movePlayer(s, altar.x, altar.y);
    stepAltars(s, { ...NO_COMMAND, summon: ANVIL_ARENA.altar.id });
    expect(s.inventory.cinderite).toBe(0);
    run(s, ANVIL_ARENA.summonTicks + 1);
    const again = s.enemies.find((e) => e.enemyId === 'forgewright');
    expect(again).toMatchObject({ health: FORGE.maxHealth, group: 'anvil-hall' });
    // Risen at its start a tick ago (the player is in the hall, so it has woken and taken a step).
    expect(Math.hypot((again?.x ?? 0) - HALL_START.x, (again?.y ?? 0) - HALL_START.y)).toBeLessThan(1);
  });
});
