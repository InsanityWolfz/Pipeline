import { expect, test, type Page } from '@playwright/test';
import { ENEMY_FAMILIES, type FamilyId } from '../../src/data/art/enemyFamilies';
import { enemyDef } from '../../src/data/enemies';
import { stripsOf } from '../../src/render/enemyMotion';
import { boot, cameraSettled } from './helpers';
import { bannersGone, frames, openWorld, setLook, spawnPack, toRegion, type Region } from './lightingPage';

// Review screenshots for 076 (REVIEW_SHOTS=1, into docs/review/076): the contact sheet per family; each family's pack
// in its own region's mood on Medium; every enemy's gather, coil and peak at game size and at 4×; a flinch and a
// stagger; a dissolve mid-way per family; the motes on Low, Medium and High.

const SHOTS = 'docs/review/076';
const REGION: Record<FamilyId, Region> = { ruin: 'region1', quarry: 'hollows', forge: 'emberworks', storm: 'stormcrown' };

/** Shows only the contact sheet's sections whose title includes `filter`, canvases drawn at `k` of their 4×. */
async function sheetOnly(page: Page, filter: string, k: number, strips = false): Promise<void> {
  await page.evaluate(
    ([f, scale, onlyStrips]) => {
      const kids = [...(document.getElementById('sheet')?.children ?? [])];
      for (let i = 0; i + 1 < kids.length; i += 2) {
        const keep = (kids[i]?.textContent ?? '').includes(f);
        for (const el of [kids[i], kids[i + 1]]) if (el instanceof HTMLElement) el.style.display = keep ? '' : 'none';
        for (const fig of kids[i + 1]?.querySelectorAll('figure') ?? []) {
          const label = fig.querySelector('figcaption')?.textContent ?? '';
          if (fig instanceof HTMLElement) fig.style.display = !onlyStrips || /\((gather|coil|peak)\)$/.test(label) ? '' : 'none';
        }
      }
      for (const c of document.querySelectorAll('canvas')) c.style.width = `${c.width * scale}px`;
    },
    [filter, k, strips] as const,
  );
}

/** Steps an enemy into one of its wind-ups until `modeTicks` reaches `at` of it (the player kept up). */
async function windupAt(page: Page, id: number, at: number): Promise<boolean> {
  return page.evaluate(
    ([eid, k]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 900; t++) {
        const e = g.getState().enemies.find((x) => x.id === eid);
        if (!e) return false;
        const art = g.ui().enemyArt.find((a) => a.id === eid);
        if (art?.phase && e.modeTicks >= k && /windup/.test(e.mode)) return true;
        g.step(1);
        g.setPlayerHealth(100);
      }
      return false;
    },
    [id, at] as const,
  );
}

