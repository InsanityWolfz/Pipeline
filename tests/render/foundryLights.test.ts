import { describe, expect, it } from 'vitest';
import { FOUNDRY_LIGHTS, LIGHT_BUDGET } from '../../src/data/lights';
import { STATIC_ROOMS } from '../../src/data/rooms';
import { foundryLights, wallLights } from '../../src/render/lighting/foundryLights';
import { pickLights } from '../../src/render/lighting/lightPick';
import type { ForgeAt } from '../../src/render/foundry/runningForges';

// 079: the foundry's lights: its wall fires from the props (worked out once a room), the intake's mouth, and running
// forge machines on screen; the wall lights keep their place under a full budget; fires flicker within ±15% and the
// coil's light holds steady with Flashes off.

const room = STATIC_ROOMS.foundry;
if (!room) throw new Error('no foundry');
const forge = (id: number, pieceId: string, x = 300, bottom = 200): ForgeAt => ({ id, pieceId, x, bottom });
const base = { room, view: { x: 0, y: -48, width: 768, height: 560 }, time: 0, flashes: true, forges: [] as ForgeAt[], intake: null };

describe('the foundry’s lights (079)', () => {
  it('lights the two braziers and four torches from the room’s props, once a room', () => {
    const walls = wallLights(room);
    expect(walls.map((w) => w.key).sort()).toEqual(['brazier', 'brazier', 'torch', 'torch', 'torch', 'torch']);
    expect(wallLights(room)).toBe(walls);
    // The torches stand on the side walls: the west ones reach into the room, the east ones too.
    const torches = walls.filter((w) => w.key === 'torch');
    for (const t of torches) expect(t.x < 32 || t.x > 23 * 32).toBe(true);
    const lights = foundryLights(base);
    expect(lights.filter((l) => l.source === 'wall').length).toBe(6);
    for (const l of lights.filter((x) => x.source === 'wall')) expect(l.priority).toBe(2);
  });

  it('offers a wall light only while its pool reaches the view', () => {
    const west = foundryLights({ ...base, view: { x: 0, y: 0, width: 300, height: 512 } }).filter((l) => l.source === 'wall');
    expect(west.every((l) => l.x - l.radius <= 300)).toBe(true);
    expect(west.length).toBeLessThan(6);
  });

  it('places a machine’s light only for the running forge machines it is given, by machine', () => {
    const lights = foundryLights({ ...base, forges: [forge(1, 'smelter', 300, 200), forge(2, 'kiln'), forge(3, 'tempering-coil')] });
    const machines = lights.filter((l) => l.source === 'forge');
    expect(machines.length).toBe(3);
    const smelter = machines[0];
    expect(smelter?.color).toBe('cinder');
    expect(smelter?.radius).toBe(56);
    expect(smelter?.y).toBe(200 - (FOUNDRY_LIGHTS.machines.smelter?.rise ?? 0));
    expect(machines[2]?.color).toBe('storm-glow');
    expect(machines[2]?.radius).toBe(40);
    expect(foundryLights({ ...base, forges: [forge(4, 'assembler')] }).some((l) => l.source === 'forge')).toBe(false);
  });

  it('lights the intake’s mouth while it glows, 1.5 × its glow, swelling with it', () => {
    expect(foundryLights(base).some((l) => l.source === 'intake')).toBe(false);
    const still = foundryLights({ ...base, intake: { x: 400, y: 32, glowRadius: 40 } }).find((l) => l.source === 'intake');
    expect(still?.radius).toBe(60);
    expect(still?.color).toBe('cyan-glow');
    const swollen = foundryLights({ ...base, intake: { x: 400, y: 32, glowRadius: 56 } }).find((l) => l.source === 'intake');
    expect(swollen?.radius).toBe(84);
  });

  it('never drops a wall light for a machine’s, on Medium or High', () => {
    const forges = Array.from({ length: 14 }, (_, i) => forge(i, i % 2 ? 'kiln' : 'smelter', 100 + i * 30, 200));
    const all = foundryLights({ ...base, forges, intake: { x: 400, y: 32, glowRadius: 40 } });
    for (const q of ['medium', 'high'] as const) {
      const picked = pickLights(all, q, { x: 384, y: 256 });
      expect(picked.length).toBe(LIGHT_BUDGET[q]);
      const walls = picked.filter((l) => l.source === 'wall' || l.source === 'intake').length;
      expect(walls, q).toBe(Math.min(7, LIGHT_BUDGET[q]));
    }
    expect(pickLights(all, 'low', { x: 0, y: 0 })).toEqual([]);
  });

  it('flickers fires within ±15%, and holds the coil steady with Flashes off', () => {
    const seen = { fire: [] as number[], coil: [] as number[], coilOff: [] as number[] };
    for (let t = 0; t < 3000; t += 7) {
      const on = foundryLights({ ...base, time: t, forges: [forge(1, 'smelter'), forge(2, 'tempering-coil')] });
      const off = foundryLights({ ...base, time: t, flashes: false, forges: [forge(2, 'tempering-coil')] });
      seen.fire.push(on.find((l) => l.source === 'forge' && l.color === 'cinder')?.intensity ?? 0);
      seen.coil.push(on.find((l) => l.color === 'storm-glow')?.intensity ?? 0);
      seen.coilOff.push(off.find((l) => l.color === 'storm-glow')?.intensity ?? 0);
    }
    const within = (xs: number[], base0: number) => xs.every((x) => x >= base0 * 0.85 - 1e-9 && x <= base0 * 1.15 + 1e-9);
    expect(within(seen.fire, 0.9)).toBe(true);
    expect(Math.max(...seen.fire) - Math.min(...seen.fire)).toBeGreaterThan(0.05);
    expect(within(seen.coil, 0.7)).toBe(true);
    expect(new Set(seen.coilOff).size).toBe(1);
  });

  // 079.1, the motion check: at 30 frames a second a light changes gently from one frame to the next (the spec's
  // 7 Hz two-wave flicker jumped up to a third of its brightness a frame).
  it('flickers gently: a wall fire moves at most 4% a 33 ms frame, a forge’s at most 7%', () => {
    const steps = (pick: (ls: ReturnType<typeof foundryLights>) => number) => {
      let worst = 0;
      let last = pick(foundryLights({ ...base, forges: [forge(1, 'smelter'), forge(2, 'tempering-coil')] }));
      for (let t = 1000 / 30; t < 4000; t += 1000 / 30) {
        const now = pick(foundryLights({ ...base, time: t, forges: [forge(1, 'smelter'), forge(2, 'tempering-coil')] }));
        worst = Math.max(worst, Math.abs(now - last) / last);
        last = now;
      }
      return worst;
    };
    expect(steps((ls) => ls.find((l) => l.source === 'wall' && l.radius === 48)?.intensity ?? 1)).toBeLessThanOrEqual(0.04);
    expect(steps((ls) => ls.find((l) => l.source === 'wall' && l.radius === 64)?.intensity ?? 1)).toBeLessThanOrEqual(0.04);
    expect(steps((ls) => ls.find((l) => l.color === 'cinder' && l.source === 'forge')?.intensity ?? 1)).toBeLessThanOrEqual(0.07);
    expect(steps((ls) => ls.find((l) => l.color === 'storm-glow')?.intensity ?? 1)).toBeLessThanOrEqual(0.07);
  });
});
