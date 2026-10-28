import { expect, test, type Page } from '@playwright/test';
import { ENEMY_FAMILIES } from '../../src/data/art/enemyFamilies';
import { DEATH_MOTES, PARTICLE_BUDGET } from '../../src/data/juice';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import type { Quality } from '../../src/data/settings';
import { VIEW_WIDTH } from '../../src/data/config';
import { boot, cameraSettled, watchErrors } from './helpers';
import { dissolveMs } from '../../src/render/deathMotes';

// 076: deaths dissolve into ley motes in the family's colours: the struck pose, then the dissolve, gone in about
// 600 ms (bosses 1.4 s), the corpse no longer lingering; the motes stay within each tier's caps and the particle
// budget, Low throwing half of Medium's; the cinder mote's own burst still plays.

/**
 * The sandbox (044) with the camera at rest, at a Graphics quality. Its own pack (and the golem's whelps) is cleared
 * on Low, so its twenty-odd deaths throw the fewest motes, and has dissolved away before the quality under test is set
 * and anything is measured.
 */
async function sandbox(page: Page, quality: Quality = 'medium'): Promise<void> {
  await boot(page, '?sandbox');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setLook({ quality: 'low' });
    for (let k = 0; k < 3; k++) {
      for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
      g.step(30);
    }
  });
  await cameraSettled(page, 20_000);
  await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().particles.dissolving ?? 1) + (window.__GAME__?.ui().particles.deathMotes ?? 1)), { timeout: 120_000 }).toBe(0);
  await page.evaluate((q) => window.__GAME__?.setLook({ quality: q }), quality);
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
  // The dissolve runs on the tween clock, so its length is read on that clock (`dissolveDoneMs`): real time on a loaded
  // runner both stretches it and, with Phaser's smoothed delta, can run behind it (fix-e2e-wallclock: CI read 308 and
  // 324 ms of real time for a 600 ms dissolve). Its last frame may run past the end by a frame's delta (under 250 ms even on a loaded runner).
  const doneMs = () => page.evaluate(() => window.__GAME__?.ui().particles.dissolveDoneMs ?? -1);
  const husk = await watch(page, 4000, true);
  expect(husk.dissolving).toBe(1);
  expect(husk.endedAt).toBeGreaterThan(0);
  expect(await doneMs()).toBeGreaterThanOrEqual(dissolveMs(false));
  expect(await doneMs()).toBeLessThan(dissolveMs(false) + 250);
  await spawnAndKill(page, ['pylon-warden'], [[80, 0]]);
  const warden = await watch(page, 6000, true);
  expect(warden.endedAt).toBeGreaterThan(0);
  expect(await doneMs()).toBeGreaterThanOrEqual(dissolveMs(true));
  expect(await doneMs()).toBeLessThan(dissolveMs(true) + 250);
  expect(await page.evaluate(() => window.__GAME__?.ui().particles.dissolving)).toBe(0);
  expect(errors).toEqual([]);
});

test.setTimeout(240_000);