test.describe('review screenshots (076)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/076');

  test('the contact sheet per family, and every wind-up strip at 4×', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.goto('/sheet.html');
    await page.waitForSelector('h2');
    for (const [i, f] of ENEMY_FAMILIES.entries()) {
      await sheetOnly(page, f.name, 0.5);
      await page.screenshot({ path: `${SHOTS}/01-sheet-${i + 1}-${f.id}.png`, fullPage: true });
      await sheetOnly(page, f.name, 1, true);
      await page.screenshot({ path: `${SHOTS}/03-windups-4x-${i + 1}-${f.id}.png`, fullPage: true });
    }
  });

  test("each family's pack in its own region's mood on Medium, winding up", async ({ page }) => {
    test.setTimeout(400_000);
    await openWorld(page);
    for (const [i, f] of ENEMY_FAMILIES.entries()) {
      await toRegion(page, REGION[f.id]);
      await setLook(page, { quality: 'medium' });
      const pack = f.members.filter((m) => !enemyDef(m).boss);
      const ids = await spawnPack(page, pack, 90);
      await windupAt(page, ids[0] ?? -1, 12);
      await frames(page, 4);
      await page.screenshot({ path: `${SHOTS}/02-pack-${i + 1}-${REGION[f.id]}.png` });
      await page.evaluate((list) => {
        const g = window.__GAME__;
        for (const id of list) g?.setEnemyHealth(id, 0);
        g?.step(1);
      }, ids);
      // 04: a dissolve mid-way: slowed on the tween clock, caught with two of its three waves out.
      await page.evaluate(() => window.__GAME__?.tweenSpeed(0.08));
      await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.deathMotes ?? 0), { timeout: 30_000 }).toBeGreaterThan(pack.length * 6);
      await page.screenshot({ path: `${SHOTS}/04-dissolve-${i + 1}-${f.id}.png` });
      await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
      await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.dissolving ?? 1), { timeout: 30_000 }).toBe(0);
    }
  });

  test("every enemy's gather, coil and peak at game size and at 4×", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 4 });
    const page = await ctx.newPage();
    await boot(page, '?sandbox');
    await cameraSettled(page, 20_000);
    const cells: { id: string; phase: string; css: string; dev: string }[] = [];
    for (const f of ENEMY_FAMILIES) {
      for (const enemyId of f.members) {
        const def = enemyDef(enemyId);
        const ticks = stripsOf(def)[0]?.ticks ?? 30;
        for (const [phase, at] of [['gather', 2], ['coil', Math.round(ticks * 0.5)], ['peak', ticks - 2]] as const) {
          await page.evaluate(() => {
            const g = window.__GAME__;
            for (const e of g?.getState().enemies ?? []) g?.setEnemyHealth(e.id, 0);
            g?.step(1);
          });
          await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.dissolving ?? 1), { timeout: 30_000 }).toBe(0);
          const [id] = await spawnPack(page, [enemyId], def.boss ? 70 : 50);
          if (!(await windupAt(page, id ?? -1, at))) continue;
          await frames(page, 2);
          const clip = { x: 320 + (def.boss ? 70 : 50) - 50, y: 180 - 95, width: 100, height: 120 };
          const css = (await page.screenshot({ clip, scale: 'css' })).toString('base64');
          const dev = (await page.screenshot({ clip })).toString('base64');
          cells.push({ id: enemyId, phase, css, dev });
        }
      }
    }
    // One sheet at game size, one at 4×: a row per enemy, its gather, coil and peak.
    for (const [name, key, w] of [['05-windups-1x', 'css', 100], ['06-windups-4x', 'dev', 400]] as const) {
      const rows = [...new Set(cells.map((c) => c.id))]
        .map((id) => `<div style="display:flex;gap:4px;align-items:center"><span style="width:110px;font:12px sans-serif">${id}</span>${cells.filter((c) => c.id === id).map((c) => `<figure style="margin:0"><img src="data:image/png;base64,${c[key]}" width="${w}"><figcaption style="font:10px sans-serif">${c.phase}</figcaption></figure>`).join('')}</div>`)
        .join('');
      const out = await ctx.newPage();
      await out.setContent(`<body style="margin:8px;background:#5cc850">${rows}</body>`);
      await out.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, scale: 'css' });
      await out.close();
    }
    await ctx.close();
  });

  test('a flinch and a stagger on a Husk, and the motes on Low, Medium and High', async ({ page }) => {
    test.setTimeout(300_000);
    await boot(page, '?start=tutorial');
    await page.evaluate(() => {
      const g = window.__GAME__;
      for (const e of g?.getState().enemies ?? []) g?.setEnemyHealth(e.id, 0);
      g?.step(120);
    });
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    const [id] = await spawnPack(page, ['husk'], 18);
    // Slowed on the tween clock, the punch's stagger reels long enough to catch.
    const hit = await page.evaluate((eid) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 400; t++) {
        const e = g.getState().enemies.find((x) => x.id === eid);
        if (!e) return false;
        const p = g.getState().player;
        if (e.mode === 'recover' && Math.hypot(e.x - p.x, e.y - p.y) < 22) {
          g.tweenSpeed(0.1);
          return g.step(1, { fire: true, aimX: e.x, aimY: e.y }).events.melees.length > 0;
        }
        g.step(1, e.mode === 'recover' ? { moveX: Math.sign(e.x - p.x) as -1 | 0 | 1, moveY: Math.sign(e.y - p.y) as -1 | 0 | 1 } : {});
        g.setPlayerHealth(100);
      }
      return false;
    }, id ?? -1);
    expect(hit).toBe(true);
    await expect.poll(() => page.evaluate((eid) => window.__GAME__?.ui().enemyArt.find((a) => a.id === eid)?.reaction ?? null, id)).toBe('stagger');
    await page.screenshot({ path: `${SHOTS}/07-stagger.png`, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    // The flinch: one arrow on a Husk in the field, its hit pose under the (dim, Flashes off) hit flash.
    await boot(page, '?start=field');
    await page.evaluate(() => {
      const g = window.__GAME__;
      g?.setLook({ flashes: false });
      for (const e of g?.getState().enemies ?? []) g?.setEnemyHealth(e.id, 0);
      g?.step(120);
    });
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    const [husk] = await spawnPack(page, ['husk'], 90);
    const flinched = await page.evaluate((eid) => {
      const g = window.__GAME__;
      for (let t = 0; t < 120; t++) {
        const e = g?.getState().enemies.find((x) => x.id === eid);
        if (!g || !e) return false;
        if (g.step(1, { use: true, aimX: e.x, aimY: e.y - 10 }).events.hits.some((h) => h.target === 'enemy' && h.id === eid)) return true;
      }
      return false;
    }, husk ?? -1);
    expect(flinched).toBe(true);
    await expect.poll(() => page.evaluate((eid) => window.__GAME__?.ui().enemyArt.find((a) => a.id === eid)?.reaction ?? null, husk)).toBe('flinch');
    await page.screenshot({ path: `${SHOTS}/08-flinch-flashes-off.png` });
    await page.evaluate(() => window.__GAME__?.setLook({ flashes: true }));
    // The motes on each tier: four Hollows enemies at once, caught with their waves out.
    for (const q of ['low', 'medium', 'high'] as const) {
      await boot(page, '?sandbox');
      await page.evaluate((tier) => {
        const g = window.__GAME__;
        g?.setLook({ quality: tier });
        for (const e of g?.getState().enemies ?? []) g?.setEnemyHealth(e.id, 0);
        g?.step(60);
      }, q);
      await cameraSettled(page, 20_000);
      await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.dissolving ?? 1), { timeout: 60_000 }).toBe(0);
      const ids = await spawnPack(page, ['charger', 'shardback', 'sniper', 'charger'], 60);
      await page.evaluate((list) => {
        const g = window.__GAME__;
        for (const eid of list) g?.setEnemyHealth(eid, 0);
        g?.step(1);
        g?.tweenSpeed(0.08);
      }, ids);
      await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().particles.deathMotes ?? 0), { timeout: 30_000 }).toBeGreaterThan(q === 'low' ? 18 : 40);
      await page.screenshot({ path: `${SHOTS}/09-motes-${q}.png` });
      await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    }
  });
});
