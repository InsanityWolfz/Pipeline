import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { bootSandbox, openPanel, setRound } from './sandboxPage';

// 064: Lightning in the game. In the sandbox, a Lightning arrow shot into a pack arcs on: the arcs are drawn as bolts
// between the enemies, and the enemies it arcs to are hurt without being shot.

test('a Lightning arrow arcs across a pack: bolts drawn between the enemies, each arc a hit', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await openPanel(page);
  await setRound(page, 0, 'arrow+lightning');
  const entrances = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const n = g.getState().loadout?.length ?? 0;
    for (let i = 1; i < n; i++) g.step(1, { sandbox: { kind: 'loadout', entrance: i, round: null } });
    g.step(1, { sandbox: { kind: 'god', on: true } });
    // A pack of Husks ahead, tough enough to take a few arcs (ring 3).
    g.step(1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 3, champion: false, count: 5 } });
    return g.getState().loadout ?? [];
  });
  expect(entrances[0]).toBe('arrow+lightning');
  expect(entrances.slice(1).every((r) => r === null)).toBe(true);
  // Shoot the pack's nearest until a shot's hit arcs on, stepping a tick at a time so the arc events are seen.
  const arced = await page.evaluate((group) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 600; t++) {
      const s = g.getState();
      const pack = s.enemies.filter((e) => e.group === group);
      const p = s.player;
      const near = pack.reduce((a, b) => (Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a), pack[0] ?? { x: p.x + 100, y: p.y });
      const after = g.step(1, { fire: true, aimX: near.x, aimY: near.y - 10 });
      if (after.events.arcs.length > 0) return { arcs: after.events.arcs.length, arcHits: after.events.hits.filter((h) => h.target === 'enemy' && h.arc).length };
    }
    return null;
  }, SPAWN_GROUP);
  expect(arced).not.toBeNull();
  expect(arced?.arcHits).toBe(arced?.arcs);
  // Drawn: a bolt for each arc while it shows.
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().lightningArcs ?? 0), { timeout: 5_000 }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
