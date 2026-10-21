import { expect, type Page } from '@playwright/test';
import { SANDBOX_PANEL } from '../../src/data/sandbox';
import { ENEMY_CHOICES, ROUND_CHOICES } from '../../src/render/sandboxRows';
import { boot } from './helpers';
import { clickView } from './flowPage';

// The sandbox (044) for the e2e specs: booting `?sandbox`, the pop-outs opened by their tabs (057), and their rows
// clicked as a player would (each click then a tick, so the sim takes it before the next).

/** Boots `?sandbox` and waits for the game. */
export async function bootSandbox(page: Page): Promise<void> {
  await boot(page, '?sandbox');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState()?.sandbox)).toBe(true);
}

/** Whether a sandbox panel is all the way out (057: they start closed, only their tabs showing). */
export const controlsShown = (page: Page) => page.evaluate(() => window.__GAME__?.ui().sandbox?.open ?? false);

/** Which panels are all the way out, and whether either is still sliding (057). */
export const panelsOut = (page: Page) =>
  page.evaluate(() => {
    const sb = window.__GAME__?.ui().sandbox;
    const ids = sb?.rows.map((r) => r.id) ?? [];
    return { loadout: ids.includes('god'), spawn: ids.includes('spawn'), sliding: sb?.sliding ?? false };
  });

/** Clicks a pop-out's tab (057), as a player would, once it's on screen and still (not stepped aside, not sliding). */
export async function clickTab(page: Page, id: 'loadout' | 'spawn'): Promise<void> {
  const find = () =>
    page.evaluate((tabId) => {
      const sb = window.__GAME__?.ui().sandbox;
      return sb && !sb.sliding ? (sb.tabs.find((t) => t.id === tabId) ?? null) : null;
    }, id);
  await expect.poll(async () => (await find()) !== null).toBe(true);
  const tab = await find();
  if (!tab) throw new Error(`no sandbox tab '${id}'`);
  await clickView(page, tab.x + tab.w / 2, tab.y + tab.h / 2);
}

/** Makes sure both panels are out: each closed one's tab is clicked (057), then it waits for the slide. */
export async function openPanel(page: Page): Promise<void> {
  const tabs = (await page.evaluate(() => window.__GAME__?.ui().sandbox?.tabs)) ?? [];
  for (const t of tabs) if (!t.open) await clickTab(page, t.id);
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: true, sliding: false });
}

/** Closes both panels with their key (057.3), for a clean shot: only the tabs stay. */
export async function hidePanel(page: Page): Promise<void> {
  const tabs = (await page.evaluate(() => window.__GAME__?.ui().sandbox?.tabs)) ?? [];
  if (tabs.some((t) => t.open)) await page.keyboard.press('Backquote');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: false, spawn: false, sliding: false });
}

/** Clicks a panel row (its − or +, or its label side), then runs a tick so the sim takes what it sent. */
export async function clickPanel(page: Page, id: string, at: 'row' | 'down' | 'up' = 'row'): Promise<void> {
  const box = await page.evaluate((rowId) => window.__GAME__?.ui().sandbox?.rows.find((r) => r.id === rowId) ?? null, id);
  if (!box) throw new Error(`no panel row '${id}'`);
  const S = SANDBOX_PANEL.rows.stepper;
  const x = at === 'down' ? box.x + S.down : at === 'up' ? box.x + S.up : box.x + 40;
  await clickView(page, x, box.y + box.h / 2);
  await page.evaluate(() => window.__GAME__?.step(1));
}

/** Steps an entrance's row with + until it holds `round`. */
export async function setRound(page: Page, entrance: number, round: string | null): Promise<void> {
  const now = (await page.evaluate((i) => window.__GAME__?.getState().loadout?.[i] ?? null, entrance)) ?? null;
  const clicks = (ROUND_CHOICES.indexOf(round) - ROUND_CHOICES.indexOf(now) + ROUND_CHOICES.length) % ROUND_CHOICES.length;
  for (let i = 0; i < clicks; i++) await clickPanel(page, `entrance-${entrance}`, 'up');
  await expect.poll(() => page.evaluate((i) => window.__GAME__?.getState().loadout?.[i] ?? null, entrance)).toBe(round);
}

/** Sets the spawn rows to `count` of `enemyId` at `ring`, a champion pack if `champion`, then presses Spawn. */
export async function spawnPack(page: Page, enemyId: string, ring: number, champion: boolean, count: number): Promise<void> {
  for (let i = 0; i < ENEMY_CHOICES.indexOf(enemyId); i++) await clickPanel(page, 'enemy', 'up');
  for (let i = 1; i < ring; i++) await clickPanel(page, 'ring', 'up');
  if (champion) await clickPanel(page, 'champion');
  for (let i = 1; i < count; i++) await clickPanel(page, 'count', 'up');
  await clickPanel(page, 'spawn');
}
