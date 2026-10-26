import { expect, test } from '@playwright/test';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, watchErrors } from './helpers';
import { screenPoint, step } from './foundryPage';
import { steelArrowLine } from './tierPage';

// 062 in the game: a Smelter built into an arrow line makes steel arrows that fill the intake and fire from the
// tube; a steel round's hover summary names its tier and its breakdown shows the ×1.6 as its own step.

test('a Smelter in an arrow line: steel arrowheads, steel arrows into the intake, fired from the tube', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  const smelter = await steelArrowLine(page);
  const s = await step(page, 0);
  expect(s.foundry.pieces.find((p) => p.id === smelter)?.pieceId).toBe('smelter');
  // The intake's open entrance holds steel arrows, made by the line: the steel goals' "Build a Smelter" counts it.
  expect(s.intake.entrances.find((e) => e.ammo === 'arrow+steel')?.count).toBeGreaterThan(0);
  const fired = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    let st = g.step(30);
    const shots: string[] = [];
    for (let t = 0; t < 120 && shots.length < 3; t++) {
      st = g.step(1, { fire: true, aimX: st.player.x + 200, aimY: st.player.y });
      shots.push(...st.arrows.filter((a) => !shots.includes(`${a.id}`)).map((a) => `${a.id}`));
    }
    return { ammo: [...new Set(st.arrows.map((a) => a.ammoId))], count: shots.length };
  });
  expect(fired.count).toBeGreaterThan(0);
  expect(fired.ammo).toEqual(['arrow+steel']);
  expect(errors).toEqual([]);
});

test('a Steel Frost arrow’s hover names its tier; Shift shows the ×1.6 Steel step', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // Carried for the first time, it takes the carried bar's first empty slot (047).
  const slot = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const s = g.step(1);
    g.drop('arrow+steel+frost', s.player.x, s.player.y);
    h.collect();
    return g.step(1).hotbar.slots.indexOf('arrow+steel+frost');
  });
  expect(slot).toBeGreaterThanOrEqual(0);
  const cell = hotbarCells().find((c) => c.slot === slot);
  if (!cell) throw new Error('no slot');
  const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.move(p.x, p.y);
  const ui = () => page.evaluate(() => window.__GAME__?.ui().tip);
  await expect.poll(async () => (await ui())?.mode).toBe('summary');
  let tip = await ui();
  expect(tip?.source).toEqual({ kind: 'round', id: 'arrow+steel+frost' });
  expect(tip?.name).toBe('Steel Frost arrow');
  expect(tip?.lines.join(' ')).toContain('Steel ×1.6 dmg');
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await ui())?.mode).toBe('breakdown');
  tip = await ui();
  expect(tip?.lines[0]).toBe('Damage 14 × 1.6 Steel = 22.4');
  await page.keyboard.up('Shift');
  expect(errors).toEqual([]);
});
