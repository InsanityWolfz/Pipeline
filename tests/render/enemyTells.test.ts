import { describe, expect, it } from 'vitest';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { WINDUP_STRIPS } from '../../src/data/art/enemyMotion';
import type { EnemyPoseName } from '../../src/data/art/enemyRig';
import { ENEMIES } from '../../src/data/enemies';
import { rigBounds } from '../../src/render/vector/enemyBounds';
import { posedPoint } from '../../src/render/vector/enemyPose';

// 076: a wind-up's tell reads at game size: its coil and peak carry the attack part (claw, fist, hammer, staff,
// plate, head) at least 4 world px from where it rests (bosses 6), measured on the posed geometry as drawEnemy
// draws it. Every pose fits its rig's frame box, so nothing clips; squash keeps the feet planted.

const VIEWS = ['side', 'down', 'up'] as const;
const MIN = 4;
const BOSS_MIN = 6;
/** Rigs redrawn by 076 so far, which carry their tells. The Burrower's wind-up is underground (its ripple's). */
const REDRAWN = ['husk', 'wisp', 'warden', 'charger', 'burrower', 'shardback', 'sniper', 'bulwark'];
/** Its wind-up is spent underground: the ripple's phases are its tell. */
const UNDERGROUND = ['burrower'];
const bossRig = (id: string): boolean => Object.values(ENEMIES).some((d) => d.anims === id && d.boss);

describe('wind-up tells (076)', () => {
  for (const rig of ENEMY_RIGS.filter((r) => REDRAWN.includes(r.id) && !UNDERGROUND.includes(r.id))) {
    it(`${rig.id}: coil and peak move the attack part clear of idle in every view`, () => {
      const idle = rig.poses.idle?.[0] ?? {};
      const strips = WINDUP_STRIPS.filter((p) => rig.poses[p]);
      expect(strips.length).toBeGreaterThan(0);
      for (const pose of strips) {
        const tell = rig.tells?.[pose as EnemyPoseName];
        expect(tell, `${rig.id} ${pose}`).toBeDefined();
        if (!tell) continue;
        const frames = rig.poses[pose] ?? [];
        for (const view of VIEWS) {
          const part = typeof tell.part === 'string' ? tell.part : tell.part[view];
          const rest = posedPoint(rig, view, idle, part, tell.at[view]);
          expect(rest, `${rig.id} ${view} ${part}`).not.toBeNull();
          for (const [i, p] of frames.entries()) {
            if (i === 0) continue;
            const at = posedPoint(rig, view, p, part, tell.at[view]);
            if (!rest || !at) continue;
            expect(Math.hypot(at[0] - rest[0], at[1] - rest[1]), `${rig.id} ${pose} ${view} frame ${i}`).toBeGreaterThanOrEqual(bossRig(rig.id) ? BOSS_MIN : MIN);
          }
        }
      }
    });
  }
});

describe('frame boxes (076)', () => {
  it('hold every pose of every redrawn rig, in every view', () => {
    for (const rig of ENEMY_RIGS.filter((r) => REDRAWN.includes(r.id))) {
      const [w, h] = rig.box.size;
      const [ax, ay] = rig.box.anchor;
      for (const [name, poses] of Object.entries(rig.poses)) {
        for (const [i, p] of (poses ?? []).entries()) {
          for (const view of VIEWS) {
            const b = rigBounds(rig, view, p);
            const at = `${rig.id} ${name}/${i} ${view}`;
            expect(b.x0, at).toBeGreaterThanOrEqual(-ax);
            expect(b.x1, at).toBeLessThanOrEqual(w - ax);
            expect(b.y0, at).toBeGreaterThanOrEqual(-ay);
            expect(b.y1, at).toBeLessThanOrEqual(h - ay);
          }
        }
      }
    }
  });

  it('keep the feet planted through a squash', () => {
    const rig = ENEMY_RIGS.find((r) => r.id === 'husk');
    if (!rig) throw new Error('no husk');
    for (const squash of [-0.2, -0.1, 0.1, 0.2]) {
      const foot = posedPoint(rig, 'side', { squash }, 'leg-front', [4, -1]);
      const rest = posedPoint(rig, 'side', {}, 'leg-front', [4, -1]);
      if (!foot || !rest) throw new Error('no foot');
      expect(foot[1]).toBeCloseTo(rest[1] * (1 - squash), 5);
      expect(Math.abs(foot[1])).toBeLessThan(1);
      expect(rigBounds(rig, 'side', { squash }).y1).toBeCloseTo(rigBounds(rig, 'side', {}).y1 * (1 - squash), 5);
    }
  });
});
