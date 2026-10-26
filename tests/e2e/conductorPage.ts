import type { Page } from '@playwright/test';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { bootSandbox, hidePanel } from './sandboxPage';

// 064's Conductor in the sandbox, for its e2e and review shots: into the Crown Spire with god mode and three arrow
// lanes, and breaking five of its six rods to ground it (068: or fewer, to drop its storm shield).

/** Fires at the Conductor's body from the middle, following him, `ticks` ticks; returns the blocks seen and the health he lost. */
export async function fireAtConductor(page: Page, ticks: number): Promise<{ blocks: number; lost: number }> {
  return page.evaluate((n) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const body = () => {
      const c = g.getState().enemies.find((e) => e.enemyId === 'conductor');
      if (!c) throw new Error('no Conductor');
      return c;
    };
    const before = body().health;
    let blocks = 0;
    for (let t = 0; t < n; t++) {
      const c = body();
      blocks += g.step(1, { fire: true, aimX: c.x, aimY: c.y - 30 }).events.blocked.length;
    }
    return { blocks, lost: before - body().health };
  }, ticks);
}

/** The sandbox, god mode on, three arrow lanes, the player in the Crown Spire's middle (the Conductor awake). */
export async function intoSpire(page: Page): Promise<void> {
  await bootSandbox(page);
  await hidePanel(page);
  await page.evaluate((m) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'god', on: true } });
    ['arrow', 'arrow', 'arrow', null, null].forEach((round, entrance) => g.step(1, { sandbox: { kind: 'loadout', entrance, round } }));
    h.enterArena('crown-spire');
    h.walkTo((m.tx + 0.5) * 32, (m.ty + 0.5) * 32);
  }, CROWN_SPIRE.middle);
}

/** Breaks rods 0–4 in turn, each from beside it (square to the way in, where the Conductor never stands); returns which rods are down and whether it's grounded. */
export const breakFiveRods = (page: Page): Promise<{ rods: boolean[]; grounded: boolean }> => breakRods(page, 5);

/** Breaks rods 0 to `count` - 1 in turn, as breakFiveRods does (068: 2 drop his storm shield to 4 standing, 4 to 2). */
export async function breakRods(page: Page, count: number): Promise<{ rods: boolean[]; grounded: boolean }> {
  return page.evaluate(
    ([sockets, m, n]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const [i, at] of sockets.slice(0, n).entries()) {
        // Close enough for all three lanes to strike the rod.
        const d = Math.hypot(m.x - at.x, m.y - at.y) || 1;
        h.walkTo(at.x - ((m.y - at.y) / d) * 44, at.y + ((m.x - at.x) / d) * 44);
        for (let t = 0; t < 600; t++) {
          const s = g.step(1, { fire: true, aimX: at.x, aimY: at.y - 30 });
          if ((s.bosses.find((b) => b.enemyId === 'conductor')?.rods[i]?.regrow ?? 0) > 0) break;
        }
      }
      const c = g.step(1).bosses.find((b) => b.enemyId === 'conductor');
      return { rods: c?.rods.map((r) => r.regrow > 0) ?? [], grounded: c?.grounded ?? false };
    },
    [CROWN_SPIRE.sockets, { x: (CROWN_SPIRE.middle.tx + 0.5) * 32, y: (CROWN_SPIRE.middle.ty + 0.5) * 32 }, count] as const,
  );
}
