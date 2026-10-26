import { describe, expect, it } from 'vitest';
import { MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { COLD } from '../../src/data/tags';
import type { EnemyState } from '../../src/sim/enemies';
import { heatFull } from '../../src/sim/forgewrightAi';
import { hitPart } from '../../src/sim/forgewrightParts';
import type { SimState } from '../../src/sim/state';
import { run } from './fight';
import { FORGE, hall, topUp } from './hall';

// 068's tougher Forgewright: 6,000 health; bellows of 300 that patch in 3 s; its slam's and spray's cooldowns 20%
// shorter, their wind-ups unchanged. Its heat keeps filling while it vents: a vent no longer resets it, only a Forge
// Flood does, so the flood comes on its rhythm (060.24's "heat stays at 0 through a vent" is replaced).

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

/** Breaks both bellows at once: it vents. */
const vent = (s: SimState, f: EnemyState): void => {
  hitPart(s, f, 0, FORGE.bellows.health, PHYSICAL);
  hitPart(s, f, 1, FORGE.bellows.health, PHYSICAL);
};

/** The player topped up and its slam and spray held off, so only heat, vents and floods run. */
const calm = (s: SimState, f: EnemyState) => (): Record<string, never> => {
  topUp(s);
  f.lobCooldown = 10;
  f.cooldown = 10;
  return {};
};

describe('the Forgewright’s 068 numbers', () => {
  it('has 6,000 health, bellows of 300 patching in 180 ticks, and cooldowns 20% shorter with the same wind-ups', () => {
    expect(FORGE.maxHealth).toBe(6000);
    expect(FORGE.bellows).toMatchObject({ health: 300, patchTicks: 180 });
    expect(FORGE.slam).toMatchObject({ windupTicks: 54, cooldownTicks: 120 });
    expect(FORGE.spray).toMatchObject({ windupTicks: 45, cooldownTicks: 144 });
    expect(FORGE.slam.cooldownTicks).toBe(150 * 0.8);
    expect(FORGE.spray.cooldownTicks).toBe(180 * 0.8);
    for (const w of [FORGE.slam.windupTicks, FORGE.spray.windupTicks]) expect(w).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });
});

describe('heat through a vent (068)', () => {
  it('a vent keeps its heat, and the gauge goes on filling at its usual rate while it staggers', () => {
    const { s, f } = hall(150);
    run(s, 1);
    f.heat = 40;
    vent(s, f);
    expect(f).toMatchObject({ mode: 'vent', heat: 40 });
    run(s, 60, calm(s, f));
    expect(f.mode).toBe('vent');
    expect(f.heat).toBeCloseTo(40 + (100 / FORGE.heat.fillTicks) * 60, 3);
  });

  it('Chill still slows it through a vent', () => {
    const { s, f } = hall(150);
    run(s, 1);
    vent(s, f);
    const at = f.heat;
    f.chill = 2;
    f.chillTicks = 1000;
    run(s, 60, calm(s, f));
    expect(f.heat - at).toBeCloseTo((100 / FORGE.heat.fillTicks) * 60 * (1 - 2 * COLD.slowPerStack), 3);
  });

  it('full mid-vent, its flood waits for the vent to end (a vent can’t attack), then winds up at once', () => {
    const { s, f } = hall(150);
    run(s, 1);
    f.heat = 99;
    vent(s, f);
    run(s, FORGE.ventTicks - 2, calm(s, f));
    expect(heatFull(f, FORGE)).toBe(true);
    expect(f.mode).toBe('vent');
    let started = -1;
    for (let t = 1; t <= 5 && started < 0; t++) {
      run(s, 1, calm(s, f));
      if (s.events.floodStarts.length > 0) started = t;
    }
    expect(started).toBeGreaterThan(0);
    expect(f.mode).toBe('flood-windup');
  });

  it('vented every 8 s, it still floods on its 30 s rhythm: only the flood resets its heat', () => {
    const { s, f } = hall(150);
    const floods: number[] = [];
    for (let t = 1; t <= 2 * FORGE.heat.fillTicks + 600; t++) {
      if (t % 480 === 0 && f.mode !== 'vent' && f.mode !== 'flood-windup' && f.mode !== 'flood') vent(s, f);
      run(s, 1, calm(s, f));
      if (s.events.floodStarts.length > 0) floods.push(t);
    }
    // The first at full heat (30 s, or the end of a vent then running); the next 30 s after its pools dry.
    expect(floods.length).toBeGreaterThanOrEqual(2);
    expect(floods[0]).toBeGreaterThanOrEqual(FORGE.heat.fillTicks - 2);
    expect(floods[0]).toBeLessThanOrEqual(FORGE.heat.fillTicks + FORGE.ventTicks);
    const gap = (floods[1] ?? 0) - (floods[0] ?? 0);
    const flood = FORGE.flood.windupTicks + FORGE.flood.floodTicks;
    expect(gap).toBeGreaterThanOrEqual(flood + FORGE.heat.fillTicks - 2);
    expect(gap).toBeLessThanOrEqual(flood + FORGE.heat.fillTicks + FORGE.ventTicks);
  });
});
