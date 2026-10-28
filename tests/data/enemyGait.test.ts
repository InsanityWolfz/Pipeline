import { describe, expect, it } from 'vitest';
import { ENEMY_ANIMS } from '../../src/data/assets';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import type { EnemyPose } from '../../src/data/art/enemyRig';
import { ENEMIES } from '../../src/data/enemies';

// 076: locomotion reads smooth and purposeful, never frantic (Shaun's playtest of 075's wanderer: "a million steps a
// second", bouncing). Snap belongs to wind-ups, hits and deaths, not to walking. For every enemy's walk loop (the
// side view's anim, which every view shares):
// - cadence: walkers at most GAIT.maxSteps steps a second, and no faster than GAIT.paddle times what its own speed
//   needs for the stride it draws (feet paddling in place read as frantic); hoverers and flyers at most
//   GAIT.maxCycles bob or flap cycles a second;
// - bob: at most GAIT.bobPx world px from top to bottom, and at most that from one frame to the next (frames are not
//   tweened, so every change is a pop);
// - squash: within GAIT.squash of rest on every walk frame (075's bound for the wanderer).

const GAIT = { maxSteps: 4, paddle: 1.25, maxCycles: 1.5, bobPx: 1, squash: 0.015 } as const;

/** Every looping locomotion pose: the walk, the Bulwark's shuffle and the Sniper's sidestep. */
const LOCOMOTION = ['walk', 'turn', 'step'] as const;

interface Gait {
  id: string;
  speed: number;
  /** Steps a second (walkers) or cycles a second (hoverers). */
  cadence: number;
  walker: boolean;
  /** The stride it draws per step, world px (front foot forward to back). */
  stride: number;
  bobPx: number;
  bobJump: number;
  squash: number;
}

const squashOf = (p: EnemyPose): number => Math.max(Math.abs(p.squash ?? 0), Math.abs(1 - (p.scaleY ?? 1)));

function gait(id: string): Gait[] {
  const def = ENEMIES[id];
  const rig = ENEMY_RIGS.find((r) => r.id === def?.anims);
  const anims = def ? ENEMY_ANIMS[def.anims] : undefined;
  if (!def || !rig || !anims) throw new Error(id);
  const out: Gait[] = [];
  for (const pose of LOCOMOTION) {
    const frames = rig.poses[pose];
    const anim = (anims as Readonly<Record<string, { frames: number; frameRate: number } | undefined>>)[`${pose}-side`];
    if (!frames || !anim || anim.frames < 2) continue;
    const steps = frames.filter((p) => (p.step ?? 0) !== 0).length;
    const walker = steps > 0;
    const cycles = anim.frameRate / anim.frames;
    const bob = frames.map((p) => ((p.bob ?? 0) + (p.sink ?? 0)) * rig.scale);
    const jumps = bob.map((b, i) => Math.abs(b - (bob[(i + 1) % bob.length] ?? b)));
    out.push({
      id: `${id}:${pose}`,
      speed: def.walkSpeed,
      cadence: walker ? cycles * steps : cycles,
      walker,
      stride: 2 * Math.max(...frames.map((p) => Math.abs(p.step ?? 0))) * rig.scale,
      bobPx: Math.max(...bob) - Math.min(...bob),
      bobJump: Math.max(...jumps),
      squash: Math.max(...frames.map(squashOf)),
    });
  }
  return out;
}

const ALL = Object.keys(ENEMIES).flatMap(gait);

describe('enemy locomotion stays calm (076)', () => {
  it('measures every enemy that moves', () => {
    expect(ALL.filter((g) => g.id.endsWith(':walk'))).toHaveLength(Object.keys(ENEMIES).length);
  });

  it.each(ALL.filter((g) => g.walker))('$id steps at a calm cadence for its speed', (g) => {
    expect(g.cadence).toBeLessThanOrEqual(GAIT.maxSteps);
    // Only the walk moves at its walk speed (a shuffle turns on the spot); a walk shown standing still has no ground.
    if (g.id.endsWith(':walk') && g.speed > 0) expect(g.cadence).toBeLessThanOrEqual(Math.max(1, (GAIT.paddle * g.speed) / g.stride));
  });

  it.each(ALL.filter((g) => !g.walker))('$id bobs or flaps at a calm rate', (g) => {
    expect(g.cadence).toBeLessThanOrEqual(GAIT.maxCycles);
  });

  it.each(ALL)('$id bobs gently and barely squashes', (g) => {
    expect(g.bobPx).toBeLessThanOrEqual(GAIT.bobPx + 1e-9);
    expect(g.bobJump).toBeLessThanOrEqual(GAIT.bobPx + 1e-9);
    expect(g.squash).toBeLessThanOrEqual(GAIT.squash + 1e-9);
  });
});
