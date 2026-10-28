import { describe, expect, it } from 'vitest';
import { BOSS_PHASE_SPRITES } from '../../src/data/arenaAssets';
import { INTRO_LOOK } from '../../src/data/art/bossIntro';
import { BOSS_PHASE_LOOK, type PhasePart } from '../../src/data/art/bossPhases';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { ENEMY_ANIMS } from '../../src/data/assets';
import { ENEMIES } from '../../src/data/enemies';
import { INTRO_EXTRAS } from '../../src/data/enemyAnims';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { SOUNDS } from '../../src/data/sounds';

// 080: the bosses' intro poses and phase parts as data: every boss has its intro in every view, the Bulwark's roar is
// three frames, every reference is real (boss ids, sounds, palette ids, sprite keys, rig parts), and the baked enemy
// frames stay within 12% of 076's 954.

const VIEWS = ['side', 'down', 'up'] as const;
const PALETTE = new Set(DAYLIGHT_PALETTE.map((c) => c.id));
const BOSSES = Object.values(ENEMIES).filter((d) => d.boss);
/** 076's enemy frames, and 080's ceiling (+12%). */
const FRAMES_076 = 954;
const MAX_FRAMES = Math.floor(FRAMES_076 * 1.12);

describe('080: the boss intro poses', () => {
  it('every boss has dormant, stir, rise (3), beat and ready (2) in every view, one pose per frame', () => {
    expect(BOSSES.map((d) => d.id).sort()).toEqual(['bulwark', 'conductor', 'forgewright', 'pylon-warden']);
    for (const def of BOSSES) {
      const anims = ENEMY_ANIMS[def.anims];
      const rig = ENEMY_RIGS.find((r) => r.id === def.anims);
      for (const pose of INTRO_EXTRAS) {
        expect(rig?.poses[pose]?.length, `${def.id} ${pose}`).toBe(pose === 'rise' ? 3 : pose === 'ready' ? 2 : 1);
        for (const v of VIEWS) expect(anims?.[`${pose}-${v}`]?.frames, `${def.id} ${pose}-${v}`).toBe(rig?.poses[pose]?.length);
      }
    }
  });

  it("the Bulwark's roar is a three-frame strip in every view", () => {
    for (const v of VIEWS) expect(ENEMY_ANIMS.bulwark?.[`roar-${v}`]?.frames).toBe(3);
  });

  it('keeps the baked enemy frames within 12% of 076\'s', () => {
    let frames = 0;
    for (const rig of ENEMY_RIGS) for (const anim of Object.values(ENEMY_ANIMS[rig.id] ?? {})) frames += anim?.frames ?? 0;
    expect(frames).toBeGreaterThan(FRAMES_076);
    expect(frames).toBeLessThanOrEqual(MAX_FRAMES);
  });
});

describe('080: the intro and phase looks reference only what exists', () => {
  it('names each boss, an existing sound and palette colours', () => {
    expect(Object.keys(INTRO_LOOK.bosses).sort()).toEqual(BOSSES.map((d) => d.id).sort());
    const sounds = new Set<string>(Object.values(SOUNDS));
    for (const [id, look] of Object.entries(INTRO_LOOK.bosses)) {
      expect(sounds.has(look.sound), id).toBe(true);
      for (const c of [...look.stir.colors, ...look.rise.colors, ...look.beat.colors, look.light.color]) expect(PALETTE.has(c), `${id} ${c}`).toBe(true);
    }
  });

  it("places each phase part on a real rig part, by a registered sprite key, in palette colours", () => {
    const keys = new Set<string>();
    for (const v of Object.values(BOSS_PHASE_SPRITES)) if (typeof v === 'string') keys.add(v);
    const placed: [string, readonly PhasePart[]][] = [
      ['bulwark', [...BOSS_PHASE_LOOK.bulwark.called.parts, ...BOSS_PHASE_LOOK.bulwark.enraged.parts]],
      ['forgewright', [...BOSS_PHASE_LOOK.forgewright.vent.parts, ...BOSS_PHASE_LOOK.forgewright.enraged.parts]],
      ['conductor', BOSS_PHASE_LOOK.conductor.enraged.parts],
    ];
    for (const [rigId, parts] of placed) {
      const rig = ENEMY_RIGS.find((r) => r.id === rigId);
      for (const p of parts) {
        expect(keys.has(p.key), p.key).toBe(true);
        for (const v of p.views ?? VIEWS) expect(rig?.views[v].some((x) => x.id === p.part), `${rigId} ${p.part} ${v}`).toBe(true);
      }
    }
    expect(keys.has(BOSS_PHASE_LOOK.conductor.dome.key)).toBe(true);
    const L = BOSS_PHASE_LOOK;
    for (const c of [L.bulwark.called.layer.color, L.bulwark.enraged.layer.color, L.forgewright.enraged.layer.color, L.conductor.enraged.layer.color, ...L.forgewright.bands.map((b) => b.color)]) expect(PALETTE.has(c), c).toBe(true);
    expect(L.conductor.dome.alphaCap).toBeLessThanOrEqual(0.3);
  });
});
