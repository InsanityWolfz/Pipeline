import { describe, expect, it } from 'vitest';
import { WANDERER } from '../../src/data/art/wanderer';
import { WANDERER_MOTION as M } from '../../src/data/art/wandererMotion';
import { SHAKE_ON } from '../../src/data/juice';
import { HALF_STEP } from '../../src/render/vector/wandererGait';
import { braceDip, nextSpinRate, recoil, STILL, strideRate, wandererAnim, wandererMotion, type WandererClocks } from '../../src/render/vector/wandererMotion';

// 075: the wanderer's motion is a pure function of clocks, sampled at fixed times here as the contact sheet does.

const at = (c: Partial<WandererClocks>) => wandererMotion({ ...STILL, view: 'side', aim: 0, ...c });
const running = (stride: number, extra: Partial<WandererClocks> = {}) => at({ moving: 30, speed: 1, stride, ...extra });
const TAU = Math.PI * 2;
const steps = (n: number) => Array.from({ length: n }, (_, i) => (i * TAU) / n);

describe('the run (075)', () => {
  it('keys the stride to distance: a planted foot moves back exactly as far as the body moves on', () => {
    const rate = strideRate(false);
    expect(rate).toBe(0.32);
    // Through the near foot's stance (phase 0..π), its world x plus the distance walked stays put.
    for (const firing of [false, true]) {
      const r = strideRate(firing);
      const world = (phase: number) => {
        const p = running(phase, firing ? { firing: 30 } : {});
        return p.feet.near.x * (1 + p.squash) * WANDERER.scale + phase / r;
      };
      const start = world(0.1);
      for (const ph of [0.5, 1, 1.5, 2, 2.5, 3]) expect(world(ph), `firing ${firing}, phase ${ph}`).toBeCloseTo(start, 1);
    }
    expect(HALF_STEP * 2 * WANDERER.scale).toBeCloseTo(Math.PI / 0.32, 5);
  });

  it('lifts the swinging foot, kicks it back, and bends the passing knee', () => {
    const swing = steps(32).map((ph) => running(ph + Math.PI));
    expect(Math.min(...swing.map((p) => p.feet.near.y))).toBeLessThan(-2.5);
    expect(Math.min(...swing.map((p) => p.feet.near.x))).toBeLessThan(-HALF_STEP - 1);
  });

  it('bobs the body lowest just after each contact, squashing there and stretching at passing', () => {
    const cycle = steps(64).map((ph) => ({ ph, p: running(ph) }));
    const lowest = cycle.reduce((a, b) => (b.p.crouch > a.p.crouch ? b : a));
    const after = lowest.ph % Math.PI;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(0.6);
    expect(lowest.p.squash).toBeCloseTo(M.run.contactSquash, 2);
    const passing = running(Math.PI / 2 + M.run.lag);
    expect(passing.squash).toBeCloseTo(-M.run.passingStretch, 2);
    expect(Math.max(...cycle.map((c) => c.p.crouch)) - Math.min(...cycle.map((c) => c.p.crouch))).toBeCloseTo(M.run.bob, 1);
  });

  it('trails the cape further the faster it goes', () => {
    const trail = (speed: number) => running(0.3, { speed }).cape.trail;
    expect(trail(0)).toBe(0);
    expect(trail(0.5)).toBeGreaterThan(0);
    expect(trail(1)).toBeCloseTo(M.cape.run, 5);
    expect(trail(1)).toBeGreaterThan(trail(0.5));
  });

  it('bounces the tank a quarter of the bob\'s cycle behind the body', () => {
    const cycle = steps(128).map((ph) => ({ ph, p: running(ph) }));
    const bodyLow = cycle.reduce((a, b) => (b.p.crouch > a.p.crouch ? b : a)).ph % Math.PI;
    const tankLow = cycle.reduce((a, b) => (b.p.tank.bob > a.p.tank.bob ? b : a)).ph % Math.PI;
    // The bob repeats every π of stride: a quarter of it is π/4.
    const lag = (tankLow - bodyLow + Math.PI) % Math.PI;
    expect(lag).toBeCloseTo(Math.PI / 4, 1);
    expect(Math.max(...cycle.map((c) => c.p.tank.squash))).toBeCloseTo(M.tank.squash, 2);
  });

  it('strafes while firing at half the stride and bob, with no lean into the run', () => {
    const runLift = Math.min(...steps(32).map((ph) => running(ph).feet.near.y));
    const strafe = steps(32).map((ph) => running(ph, { firing: 30 }));
    expect(Math.min(...strafe.map((p) => p.feet.near.y))).toBeGreaterThan(runLift * 0.75);
    const reach = (ps: { feet: { near: { x: number } } }[]) => Math.max(...ps.map((p) => p.feet.near.x)) - Math.min(...ps.map((p) => p.feet.near.x));
    expect(reach(strafe)).toBeLessThan(reach(steps(32).map((ph) => running(ph))) * 0.6);
    expect(running(1, { firing: 30 }).lean).toBeCloseTo(M.brace.lean, 1);
    expect(running(1).lean).toBeCloseTo(M.run.lean, 5);
  });

  it('settles once as the stride ends', () => {
    // At a stride phase where the bob's own squash is nothing, so only the settle shows.
    const s = [0, 2, 4, 6, 8, 12].map((t) => at({ stopped: t, stride: M.run.lag + Math.PI / 4, ms: M.idle.breathMs / 4 }).squash);
    expect(Math.max(...s)).toBeGreaterThan(0.02);
    expect(Math.max(...s)).toBeLessThanOrEqual(M.stop.squash + 1e-9);
    expect(s.at(-1)).toBeCloseTo(at({ ms: M.idle.breathMs / 4 }).squash, 5);
  });
});

