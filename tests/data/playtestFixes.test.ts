import { describe, expect, it } from 'vitest';
import { DEPTHS, SPRITES } from '../../src/data/assets';
import { VECTOR_SPRITES } from '../../src/data/art/sprites';
import { ITEM_SPRITES_VECTOR } from '../../src/data/art/items';
import { HUD_SPRITES_VECTOR } from '../../src/data/art/hud';
import { inksOf } from '../../src/data/art/types';

// Playtest fixes (021): the arrowhead is only its stone head, and the cursor draws above everything.

const spriteOf = (key: string) => {
  const s = [...VECTOR_SPRITES, ...ITEM_SPRITES_VECTOR, ...HUD_SPRITES_VECTOR].find((v) => v.key === key);
  if (!s) throw new Error(`no vector sprite '${key}'`);
  return s;
};

/** A short, stable fingerprint of a sprite's data. */
function fingerprint(key: string): string {
  const text = JSON.stringify(spriteOf(key));
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

describe('the arrowhead icon (021)', () => {
  it('is only the stone head: no wood in it', () => {
    const inks = spriteOf(SPRITES.itemArrowhead).frames.flat().flatMap(inksOf);
    expect(inks.filter((i) => i.startsWith('wood'))).toEqual([]);
    expect(inks.some((i) => i.startsWith('rock'))).toBe(true);
  });

  it('leaves the arrow and shaft icons as they were', () => {
    expect({ arrow: fingerprint(SPRITES.iconArrow), flying: fingerprint(SPRITES.arrow), shaft: fingerprint(SPRITES.itemShaft) }).toEqual(PINNED);
  });
});

describe('the cursor (021)', () => {
  it('has its own depth above every other, with room for the offsets menus add', () => {
    const others = Object.entries(DEPTHS).filter(([k]) => k !== 'cursor').map(([, v]) => v);
    for (const d of others) expect(DEPTHS.cursor).toBeGreaterThan(d + 100);
  });

  it('has a pointer sprite beside the crosshair', () => {
    expect(spriteOf(SPRITES.pointer).frames[0]?.length).toBeGreaterThan(0);
    expect(spriteOf(SPRITES.crosshair).frames[0]?.length).toBeGreaterThan(0);
  });
});

/** The arrow and shaft icons' data before 021, which it must not change. */
// 078 redrew the arrow in flight in the pushed look (its spec's "Projectile bodies"); the icons stay as they were.
const PINNED = { arrow: 'ab196929', flying: '9db71294', shaft: '375001b6' };
