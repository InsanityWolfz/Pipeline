import type { Page } from '@playwright/test';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { bootSandbox, hidePanel } from './sandboxPage';

// 060's Forgewright in the sandbox (044) for the e2e specs: the Anvil Hall stands at its Emberworks tiles, its door
// open. In by E at the door, god mode on, three entrances of plain arrows (a three-lane fan), the player standing
// 7.5 tiles west of the Forgewright's start, face-on to it.

/** Where the player stands in the hall: 7.5 tiles west of the Forgewright's start, on its row. */
export const FAN_SPOT = { x: (ANVIL_ARENA.start.tx + 0.5 - 7.5) * 32, y: (ANVIL_ARENA.start.ty + 0.5) * 32 };

/** The sandbox, in the Anvil Hall with god mode and three arrow lanes, at FAN_SPOT. */
export async function intoHall(page: Page): Promise<void> {
  await bootSandbox(page);
  await hidePanel(page);
  await page.evaluate((spot) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'god', on: true } });
    ['arrow', 'arrow', 'arrow', null].forEach((round, entrance) => g.step(1, { sandbox: { kind: 'loadout', entrance, round } }));
    h.enterArena('anvil-hall');
    h.walkTo(spot.x, spot.y);
  }, FAN_SPOT);
}

/** Fires the three-lane fan at the Forgewright's body, standing still, until it vents (or `limit` ticks). Returns the ticks it took, or -1. */
export async function fanUntilVent(page: Page, limit = 900): Promise<number> {
  return page.evaluate((max) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 1; t <= max; t++) {
      const s = g.getState();
      const f = s.enemies.find((e) => e.enemyId === 'forgewright');
      if (!f) return -1;
      if (g.step(1, { fire: true, aimX: f.x, aimY: f.y - 24 }).events.vents.length > 0) return t;
    }
    return -1;
  }, limit);
}