describe('firing (075)', () => {
  it('dips on its first frames, then braces with an overshoot', () => {
    expect(braceDip(0)).toBeGreaterThan(1.5);
    expect(braceDip(1)).toBeCloseTo(M.brace.dip, 5);
    expect(braceDip(3)).toBe(0);
    const crouch = (f: number) => at({ firing: f }).crouch;
    expect(crouch(1)).toBeGreaterThan(crouch(30));
    // The brace leans back past its rest and comes back: the overshoot.
    expect(Math.min(...[5, 6, 7, 8, 9].map((f) => at({ firing: f }).lean))).toBeLessThan(M.brace.lean);
  });

  it('kicks and squashes on each shot and recovers within 6 frames, through a small stretch', () => {
    expect(recoil(0)).toEqual({ kick: 1, squash: M.recoil.squash });
    expect(at({ firing: 30, shots: [0] }).kick).toBeCloseTo(M.recoil.kick, 5);
    expect(Math.min(...[3, 4, 5].map((t) => recoil(t).squash))).toBeLessThan(-0.01);
    expect(recoil(6)).toEqual({ kick: 0, squash: 0 });
    expect(at({ firing: 30, shots: [0] }).shove).toBeCloseTo(M.recoil.shove, 5);
    expect(at({ firing: 30, shots: [6] }).kick).toBe(0);
  });

  it('spins the barrel up over 15 frames and down over 30', () => {
    let rate = 0;
    const up: number[] = [];
    for (let i = 0; i < 20; i++) up.push((rate = nextSpinRate(rate, true)));
    expect(up[13]).toBeLessThan(1);
    expect(up[14]).toBeCloseTo(1, 9);
    const down: number[] = [];
    for (let i = 0; i < 31; i++) down.push((rate = nextSpinRate(rate, false)));
    expect(down[28]).toBeGreaterThan(0);
    expect(down[29]).toBeCloseTo(0, 9);
  });

  it('flashes the muzzle for 3 frames a shot, odd and even shots at alternating angles', () => {
    const f = [0, 1, 2, 3].map((t) => at({ firing: 30, shots: [t], shotCount: 1 }).flash);
    expect(f.map((x) => x?.frame ?? null)).toEqual([0, 1, 2, null]);
    expect(f[1]?.angle).toBeCloseTo((f[0]?.angle ?? 0) + Math.PI / 4, 5);
    expect(at({ firing: 30, shots: [0], shotCount: 2 }).flash?.angle).not.toBeCloseTo(f[0]?.angle ?? 0, 3);
  });

  it('sends a hose pulse from the tank to the tube in 150 ms, one per shot', () => {
    const along = (t: number) => at({ firing: 30, shots: [t] }).pulses;
    expect(along(0)).toEqual([0]);
    expect(along(4)[0]).toBeCloseTo(4 / 9, 5);
    expect(along(9)).toEqual([]);
    expect(M.pulseFrames * M.frameMs).toBeCloseTo(150, 0);
    expect(at({ firing: 30, shots: [1, 4, 7] }).pulses).toHaveLength(3);
    expect(at({ firing: 30, shots: [0] }).windowFlare).toBe(1);
  });

  it('flares the face glow on a shot', () => {
    expect(at({ firing: 30, shots: [0] }).glow).toBe(1);
    expect(at({ firing: 30, shots: [20] }).glow).toBeLessThan(1);
  });
});

