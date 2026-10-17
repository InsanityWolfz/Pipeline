import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hexToRgb, OUTLINE_ID, PALETTE, TRANSPARENT } from '../../src/data/palette';
import { AMMO } from '../../src/data/ammo';
import { animFrames, digitFrame, HUD_DIGITS, PLAYER_ANIMS, SPRITES, TUBE_SPRITES } from '../../src/data/assets';
import { ITEMS } from '../../src/data/items';
import { STARTING_INVENTORY } from '../../src/data/player';
import { SLOT_AMMO } from '../../src/data/tube';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('palette', () => {
  it('has about 24 colors', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(20);
    expect(PALETTE.length).toBeLessThanOrEqual(28);
  });

  it('has unique kebab-case ids, unique single-char symbols and valid hex', () => {
    expect(new Set(PALETTE.map((c) => c.id)).size).toBe(PALETTE.length);
    expect(new Set(PALETTE.map((c) => c.char)).size).toBe(PALETTE.length);
    for (const color of PALETTE) {
      expect(color.id).toMatch(KEBAB);
      expect(color.char).toHaveLength(1);
      expect(color.char).not.toBe(TRANSPARENT);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('includes ley-line cyan', () => {
    expect(PALETTE.some((c) => c.id === 'ley-cyan')).toBe(true);
  });

  it('uses its darkest color, not pure black, as the outline', () => {
    const darkest = [...PALETTE].sort((a, b) => luminance(a.hex) - luminance(b.hex))[0];
    expect(darkest?.id).toBe(OUTLINE_ID);
    expect(darkest?.hex).not.toBe('#000000');
  });

  it('is the palette docs/art.md names', () => {
    const doc = readFileSync('docs/art.md', 'utf8');
    for (const color of PALETTE) expect(doc).toContain(color.hex);
    expect(doc).toContain(`\`${OUTLINE_ID}\``);
  });
});

describe('assets', () => {
  const atlas = JSON.parse(readFileSync('assets/build/sprites.json', 'utf8')) as {
    frames: Record<string, unknown>;
  };

  it('has kebab-case keys that exist in the built atlas', () => {
    for (const key of [...Object.values(SPRITES), ...Object.values(TUBE_SPRITES)]) {
      expect(key).toMatch(KEBAB);
      expect(Object.keys(atlas.frames)).toContain(key);
    }
  });

  it('has every player animation frame in the built atlas', () => {
    for (const anim of Object.values(PLAYER_ANIMS)) {
      expect(anim.key).toMatch(KEBAB);
      for (const frame of animFrames(anim)) expect(Object.keys(atlas.frames)).toContain(frame);
    }
  });

  it('has a HUD font frame for every glyph', () => {
    for (const ch of HUD_DIGITS.glyphs) expect(Object.keys(atlas.frames)).toContain(digitFrame(ch));
    expect(() => digitFrame('x')).toThrow();
  });
});

describe('items and ammo', () => {
  it('have kebab-case ids that match their keys', () => {
    for (const [key, item] of Object.entries(ITEMS)) {
      expect(item.id).toMatch(KEBAB);
      expect(item.id).toBe(key);
    }
    for (const [key, ammo] of Object.entries(AMMO)) {
      expect(ammo.id).toMatch(KEBAB);
      expect(ammo.id).toBe(key);
    }
  });

  it('reference items and ammo that exist', () => {
    for (const ammo of Object.values(AMMO)) expect(ITEMS[ammo.itemId]).toBeDefined();
    expect(AMMO[SLOT_AMMO]).toBeDefined();
    for (const id of Object.keys(STARTING_INVENTORY)) expect(ITEMS[id]).toBeDefined();
  });
});
