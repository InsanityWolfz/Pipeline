import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { SET_PIECES, setPieceAnchor } from '../../src/data/setPieces';
import { WEATHER, WEATHER_BUDGET, WEATHER_CAP, WEATHER_LIGHTNING, WEATHER_MARGIN, WEATHER_MOTION } from '../../src/data/weather';
import { createRng } from '../../src/sim/rng';
import { WORLD } from '../../src/sim/world';
import { moodAt } from '../../src/render/lighting/mood';
import { budgetRoom, layerTargets, WeatherModel, weatherWeights, type WeatherWind } from '../../src/render/world/weatherModel';
import { LightningClock, lightningActive, strikeTarget } from '../../src/render/world/weatherLightning';

// 077: the weather's rules: the regions' weights from 074's mood blend, the layers' counts by tier within the cap,
// Low's counts in a boss fight, the shared budget's gate, spawning over the view and recycling at the upwind edge,
// replaying from a seed; and weather lightning's clock and targets.

const T = TILE_SIZE;
const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');
const view = { x: 1000, y: 1000, width: 640, height: 360 };
const east: WeatherWind = { strength: 1, dx: 1, dy: 0, gust: 1 };
const rodNodes = OVERWORLD.nodes.filter((n) => n.nodeId === 'storm-rod').map((n) => ({ x: (n.tx + 0.5) * T, y: (n.ty + 0.5) * T }));

