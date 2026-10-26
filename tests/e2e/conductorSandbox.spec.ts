import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';
import { breakFiveRods, breakRods, fireAtConductor, intoSpire } from './conductorPage';

// 064: grounding the Conductor in the sandbox. From beside each, a three-lane arrow volley at five of its six rods
// break them one by one; with fewer than two standing it is grounded (no blink, no warning), its broken rods drawn
// broken; then they regrow. 068: his storm shield clangs every shot off his body while 3 or more rods stand, the boss
// bar blue; with four rods broken (2 standing) it drops and shots land.

test('arrows break five rods and ground the Conductor; it stops blinking until one regrows', async ({ page }) => {
  // About 8 s here, with another build's tests running beside it (2026-10-26).
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await intoSpire(page);
  const awake = await page.evaluate(() => window.__GAME__?.step(1).bosses.find((b) => b.enemyId === 'conductor'));
  expect(awake).toMatchObject({ engaged: true, grounded: false });
  const broke = await breakFiveRods(page);
  expect(broke.rods).toEqual([true, true, true, true, true, false]);
  expect(broke.grounded).toBe(true);
  // Drawn broken (the first may already show regrowing), the sixth standing.
  const looks = await page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return window.__GAME__?.ui().stormcrown.conductor.rods;
  });
  expect(looks?.slice(0, 5).every((l) => l !== 'standing')).toBe(true);
  expect(looks?.[5]).toBe('standing');
  // Grounded, it never warns of a blink; once a rod regrows, it blinks again.
  const after = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let groundedWarns = 0;
    for (let t = 0; t < 1500; t++) {
      const s = g.step(1);
      const c = s.bosses.find((b) => b.enemyId === 'conductor');
      if (c?.grounded) groundedWarns += s.events.blinkWarns.length;
      else if (s.events.blinkWarns.length > 0) return { groundedWarns, resumed: true };
    }
    return { groundedWarns, resumed: false };
  });
  expect(after).toEqual({ groundedWarns: 0, resumed: true });
  expect(errors).toEqual([]);
});

test('068: shots clang off his storm shield with six rods standing; four broken, it drops and shots land', async ({ page }) => {
  // About 8 s here, as the grounding test (one Playwright process, 2026-10-26).
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await intoSpire(page);
  const shielded = await fireAtConductor(page, 120);
  expect(shielded.blocks).toBeGreaterThan(0);
  expect(shielded.lost).toBe(0);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.shielded).toBe(true);
  const broke = await breakRods(page, 4);
  expect(broke.rods.filter((r) => r)).toHaveLength(4);
  expect(broke.grounded).toBe(false);
  const state = await page.evaluate(() => window.__GAME__?.step(1).bosses.find((b) => b.enemyId === 'conductor'));
  expect(state?.plated).toBe(false);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.shielded).toBe(false);
  const exposed = await fireAtConductor(page, 180);
  expect(exposed.lost).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
