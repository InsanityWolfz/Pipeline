import { expect, type Page } from '@playwright/test';
import type {} from '../../src/render/testHook';
import { VIEW_WIDTH } from '../../src/data/config';
import { installPageHelpers } from './helpers';

// Page helpers for 042's flow screens: boot the shipped game (the title), click a flow row by its id, wait on state.

/** Boots the plain URL (the shipped game: the title), with the in-page `__helpers`. */
export async function bootTitle(page: Page, query = ''): Promise<void> {
  await installPageHelpers(page);
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true && window.__GAME__?.flow().state === 'title');
}

/** Clicks a point given in view px (the 640×360 layout), wherever the canvas sits. */
export async function clickView(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const k = box.width / VIEW_WIDTH;
  await page.mouse.move(box.x + x * k, box.y + y * k);
  await page.mouse.click(box.x + x * k, box.y + y * k);
}

/** Every flow row on screen (title, card, Settings, key list), by id. */
async function rowBox(page: Page, id: string): Promise<{ x: number; y: number; w: number; h: number; usable: boolean } | null> {
  return page.evaluate((rowId) => {
    const f = window.__GAME__?.ui().flow;
    if (!f) return null;
    const rows = [...(f.card?.rows ?? []), ...(f.title?.rows ?? []), ...(f.settings?.rows ?? []), ...(f.bindings?.rows ?? []), ...(f.endCard?.rows ?? []), ...(f.note?.rows ?? [])];
    return rows.find((r) => r.id === rowId) ?? null;
  }, id);
}

/** Clicks a flow row by id (the middle of its label side, away from any stepper). */
export async function clickRow(page: Page, id: string, at: 'row' | 'down' | 'up' = 'row'): Promise<void> {
  await expect.poll(() => rowBox(page, id).then((b) => b !== null)).toBe(true);
  const b = await rowBox(page, id);
  if (!b) throw new Error(`no row '${id}'`);
  const x = at === 'down' ? b.x + 128 : at === 'up' ? b.x + 170 : b.x + 40;
  await clickView(page, x, b.y + b.h / 2);
}

/** Waits for the flow to reach a state. */
export async function flowIs(page: Page, state: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__GAME__?.flow().state)).toBe(state);
}

/** Reloads the page and waits for the title again (storage is kept). */
export async function reloadTitle(page: Page): Promise<void> {
  await page.reload();
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true && window.__GAME__?.flow().state === 'title');
}

/**
 * New game from the title, then into the foundry: the field's pack killed and (067) the shrine claimed by the hook so the
 * stairs open, then down them. With `progress`, levels and a gear piece first too.
 */
export async function newGameToFoundry(page: Page, progress = false): Promise<void> {
  await clickRow(page, 'newGame');
  await flowIs(page, 'play');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  await page.evaluate((prog) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    for (const e of g.getState().enemies) if (e.group === 'field') g.setEnemyHealth(e.id, 0);
    // 067: the shrine's claim opens the foundry's stairs (and is something a restore must bring back).
    g.claim('shrine');
    // `progress`: more a restore must bring back (levels, gear) before the save.
    if (prog) {
      g.gainXp(2000);
      g.addGear({ slot: 'helm', rarity: 'rare', weight: null, baseArmor: 2, relic: null, name: 'Test Helm', affixes: [{ kind: 'armor', value: 2 }] });
    }
    g.step(3);
    h.toFoundry();
  }, progress);
}
