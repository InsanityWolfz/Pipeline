import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { clickCraftRow, craftRow, openCraftTab } from './craftPage';

// The keyword system (039): from ?playtest, craft Frost bombs from the crafting menu's
// Bombs tab (047: a tagged round per family), fire Frost bombs at a pack and see Chill on several
// enemies in getState(); and read the rendered keyword list and content lines from
// __GAME__.keywords(), the same text the game shows.

test('Frost bombs crafted from the Bombs tab chill a pack', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
  });
  // 047: each tagged round is a row on its family's crafting tab, the landmine's once ley-iron is found (the kit carries it).
  await openCraftTab(page, 'bomb');
  const menu = await page.evaluate(() => window.__GAME__?.ui().craftMenu);
  const tagged = (menu?.rows ?? []).filter((r) => r.shown && (r.labels[r.labels.length - 1]?.itemId.includes('+') ?? false));
  // 060: the Fire bomb's row too, as the kit carries cinderite. (062: the steel bomb's waits for ley-steel, which the
  // kit leaves out.) 064: and the Lightning bomb's, as the kit carries stormglass.
  expect(tagged.map((r) => r.recipeId)).toEqual(['frost-rune-bomb', 'fire-rune-bomb', 'lightning-rune-bomb', 'cluster-die-bomb']);
  await openCraftTab(page, 'landmine');
  await craftRow(page, 'frost-rune-landmine');
  await openCraftTab(page, 'bomb');
  const row = await craftRow(page, 'frost-rune-bomb');
  expect(row.labels.map((l) => l.text)).toEqual(['Bomb', 'Rimestone', 'Frost bomb']);
  await clickCraftRow(page, 'frost-rune-bomb');
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.step(1).inventory['bomb+frost'] ?? 0)).toBe(4);
  await page.keyboard.press('c');

  // Out to the meadow: a pack of three Husks ahead, Frost bombs lobbed into it until two are chilled.
  const chilled = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    window.__helpers?.hold('bomb+frost');
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
      s = g.step(1, { use: fire, aimX: cx, aimY: cy });
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
