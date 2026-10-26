import { describe, expect, it } from 'vitest';
import { ANVIL_ARENA, CROWN_ARENA } from '../../src/data/arenas';
import { BOSS_LOOK } from '../../src/data/arenaAssets';
import { TILE_SIZE, VIEW_HEIGHT } from '../../src/data/config';
import { CONDUCTOR_LOOK } from '../../src/data/conductorAssets';
import { standPoint } from '../../src/data/stormcrownSites';
import { bossBarBottom, bossLookShift } from '../../src/render/bossLook';

// fix-playtest-ui (Shaun: "need to fix the boss bar covering the bosses"): a slimmer boss bar, and the camera eased
// up while a boss fights just far enough that the boss, and the Crown Spire's north rods, show below the bar.

/** Where a world y lands on screen, view px, with the camera centred `shift` px above the player at `playerY`. */
const screenY = (y: number, playerY: number, shift: number) => VIEW_HEIGHT / 2 + (y - playerY) + shift;

describe('the boss bar and the camera in a boss fight', () => {
  it('is slimmer: its bottom, with the heat gauge, 32 px down (was 38)', () => {
    expect(bossBarBottom(true)).toBeLessThanOrEqual(32);
    expect(bossBarBottom(false)).toBeLessThan(bossBarBottom(true));
  });

  it('shows the Forgewright whole below the bar with the player 5 tiles south of it', () => {
    const boss = { x: (ANVIL_ARENA.start.tx + 0.5) * TILE_SIZE, y: (ANVIL_ARENA.start.ty + 0.5) * TILE_SIZE };
    const playerY = boss.y + 5 * TILE_SIZE;
    const top = boss.y - (BOSS_LOOK.heights.forgewright ?? 0);
    // Without the nudge its top is off the top of the screen.
    expect(screenY(top, playerY, 0)).toBeLessThan(0);
    const shift = bossLookShift('forgewright', boss.y - playerY, true);
    expect(screenY(top, playerY, shift)).toBeGreaterThanOrEqual(bossBarBottom(true));
    expect(shift).toBeLessThanOrEqual(BOSS_LOOK.max);
  });

  it("shows the Crown Spire's north rods and the Conductor at one below the bar, from the court's middle", () => {
    const playerY = (CROWN_ARENA.middle.ty + 0.5) * TILE_SIZE;
    for (const rod of [4, 5]) {
      const socket = CROWN_ARENA.sockets[rod];
      if (!socket) throw new Error(`no rod ${rod}`);
      const stand = standPoint(rod);
      const shift = bossLookShift('conductor', stand.y - playerY, false);
      expect(screenY(socket.y - CONDUCTOR_LOOK.target.h, playerY, shift)).toBeGreaterThanOrEqual(bossBarBottom(false));
      expect(screenY(stand.y - BOSS_LOOK.height, playerY, shift)).toBeGreaterThanOrEqual(bossBarBottom(false));
    }
  });

  it('leaves the camera on the player when the boss is clear of the bar, or south of the player', () => {
    expect(bossLookShift('forgewright', -2 * TILE_SIZE, true)).toBe(0);
    expect(bossLookShift('conductor', 3 * TILE_SIZE, false)).toBe(0);
    expect(bossLookShift('bulwark', 0, false)).toBe(0);
  });
});
