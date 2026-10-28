import { describe, expect, it } from 'vitest';
import { ENEMY_MOTION as M } from '../../src/data/art/enemyMotion';
import { ENEMIES } from '../../src/data/enemies';
import { SNIPER } from '../../src/data/hollowsEnemies';
import { createEnemy } from '../../src/sim/enemies';
import { ENEMY_ANIMS } from '../../src/data/assets';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { enemyArt } from '../../src/render/enemyArt';
import { peakStart, RELEASE_MODES, releaseSquash, stripIndex, stripsOf, tremble, windupOf, windupPhase, type WindupPhase } from '../../src/render/enemyMotion';

// 076: every attack's wind-up is a strip of gather, coil and peak, picked by the wind-up's progress, so it fills the
// sim's wind-up exactly however long it is; the peak trembles; the attack's first frames stretch and settle.

const phasesOf = (ticks: number, peakAt?: number): WindupPhase[] => Array.from({ length: ticks }, (_, i) => windupPhase(i + 1, ticks, peakAt));

describe('wind-up phases (076)', () => {
  it('gather below 20%, coil to 85%, peak the rest, for every attack in the tables', () => {
    const attacks = Object.values(ENEMIES).flatMap((def) => stripsOf(def).map((s) => ({ id: def.id, ...s })));
    // Every enemy and every boss attack: the Bulwark's three, the Forgewright's three, the Conductor's three.
    expect(attacks.length).toBe(Object.keys(ENEMIES).length + 6);
    for (const a of attacks) {
      const peakAt = M.peakAt[`${a.id}:${a.pose}`];
      const phases = phasesOf(a.ticks, peakAt);
      for (let t = 1; t <= a.ticks; t++) {
        const p = t / a.ticks;
        const want: WindupPhase = p < M.phases.gather ? 'gather' : t >= peakStart(a.ticks, peakAt) ? 'peak' : 'coil';
        expect(phases[t - 1], `${a.id} ${a.pose} tick ${t}`).toBe(want);
      }
      // In order, each phase shown, the peak at least 5 ticks and starting no earlier than 85% (the Sniper's lock aside).
      expect(phases.indexOf('coil')).toBeGreaterThan(phases.lastIndexOf('gather'));
      expect(phases.indexOf('peak')).toBeGreaterThan(phases.lastIndexOf('coil'));
      expect(phases.filter((x) => x === 'peak').length, `${a.id} ${a.pose}`).toBeGreaterThanOrEqual(M.phases.minPeakTicks);
      if (peakAt === undefined) expect(phases.indexOf('peak') + 1, `${a.id} ${a.pose}`).toBeGreaterThanOrEqual(Math.min(Math.ceil(a.ticks * M.phases.peak), a.ticks - M.phases.minPeakTicks + 1));
    }
  });

  it("starts the Sniper's peak at its lock", () => {
    const { windupTicks, trackTicks } = SNIPER.snipe;
    const phases = phasesOf(windupTicks, M.peakAt['sniper:windup']);
    expect(phases.indexOf('peak') + 1).toBe(trackTicks + 1);
    expect(phases[trackTicks - 1]).toBe('coil');
  });

  it('reads the wind-up of the attack a mode belongs to', () => {
    const at = (enemyId: string, mode: string, attack = -1) => {
      const e = createEnemy(1, enemyId, { x: 0, y: 0 }, 'x');
      e.mode = mode as typeof e.mode;
      e.conductor.attack = attack;
      return windupOf(e);
    };
    expect(at('husk', 'windup')).toEqual({ pose: 'windup', ticks: 36 });
    expect(at('bulwark', 'lob')).toEqual({ pose: 'lob', ticks: 30 });
    expect(at('bulwark', 'stomp-windup')).toEqual({ pose: 'brace', ticks: 40 });
    expect(at('forgewright', 'flood-windup')).toEqual({ pose: 'flood', ticks: 90 });
    expect(at('forgewright', 'spray-windup')).toEqual({ pose: 'spray', ticks: 45 });
    expect(at('conductor', 'windup', 1)).toEqual({ pose: 'call', ticks: 60 });
    expect(at('conductor', 'windup', 2)).toEqual({ pose: 'chain', ticks: 60 });
    expect(at('husk', 'chase')).toBeNull();
    // Enraged, the Bulwark's stomp winds up for its shorter telegraph.
    const b = createEnemy(1, 'bulwark', { x: 0, y: 0 }, 'x');
    b.mode = 'stomp-windup';
    b.enraged = true;
    expect(windupOf(b)?.ticks).toBe(35);
  });

  it('shows gather first, peak last, and alternates a two-frame coil at walk pace', () => {
    expect(stripIndex('gather', 1, 0)).toBe(0);
    expect(stripIndex('coil', 1, 999)).toBe(1);
    expect(stripIndex('peak', 1, 0)).toBe(2);
    expect(stripIndex('peak', 2, 0)).toBe(3);
    const frame = 1000 / M.phases.coilFps;
    expect([0, frame * 1.01, frame * 2.01].map((ms) => stripIndex('coil', 2, ms))).toEqual([1, 2, 1]);
  });

  it('trembles only in the peak, by 0.8 px (bosses 1.2) at 20 Hz', () => {
    const samples = Array.from({ length: 200 }, (_, i) => i * 1.7);
    for (const phase of ['gather', 'coil'] as const) for (const ms of samples) expect(tremble(phase, ms, false)).toEqual({ dx: 0, dy: 0 });
    const xs = samples.map((ms) => tremble('peak', ms, false).dx);
    expect(Math.max(...xs)).toBeCloseTo(M.tremble.px, 1);
    expect(Math.min(...xs)).toBeCloseTo(-M.tremble.px, 1);
    expect(Math.max(...samples.map((ms) => Math.abs(tremble('peak', ms, true).dx)))).toBeCloseTo(M.tremble.bossPx, 1);
    // One cycle every 50 ms.
    expect(tremble('peak', 12.5, false).dx).toBeCloseTo(M.tremble.px, 5);
    expect(tremble('peak', 62.5, false).dx).toBeCloseTo(M.tremble.px, 5);
  });

  it("stretches an attack's first frame and settles over 4 ticks", () => {
    expect(releaseSquash(1)).toBeCloseTo(M.release.squash, 5);
    expect(releaseSquash(1)).toBeLessThan(0);
    expect(releaseSquash(3)).toBeGreaterThan(releaseSquash(2));
    expect(releaseSquash(M.release.ticks + 1)).toBe(0);
    expect(releaseSquash(40)).toBe(0);
  });

  it("never stretches a slam's or a stomp's impact frame, so its baked squash lands (review 1)", () => {
    // Every release an enemy can show: where the pose it shows on the release's first tick is baked squashed (an
    // impact), render adds no stretch and the frame lands squashed; elsewhere the stretch plays.
    let slams = 0;
    for (const def of Object.values(ENEMIES)) {
      const rig = ENEMY_RIGS.find((r) => r.id === def.anims);
      const anims = ENEMY_ANIMS[def.anims];
      if (!rig || !anims) throw new Error(def.id);
      for (const mode of RELEASE_MODES) {
        const e = createEnemy(1, def.id, { x: 0, y: 0 }, 'x');
        e.mode = mode as typeof e.mode;
        e.modeTicks = 1;
        const art = enemyArt(e, def, anims, 'side', false, null, 0);
        const baked = rig.poses[art.pose as keyof typeof rig.poses]?.[0]?.squash ?? 0;
        if (baked >= 0.12) {
          slams += 1;
          expect(art.squash, `${def.id}:${mode}`).toBe(0);
          expect(baked + art.squash, `${def.id}:${mode}`).toBeGreaterThan(0.1);
        }
      }
    }
    // The Warden's and the golem's slams, the Bulwark's pound and stomp, the Forgewright's three hammer blows.
    expect(slams).toBeGreaterThanOrEqual(7);
    const husk = createEnemy(1, 'husk', { x: 0, y: 0 }, 'x');
    husk.mode = 'swipe';
    husk.modeTicks = 1;
    const huskDef = ENEMIES.husk;
    const huskAnims = ENEMY_ANIMS.husk;
    if (!huskDef || !huskAnims) throw new Error('husk');
    expect(enemyArt(husk, huskDef, huskAnims, 'side', false, null, 0).squash).toBeCloseTo(M.release.squash, 5);
  });
});
