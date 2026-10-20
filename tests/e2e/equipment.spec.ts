import { expect, test, type Page } from '@playwright/test';
import { MIN_DAMAGE_SHARE, MOVE_BONUS_CAP, ROLL_COOLDOWN_FLOOR, SLOT_BASE, type AffixKind } from '../../src/data/gear';
import { PLAYTEST_GEAR } from '../../src/data/playtest';
import { MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE } from '../../src/data/player';
import { boot, watchErrors } from './helpers';
import { screenPoint, state, step } from './foundryPage';

// Equipment (036): with ?playtest, open the bench with E, identify with a click on the
// panel's button, wear a piece in each slot (the body by clicking its row), read the
// stats from getState(), and take a Husk's swipe for the reduced damage.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());
const BENCH_STAND = { x: 2.3 * 32, y: 12.5 * 32 };
const HUSK_SWIPE = 20;

/** Clicks the middle of a panel box, view px. */
async function clickBox(page: Page, b: { x: number; y: number; w: number; h: number }): Promise<void> {
  const p = await screenPoint(page, b.x + b.w / 2, b.y + b.h / 2);
  await page.mouse.click(p.x, p.y);
}

/** Into the foundry from the playtest start and over to the bench, its panel open. */
async function openBench(page: Page): Promise<void> {
  await page.evaluate((at) => {
    window.__GAME__?.step(1);
    window.__helpers?.toFoundry();
    window.__helpers?.walkTo(at.x, at.y);
  }, BENCH_STAND);
  expect((await state(page)).room).toBe('foundry');
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.gearPanel?.open, { timeout: 15_000 }).toBe(true);
}

test('identify and wear a piece in each slot at the bench; the stats add up and a Husk hits for less', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await openBench(page);
  let panel = (await ui(page))?.gearPanel;
  expect(panel?.tab).toBe('body');
  expect(panel?.identify?.text).toBe('Identify all (3)');
  expect(panel?.cells.map((c) => [c.slot, c.worn])).toEqual([['helm', null], ['body', null], ['boots', null], ['trinket', null]]);

  // Identify with a click on the button: the playtest's five pieces and three more.
  if (!panel?.identify) throw new Error('no identify button');
  await clickBox(page, panel.identify);
  let s = await step(page, 1);
  expect(s.gear).toHaveLength(PLAYTEST_GEAR.length + 3);
  expect(s.inventory['unidentified-armor'] ?? 0).toBe(0);
  await expect.poll(async () => (await ui(page))?.gearPanel?.identify ?? null).toBeNull();

  // The body by clicking its row on the body tab; the others by the hook's equip.
  const [helm, body, boots, trinket] = PLAYTEST_GEAR;
  if (!helm || !body || !boots || !trinket) throw new Error('playtest gear');
  await expect.poll(async () => (await ui(page))?.gearPanel?.rows.some((r) => r.id === body.id)).toBe(true);
  panel = (await ui(page))?.gearPanel;
  const row = panel?.rows.find((r) => r.id === body.id);
  if (!row) throw new Error('no body row');
  expect(row.texts[0]).toBe(body.name);
  await clickBox(page, row.box);
  s = await step(page, 1);
  expect(s.equipped.body).toBe(body.id);
  for (const piece of [helm, boots, trinket]) s = await step(page, 1, { equip: { id: piece.id } });
  expect(s.equipped).toEqual({ helm: helm.id, body: body.id, boots: boots.id, trinket: trinket.id });

  // The stats are every worn piece summed.
  const worn = [helm, body, boots, trinket];
  const sum = (kind: AffixKind) => worn.reduce((n, p) => n + p.affixes.reduce((m, a) => m + (a.kind === kind ? a.value : 0), 0), 0);
  const armor = worn.reduce((n, p) => n + p.baseArmor, 0) + sum('armor');
  const move = Math.min(MOVE_BONUS_CAP, sum('move-speed'));
  expect(s.stats.armor).toBe(armor);
  expect(s.stats.maxHealth).toBe(MAX_HEALTH + sum('max-health'));
  expect(s.stats.regen).toBeCloseTo(sum('regen'), 6);
  expect(s.stats.moveBonus).toBeCloseTo(move, 6);
  expect(s.stats.walkScale).toBeCloseTo(SLOT_BASE.body.heavy.walkScale * (1 + move), 6);
  // 039.9: roll affixes are shares of the bare roll, the cooldown's floored at −50%.
  expect(s.stats.rollCooldown).toBeCloseTo(ROLL_COOLDOWN_TICKS * (1 + Math.max(ROLL_COOLDOWN_FLOOR, sum('roll-cooldown'))), 6);
  expect(s.stats.rollDistance).toBeCloseTo(ROLL_DISTANCE * (1 + sum('roll-distance')), 6);
  expect(s.player.maxHealth).toBe(s.stats.maxHealth);
  // The foundry's fill (030) tops health up to the new max (equipping itself never heals: unit-tested).
  expect(s.player.health).toBeLessThan(s.stats.maxHealth);
  expect((await step(page, 120)).player.health).toBe(s.stats.maxHealth);
  await expect.poll(async () => (await ui(page))?.gearPanel?.totals[0]).toBe(`Armor ${armor} · Max health ${MAX_HEALTH + sum('max-health')} · Field regen ${sum('regen').toFixed(1)} HP/s`);
  await expect.poll(async () => (await ui(page))?.gearPanel?.cells.map((c) => c.worn)).toEqual([helm.id, body.id, boots.id, trinket.id]);

  // A Husk beside the player swings: the hit lands for the armor's reduced damage.
  await page.keyboard.press('Escape');
  const damage = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    g.spawnEnemy('husk', p.x + 20, p.y);
    for (let t = 0; t < 300; t++) {
      const hit = g.step(1).events.hits.find((h) => h.target === 'player');
      if (hit) return hit.damage;
    }
    return null;
  });
  expect(damage).toBe(Math.max(Math.ceil(HUSK_SWIPE * MIN_DAMAGE_SHARE), HUSK_SWIPE - armor));
  expect(errors).toEqual([]);
});

