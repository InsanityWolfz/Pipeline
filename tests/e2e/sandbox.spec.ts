import { expect, test } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/data/save';
import { TILE_SIZE } from '../../src/data/config';
import { SANDBOX } from '../../src/data/sandbox';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { ROUND_CHOICES } from '../../src/render/sandboxRows';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { clickView, flowIs } from './flowPage';
import { watchErrors } from './helpers';
import { bootSandbox, clickPanel, openPanel, setRound, spawnPack } from './sandboxPage';

// 044: `?sandbox` boots straight into the sandbox's room in play; its panel sets a mixed
// loadout that fires, spawns a ring 3 champion pack, and turns god mode on; a real save in
// storage is untouched, and Settings shows no save rows.

const SPAWN_AT = { x: (SANDBOX.spawn.tx + 0.5) * TILE_SIZE, y: (SANDBOX.spawn.ty + 0.5) * TILE_SIZE };

test('boots ?sandbox into its room, and a mixed loadout fires from the panel', async ({ page }) => {
  // 064: 44 panel clicks now that the round list holds the lightning rounds (57 choices; 062: 39 of 43), about 1.1 s a
  // click. Measured with another build's tests running beside it: 66–96 s here, against 47 s on 062's head.
  // 066: the storm rounds take it to 85 choices and 64 clicks (was 44). Measured alone, one Playwright process: 58 s on
  // the commit before (a2bc6de) and 90 s here. Scaling 064's loaded 96 s by that measured time (96 × 90 / 58), not by
  // the clicks, gives about 149 s under load; 220 s leaves room above it.
  test.setTimeout(220_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  const s = await page.evaluate(() => window.__GAME__?.getState());
  expect(s?.room).toBe('sandbox');
  expect(s?.loadout).toEqual([...SANDBOX.loadout]);
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('play');
  expect(await page.evaluate(() => window.__GAME__?.ui().flow.title)).toBeNull();
  await openPanel(page);
  await setRound(page, 0, 'arrow+frost');
  await setRound(page, 1, 'ley-bolt+frost+homing');
  await setRound(page, 2, 'bomb+cluster');
  const fired = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    const seen = new Set<string>();
    let bombs = 0;
    for (let t = 0; t < 120; t++) {
      const st = g.step(1, { fire: true, aimX: p.x + 160, aimY: p.y + 60 });
      for (const a of st.arrows) seen.add(a.ammoId);
      bombs = Math.max(bombs, st.bombs.filter((b) => b.keywords.includes('cluster')).length);
    }
    return { seen: [...seen].sort(), bombs, loadout: g.getState().loadout };
  });
  expect(fired.seen).toEqual(expect.arrayContaining(['arrow+frost', 'ley-bolt+frost+homing']));
  expect(fired.bombs).toBeGreaterThan(0);
  // 060: the fourth entrance keeps its plain arrows (064: and the fifth).
  expect(fired.loadout).toEqual(['arrow+frost', 'ley-bolt+frost+homing', 'bomb+cluster', 'arrow', 'arrow']);
  expect(errors).toEqual([]);
});

test("an entrance's − steps its round backwards, wrapping past Empty", async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  await openPanel(page);
  const roundOf = () => page.evaluate(() => window.__GAME__?.getState().loadout?.[0] ?? null);
  const start = await roundOf();
  const at = ROUND_CHOICES.indexOf(start);
  // Back to Empty, then once more round to the last choice.
  for (let i = at - 1; i >= -1; i--) {
    await clickPanel(page, 'entrance-0', 'down');
    const want = ROUND_CHOICES[(i + ROUND_CHOICES.length) % ROUND_CHOICES.length] ?? null;
    await expect.poll(roundOf).toBe(want);
  }
  await clickPanel(page, 'entrance-0', 'up');
  await expect.poll(roundOf).toBeNull();
});

test('spawns a ring 3 champion pack from the panel, and Clear removes it', async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  await openPanel(page);
  await spawnPack(page, 'charger', 3, true, 5);
  await expect.poll(() => page.evaluate((group) => window.__GAME__?.getState().enemies.filter((e) => e.group === group).length, SPAWN_GROUP)).toBe(5);
  const pack = await page.evaluate((group) => window.__GAME__?.getState().enemies.filter((e) => e.group === group) ?? [], SPAWN_GROUP);
  for (const e of pack) {
    expect(e.enemyId).toBe('charger');
    expect(e.ring).toBe(3);
    expect(e.champion).not.toBeNull();
  }
  await clickPanel(page, 'clear');
  await expect.poll(() => page.evaluate((group) => window.__GAME__?.getState().enemies.filter((e) => e.group === group).length, SPAWN_GROUP)).toBe(0);
});

test('god mode on: a Husk hit lands but takes no health', async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  await openPanel(page);
  await clickPanel(page, 'god');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState().god)).toBe(true);
  const hit = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    g.spawnEnemy('husk', p.x + 24, p.y);
    for (let t = 0; t < 600; t++) {
      const st = g.step(1);
      if (st.player.hitInvulnerable) return { health: st.player.health, max: st.player.maxHealth };
    }
    return null;
  });
  expect(hit).not.toBeNull();
  expect(hit?.health).toBe(hit?.max);
});

test('a real save in storage is untouched, and Settings shows no save rows', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript((keys) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(keys.save, 'REAL-SAVE');
    localStorage.setItem(keys.backup, 'REAL-BACKUP');
  }, STORAGE_KEYS);
  await bootSandbox(page);
  const woke = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Away from the spawn, then a KO and a wake, with god mode off.
    g.step(30, { moveX: 1 });
    g.setPlayerHealth(0);
    for (let t = 0; t < 300; t++) {
      const st = g.step(1, { fire: true });
      if (st.player.dying === 0 && st.player.health === st.player.maxHealth) return st;
    }
    return null;
  });
  expect(woke?.room).toBe('sandbox');
  expect({ x: woke?.player.x, y: woke?.player.y }).toEqual(SPAWN_AT);
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  const settings = pauseRows()[1];
  if (!settings) throw new Error('no settings row');
  await clickView(page, settings.x + 40, settings.y + 10);
  await flowIs(page, 'settings');
  const ids = (await page.evaluate(() => window.__GAME__?.ui().flow.settings?.rows.map((r) => r.id))) ?? [];
  expect(ids).not.toContain('export');
  expect(ids).not.toContain('import');
  expect(ids).toContain('keys');
  const stored = await page.evaluate((keys) => [localStorage.getItem(keys.save), localStorage.getItem(keys.backup)], STORAGE_KEYS);
  expect(stored).toEqual(['REAL-SAVE', 'REAL-BACKUP']);
  expect(await page.evaluate(() => window.__GAME__?.flow())).toMatchObject({ saves: 0, hasSave: false });
});
