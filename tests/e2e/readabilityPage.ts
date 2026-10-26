import type { Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { LANDMARKS } from '../../src/data/landmarks';

// 045's e2e scenes, shared by readability.spec.ts and its review shots.

const CACHE = landmarkDef('ruined-cache').cache ?? { tx: 0, ty: 0 };

/** Walks to the Ruined Cache, its guards gone, and opens it with a held E. Returns the ids of the items it gave. */
export async function openCache(page: Page): Promise<number[]> {
  return page.evaluate(
    ([tx, ty, ticks]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies.filter((x) => x.group === 'ruined-cache')) g.setEnemyHealth(e.id, 0);
      g.step(1);
      h.walkTo((tx + 0.5) * 32, (ty + 6.5) * 32);
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
      const before = new Set(g.step(1, { interact: true }).groundItems.map((i) => i.id));
      return g
        .step(ticks - 1)
        .groundItems.filter((i) => !before.has(i.id))
        .map((i) => i.id);
    },
    [CACHE.tx, CACHE.ty, LANDMARKS.cacheOpenTicks] as const,
  );
}

/** Walks to just left of the nearest ley crystal vein in the overworld; returns its point. */
export async function atLeyVein(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const s = g.step(1);
    const p = s.player;
    const vein = s.nodes.filter((n) => n.nodeId === 'ley-vein' && n.room === 'overworld').sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!vein) throw new Error('no ley vein');
    // 060: the Forgewright spared (its first kill is the end card's).
    for (const e of g.getState().enemies) if (e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
    h.walkTo(vein.x - 20, vein.y);
    g.step(1);
    return { x: vein.x, y: vein.y };
  });
}
