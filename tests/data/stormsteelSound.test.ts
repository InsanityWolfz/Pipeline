import { describe, expect, it } from 'vitest';
import { FIRE_SOUNDS, SOUND_RECIPES, SOUNDS } from '../../src/data/sounds';
import { STEEL_FIRE_SOUNDS, STORMSTEEL_FIRE_SOUNDS, WORK_SOUNDS } from '../../src/data/tierSounds';
import { fireSoundOf } from '../../src/render/tierFeel';

// 066's sounds: the Tempering coil's crackle as it starts a craft (062.10's rule for Forge machines), and a stormsteel
// round's sharper version of steel's shot. A storm glass bolt fires as a ley bolt does, as a glass one does (062.10).
// tests/scripts/sound.test.ts checks every recipe is rendered into the committed wavs.

describe('storm tier sounds (066)', () => {
  it('fire a stormsteel round with its family’s sharper sound: its own recipe, not steel’s or stone’s', () => {
    expect(Object.keys(STORMSTEEL_FIRE_SOUNDS)).toEqual(['arrow', 'bomb', 'landmine']);
    for (const [family, key] of Object.entries(STORMSTEEL_FIRE_SOUNDS)) {
      expect(SOUND_RECIPES[key], key).toBeDefined();
      expect(key).not.toBe(FIRE_SOUNDS[family]);
      expect(key).not.toBe((STEEL_FIRE_SOUNDS as Readonly<Record<string, string>>)[family]);
    }
  });

  it('are sharper than steel’s: each layer starts higher', () => {
    const top = (key: keyof typeof SOUND_RECIPES): number => Math.max(...SOUND_RECIPES[key].layers.map((l) => l.from));
    expect(top(SOUNDS.fireArrowStormsteel)).toBeGreaterThan(top(SOUNDS.fireArrowSteel));
    expect(top(SOUNDS.fireBombStormsteel)).toBeGreaterThan(top(SOUNDS.fireBombSteel));
  });

  it('pick the shot’s sound by its tier', () => {
    expect(fireSoundOf('arrow+stormsteel+frost')).toBe(SOUNDS.fireArrowStormsteel);
    expect(fireSoundOf('bomb+stormsteel+cluster')).toBe(SOUNDS.fireBombStormsteel);
    expect(fireSoundOf('landmine+stormsteel')).toBe(SOUNDS.fireBombStormsteel);
    expect(fireSoundOf('arrow+steel')).toBe(SOUNDS.fireArrowSteel);
    expect(fireSoundOf('ley-bolt+storm-glass+split')).toBe(SOUNDS.fireLeyBolt);
  });

  it('give the Tempering coil its crackle', () => {
    expect(WORK_SOUNDS['tempering-coil']).toBe(SOUNDS.coilCrackle);
    expect(SOUND_RECIPES[SOUNDS.coilCrackle]).toBeDefined();
  });
});
