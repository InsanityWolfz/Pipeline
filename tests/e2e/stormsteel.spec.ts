import { expect, test, type Page } from '@playwright/test';
import { craftRecipeDef } from '../../src/data/craftTabs';
import { itemDef } from '../../src/data/items';
import { hotbarCells } from '../../src/render/bottomHud';
import { boot, watchErrors } from './helpers';
import { openCraftTab } from './craftPage';
import { screenPoint, step } from './foundryPage';
import { stormsteelArrowLine } from './stormsteelPage';

// 066 in the game: a Tempering coil built into an arrow line makes stormsteel arrows that fill the intake and fire from
// the tube; a storm round's hover names its tier and its breakdown shows the ×2.56 as one step; the crafting menu's
// storm rows name every item inside their row.

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** Hovers a carried round's hotbar cell (taken up from the ground, so it has a slot) and returns its tip once shown. */
async function hoverCarried(page: Page, round: string) {
  const slot = await page.evaluate((id) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const s = g.step(1);
    g.drop(id, s.player.x, s.player.y);
    h.collect();
    return g.step(1).hotbar.slots.indexOf(id);
  }, round);
  expect(slot).toBeGreaterThanOrEqual(0);
  const cell = hotbarCells().find((c) => c.slot === slot);
  if (!cell) throw new Error('no slot');
  const p = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.move(p.x, p.y);
}

test('a Tempering coil in an arrow line: stormsteel arrowheads, stormsteel arrows into the intake, fired from the tube', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  const coil = await stormsteelArrowLine(page);
  const s = await step(page, 0);
  expect(s.foundry.pieces.find((p) => p.id === coil)?.pieceId).toBe('tempering-coil');
  expect(s.intake.entrances.find((e) => e.ammo === 'arrow+stormsteel')?.count).toBeGreaterThan(0);
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
  expect(fired.ammo).toEqual(['arrow+stormsteel']);
  expect(errors).toEqual([]);
});

test('a Stormsteel Frost arrow’s hover names its tier; Shift shows the one × 2.56 Stormsteel step', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await hoverCarried(page, 'arrow+stormsteel+frost');
  const ui = () => page.evaluate(() => window.__GAME__?.ui().tip);
  await expect.poll(async () => (await ui())?.mode).toBe('summary');
  let tip = await ui();
  expect(tip?.source).toEqual({ kind: 'round', id: 'arrow+stormsteel+frost' });
  expect(tip?.name).toBe('Stormsteel Frost arrow');
  expect(tip?.lines.join(' ')).toContain('Stormsteel ×2.56 dmg');
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await ui())?.mode).toBe('breakdown');
  tip = await ui();
  expect(tip?.lines[0]).toBe('Damage 14 × 2.56 Stormsteel = 35.8');
  await page.keyboard.up('Shift');
  expect(errors).toEqual([]);
});

test('the crafting menu’s storm rows name every item inside their row, the coil’s and the stormsteel chain’s', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // The kit leaves the tier parts out: smelt and temper by hand so every storm row shows (they wait on being carried).
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let i = 0; i < 4; i++) g.craft('ley-steel');
    g.craft('ley-glass');
    // Carried for a tick, so the coil's rows are known (038).
    g.step(1);
    g.craft('stormsteel');
    g.craft('storm-glass');
    g.step(2);
  });
  for (const [tab, rows] of [
    // 062's steel arrow row too, whose Steel arrowhead ran into Rope until 066 placed the names.
    ['arrow', ['steel-arrow', 'stormsteel', 'stormsteel-arrowhead', 'stormsteel-arrow']],
    ['bomb', ['stormsteel', 'stormsteel-casing', 'stormsteel-bomb']],
    ['ley-bolt', ['storm-glass', 'storm-glass-bolt']],
    ['landmine', ['stormsteel', 'stormsteel-plate', 'stormsteel-landmine']],
  ] as const) {
    await openCraftTab(page, tab);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().craftMenu))?.rows.filter((r) => r.shown && (rows as readonly string[]).includes(r.recipeId)).length).toBe(rows.length);
    const menu = await page.evaluate(() => window.__GAME__?.ui().craftMenu);
    for (const id of rows) {
      const row = menu?.rows.find((r) => r.shown && r.recipeId === id);
      if (!row) throw new Error(`no ${id} row`);
      const recipe = craftRecipeDef(id);
      const items = [...Object.keys(recipe.inputs), recipe.output.itemId];
      expect(row.labels.map((l) => l.text), id).toEqual(items.map((it) => itemDef(it).name));
      const texts = [...row.labels, ...row.counts];
      for (const [i, t] of texts.entries()) {
        expect(t.w, `${id} ${t.text}`).toBeGreaterThan(0);
        expect(inside(t, row), `${id} ${t.text} inside its row`).toBe(true);
        for (const other of texts.slice(i + 1)) expect(overlaps(t, other), `${id}: ${t.text} / ${other.text}`).toBe(false);
      }
    }
  }
  expect(errors).toEqual([]);
});
