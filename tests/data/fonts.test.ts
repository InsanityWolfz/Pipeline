import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FONT_FILES, TEXT_STYLES } from '../../src/data/fonts';
import { paletteHex } from '../../src/data/palette';

// The bundled fonts (020): two open-licence faces with their licences beside them,
// and every text style drawn from one of them in palette colours.

const DIR = new URL('../../assets/fonts/', import.meta.url);

describe('bundled fonts', () => {
  it('has a display face and a body face, each a TrueType file with its OFL licence beside it', () => {
    expect(Object.keys(FONT_FILES).sort()).toEqual(['body', 'display']);
    for (const f of Object.values(FONT_FILES)) {
      const font = new URL(f.file, DIR);
      expect(existsSync(font), f.file).toBe(true);
      // TrueType files start with the sfnt version 0x00010000.
      expect([...readFileSync(font).subarray(0, 4)], f.file).toEqual([0, 1, 0, 0]);
      expect(readFileSync(new URL(f.licence, DIR), 'utf8'), f.licence).toContain('SIL Open Font License');
    }
  });

  it('draws every text style from a bundled font in palette colours', () => {
    for (const [key, s] of Object.entries(TEXT_STYLES)) {
      expect(FONT_FILES[s.font], key).toBeDefined();
      expect(() => paletteHex(s.fill), key).not.toThrow();
      expect(() => paletteHex(s.stroke), key).not.toThrow();
      expect(s.lineHeight, key).toBeGreaterThanOrEqual(s.size);
    }
  });
});
