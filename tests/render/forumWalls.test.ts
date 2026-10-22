import { describe, expect, it } from 'vitest';
import { FORUM_ARENA } from '../../src/data/arenas';
import { HOLLOWS_SPRITES_VECTOR } from '../../src/data/art/hollows';
import { HOLLOWS_GROUND, HOLLOWS_SPRITES, FORUM_WALL_LOOK } from '../../src/data/hollowsAssets';
import { DAYLIGHT_PALETTE, paletteHex } from '../../src/data/palette';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { SANDBOX_ROOM, TILE } from '../../src/data/rooms';
import { hollowsFrame } from '../../src/render/hollowsTiles';
import { WORLD } from '../../src/sim/world';

// 059 (059.1, Shaun: "only the Bulwark's arena walls get darker"): the forum's wall tiles are drawn in the Hollows'
// darkest stone tone with a lighter top, like the shrine's walls, so they read as walls against its pale floor. Every
// other Hollows tile keeps its look.

/** 0–255 luminance of a palette colour. */
function luminance(id: string): number {
  const hex = paletteHex(id);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

const b = FORUM_ARENA.bounds;
const outline: { tx: number; ty: number }[] = [];
for (let tx = b.x0; tx <= b.x1; tx++) outline.push({ tx, ty: b.y0 }, { tx, ty: b.y1 });
for (let ty = b.y0 + 1; ty < b.y1; ty++) outline.push({ tx: b.x0, ty }, { tx: b.x1, ty });

describe("the forum's walls (059)", () => {
  it("use the Hollows' darkest stone for their body, and a top darker than the forum's floor", () => {
    const hollowTones = DAYLIGHT_PALETTE.filter((c) => c.id.startsWith('hollow')).map((c) => c.id);
    const darkest = Math.min(...hollowTones.map(luminance));
    expect(luminance(FORUM_WALL_LOOK.body)).toBe(darkest);
    expect(luminance(FORUM_WALL_LOOK.top)).toBeGreaterThan(luminance(FORUM_WALL_LOOK.body));
    for (const floor of [HOLLOWS_GROUND.base, HOLLOWS_GROUND.flags.color]) expect(luminance(FORUM_WALL_LOOK.top)).toBeLessThan(luminance(floor));
    expect(HOLLOWS_SPRITES_VECTOR.some((s) => s.key === HOLLOWS_SPRITES.forumWall)).toBe(true);
  });

  for (const roomId of [OVERWORLD_ROOM, SANDBOX_ROOM]) {
    it(`draw every cliff tile of its outline as the forum's wall in ${roomId}, and leave other cliffs as they were`, () => {
      const room = WORLD[roomId];
      if (!room) throw new Error(`no ${roomId}`);
      let walls = 0;
      for (const t of outline) {
        if (room.rows[t.ty]?.[t.tx] !== TILE.cliff) continue;
        walls += 1;
        expect(hollowsFrame(TILE.cliff, t.tx, t.ty, 0, room), `${t.tx},${t.ty}`).toBe(HOLLOWS_SPRITES.forumWall);
      }
      expect(walls).toBeGreaterThan(30);
      // A cliff just outside the forum's outline, and the colonnade's pillars, keep theirs.
      const old: readonly string[] = [...HOLLOWS_SPRITES.cliffs, HOLLOWS_SPRITES.cliffTop];
      expect(old).toContain(hollowsFrame(TILE.cliff, b.x0 - 1, b.y0 + 3, 0, room));
      expect(hollowsFrame(TILE.pillar, b.x0, b.y0, 0, room)).toBe(HOLLOWS_SPRITES.pillar);
    });
  }
});