describe('weather (077)', () => {
  it('weighs the regions by the mood’s blend: one region inside it, a crossfade at its edge', () => {
    expect(weatherWeights(moodAt(20))).toMatchObject({ meadow: 1, hollows: 0 });
    expect(weatherWeights(moodAt(125))).toMatchObject({ storm: 1, ember: 0 });
    const edge = weatherWeights(moodAt(110));
    expect(edge.ember).toBeGreaterThan(0.3);
    expect(edge.storm).toBeGreaterThan(0.3);
    expect(edge.ember + edge.storm).toBeCloseTo(1);
    // Across the band the Stormcrown's weight only grows.
    let last = 0;
    for (let d = 105; d <= 115; d += 0.5) {
      const w = weatherWeights(moodAt(d)).storm;
      expect(w).toBeGreaterThanOrEqual(last);
      last = w;
    }
  });

  it('counts each layer by tier and weight within the cap, and drops to Low’s counts in a boss fight', () => {
    const storm = weatherWeights(moodAt(125));
    for (const q of ['low', 'medium', 'high'] as const) {
      const t = layerTargets(storm, q, false);
      expect(t.reduce((n, x) => n + x.count, 0)).toBeLessThanOrEqual(WEATHER_CAP[q]);
      expect(t.find((x) => x.layer.id === 'rain')?.count).toBe(WEATHER.storm.layers[0]?.count[q]);
    }
    expect(layerTargets(storm, 'high', true).map((x) => x.count)).toEqual(layerTargets(storm, 'low', false).map((x) => x.count));
    const edge = layerTargets(weatherWeights(moodAt(110)), 'high', false);
    expect(edge.map((x) => x.layer.id).sort()).toEqual(['ash', 'embers', 'rain', 'splashes']);
  });

  it('spawns only while every live particle is below the budget less the death motes’ room', () => {
    expect(budgetRoom('high', 0, 0)).toBe(WEATHER_BUDGET.particles.high - WEATHER_BUDGET.deathMotes.high);
    expect(budgetRoom('high', 290, 10)).toBe(0);
    expect(budgetRoom('medium', 500, 0)).toBe(0);
    const m = new WeatherModel(createRng(1));
    const t = layerTargets(weatherWeights(moodAt(125)), 'high', false);
    m.step(16, view, t, 0, east);
    expect(m.count()).toBe(0);
    m.step(16, view, t, 25, east);
    expect(m.count()).toBe(25);
    m.step(16, view, t, 1000, east);
    expect(m.count()).toBeLessThanOrEqual(WEATHER_CAP.high);
    expect(m.count()).toBe(t.reduce((n, x) => n + x.count, 0));
  });

  it('spawns over the view plus its margin and recycles at the upwind edge, keeping the count', () => {
    const m = new WeatherModel(createRng(2));
    const t = layerTargets(weatherWeights(moodAt(70)), 'high', false);
    const want = t.reduce((n, x) => n + x.count, 0);
    const m1 = WEATHER_MARGIN + 1;
    let outside = 0;
    const counts = new Set<number>();
    for (let i = 0; i < 600; i++) {
      m.step(16, view, t, 1000, east);
      for (const p of m.particles) if (p.x < view.x - m1 || p.x > view.x + view.width + m1 || p.y < view.y - m1 || p.y > view.y + view.height + m1) outside += 1;
      counts.add(m.count());
    }
    expect(outside).toBe(0);
    expect([...counts]).toEqual([want]);
    expect(m.recycled).toBeGreaterThan(0);
    // The camera moves on: the field follows the view, never the map.
    const far = { ...view, x: view.x + 5000 };
    for (let i = 0; i < 200; i++) m.step(16, far, t, 1000, east);
    for (const p of m.particles) expect(p.x).toBeGreaterThanOrEqual(far.x - WEATHER_MARGIN - 1);
  });

  it('fades the particles over a layer’s target out (a tier change, a crossfade) instead of cutting them (review)', () => {
    const m = new WeatherModel(createRng(5));
    const weights = weatherWeights(moodAt(125));
    const high = layerTargets(weights, 'high', false);
    m.step(16, view, high, 1000, east);
    const before = m.count();
    const low = layerTargets(weights, 'low', false);
    const want = low.reduce((n, x) => n + x.count, 0);
    expect(before).toBeGreaterThan(want);
    const dead = m.step(16, view, low, 1000, east);
    // None cut for being over: only those at the end of their lives, or drifted out of the view and its margin, die.
    const out = (p: { x: number; y: number }) => p.x < view.x - WEATHER_MARGIN || p.x > view.x + view.width + WEATHER_MARGIN || p.y < view.y - WEATHER_MARGIN || p.y > view.y + view.height + WEATHER_MARGIN;
    expect(dead.filter((p) => p.age < p.life && !out(p))).toEqual([]);
    expect(dead.length).toBeLessThan(before - want);
    expect(m.live()).toBe(want);
    expect(m.count()).toBeGreaterThan(want);
    const over = m.particles.filter((p) => p.fadeLeft !== null);
    const layer = (p: (typeof over)[number]) => WEATHER[p.region].layers.find((l) => l.id === p.layer);
    m.step(WEATHER_MOTION.overMs / 2, view, low, 1000, east);
    // Halfway through its fade a particle shows at half the alpha it would have.
    const halfway = over.filter((p) => m.particles.includes(p));
    expect(halfway.length).toBeGreaterThan(0);
    for (const p of halfway) {
      const l = layer(p);
      if (!l) throw new Error(p.layer);
      expect(WeatherModel.alpha(p, l)).toBeCloseTo(WeatherModel.alpha({ ...p, fadeLeft: null }, l) * ((p.fadeLeft ?? 0) / WEATHER_MOTION.overMs), 9);
      expect(p.fadeLeft).toBeLessThan(WEATHER_MOTION.overMs * 0.6);
    }
    m.step(WEATHER_MOTION.overMs / 2 + 1, view, low, 1000, east);
    expect(m.particles.filter((p) => p.fadeLeft !== null)).toEqual([]);
    expect(m.count()).toBeLessThanOrEqual(want);
  });

  it('replays the same from the same seed and frames', () => {
    const run = (seed: number) => {
      const m = new WeatherModel(createRng(seed));
      const t = layerTargets(weatherWeights(moodAt(95)), 'medium', false);
      for (let i = 0; i < 300; i++) m.step(16, view, t, 1000, east);
      return JSON.stringify(m.particles);
    };
    expect(run(5)).toEqual(run(5));
    expect(run(5)).not.toEqual(run(6));
  });
});

