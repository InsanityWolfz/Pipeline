import { expect, type Page } from '@playwright/test';
import { OBJECTIVES } from '../../src/data/objectives';
import { boot } from './helpers';
import { state } from './foundryPage';

// 058: staging a New game for the guided tutorial's e2e and review shots.

const at = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);

/** A New game: the tube taken, the ruin field's pack felled (the hook), into the foundry, the attune played out. */
export async function newGameInFoundry(page: Page): Promise<void> {
  await boot(page, '?start=tutorial');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    h.walkTo((40.5 + h.ox) * 32, (34.5 + h.oy) * 32);
    g.step(1, { interact: true });
    for (const e of g.getState().enemies.filter((x) => x.group === 'field')) g.setEnemyHealth(e.id, 0);
    g.step(2);
    h.toFoundry();
    for (let t = 0; t < 600 && g.getState().link.attunePulse > 0; t++) g.step(1);
  });
  expect((await state(page)).room).toBe('foundry');
}

/** Every goal before `text` done (the hook), so it's the current one. */
export async function goalTo(page: Page, text: string): Promise<void> {
  const s = await page.evaluate((n) => window.__GAME__?.completeObjectives(n), at(text));
  expect(s?.objective.text).toBe(text);
}

/** Ley dust and a ley bolt crafted by hand from a dropped crystal, as the bomb goal does: the grinder and the focuser join the bar. */
export async function craftLeyByHand(page: Page): Promise<void> {
  const s = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    g.drop('ley-crystal', p.x, p.y);
    g.step(30);
    g.craft('ley-dust');
    g.craft('ley-bolt');
    return g.step(1);
  });
  expect(s?.crafted).toEqual(expect.arrayContaining(['ley-dust', 'ley-bolt']));
}
