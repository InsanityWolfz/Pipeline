import { expect, test } from '@playwright/test';
import { sheetSections } from '../../src/render/vector/wandererPoses';
import { watchErrors } from './helpers';

// 075: the contact sheet shows every wanderer pose and strip the spec's table lists, per view, plus the trim and the
// schemes, each labelled as `sheetSections` names it, with no console errors.

test('the contact sheet lays out every wanderer strip, labelled, without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/sheet.html');
  await page.waitForSelector('h2');
  const shown = await page.evaluate(() => {
    const root = document.getElementById('sheet');
    const kids = [...(root?.children ?? [])];
    const out: { title: string; labels: string[] }[] = [];
    for (let i = 0; i + 1 < kids.length; i += 2) {
      const title = kids[i]?.textContent ?? '';
      if (!title.startsWith('Wanderer ')) continue;
      out.push({ title, labels: [...(kids[i + 1]?.querySelectorAll('figcaption') ?? [])].map((f) => f.textContent ?? '') });
    }
    return out;
  });
  const want = (['side', 'down', 'up'] as const).flatMap((view) => sheetSections(view).map((s) => ({ title: `Wanderer ${view}: ${s.title}`, labels: s.cells.map((c) => c.label) })));
  expect(shown).toEqual(want);
  // The table's strips are all there, in every view.
  for (const view of ['side', 'down', 'up'] as const) {
    const titles = sheetSections(view).map((s) => s.title);
    for (const strip of ['idle breath', 'run cycle', 'strafe walk', 'stop settle', 'firing brace', 'shot recoil', 'barrel spin', 'muzzle flash', 'hose pulse', 'roll', 'hit', 'ko', 'tube states', 'rarity trim', 'schemes'])
      expect(titles, `${view}: ${strip}`).toContain(strip);
  }
  expect(sheetSections('side').map((s) => s.title)).toContain('facing left');
  const counts = Object.fromEntries(sheetSections('down').map((s) => [s.title, s.cells.length]));
  expect(counts).toMatchObject({ 'idle breath': 4, 'run cycle': 8, 'strafe walk': 4, 'stop settle': 2, 'firing brace': 3, 'shot recoil': 4, 'barrel spin': 3, 'muzzle flash': 3, 'hose pulse': 3, roll: 6, hit: 3, ko: 6, 'tube states': 5, 'rarity trim': 5, schemes: 3 });
  // Every cell drew something.
  const blank = await page.evaluate(() =>
    [...document.querySelectorAll('h2')]
      .filter((h) => h.textContent?.startsWith('Wanderer '))
      .flatMap((h) => [...(h.nextElementSibling?.querySelectorAll('canvas') ?? [])])
      .filter((c) => {
        const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data;
        return !d || !d.some((v, i) => i % 4 === 3 && v > 0);
      }).length,
  );
  expect(blank).toBe(0);
  expect(errors).toEqual([]);
});

test('the rim light lights a shape\'s top and left edges and leaves its bottom and right dark', async ({ page }) => {
  await page.goto('/sheet.html');
  await page.waitForSelector('h2');
  const band = await page.evaluate(async (path) => {
    // The page's own module, as Vite serves it.
    const { drawShape } = (await import(/* @vite-ignore */ path)) as typeof import('../../src/render/vector/draw');
    const c = document.createElement('canvas');
    c.width = 100;
    c.height = 100;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    drawShape(ctx, { kind: 'rect', x: 20, y: 20, w: 60, h: 60, fill: 'ink', rim: { color: 'snow', width: 4, offset: 4 } }, { outline: 1, blurScale: 1 });
    const at = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)];
    return { top: at(50, 24), left: at(24, 50), bottom: at(50, 76), right: at(76, 50), middle: at(50, 50) };
  }, '/src/render/vector/draw.ts');
  // Lit (near white) along the top and left; the fill's ink along the bottom and right and in the middle.
  for (const lit of [band.top, band.left]) expect(Math.min(...lit)).toBeGreaterThan(200);
  for (const dark of [band.bottom, band.right, band.middle]) expect(Math.max(...dark)).toBeLessThan(60);
});
