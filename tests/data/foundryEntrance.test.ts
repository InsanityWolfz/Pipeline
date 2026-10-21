import { describe, expect, it } from 'vitest';
import { SUPPLY_LOOK } from '../../src/data/art/ground';
import { OVERWORLD_SPRITES } from '../../src/data/assets';
import { ARRIVE, ENTRANCE, MOUND, RUIN, RUIN_AREA } from '../../src/data/home';
import { ITEMS, itemDef } from '../../src/data/items';
import { SITE_SUPPLY } from '../../src/data/claims';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { vectorFrames } from '../../src/render/vector/catalog';
import { generateOverworld } from '../../src/sim/overworldGen';

// The foundry's entrance (053, D.2) and the haul's icons (D.4) as data.

const room = generateOverworld();
const at = (t: { tx: number; ty: number }) => room.rows[t.ty]?.[t.tx];

describe("the foundry's entrance", () => {
  it('is a big ruin: a 9 × 5 footprint round the stairs, solid but its door, the door in its front row and the arrival tile open', () => {
    expect([RUIN.w, RUIN.h]).toEqual([9, 5]);
    expect(MOUND).toHaveLength(RUIN.w * RUIN.h - 1);
    for (const t of MOUND) expect(at(t), `${t.tx},${t.ty}`).toBe(TILE.ruinBlock);
    expect(at(ENTRANCE)).toBe(TILE.door);
    expect(ENTRANCE.ty).toBe(RUIN_AREA.y1);
    expect(ENTRANCE.tx).toBe((RUIN_AREA.x0 + RUIN_AREA.x1) / 2);
    expect(WALKABLE).toContain(at(ARRIVE));
  });

  it('draws as the gatehouse sprite on the contact sheet, wider than its footprint and taller than a screen half', () => {
    const frame = vectorFrames().find((f) => f.name === OVERWORLD_SPRITES.entrance);
    expect(frame).toBeDefined();
    expect(frame?.size[0]).toBeGreaterThanOrEqual(RUIN.w * 32);
    expect(frame?.size[1]).toBeGreaterThan(180);
  });
});

describe("a claimed pylon's haul (D.4)", () => {
  it('runs home as the icon of each raw a site supplies, each icon on the contact sheet', () => {
    const frames = new Set(vectorFrames().map((f) => f.name));
    const raws = new Set(Object.values(SITE_SUPPLY).flat());
    expect(raws.size).toBeGreaterThan(0);
    for (const raw of raws) {
      expect(ITEMS[raw], raw).toBeDefined();
      expect(frames.has(itemDef(raw).icon), raw).toBe(true);
    }
    expect(SUPPLY_LOOK.iconScale).toBeGreaterThan(0);
  });
});
