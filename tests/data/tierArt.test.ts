import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef } from '../../src/data/ammo';
import { STAGE_SPRITES_VECTOR } from '../../src/data/art/stages';
import { TIER_ART, TIER_SPRITES_VECTOR } from '../../src/data/art/tiers';
import { ITEMS } from '../../src/data/items';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { inksOf } from '../../src/data/art/types';
import { FIRE_SOUNDS, SOUND_RECIPES, SOUNDS } from '../../src/data/sounds';
import { ROUND_ICONS } from '../../src/data/stageAssets';
import { ROUNDS, roundBase, roundTier, withTier } from '../../src/data/tags';
import { TIER_ARMED, TIER_PROJECTILES, TIER_SPRITES } from '../../src/data/tierAssets';
import { STEEL_FIRE_SOUNDS, WORK_SOUNDS } from '../../src/data/tierSounds';
import { vectorFrames } from '../../src/render/vector/catalog';
import { fireSoundOf } from '../../src/render/tierFeel';

// 062's art and sound as data: every tiered round's icon is its stone icon recoloured (derived, never drawn by hand),
// each plain tiered round flies as a recoloured projectile, the tier parts have icons, and the new sounds resolve.

const TIERED = ROUNDS.filter((r) => roundTier(r) !== 'stone');
const frames = new Map(vectorFrames().map((f) => [f.name, f]));
const sprites = new Map(STAGE_SPRITES_VECTOR.map((s) => [s.key, s]));
const PALETTE = new Set(DAYLIGHT_PALETTE.map((c) => c.id));

describe('tier art (062)', () => {
  it('gives every tiered round its own icon, its stone icon in the tier’s colours', () => {
    for (const id of TIERED) {
      const key = ROUND_ICONS[id] ?? '';
      expect(ITEMS[id]?.icon, id).toBe(key);
      expect(frames.has(key), key).toBe(true);
      const stone = ROUND_ICONS[withTier(id, 'stone')] ?? ITEMS[roundBase(id)]?.icon ?? '';
      const mine = sprites.get(key)?.frames[0] ?? [];
      const base = sprites.get(stone)?.frames[0];
      // Its own shapes: the stone icon's, recoloured, with the tier's mark on top.
      expect(mine.length, id).toBeGreaterThan(0);
      if (base) expect(JSON.stringify(mine)).not.toBe(JSON.stringify(base));
    }
  });

  it('swaps to real palette colours only', () => {
    for (const art of Object.values(TIER_ART)) {
      for (const [from, to] of Object.entries(art.swap)) {
        expect(PALETTE.has(from), from).toBe(true);
        expect(PALETTE.has(to), to).toBe(true);
      }
      for (const sh of art.mark) for (const ink of inksOf(sh)) expect(PALETTE.has(ink), ink).toBe(true);
    }
    for (const s of TIER_SPRITES_VECTOR) for (const sh of s.frames.flat()) for (const ink of inksOf(sh)) expect(PALETTE.has(ink), `${s.key}: ${ink}`).toBe(true);
  });

  it('flies each tiered round as its stone projectile recoloured; a tagged one as its plain tiered round', () => {
    for (const id of TIERED) {
      const own = TIER_PROJECTILES[withTier(roundBase(id), roundTier(id))];
      expect(own, id).toBeDefined();
      expect(ammoDef(id).sprite).toBe(own?.key);
      expect(frames.has(own?.key ?? ''), own?.key).toBe(true);
      expect(own?.from).toBe(ammoDef(roundBase(id)).sprite);
    }
    // A steel landmine lies armed in steel too (066: a stormsteel one in stormsteel).
    for (const id of TIERED.filter((r) => roundBase(r) === 'landmine')) {
      const def = ammoDef(id);
      expect(def.kind === 'mine' ? def.armed : null).toBe(TIER_ARMED[withTier('landmine', roundTier(id))]?.key);
    }
    expect(frames.has(TIER_SPRITES.landmineArmedSteel)).toBe(true);
  });

  it('draws the tier parts’ icons: ley-steel, ley glass and the three steel parts', () => {
    for (const id of ['ley-steel', 'ley-glass', 'steel-arrowhead', 'steel-casing', 'steel-plate']) {
      const icon = ITEMS[id]?.icon ?? '';
      expect(Object.values(TIER_SPRITES)).toContain(icon);
      expect(frames.has(icon), id).toBe(true);
    }
    const icons = ['ley-steel', 'ley-glass', 'steel-arrowhead', 'steel-casing', 'steel-plate', 'ley-iron', 'ley-dust', 'arrowhead', 'casing', 'iron-plate'].map((id) => ITEMS[id]?.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('tier sounds (062)', () => {
  it('fire a steel round with its family’s heavier sound, a glass bolt with the ley bolt’s', () => {
    for (const [family, key] of Object.entries(STEEL_FIRE_SOUNDS)) {
      expect(SOUND_RECIPES[key], key).toBeDefined();
      expect(key).not.toBe(FIRE_SOUNDS[family]);
      expect(AMMO[`${family}+steel`]).toBeDefined();
    }
    expect(Object.keys(STEEL_FIRE_SOUNDS)).toEqual(['arrow', 'bomb', 'landmine']);
  });

  it('give the Smelter its pour and the kiln its roar, each a real sound', () => {
    // 066: and the Tempering coil its crackle (tests/data/stormsteelSound.test.ts).
    expect(WORK_SOUNDS).toEqual({ smelter: SOUNDS.smelterPour, kiln: SOUNDS.kilnRoar, 'tempering-coil': SOUNDS.coilCrackle });
    for (const key of Object.values(WORK_SOUNDS)) expect(SOUND_RECIPES[key]).toBeDefined();
  });
});

describe('tier feel (062)', () => {
  it('fires a steel round with the heavier sound, a stone or glass one with its family’s', () => {
    expect(fireSoundOf('arrow+steel+frost')).toBe(SOUNDS.fireArrowSteel);
    expect(fireSoundOf('landmine+steel')).toBe(SOUNDS.fireBombSteel);
    expect(fireSoundOf('bomb+steel+cluster')).toBe(SOUNDS.fireBombSteel);
    expect(fireSoundOf('arrow+frost')).toBe(SOUNDS.fireArrow);
    expect(fireSoundOf('ley-bolt+glass+split')).toBe(SOUNDS.fireLeyBolt);
  });
});