test('Low throws half the motes of Medium, High half again', async ({ page }) => {
  const thrown: Record<string, number> = {};
  for (const q of ['low', 'medium', 'high'] as const) {
    await sandbox(page, q);
    // At full speed: slowed on the tween clock, the sandbox's other particles (spawned in real time, aged on the tween
    // clock) pile up toward the budget and thin the last wave.
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

/** Keeps the box 50 world px round the death spot (70 px right of the player, 25 up), as drawn now, under `slot`. */
async function grab(page: Page, slot: 'ground' | 'struck' | 'motes'): Promise<void> {
  await page.evaluate(
    async ([name, view]) => {
      const canvas = document.querySelector('canvas');
      const g = window.__GAME__;
      if (!canvas || !g) throw new Error('no canvas');
      // In backbuffer px from the camera's centre.
      const ui = g.ui();
      const p = g.getState().player;
      const k = (canvas.width / view) * ui.camera.zoom;
      const cx = canvas.width / 2 + (p.x + 70 - ui.camera.x) * k;
      const cy = canvas.height / 2 + (p.y - 25 - ui.camera.y) * k;
      const half = 50 * k;
      // Taken in a frame callback, after the game has drawn that frame and before the buffer is handed on.
      const img = await new Promise<ImageBitmap>((resolve, reject) => {
        requestAnimationFrame(() => {
          createImageBitmap(canvas, Math.round(cx - half), Math.round(cy - half), Math.round(half * 2), Math.round(half * 2)).then(resolve, reject);
        });
      });
      const c = new OffscreenCanvas(img.width, img.height);
      const x = c.getContext('2d');
      if (!x) throw new Error('no 2d');
      x.drawImage(img, 0, 0);
      const w = window as unknown as { __deathBox?: Record<string, { w: number; data: Uint8ClampedArray }> };
      w.__deathBox = { ...(w.__deathBox ?? {}), [name]: { w: img.width, data: x.getImageData(0, 0, img.width, img.height).data } };
    },
    [slot, VIEW_WIDTH] as const,
  );
}

/**
 * Pixels of each family's mote colours in the `motes` grab, the body masked out: wherever the struck body (or its drop)
 * already showed one of the families' colours, and 2 px round it, doesn't count, nor a colour the ground had. So the
 * comparison measures motes only, from the pixels drawn, not from what the code says it threw.
 */
async function moteCounts(page: Page): Promise<number[]> {
  return page.evaluate((families) => {
    const w = window as unknown as { __deathBox?: Record<string, { w: number; data: Uint8ClampedArray }> };
    const ground = w.__deathBox?.ground;
    const struck = w.__deathBox?.struck;
    const motes = w.__deathBox?.motes;
    if (!ground || !struck || !motes) throw new Error('no grabs');
    const W = motes.w;
    const H = motes.data.length / 4 / W;
    const all = families.flat();
    const near = (d: Uint8ClampedArray, i: number, cols: readonly (readonly [number, number, number])[]): boolean =>
      cols.some(([r, g, b]) => Math.abs((d[i] ?? 0) - r) < 14 && Math.abs((d[i + 1] ?? 0) - g) < 14 && Math.abs((d[i + 2] ?? 0) - b) < 14);
    // The body's (and its drop's) pixels in any family's mote colours: a husk's straw, a drop's gold.
    const body = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      let changed = false;
      for (let ch = 0; ch < 3; ch++) if (Math.abs((struck.data[i * 4 + ch] ?? 0) - (ground.data[i * 4 + ch] ?? 0)) > 24) changed = true;
      if (changed && near(struck.data, i * 4, all)) body[i] = 1;
    }
    const masked = (x: number, y: number): boolean => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (body[Math.min(H - 1, Math.max(0, y + dy)) * W + Math.min(W - 1, Math.max(0, x + dx))]) return true;
      return false;
    };
    return families.map((cols) => {
      let n = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const d = motes.data;
          if (!near(d, i, cols)) continue;
          // A colour already there on the ground isn't a mote's either.
          const gd = ground.data;
          if (Math.abs((gd[i] ?? 0) - (d[i] ?? 0)) < 8 && Math.abs((gd[i + 1] ?? 0) - (d[i + 1] ?? 0)) < 8 && Math.abs((gd[i + 2] ?? 0) - (d[i + 2] ?? 0)) < 8) continue;
          if (!masked(x, y)) n += 1;
        }
      }
      return n;
    });
  }, ENEMY_FAMILIES.map((f) => f.motes.map((m) => hexToRgb(paletteHex(m)))));
}

test("the motes rise in each family's colours", async ({ page }) => {
  // On Low the motes are drawn plain (no additive blend), so their pixels are their palette colours.
  const one = { ruin: 'husk', quarry: 'charger', forge: 'bellows-hound', storm: 'storm-sentinel' } as const;
  for (const fam of ENEMY_FAMILIES) {
    await sandbox(page, 'low');
    await grab(page, 'ground');
    // Held on the tween clock at its struck pose (and its drop): the body to mask out, before any mote is thrown.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await spawnAndKill(page, [one[fam.id]], [[70, -10]]);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.dissolving ?? 0)).toBe(1);
    await grab(page, 'struck');
    // Then slowed, until two waves are out (a runner drawing a few frames a second takes a while).
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.15));
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.deathMotes ?? 0), { timeout: 60_000 }).toBeGreaterThan(4);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await grab(page, 'motes');
    const counts = await moteCounts(page);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    const own = counts[ENEMY_FAMILIES.indexOf(fam)] ?? 0;
    expect(own, `${fam.id} ${JSON.stringify(counts)}`).toBeGreaterThan(8);
    // Its own colours outnumber any other family's (the ruins' and the quarry's share cyan-glow, so a ruin death
    // is told from a forge or storm one, and the quarry's vein from the forge's gold).
    for (const [i, other] of ENEMY_FAMILIES.entries()) if (other.id !== fam.id && !(fam.motes as readonly string[]).some((m) => (other.motes as readonly string[]).includes(m))) expect(counts[i] ?? 0, `${fam.id} vs ${other.id} ${JSON.stringify(counts)}`).toBeLessThan(own);
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
