import { expect, test } from '@playwright/test';
import { NODE_SPRITES } from '../../src/data/assets';
import { nodeDef } from '../../src/data/nodes';
import { LEY_VEIN } from './foundryPage';
import { boot, watchErrors } from './helpers';

// Believable resources (018): a node's remains grow back through their stages,
// and a Husk's resin is what it drops.

/** Lets a frame draw, then reads the frame each node shows. */
async function frames(page: import('@playwright/test').Page): Promise<Record<number, string>> {
  await page.waitForTimeout(80);
  return (await page.evaluate(() => window.__GAME__?.ui().nodes)) ?? {};
}

test('a ley vein worked to nothing shows its remains, grows back through its stages, then returns', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const vein = NODE_SPRITES['ley-vein'];
  if (!vein) throw new Error('no vein frames');
  await page.evaluate(() => window.__GAME__?.step(0));
  expect((await frames(page))[LEY_VEIN]).toBe(vein.uses[2]);
  // Each harvest takes a use off, and the vein shows it.
  const seenUses: string[] = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate((n) => window.__helpers?.harvest(n, 1), LEY_VEIN);
    seenUses.push((await frames(page))[LEY_VEIN] ?? '');
  }
  expect(seenUses).toEqual([vein.uses[1], vein.uses[0], vein.regrow[0]]);
  // Through the regrow timer, step by step: the bare remains, every stage in order, then the full vein.
  const seen: string[] = [];
  for (let t = 0; t < nodeDef('ley-vein').regrowTicks; t += 100) {
    await page.evaluate(() => window.__GAME__?.step(100));
    const f = (await frames(page))[LEY_VEIN] ?? '';
    if (seen[seen.length - 1] !== f) seen.push(f);
  }
  expect([vein.regrow[0], ...seen.filter((f) => f !== vein.regrow[0])]).toEqual([...vein.regrow, vein.uses[2]]);
  expect(errors).toEqual([]);
});

test("a Husk's resin is what it drops", async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const resin = await page.evaluate(() => {
    window.__GAME__?.step(0);
    window.__helpers?.killHusk();
    return window.__GAME__?.getState().inventory['husk-resin'] ?? 0;
  });
  expect(resin).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
