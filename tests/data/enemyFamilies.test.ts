import { describe, expect, it } from 'vitest';
import { DEATH_SIZE, ENEMY_FAMILIES, familyOf } from '../../src/data/art/enemyFamilies';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { WINDUP_STRIPS } from '../../src/data/art/enemyMotion';
import { INTRO_EXTRAS } from '../../src/data/enemyAnims';
import { ENEMY_ANIMS } from '../../src/data/assets';
import { ENEMIES } from '../../src/data/enemies';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { poseOfAnim } from '../../src/render/vector/catalog';
import { stripsOf } from '../../src/render/enemyMotion';

// 076: the family looks (one per region) and the frames the pass adds to every rig.

const PALETTE = new Set(DAYLIGHT_PALETTE.map((c) => c.id));
const VIEWS = ['side', 'down', 'up'] as const;
/** Enemy frames baked on main before 076, and the spec's ceiling (+35%). */
const MAIN_FRAMES = 733;
const MAX_FRAMES = 990;

describe('enemy families (076)', () => {
  it('are the four families, each enemy in exactly one, every member a real enemy, every colour a palette id', () => {
    expect(ENEMY_FAMILIES.map((f) => f.id)).toEqual(['ruin', 'quarry', 'forge', 'storm']);
    expect(ENEMY_FAMILIES.map((f) => f.name)).toEqual(['Mossbound ruins', 'Quarry constructs', 'Forge constructs', 'Storm-works']);
    for (const id of Object.keys(ENEMIES)) expect(ENEMY_FAMILIES.filter((f) => f.members.includes(id)).length, id).toBe(1);
    for (const f of ENEMY_FAMILIES) {
      for (const m of f.members) expect(ENEMIES[m], m).toBeDefined();
      for (const c of [f.rim, ...f.motes, ...Object.values(f.ramps).flat()]) expect(PALETTE.has(c), `${f.id} ${c}`).toBe(true);
    }
    expect(familyOf('bulwark').id).toBe('quarry');
    expect(familyOf('gale-ram').id).toBe('storm');
    // The palette doesn't change: 075 left it at 100 colours.
    expect(DAYLIGHT_PALETTE.length).toBe(100);
  });

  it('give every enemy a death size class: the small and large by name, the bosses, the rest medium', () => {
    expect(Object.keys(DEATH_SIZE).sort()).toEqual(Object.keys(ENEMIES).sort());
    expect(Object.entries(DEATH_SIZE).filter(([, s]) => s === 'small').map(([id]) => id).sort()).toEqual(['cinder-mote', 'slag-whelp', 'static-mite', 'wisp']);
    expect(Object.entries(DEATH_SIZE).filter(([, s]) => s === 'large').map(([id]) => id).sort()).toEqual(['gale-ram', 'slag-golem']);
    for (const def of Object.values(ENEMIES)) expect(DEATH_SIZE[def.id] === 'boss', def.id).toBe(def.boss);
  });
});

describe("the pass's frames on every rig (076)", () => {
  it('has, in every view, a strip per attack, a hit, a stagger (not bosses) and a one-frame death', () => {
    for (const def of Object.values(ENEMIES)) {
      const anims = ENEMY_ANIMS[def.anims];
      expect(anims, def.id).toBeDefined();
      if (!anims) continue;
      for (const v of VIEWS) {
        for (const s of stripsOf(def)) {
          const strip = anims[`${s.pose === 'windup' ? 'windup' : s.pose}-${v}` as keyof typeof anims];
          expect(strip?.frames, `${def.id} ${s.pose} ${v}`).toBeGreaterThanOrEqual(3);
          expect(strip?.frames, `${def.id} ${s.pose} ${v}`).toBeLessThanOrEqual(4);
          expect(WINDUP_STRIPS).toContain(s.pose);
        }
        expect(anims[`hit-${v}`].frames).toBe(1);
        expect(anims[`death-${v}`].frames, `${def.id} death ${v}`).toBe(1);
        if (def.boss) expect(anims[`stagger-${v}`], def.id).toBeUndefined();
        else expect(anims[`stagger-${v}`]?.frames, def.id).toBe(2);
      }
    }
  });

  it('keeps every frame one pose, with the enemy frames within +35% of main', () => {
    let frames = 0;
    for (const rig of ENEMY_RIGS) {
      for (const anim of Object.values(ENEMY_ANIMS[rig.id] ?? {})) {
        if (!anim) continue;
        // 080's boss intro poses are its own budget (tests/data/bossArt.test.ts); 076's pass is held to its own here.
        if (!(INTRO_EXTRAS as readonly string[]).includes(poseOfAnim(rig, anim).pose)) frames += anim.frames;
        expect(rig.poses[poseOfAnim(rig, anim).pose]?.length, anim.key).toBe(anim.frames);
      }
    }
    expect(frames).toBeGreaterThan(MAIN_FRAMES);
    expect(frames).toBeLessThanOrEqual(MAX_FRAMES);
  });
});
