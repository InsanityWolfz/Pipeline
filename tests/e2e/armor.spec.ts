import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// Armor (010, gear since 036): the first Husk drops a piece; identify it at the bench, wear it,
// and the next Husk swipe lands for less (or the same, for a trinket with no armor).

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
    // Into the foundry and over to the bench (052: tile 22,9, by the door), standing on its left.
    // The rest of the field pack guards the stairs (017): duck straight down them, where Husks don't follow.
    h.toFoundry();
    h.walkTo(21.7 * 32, 9.5 * 32);
    s = g.step(1, { identify: true });
    const piece = s.gear[0];
    if (!piece) return { carried, failed: `nothing identified (carried ${carried}, now ${s.inventory['unidentified-armor'] ?? 0})` };
    s = g.step(1, { equip: { id: piece.id } });
    const equipped = s.equipped[piece.slot];
    const armor = s.stats.armor;
    // Back outside and into a Husk's reach until it lands a swipe.
    h.toHall();
    s = g.getState();
    let damage = 0;
    // 053: the foundry's ruin stands between the stairs and the ruin field's pack: round it by path first.
    const nearest = s.enemies.filter((e) => e.room === s.room).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    if (nearest) h.walkTo(nearest.x + 64, nearest.y);
    s = g.getState();
    for (let t = 0; t < 3000 && damage === 0; t++) {
      const p = s.player;
      const husk = s.enemies.filter((e) => e.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!husk) break;
      const far = Math.hypot(husk.x - p.x, husk.y - p.y) > 24;
      const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
      s = g.step(1, { moveX: far ? toward(p.x, husk.x) : 0, moveY: far ? toward(p.y, husk.y) : 0 });
      for (const hit of s.events.hits) if (hit.target === 'player') damage = hit.damage;
    }
    return { carried, armor, equipped: equipped === piece.id, damage, failed: '' };
  });
  expect(result.failed).toBe('');
  expect(result.carried).toBe(1);
  expect(result.equipped).toBe(true);
  // 036: armor takes its total off, but a hit always deals at least a quarter of its damage.
  expect(result.damage).toBe(Math.max(Math.ceil(20 * 0.25), 20 - (result.armor ?? 0)));
  expect(errors).toEqual([]);
});
