import { expect, test, type Page } from '@playwright/test';
import { XP_CURVE } from '../../src/data/leveling';
import { MAX_HEALTH } from '../../src/data/player';
import { boot, watchErrors } from './helpers';
import { screenPoint, state, step } from './foundryPage';

// Leveling and the tree (037): with ?playtest, kill Husks until a level-up, open the
// tree with T, take a node by clicking it, check getState(), then respec in the foundry
// with the panel's reset.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Clicks the middle of a view-px box, or a point. */
async function clickAt(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

/** Spawns a Husk a little way off and shoots it dead, again and again, until the level rises. Returns the kills. */
async function killUntilLevelUp(page: Page): Promise<number> {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let kills = 0;
    for (let n = 0; n < 30 && g.getState().level < 2; n++) {
      const p = g.step(1).player;
      const id = g.spawnEnemy('husk', p.x + 150, p.y).enemies.at(-1)?.id;
      for (let t = 0; t < 600; t++) {
        const e = g.getState().enemies.find((en) => en.id === id);
        if (!e) break;
        g.step(1, { fire: true, aimX: e.x, aimY: e.y - 4 });
      }
      if (!g.getState().enemies.some((en) => en.id === id)) kills += 1;
      // Back to full health between fights, so a stray swipe can't end the run.
      g.setPlayerHealth(g.getState().player.maxHealth);
    }
    return kills;
  });
}

test('level up from kills, take a node in the tree with a click, and respec it free in the foundry', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const kills = await killUntilLevelUp(page);
  expect(kills).toBeGreaterThan(0);
  let s = await state(page);
  expect(s.level).toBe(2);
  expect(s.talentPoints).toBe(1);
  expect(s.xpToNext).toBe(XP_CURVE[1]);
  // The XP row reads "Lv 2", its pip lit for the unspent point.
  await expect.poll(async () => (await ui(page))?.health.xp.text).toBe('Lv 2');
  expect((await ui(page))?.health.xp.pip).toBe(true);

  // T opens the tree; it doesn't pause the world.
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talents.open).toBe(true);
  expect((await ui(page))?.paused).toBe(false);
  let panel = (await ui(page))?.talents;
  expect(panel?.header).toBe(`Level 2 · ${s.xp} / ${XP_CURVE[1]} XP · 1 point`);
  expect(panel?.reset).toBeNull();
  const states = Object.fromEntries((panel?.nodes ?? []).map((n) => [n.id, n.state]));
  expect(states).toMatchObject({ start: 'taken', a1: 'available', b1: 'available', l1: 'available', t1: 'available', s1: 'available', a2: 'dim', k1: 'dim' });

  // Hovering a node shows its name and effect; clicking a lit one takes it.
  const tough = panel?.nodes.find((n) => n.id === 's1');
  if (!tough) throw new Error('no Tough Hide');
  const at = await screenPoint(page, tough.x, tough.y);
  await page.mouse.move(at.x, at.y);
  await expect.poll(async () => (await ui(page))?.talents.hover?.name).toBe('Tough Hide');
  expect((await ui(page))?.talents.hover?.text).toBe('You: +15 max health');
  await page.mouse.click(at.x, at.y);
  s = await step(page, 1);
  expect(s.talents).toEqual(['start', 's1']);
  expect(s.talentPoints).toBe(0);
  expect(s.events.talents).toEqual([{ id: 's1' }]);
  expect(s.stats.maxHealth).toBe(MAX_HEALTH + 15);
  await expect.poll(async () => (await ui(page))?.talents.nodes.find((n) => n.id === 's1')?.state).toBe('taken');
  panel = (await ui(page))?.talents;
  expect(panel?.nodes.find((n) => n.id === 's2')?.state).toBe('dim');
  expect(panel?.glowingLinks).toBe(1);
  await expect.poll(async () => (await ui(page))?.health.xp.pip).toBe(false);
  // Clicking it again, or a dim node, does nothing.
  const dim = panel?.nodes.find((n) => n.id === 'a1');
  if (!dim) throw new Error('no a1');
  await clickAt(page, dim.x, dim.y);
  expect((await step(page, 1)).talents).toEqual(['start', 's1']);

  // Esc closes it; into the foundry, where the reset shows and respecs for free.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.talents.open).toBe(false);
  await page.evaluate(() => window.__helpers?.toFoundry());
  expect((await state(page)).room).toBe('foundry');
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talents.reset ?? null).not.toBeNull();
  const reset = (await ui(page))?.talents.reset;
  if (!reset) throw new Error('no reset');
  await clickAt(page, reset.x + reset.w / 2, reset.y + reset.h / 2);
  s = await step(page, 1);
  expect(s.talents).toEqual(['start']);
  expect(s.talentPoints).toBe(1);
  expect(s.events.respecs).toEqual([{ refunded: 1 }]);
  expect(s.player.health).toBeLessThanOrEqual(MAX_HEALTH);
  // T again closes it.
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talents.open).toBe(false);
  expect(errors).toEqual([]);
});
