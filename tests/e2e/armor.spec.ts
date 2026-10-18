import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// Armor (010): the first Husk drops a bundle; identify it at the bench, wear it,
// and the next Husk swipe lands for less.

test('the first Husk drops armor, the bench identifies it, and wearing it softens a hit', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    h.killHusk();
    let s = g.getState();
    const carried = s.inventory['unidentified-armor'] ?? 0;
    // Into the foundry and over to the bench (tile 1,12), standing on its right.
    // The rest of the field pack guards the stairs (017): duck straight down them, where Husks don't follow.
    h.toFoundry();
    h.walkTo(2.3 * 32, 12.5 * 32);
    s = g.step(1, { identify: true });
    const piece = s.armorPieces[0];
    if (!piece) return { carried, failed: `nothing identified (carried ${carried}, now ${s.inventory['unidentified-armor'] ?? 0})` };
    s = g.step(1, { equip: { id: piece.id } });
    const equipped = s.equippedArmor;
    // Back outside and into a Husk's reach until it lands a swipe.
    h.toHall();
    s = g.getState();
    let damage = 0;
    for (let t = 0; t < 3000 && damage === 0; t++) {
      const p = s.player;
      const husk = s.enemies.filter((e) => e.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!husk) break;
      const far = Math.hypot(husk.x - p.x, husk.y - p.y) > 24;
      const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
      s = g.step(1, { moveX: far ? toward(p.x, husk.x) : 0, moveY: far ? toward(p.y, husk.y) : 0 });
      for (const hit of s.events.hits) if (hit.target === 'player') damage = hit.damage;
    }
    return { carried, piece: piece.armor, equipped: equipped === piece.id, damage, failed: '' };
  });
  expect(result.failed).toBe('');
  expect(result.carried).toBe(1);
  expect(result.equipped).toBe(true);
  expect(result.damage).toBe(20 - (result.piece ?? 0));
  expect(errors).toEqual([]);
});
