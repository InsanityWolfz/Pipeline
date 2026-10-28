import { expect, test } from '@playwright/test';
import { animFrames, ENEMY_ANIMS } from '../../src/data/assets';
import { ENEMY_FAMILIES } from '../../src/data/art/enemyFamilies';
import { ENEMIES } from '../../src/data/enemies';
import { boot, cameraSettled, watchErrors } from './helpers';

// 076: the contact sheet shows every enemy frame under its family, the strips' frames labelled with their phase, with
// no console errors; and every enemy, spawned and fought in the sandbox through its attacks, reactions and death,
// never shows a frame that was never drawn.

test('the contact sheet shows every enemy frame under its family, with no console errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/sheet.html');
  await page.waitForSelector('h2');
  const sections = await page.evaluate(() => {
    const root = document.getElementById('sheet');
    const out: Record<string, string[]> = {};
    const kids = [...(root?.children ?? [])];
    for (let i = 0; i + 1 < kids.length; i += 2) out[kids[i]?.textContent ?? ''] = [...(kids[i + 1]?.querySelectorAll('figcaption') ?? [])].map((c) => c.textContent ?? '');
    return out;
  });
  for (const def of Object.values(ENEMIES)) {
    const fam = ENEMY_FAMILIES.find((f) => f.members.includes(def.id));
    const title = `${fam?.name} (${fam?.region}): ${def.anims}`;
    const labels = sections[title];
    expect(labels, title).toBeDefined();
    const names = (labels ?? []).map((l) => l.split(' ')[0]);
    for (const anim of Object.values(ENEMY_ANIMS[def.anims] ?? {})) {
      if (!anim) continue;
      for (const f of animFrames(anim)) expect(names, f).toContain(f);
    }
    const strip = labels?.filter((l) => l.startsWith(`${def.anims}-windup-side/`)) ?? [];
    expect(strip[0], def.id).toMatch(/\(gather\)$/);
    expect(strip[strip.length - 1], def.id).toMatch(/\(peak\)$/);
    expect(labels?.some((l) => l.startsWith(`${def.anims}-death-down`) && l.endsWith('(struck)')), def.id).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('every enemy fought in the sandbox, through wind-ups, reactions and deaths, shows only drawn frames', async ({ page }) => {
  // 1,140 drawn frames sampled: a loaded runner can draw a few a second.
  test.setTimeout(420_000);
  const errors = watchErrors(page);
  await boot(page, '?sandbox');
  await cameraSettled(page, 20_000);
  const shown = await page.evaluate(async (ids) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const frames = new Set<string>();
    for (const id of ids) {
      for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
      g.step(1);
      const p = g.getState().player;
      const s = g.spawnEnemy(id, p.x + 50, p.y);
      const eid = s.enemies[s.enemies.length - 1]?.id ?? -1;
      // Fought for a while, the player kept up: its walk, wind-ups, attacks and recovery; hit now and then.
      for (let t = 0; t < 360; t++) {
        const e = g.getState().enemies.find((x) => x.id === eid);
        if (!e) break;
        g.step(1, t % 40 === 0 ? { use: true, aimX: e.x, aimY: e.y - 8 } : {});
        g.setPlayerHealth(100);
        if (t % 6 === 0) {
          await new Promise((r) => requestAnimationFrame(r));
          for (const a of g.ui().enemyArt) frames.add(a.frame);
        }
      }
      g.setEnemyHealth(eid, 0);
      g.step(1);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return [...frames];
  }, Object.keys(ENEMIES));
  expect(shown.some((f) => f.includes('-windup-'))).toBe(true);
  expect(errors.filter((e) => e.includes('No frame named'))).toEqual([]);
});
