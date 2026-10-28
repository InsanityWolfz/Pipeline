import { expect, test, type Page } from '@playwright/test';
import { ENEMY_FAMILIES } from '../../src/data/art/enemyFamilies';
import { DEATH_MOTES, PARTICLE_BUDGET } from '../../src/data/juice';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import type { Quality } from '../../src/data/settings';
import { VIEW_WIDTH } from '../../src/data/config';
import { boot, cameraSettled, watchErrors } from './helpers';

// 076: deaths dissolve into ley motes in the family's colours: the struck pose, then the dissolve, gone in about
// 600 ms (bosses 1.4 s), the corpse no longer lingering; the motes stay within each tier's caps and the particle
// budget, Low throwing half of Medium's; the cinder mote's own burst still plays.

/** The sandbox (044) with the camera at rest, at a Graphics quality. */
async function sandbox(page: Page, quality: Quality = 'medium'): Promise<void> {
  await boot(page, '?sandbox');
  await page.evaluate((q) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setLook({ quality: q });
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    g.step(60);
  }, quality);
  await cameraSettled(page, 20_000);
  // The sandbox's own pack, cleared above, has dissolved away before anything is measured.
  await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().particles.dissolving ?? 1) + (window.__GAME__?.ui().particles.deathMotes ?? 1)), { timeout: 60_000 }).toBe(0);
}

/** Spawns enemies round the player (dx, dy px each) and kills them all in one tick; returns their ids. */
async function spawnAndKill(page: Page, ids: readonly string[], spots: readonly (readonly [number, number])[]): Promise<number[]> {
  return page.evaluate(
    ([enemyIds, at]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const made: number[] = [];
      enemyIds.forEach((id, i) => {
        const [dx, dy] = at[i % at.length] ?? [40, 0];
        const s = g.spawnEnemy(id, p.x + dx, p.y + dy);
        made.push(s.enemies[s.enemies.length - 1]?.id ?? -1);
      });
      for (const id of made) g.setEnemyHealth(id, 0);
      g.step(1);
      return made;
    },
    [ids, spots] as const,
  );
}

/**
 * Watches the particles every frame for `ms` of real time (or, `untilDone`, until the dissolves have run out: High on a
 * loaded runner can draw a frame a second): the most death motes, live particles and dissolves seen, and how long the
 * dissolves ran (from the first frame showing one).
 */
async function watch(page: Page, ms: number, untilDone = false) {
  return page.evaluate(async ([limit, done]) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const start = performance.now();
    let motes = 0;
    let live = 0;
    let dissolving = 0;
    let endedAt = -1;
    let startedAt = -1;
    while (performance.now() - start < limit) {
      await new Promise((r) => requestAnimationFrame(r));
      const p = g.ui().particles;
      if (p.dissolving > 0 && startedAt < 0) startedAt = performance.now() - start;
      motes = Math.max(motes, p.deathMotes);
      live = Math.max(live, p.live);
      dissolving = Math.max(dissolving, p.dissolving);
      if (dissolving > 0 && p.dissolving === 0 && endedAt < 0) endedAt = performance.now() - start - startedAt;
      if (done && endedAt >= 0) break;
    }
    return { motes, live, dissolving, endedAt };
  }, [ms, untilDone] as const);
}

test('a death dissolves in about 600 ms (a boss in 1.4 s), and nothing lingers', async ({ page }) => {
  const errors = watchErrors(page);
  await sandbox(page);
  await spawnAndKill(page, ['husk'], [[60, 0]]);
  // Real time, about the dissolve's: it runs on the frame clock, which a loaded runner stretches and Phaser's smoothed
  // delta can run a little ahead of.
  const husk = await watch(page, 2500);
  expect(husk.dissolving).toBe(1);
  expect(husk.endedAt).toBeGreaterThan(350);
  expect(husk.endedAt).toBeLessThan(1600);
  await spawnAndKill(page, ['pylon-warden'], [[80, 0]]);
  const warden = await watch(page, 3500);
  expect(warden.endedAt).toBeGreaterThan(1000);
  expect(warden.endedAt).toBeLessThan(2800);
  expect(await page.evaluate(() => window.__GAME__?.ui().particles.dissolving)).toBe(0);
  expect(errors).toEqual([]);
});

test.setTimeout(240_000);

test('Low throws half the motes of Medium, High half again', async ({ page }) => {
  const thrown: Record<string, number> = {};
  for (const q of ['low', 'medium', 'high'] as const) {
    await sandbox(page, q);
    // Slowed on the tween clock, so the death's waves are thrown over several seconds of real time and each frame's
    // jump stays short, however slowly a loaded runner draws High.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.1));
    const before = await page.evaluate(() => window.__GAME__?.ui().particles.thrown ?? 0);
    await spawnAndKill(page, ['husk'], [[60, 0]]);
    await watch(page, 60_000, true);
    // Counted as thrown, not as flying at once: a runner that stalls can let the first wave expire before the last.
    thrown[q] = (await page.evaluate(() => window.__GAME__?.ui().particles.thrown ?? 0)) - before;
  }
  expect(thrown).toEqual({ low: DEATH_MOTES.count.medium / 2, medium: DEATH_MOTES.count.medium, high: DEATH_MOTES.count.medium * 1.5 });
});

