import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../src/data/claims';
import { EXAMPLE_LINE } from '../../src/data/exampleLine';
import { INTAKE } from '../../src/data/foundry';
import { ITEMS } from '../../src/data/items';
import { PIECES } from '../../src/data/pieces';
import { FOUNDRY_ROOM, STATIC_ROOMS, TILE } from '../../src/data/rooms';
import { footprint } from '../../src/sim/pieces';

// 046: the example line's layout and stock are data; every reference exists and every tile is open floor.

const ROOM = STATIC_ROOMS[FOUNDRY_ROOM];
const tilesOf = (p: (typeof EXAMPLE_LINE)[number]) => footprint(p.pieceId, p.tx, p.ty, p.facing);

describe('the example line data (046)', () => {
  it('names real pieces, and its stock real items, in hoppers only', () => {
    for (const p of EXAMPLE_LINE) {
      expect(PIECES[p.pieceId], p.pieceId).toBeDefined();
      if (p.stock) {
        expect(PIECES[p.pieceId]?.kind).toBe('hopper');
        expect(ITEMS[p.stock.itemId], p.stock.itemId).toBeDefined();
        expect(p.stock.count).toBeGreaterThan(0);
      }
    }
    expect(EXAMPLE_LINE.flatMap((p) => (p.stock ? [p.stock.itemId] : []))).toEqual(['wood', 'stone', 'fiber']);
  });

  it('sits on open floor, its pieces never overlapping, clear of the fixtures', () => {
    const seen = new Set<string>();
    for (const p of EXAMPLE_LINE) {
      for (const t of tilesOf(p)) {
        const key = `${t.tx},${t.ty}`;
        expect(ROOM?.rows[t.ty]?.[t.tx], key).toBe(TILE.floor);
        expect(seen.has(key), key).toBe(false);
        seen.add(key);
        expect(FIXTURES.some((f) => f.tx === t.tx && f.ty === t.ty), key).toBe(false);
      }
    }
  });

  it('ends in a conduit under the entrance that starts open, and leaves the floor under the capped ones free', () => {
    const open = INTAKE.entrances.find((e) => e.startsOpen);
    const last = EXAMPLE_LINE.at(-1);
    expect(last).toMatchObject({ pieceId: 'conduit', tx: open?.tx, ty: (open?.ty ?? 0) + 1, facing: 'up' });
    const taken = EXAMPLE_LINE.flatMap(tilesOf);
    for (const e of INTAKE.entrances.filter((x) => !x.startsOpen)) expect(taken.some((t) => t.tx === e.tx && t.ty === e.ty + 1)).toBe(false);
  });
});
