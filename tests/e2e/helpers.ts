import type { Page } from '@playwright/test';
import type {} from '../../src/render/testHook';

// Page helpers shared by the e2e specs. They run inside the page, so they're
// installed there before the game boots.

export interface Helpers {
  /** Walks to a world point, failing if it can't get there. */
  walkTo(x: number, y: number): void;
  /** Walks to just below a node and harvests it `times` times, collecting each drop. */
  harvest(nodeIndex: number, times: number): void;
  /** Walks onto every ground item in the player's room. */
  collect(): void;
  /** Shoots the nearest Husk until one dies, then collects its drops. */
  killHusk(): void;
  /** Walks out of the foundry's door into the ruin hall, where the tube can fire (015). */
  toHall(): void;
}

declare global {
  interface Window {
    __helpers?: Helpers;
  }
}

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

function installHelpers(): void {
  const game = () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    return g;
  };
  const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
  const walkTo = (x: number, y: number): void => {
    const g = game();
    for (let t = 0; t < 900; t++) {
      const p = g.getState().player;
      const moveX = toward(p.x, x);
      const moveY = toward(p.y, y);
      if (moveX === 0 && moveY === 0) return;
      g.step(1, { moveX, moveY });
    }
    throw new Error(`could not reach (${x}, ${y})`);
  };
  const collect = (): void => {
    const g = game();
    let stuck = 0;
    let detour = 0;
    for (let t = 0; t < 1800; t++) {
      const s = g.getState();
      const item = s.groundItems.find((it) => it.room === s.room);
      if (!item) return;
      // Blocked by something solid on the straight line: sidestep along x for a while.
      if (detour > 0) {
        detour -= 1;
        g.step(1, { moveX: 1 });
        continue;
      }
      const after = g.step(1, { moveX: toward(s.player.x, item.x), moveY: toward(s.player.y, item.y) });
      stuck = Math.hypot(after.player.x - s.player.x, after.player.y - s.player.y) < 0.1 ? stuck + 1 : 0;
      if (stuck > 5) {
        stuck = 0;
        detour = 30;
      }
    }
    const s = g.getState();
    throw new Error(`could not collect the drops: ${JSON.stringify(s.groundItems.filter((it) => it.room === s.room))} from ${s.player.x},${s.player.y}`);
  };
  window.__helpers = {
    walkTo,
    collect,
    harvest(nodeIndex, times) {
      const g = game();
      for (let i = 0; i < times; i++) {
        const n = g.getState().nodes[nodeIndex];
        if (!n) throw new Error(`no node ${nodeIndex}`);
        walkTo(n.x, n.y + 16);
        g.step(1, { interact: true });
        g.step(30);
        collect();
      }
    },
    toHall() {
      const g = game();
      walkTo(22.5 * 32, 8.5 * 32);
      for (let t = 0; t < 60 && g.getState().room === 'foundry'; t++) g.step(1, { moveX: 1 });
      if (g.getState().room === 'foundry') throw new Error('could not leave the foundry');
    },
    killHusk() {
      const g = game();
      let s = g.getState();
      const before = s.enemies.filter((e) => e.room === s.room).length;
      for (let t = 0; t < 2400 && s.enemies.filter((e) => e.room === s.room).length === before; t++) {
        const p = s.player;
        const target = [...s.enemies.filter((e) => e.room === s.room)].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!target) break;
        const far = Math.hypot(target.x - p.x, target.y - p.y) > 200;
        s = g.step(1, {
          moveX: far ? toward(p.x, target.x) : 0,
          moveY: far ? toward(p.y, target.y) : 0,
          fire: !far,
          aimX: target.x,
          aimY: target.y,
        });
      }
      collect();
    },
  };
}

/**
 * Opens the game with the helpers installed: at `query` (e.g. `?playtest`), or by
 * default the sandbox start in the ruin hall that most specs are written for.
 */
export async function boot(page: Page, query = '?start=hall'): Promise<void> {
  await page.addInitScript(installHelpers);
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__GAME__ !== undefined);
}

