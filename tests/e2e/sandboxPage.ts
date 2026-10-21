import { expect, type Page } from '@playwright/test';
import { SANDBOX_PANEL } from '../../src/data/sandbox';
import { ENEMY_CHOICES, ROUND_CHOICES } from '../../src/render/sandboxRows';
import { boot } from './helpers';
import { clickView } from './flowPage';

// The sandbox (044) for the e2e specs: booting `?sandbox`, the controls on screen (056), and its rows
// clicked as a player would (each click then a tick, so the sim takes it before the next).

/** Boots `?sandbox` and waits for the game. */
export async function bootSandbox(page: Page): Promise<void> {
  await boot(page, '?sandbox');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState()?.sandbox)).toBe(true);
}

/** Whether the sandbox's controls are on screen (056: from the start). */
export const controlsShown = (page: Page) => page.evaluate(() => window.__GAME__?.ui().sandbox?.open ?? false);

/** Makes sure the controls are on screen: they start shown (056); only if hidden does their key (056.1) show them. */
export async function openPanel(page: Page): Promise<void> {
  if (!(await controlsShown(page))) await page.keyboard.press('Backquote');
  await expect.poll(() => controlsShown(page)).toBe(true);
}

/** Hides the controls with their key (056.1), for a clean shot. */
export async function hidePanel(page: Page): Promise<void> {
  await page.keyboard.press('Backquote');
  await expect.poll(() => controlsShown(page)).toBe(false);
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