describe('the roll, the hit and the KO (075)', () => {
  it('somersaults side on through a full circle, and tumbles facing down or up', () => {
    const turns = Array.from({ length: 18 }, (_, i) => at({ roll: i + 1 }).turn);
    expect(turns[0]).toBe(0);
    expect(Math.max(...turns)).toBeCloseTo(TAU, 5);
    for (let i = 3; i < 15; i++) expect(turns[i] ?? 0).toBeGreaterThan(turns[i - 1] ?? 0);
    expect(at({ roll: 1 }).squash).toBeGreaterThan(0.05);
    expect(at({ roll: 16 }).squash).toBeCloseTo(M.roll.land, 5);
    const tumble = Array.from({ length: 18 }, (_, i) => at({ view: 'down', roll: i + 1 }).turn);
    expect(Math.max(...tumble.map(Math.abs))).toBeLessThanOrEqual(M.roll.wobble + 1e-9);
    expect(Math.max(...tumble.map(Math.abs))).toBeGreaterThan(0.2);
    expect(at({ view: 'up', roll: 8 }).squash).toBeCloseTo(M.roll.tumble, 5);
  });

  it('snaps the hit on its first frame and is back within the 8 pose ticks', () => {
    const rest = at({});
    const hit = (h: number) => at({ hit: h });
    expect(hit(0).lean).toBeCloseTo(rest.lean - M.hit.lean, 5);
    expect(hit(0).squash).toBeCloseTo(rest.squash + M.hit.squash, 5);
    expect(hit(0).hoodTail).toBeLessThan(rest.hoodTail);
    expect(hit(0).glow).toBe(M.hit.glow);
    expect(hit(4).glow).toBeGreaterThan(M.hit.glow);
    // An overshoot the other way on the way back.
    expect(Math.max(...[3, 4, 5, 6, 7].map((h) => hit(h).lean))).toBeGreaterThan(rest.lean);
    expect(hit(8).lean).toBeCloseTo(rest.lean, 5);
    expect(wandererAnim({ ...STILL, hit: 8 })).toBe('idle');
  });

  it('lies the KO flat by frame 36, side on from any view, and puts the glow out', () => {
    for (const view of ['side', 'down', 'up'] as const) {
      expect(at({ view, ko: 0 }).view).toBe('side');
      expect(at({ view, ko: 36 }).turn).toBeCloseTo(-Math.PI / 2, 5);
      expect(at({ view, ko: 59 }).turn).toBeCloseTo(-Math.PI / 2, 5);
    }
    expect(at({ ko: 8 }).lean).toBeLessThan(-0.3);
    expect(at({ ko: 24 }).crouch).toBeCloseTo(M.ko.kneelCrouch, 5);
    expect(at({ ko: 36 }).squash).toBeCloseTo(M.ko.land, 5);
    expect(at({ ko: 36 }).tubeDrop).toBe(1);
    expect(at({ ko: 48 }).glow).toBe(0);
  });
});

describe('idle life (075)', () => {
  it('breathes every 2.4 s and sways the cape while standing still', () => {
    const rise = (ms: number) => -at({ ms }).crouch;
    expect(rise(0)).toBeCloseTo(0, 5);
    expect(rise(1200)).toBeCloseTo(M.idle.rise, 5);
    expect(rise(2400)).toBeCloseTo(rise(0), 5);
    expect(at({ ms: 1200 }).squash).toBeCloseTo(-M.idle.squash, 5);
    const sway = [0, 750, 1500, 2250].map((ms) => at({ ms }).cape.sway);
    expect(Math.max(...sway)).toBeCloseTo(M.idle.sway, 2);
    expect(Math.min(...sway)).toBeCloseTo(-M.idle.sway, 2);
  });

  it('keeps the area under a squash, with the feet planted', () => {
    const s = running(0.3);
    expect((1 + s.squash) * (1 - s.squash)).toBeGreaterThan(0.99);
    // The feet are set down where, once squashed about the feet, they land on the cycle's own places.
    const unsquashed = wandererMotion({ ...STILL, view: 'side', aim: 0, moving: 30, speed: 1, stride: 0.3 });
    expect(unsquashed.feet.near.x * (1 + unsquashed.squash)).toBeCloseTo(s.feet.near.x * (1 + s.squash), 5);
  });

  it('never shakes the camera', () => {
    expect(SHAKE_ON).toBe(false);
  });
});