test('ten Hollows enemies killed at once never pass a tier’s death-mote cap or particle budget', async ({ page }) => {
  const ring = Array.from({ length: 10 }, (_, i) => [Math.round(Math.cos((i / 10) * Math.PI * 2) * 90), Math.round(Math.sin((i / 10) * Math.PI * 2) * 60)] as const);
  const kinds = ['charger', 'shardback', 'sniper', 'burrower', 'charger', 'shardback', 'sniper', 'charger', 'shardback', 'sniper'];
  for (const q of ['low', 'medium', 'high'] as const) {
    await sandbox(page, q);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.1));
    await spawnAndKill(page, kinds, ring);
    const seen = await watch(page, 60_000, true);
    expect(seen.dissolving, q).toBe(10);
    expect(seen.motes, q).toBeGreaterThan(0);
    expect(seen.motes, q).toBeLessThanOrEqual(DEATH_MOTES.liveCap[q]);
    expect(seen.live, q).toBeLessThanOrEqual(PARTICLE_BUDGET[q]);
  }
});

test("the motes rise in each family's colours", async ({ page }) => {
  // On Low the motes are drawn plain (no additive blend), so their pixels are their palette colours.
  const one = { ruin: 'husk', quarry: 'charger', forge: 'bellows-hound', storm: 'storm-sentinel' } as const;
  for (const fam of ENEMY_FAMILIES) {
    await sandbox(page, 'low');
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.15));
    await spawnAndKill(page, [one[fam.id]], [[70, -10]]);
    // Wait until two waves are out, then count pixels of each family's mote colours round the death.
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.deathMotes ?? 0), { timeout: 10_000 }).toBeGreaterThan(4);
    const counts = await page.evaluate(
      async ([families, view]) => {
        const canvas = document.querySelector('canvas');
        const g = window.__GAME__;
        if (!canvas || !g) throw new Error('no canvas');
        await new Promise((r) => requestAnimationFrame(r));
        // A box 50 world px round the body, in backbuffer px from the camera's centre.
        const ui = g.ui();
        const p = g.getState().player;
        const k = (canvas.width / view) * ui.camera.zoom;
        const cx = canvas.width / 2 + (p.x + 70 - ui.camera.x) * k;
        const cy = canvas.height / 2 + (p.y - 25 - ui.camera.y) * k;
        const half = 50 * k;
        const img = await createImageBitmap(canvas, Math.round(cx - half), Math.round(cy - half), Math.round(half * 2), Math.round(half * 2));
        const c = new OffscreenCanvas(img.width, img.height);
        const x = c.getContext('2d');
        if (!x) throw new Error('no 2d');
        x.drawImage(img, 0, 0);
        const data = x.getImageData(0, 0, img.width, img.height).data;
        return families.map((cols) => {
          let n = 0;
          for (let i = 0; i < data.length; i += 4) {
            for (const [r, g, b] of cols) if (Math.abs((data[i] ?? 0) - r) < 14 && Math.abs((data[i + 1] ?? 0) - g) < 14 && Math.abs((data[i + 2] ?? 0) - b) < 14) n += 1;
          }
          return n;
        });
      },
      [ENEMY_FAMILIES.map((f) => f.motes.map((m) => hexToRgb(paletteHex(m)))), VIEW_WIDTH] as const,
    );
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    const own = counts[ENEMY_FAMILIES.indexOf(fam)] ?? 0;
    expect(own, fam.id).toBeGreaterThan(8);
    // Its own colours outnumber any other family's (the ruins' and the quarry's share cyan-glow, so a ruin death
    // is told from a forge or storm one, and the quarry's vein from the forge's gold).
    for (const [i, other] of ENEMY_FAMILIES.entries()) if (other.id !== fam.id && !(fam.motes as readonly string[]).some((m) => (other.motes as readonly string[]).includes(m))) expect(counts[i] ?? 0, `${fam.id} vs ${other.id}`).toBeLessThan(own);
  }
});

test("the cinder mote's own burst still plays with its dissolve", async ({ page }) => {
  await sandbox(page);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.25));
  await spawnAndKill(page, ['cinder-mote'], [[70, 0]]);
  expect(await page.evaluate(() => window.__GAME__?.getState().events.deathBursts.length ?? 0)).toBe(1);
  const seen = await watch(page, 1500);
  // Its embers and fire fly besides its motes.
  expect(seen.live).toBeGreaterThan(seen.motes);
  expect(seen.dissolving).toBe(1);
});
