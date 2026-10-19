import type { Page } from '@playwright/test';
import type {} from '../../src/render/testHook';

// Driving the foundry intake from a spec (024, shared since 025): walking to it,
// restoring its capped entrances (033: one boss core each), and feeding entrances from hopper lines.

/** Into the foundry from ?playtest (unless already there), to the floor under the intake's east end. */
export function toIntake(page: Page) {
  return page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    if (g.step(0).room !== 'foundry') h.toFoundry();
    h.walkTo(14.5 * 32, 1.5 * 32);
    return g.step(1);
  });
}

/**
 * Restores the capped entrance at mouth tile `tx` (033), from ?playtest's cores: into the foundry (unless already
 * there), under that cap, and the next entrance node's Restore, as the restore panel sends it. Returns the tick's state.
 */
export function restoreEntrance(page: Page, tx: number) {
  return page.evaluate((tx) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    if (g.step(0).room !== 'foundry') h.toFoundry();
    h.walkTo((tx + 0.5) * 32, 1.5 * 32);
    const node = g.step(0).research.nodes.find((n) => n.id.startsWith('entrance-') && n.state === 'revealed');
    if (!node) throw new Error('no entrance left to restore');
    return g.step(1, { restore: node.id });
  }, tx);
}

/** The test hook's view of what's drawn, once the next frame has drawn it. */
export const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** A hopper (two tiles south of an entrance) feeding a conduit up into it, filled with `amount` of a carried ammo. */
export function feedLines(page: Page, lines: { tx: number; itemId: string; amount: 'half' | 'all' }[], rounds: number) {
  return page.evaluate(
    ([lines, rounds]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const { tx } of lines) {
        g.step(1, { place: { pieceId: 'conduit', tx, ty: 1, facing: 'up' } });
        g.step(1, { place: { pieceId: 'hopper', tx, ty: 2, facing: 'up' } });
      }
      // Just below the hoppers, in reach of each in turn.
      for (const { tx, itemId, amount } of lines) {
        h.walkTo((tx + 0.5) * 32, 3.3 * 32);
        const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx);
        if (!hopper) throw new Error(`no hopper at ${tx}`);
        g.step(1, { deposit: { id: hopper.id, itemId, amount } });
      }
      let s = g.getState();
      const fed = () => lines.every((l) => (s.intake.entrances.find((e) => e.tx === l.tx)?.count ?? 0) >= rounds);
      for (let t = 0; t < 1200 && !fed(); t++) s = g.step(1);
      return s;
    },
    [lines, rounds] as const,
  );
}