test('tabs and cells pick a slot, a click on the worn row takes it off, and { slot, id: null } empties a slot', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await openBench(page);
  const [helm, , , trinket] = PLAYTEST_GEAR;
  if (!helm || !trinket) throw new Error('playtest gear');
  // The trinket tab: its one piece.
  let panel = (await ui(page))?.gearPanel;
  const tab = panel?.tabs.find((t) => t.slot === 'trinket');
  if (!tab) throw new Error('no tab');
  expect(tab.text).toBe('Trinket 1');
  await clickBox(page, tab.box);
  await expect.poll(async () => (await ui(page))?.gearPanel?.tab).toBe('trinket');
  panel = (await ui(page))?.gearPanel;
  expect(panel?.rows.map((r) => r.id)).toEqual([trinket.id]);
  // Wear it by its row, then take it off by clicking the worn row.
  const row = panel?.rows[0];
  if (!row) throw new Error('no row');
  await clickBox(page, row.box);
  expect((await step(page, 1)).equipped.trinket).toBe(trinket.id);
  await expect.poll(async () => (await ui(page))?.gearPanel?.rows[0]?.worn).toBe(true);
  expect((await ui(page))?.gearPanel?.rows[0]?.texts[1]).toMatch(/^Rare · worn · armor /);
  await clickBox(page, row.box);
  expect((await step(page, 1)).equipped.trinket).toBeNull();
  // A cell opens its slot's tab; the helm's tab lists the Rare helm and the Wardstone with its rule.
  const cell = (await ui(page))?.gearPanel?.cells.find((c) => c.slot === 'helm');
  if (!cell) throw new Error('no cell');
  await clickBox(page, cell.box);
  await expect.poll(async () => (await ui(page))?.gearPanel?.tab).toBe('helm');
  panel = (await ui(page))?.gearPanel;
  expect(panel?.rows).toHaveLength(2);
  const relicRow = panel?.rows.find((r) => r.texts[0] === 'Wardstone Circlet');
  expect(relicRow?.color).toBe('wisp-light');
  expect(relicRow?.texts).toHaveLength(4);
  // The hook's take-off of a slot.
  await step(page, 1, { equip: { id: helm.id } });
  expect((await step(page, 1, { equip: { slot: 'helm', id: null } })).equipped.helm).toBeNull();
  // Walking away closes it.
  await page.evaluate(() => window.__helpers?.walkTo(10 * 32, 8.5 * 32));
  await expect.poll(async () => (await ui(page))?.gearPanel ?? null).toBeNull();
  expect(errors).toEqual([]);
});
