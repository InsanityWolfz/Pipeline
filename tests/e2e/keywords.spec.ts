import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { screenPoint } from './foundryPage';
import { ui } from './intakePage';

// The keyword system (039): from ?playtest, hand-apply the frost rune to bombs at the
// bench (a row per stage and family), fire Frost bombs at a pack and see Chill on several
// enemies in getState(); and read the rendered keyword list and content lines from
// __GAME__.keywords(), the same text the game shows.

test('the frost rune on bombs at the bench, then Frost bombs chill a pack', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
    h.walkTo(2.3 * 32, 12.5 * 32);
  });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
  const rows = (await ui(page))?.tagged.benchStages?.rows ?? [];
  // One row per stage and family (039.12), the landmine row once ley-iron is found (the kit carries it).
  expect(rows.map((r) => r.stageId)).toEqual(['frost-rune-arrow', 'frost-rune-bomb', 'frost-rune-ley-bolt', 'frost-rune-landmine', 'ley-guide-ley-bolt', 'prism-lens-ley-bolt', 'cluster-die-bomb']);
  const row = rows.find((r) => r.stageId === 'frost-rune-bomb');
  if (!row) throw new Error('no Frost bomb row');
  expect(row.texts).toEqual(expect.arrayContaining(['Frost rune', 'Bomb', 'Rimestone', 'Frost bomb', '+4']));
  expect(row.line).toBe('Cold: added to any round');
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.move(p.x, p.y);
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.line).toBe('Cold: added to any round');
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.step(1).inventory['bomb+frost'] ?? 0)).toBe(4);
  await page.keyboard.press('Escape');

  // Out to the meadow: a pack of three Husks ahead, Frost bombs lobbed into it until two are chilled.
  const chilled = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    g.step(1, { selectAmmo: 'bomb' });
    let s = g.spawnChampionPack(['husk', 'husk', 'husk'], null);
    const pack = () => s.enemies.filter((e) => e.room === s.room && e.enemyId === 'husk').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y)).slice(0, 3);
    let thrown = 0;
    for (let t = 0; t < 900 && pack().filter((e) => e.chill > 0).length < 2; t++) {
      const near = pack();
      const cx = near.reduce((n, e) => n + e.x, 0) / Math.max(1, near.length);
      const cy = near.reduce((n, e) => n + e.y, 0) / Math.max(1, near.length);
      const d = Math.hypot(cx - s.player.x, cy - s.player.y);
      const fire = d < 170 && s.bombs.length === 0 && (s.inventory['bomb+frost'] ?? 0) > 0;
      if (fire) thrown += 1;
      s = g.step(1, { fire, aimX: cx, aimY: cy });
    }
    return { chilled: pack().filter((e) => e.chill > 0).length, thrown, cold: s.events.bursts.every((b) => b.damageType === 'cold') };
  });
  expect(chilled.chilled).toBeGreaterThanOrEqual(2);
  expect(chilled.thrown).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('__GAME__.keywords() returns the rendered keyword list and every content line', async ({ page }) => {
  await boot(page);
  const report = await page.evaluate(() => window.__GAME__?.keywords());
  if (!report) throw new Error('no report');
  expect(report.keywords.map((k) => k.name)).toContain('Burst');
  expect(report.keywords.find((k) => k.id === 'cold')?.text).toBe('Each hit adds 1 Chill.');
  expect(report.lines).toContainEqual({ owner: 'b2', kind: 'talent', text: 'Burst: +15% radius' });
  expect(report.lines.find((l) => l.owner === 'k1')?.text).toBe('Bomb: each Burst leaves a Pool for 0.3 s');
});