describe('weather lightning (077)', () => {
  const tower = SET_PIECES.find((p) => p.id === 'storm-tower');
  if (!tower?.strikeAt) throw new Error('no storm tower');
  const a = setPieceAnchor(tower, T);
  const crown = { x: a.x + tower.strikeAt[0], y: a.y + tower.strikeAt[1] };

  it('strikes every 10–22 s from its seed, holding while inactive', () => {
    const c = new LightningClock(createRng(3));
    expect(c.wait).toBeGreaterThanOrEqual(WEATHER_LIGHTNING.everyMs[0]);
    expect(c.wait).toBeLessThanOrEqual(WEATHER_LIGHTNING.everyMs[1]);
    const times: number[] = [];
    for (let t = 0; t < 120_000; t += 16) if (c.step(16, true)) times.push(t);
    for (let i = 1; i < times.length; i++) {
      const gap = (times[i] ?? 0) - (times[i - 1] ?? 0);
      expect(gap).toBeGreaterThanOrEqual(WEATHER_LIGHTNING.everyMs[0] - 16);
      expect(gap).toBeLessThanOrEqual(WEATHER_LIGHTNING.everyMs[1] + 16);
    }
    expect(times.length).toBeGreaterThanOrEqual(5);
    const held = c.wait;
    for (let i = 0; i < 1000; i++) expect(c.step(16, false)).toBe(false);
    expect(c.wait).toBe(held);
  });

  it('never strikes on Low, with Flashes off, in a fight or an arena, or outside the Stormcrown', () => {
    const on = { quality: 'high' as const, flashes: true, stormWeight: 1, fight: false, inArena: false, overworld: true };
    expect(lightningActive(on)).toBe(true);
    expect(lightningActive({ ...on, quality: 'medium' })).toBe(true);
    expect(lightningActive({ ...on, quality: 'low' })).toBe(false);
    expect(lightningActive({ ...on, flashes: false })).toBe(false);
    expect(lightningActive({ ...on, fight: true })).toBe(false);
    expect(lightningActive({ ...on, inArena: true })).toBe(false);
    expect(lightningActive({ ...on, overworld: false })).toBe(false);
    expect(lightningActive({ ...on, stormWeight: 0.49 })).toBe(false);
  });

  it('strikes the Storm Tower’s crown whenever it’s in view', () => {
    const v = { x: crown.x - 320, y: crown.y - 60, width: 640, height: 360 };
    for (let s = 0; s < 10; s++) expect(strikeTarget(room, v, { x: crown.x, y: crown.y + 100 }, rodNodes, createRng(s))).toEqual({ kind: 'tower', ...crown });
  });

  it('otherwise strikes a rod at least 6 tiles from the player, never within 4 of a storm-rod node, else a cairn or cliff top', () => {
    let rods = 0;
    for (let i = 0; i < 400; i++) {
      const tx = 30 + ((i * 37) % 230);
      const ty = 10 + ((i * 53) % 260);
      if (Math.hypot(tx - 146, ty - 146) < 113) continue;
      const v = { x: tx * T - 320, y: ty * T - 180, width: 640, height: 360 };
      const player = { x: tx * T, y: ty * T };
      const hit = strikeTarget(room, v, player, rodNodes, createRng(i));
      if (!hit) continue;
      if (hit.kind === 'tower') continue;
      if (hit.kind === 'rod') rods += 1;
      expect(Math.hypot(hit.x - player.x, hit.y - player.y)).toBeGreaterThanOrEqual(WEATHER_LIGHTNING.playerMargin * T - T);
      for (const n of rodNodes) expect(Math.hypot(hit.x - n.x, hit.y - n.y), `${hit.kind} by a rod node`).toBeGreaterThan(WEATHER_LIGHTNING.rodNodeMargin * T - WEATHER_LIGHTNING.riseRod);
      expect(hit.x).toBeGreaterThanOrEqual(v.x);
      expect(hit.y).toBeGreaterThanOrEqual(v.y);
    }
    expect(rods).toBeGreaterThan(10);
  });

  it('never strikes where its bolt runs down over the player, or under the bottom HUD (review)', () => {
    const L = WEATHER_LIGHTNING;
    const bad: string[] = [];
    let hits = 0;
    for (let i = 0; i < 1500; i++) {
      const tx = 20 + ((i * 37) % 250);
      const ty = 10 + ((i * 53) % 270);
      if (Math.hypot(tx - 146, ty - 146) < 113) continue;
      // The player anywhere in the view, not only its middle.
      const v = { x: tx * T - 320 + ((i * 29) % 200) - 100, y: ty * T - 180 + ((i * 41) % 120) - 60, width: 640, height: 360 };
      const player = { x: tx * T, y: ty * T };
      const hit = strikeTarget(room, v, player, rodNodes, createRng(i));
      if (!hit) continue;
      hits += 1;
      if (Math.abs(hit.x - player.x) <= L.playerColumn && hit.y >= player.y - L.playerTall) bad.push(`${i}: ${hit.kind} through the player`);
      if (hit.y > v.y + v.height - L.hudClear) bad.push(`${i}: ${hit.kind} under the HUD`);
    }
    expect(hits).toBeGreaterThan(50);
    expect(bad).toEqual([]);
  });

  it('skips when nothing suitable is in view', () => {
    // The open meadow by the foundry: no rod, cairn or cliff.
    const v = { x: 146 * T - 320, y: 150 * T - 180, width: 640, height: 360 };
    expect(strikeTarget(room, v, { x: 146 * T, y: 150 * T }, rodNodes, createRng(1))).toBeNull();
  });
});
