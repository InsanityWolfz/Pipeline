import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { feedLines, restoreEntrance, ui } from './intakePage';

// 060: the fourth entrance. From ?playtest, the three caps are restored in turn (the Warden's, the Bulwark's and the
// Forgewright's cores); four fed entrances fire one four-lane volley at ±7.5° and ±22.5°, the tube slot shows four
// wells, and the pipe draws no cap left.

test('the fourth cap takes a Forgewright core, and four fed entrances fire a four-lane volley', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await restoreEntrance(page, 11);
  await restoreEntrance(page, 13);
  const before = await page.evaluate(() => window.__GAME__?.getState().inventory['forgewright-core'] ?? 0);
  const opened = await restoreEntrance(page, 14);
  expect(opened.research.nodes.find((n) => n.id === 'entrance-4')?.state).toBe('restored');
  // 064: the fifth stays capped until a Conductor core.
  expect(opened.intake.entrances.map((e) => e.open)).toEqual([true, true, true, true, false]);
  expect(opened.inventory['forgewright-core']).toBe(before - 1);
  // Every cap but the fifth's has lifted off.
  await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(1);
  await feedLines(page, [11, 12, 13, 14].map((tx) => ({ tx, itemId: 'arrow', amount: 'half' as const })), 3);
  const shot = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    const at = g.step(0);
    const known = new Set(at.arrows.map((a) => a.id));
    const out = g.step(1, { fire: true, aimX: at.player.x + 160, aimY: at.player.y });
    return {
      lanes: at.intake.lanes,
      count: out.tube.shotCount,
      angles: out.arrows.filter((a) => !known.has(a.id)).map((a) => Math.round((Math.atan2(a.dy, a.dx) * 1800) / Math.PI) / 10).sort((a, b) => a - b),
    };
  });
  expect([shot.lanes, shot.count]).toEqual([[-22.5, -7.5, 7.5, 22.5], 4]);
  // The arrows' flight from the muzzle, a hair off the player's centre, to a tenth of a degree.
  [-22.5, -7.5, 7.5, 22.5].forEach((a, i) => expect(Math.abs((shot.angles[i] ?? 0) - a)).toBeLessThanOrEqual(0.15));
  // The tube slot's fourth frame: four wells, one per entrance.
  await expect.poll(async () => (await ui(page))?.hud?.tubeSlot.icons.length).toBe(4);
  expect(errors).toEqual([]);
});
