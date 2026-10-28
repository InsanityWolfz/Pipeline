import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { HOLLOWS } from '../../src/data/hollows';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { enemyDef, type BulwarkDef, type ForgewrightDef } from '../../src/data/enemies';
import { enterArena } from './arenaHelpers';
import { intoSandboxArena, intoShrine, SANDBOX_BOSSES } from './bossIntroPage';
import { FAN_SPOT, fanUntilVent } from './forgePage';
import { clickRow, flowIs } from './flowPage';
import { boot } from './helpers';

// 080's motion, judged in motion (REVIEW_SHOTS=1, into docs/review/080): real-speed frame strips, the game running
// unstepped at its own pace (the game loop's own clock for the sim and Phaser's for the animation; no fake clock), a
// frame copied off the canvas about every 1/30 s as it's drawn (fewer where this machine draws slower; each cell is
// labelled with its ms): each boss's full intro (the whole view, so the pan, card and shake show), the Bulwark's short
// intro, and each phase change about a second round its flip (a crop that follows the boss).

const SHOTS = 'docs/review/080';
const PER_ROW = 12;

/** A change made partway through a strip, `tick` game ticks in: a boss's health set (its flag flips on its next think). */
type Flip = { tick: number; boss: string; health: number } | null;

/**
 * Lets the game run unstepped (its own loop: Phaser's clock, the sim's ticks off its frame delta) for `ticks` game ticks
 * and copies the canvas as each frame is drawn, a cell every 2 ticks (30 a second of game time), into `name`.png. This
 * machine's software renderer draws about 12 frames a wall second, and Phaser holds a slow frame's delta near one tick,
 * so the game runs slower than the wall clock: cells are labelled with game time (ticks × 1000/60) and the log keeps
 * both.
 */
async function strip(page: Page, name: string, ticks: number, crop: { boss: string; w: number; h: number } | null, flip: Flip = null, also: { name: string; crop: { boss: string; w: number; h: number } } | null = null): Promise<string> {
  const got = await page.evaluate(
    async ([total, c0, f, perRow, extra]) => {
      const g = window.__GAME__;
      const canvas = document.querySelector('canvas');
      if (!g || !canvas) throw new Error('no game');
      const k = canvas.width / 640;
      const crops = [c0, ...(extra ? [extra.crop] : [])];
      const sheets: { t: number; img: ImageBitmap }[][] = crops.map(() => []);
      const log: string[] = [];
      g.resume();
      const wall = performance.now();
      const start = g.getState().tick;
      let last = -99;
      let flipped = false;
      while (g.getState().tick - start < total && performance.now() - wall < 120_000) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => {
            const s = g.getState();
            const at = s.tick - start;
            if (f && !flipped && at >= f.tick) {
              const e = s.enemies.find((x) => x.enemyId === f.boss);
              if (e) g.setEnemyHealth(e.id, f.health);
              flipped = true;
            }
            if (at - last < 2) return resolve();
            last = at;
            const ui = g.ui();
            const cam = ui.camera;
            const intro = ui.bossIntro;
            const phase = ui.bossPhase.map((p) => `${p.boss} ${p.look}${p.enraged ? '+enraged' : ''}${p.heatBand !== null ? ` heat ${p.heatBand}` : ''}${p.flare ? ' (transition)' : ''}`).join(', ');
            const t = Math.round((at * 1000) / 60);
            log.push(`${t} ms (wall ${Math.round(performance.now() - wall)}): ${intro ? `intro ${intro.ticks} ${intro.beat}/${intro.frame} card ${intro.card.alpha.toFixed(2)} pan ${intro.pan.dx},${intro.pan.dy}` : 'no intro'}; ${phase}; shaking ${cam.shaking}`);
            crops.forEach((c, ci) => {
              let sx = 0;
              let sy = 0;
              let sw = 640 * k;
              let sh = 360 * k;
              if (c) {
                const e = s.enemies.find((x) => x.enemyId === c.boss && x.room === s.room);
                if (e) {
                  sx = (320 + (e.x - cam.x) * cam.zoom - c.w / 2) * k;
                  sy = (180 + (e.y - cam.y) * cam.zoom - c.h + 24) * k;
                }
                sw = c.w * k;
                sh = c.h * k;
              }
              void createImageBitmap(canvas, sx, sy, sw, sh, { resizeWidth: c ? c.w : 320, resizeHeight: c ? c.h : 180 }).then((img) => sheets[ci]?.push({ t, img }));
            });
            resolve();
          }),
        );
      }
      await new Promise((r) => setTimeout(r, 200));
      const pngs = sheets.map((cells, ci) => {
        const c = crops[ci];
        const cw = c ? c.w : 320;
        const ch = c ? c.h : 180;
        cells.sort((x, y) => x.t - y.t);
        const rows = Math.ceil(cells.length / perRow);
        const out = document.createElement('canvas');
        out.width = cw * Math.min(perRow, cells.length);
        out.height = rows * (ch + 14);
        const o = out.getContext('2d');
        if (!o) throw new Error('no 2d');
        o.fillStyle = '#1e1a2e';
        o.fillRect(0, 0, out.width, out.height);
        o.font = '11px sans-serif';
        cells.forEach((cell, i) => {
          const x = (i % perRow) * cw;
          const y = Math.floor(i / perRow) * (ch + 14);
          o.drawImage(cell.img, x, y);
          o.fillStyle = '#ffffff';
          o.fillText(`${cell.t} ms`, x + 3, y + ch + 11);
        });
        return out.toDataURL('image/png');
      });
      return { pngs, log, cells: sheets[0]?.length ?? 0 };
    },
    [ticks, crop, flip, PER_ROW, also] as const,
  );
  [name, ...(also ? [also.name] : [])].forEach((n, i) => writeFileSync(`${SHOTS}/${n}.png`, Buffer.from(got.pngs[i]?.split(',')[1] ?? '', 'base64')));
  expect(got.cells).toBeGreaterThan(5);
  return `${name}: ${got.cells} cells\n${got.log.join('\n')}`;
}

/** Steps the sim (no drawing between) until `done` says so in the page, at most `limit` ticks, the player kept up. */
async function stepUntil(page: Page, done: string, limit: number, aim = ''): Promise<void> {
  await page.evaluate(
    ([cond, max, aimAt]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const test = new Function('s', `return ${cond};`) as (s: unknown) => boolean;
      const at = aimAt ? (new Function('s', `return ${aimAt};`) as (s: unknown) => { x: number; y: number }) : null;
      for (let t = 0; t < max; t++) {
        const s = g.getState();
        if (test(s)) return;
        const a = at?.(s);
        g.step(1, a ? { fire: true, aimX: a.x, aimY: a.y } : {});
        g.setPlayerHealth(100);
      }
      throw new Error(`not reached: ${cond}`);
    },
    [done, limit, aim] as const,
  );
}

/** Stands the player `dy` px south of the boss, so the boss sits mid-screen for its crop. */
async function faceBoss(page: Page, boss: string, dy = 110): Promise<void> {
  await page.evaluate(
    ([id, d]) => {
      const g = window.__GAME__;
      const e = g?.getState().enemies.find((x) => x.enemyId === id);
      if (e) window.__helpers?.walkTo(e.x, e.y + d);
    },
    [boss, dy] as const,
  );
}

/** Breaks the Conductor's standing rods (never the one he stands at), each from beside it, until `standing` stand; stepped, nothing drawn between. */
async function breakTo(page: Page, standing: number): Promise<number> {
  return page.evaluate(
    ([sockets, m, want]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const boss = () => g.getState().bosses.find((b) => b.enemyId === 'conductor');
      const up = () => (boss()?.rods ?? []).filter((r) => r.regrow <= 0).length;
      for (let pass = 0; pass < 3 && up() > want; pass++) {
        for (const [i, at] of sockets.entries()) {
          const b = boss();
          if (!b || up() <= want || (b.rods[i]?.regrow ?? 1) > 0 || b.rod === i) continue;
          const d = Math.hypot(m.x - at.x, m.y - at.y) || 1;
          h.walkTo(at.x - ((m.y - at.y) / d) * 44, at.y + ((m.x - at.x) / d) * 44);
          for (let t = 0; t < 600 && (boss()?.rods[i]?.regrow ?? 1) <= 0; t++) g.step(1, { fire: true, aimX: at.x, aimY: at.y - 30 });
        }
      }
      return up();
    },
    [CROWN_SPIRE.sockets, { x: (CROWN_SPIRE.middle.tx + 0.5) * 32, y: (CROWN_SPIRE.middle.ty + 0.5) * 32 }, standing] as const,
  );
}

const BW = enemyDef('bulwark') as BulwarkDef;
const FW = enemyDef('forgewright') as ForgewrightDef;
const BOSS_CROP = { w: 180, h: 200 };

test.describe('motion strips (080)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/080');
  test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));
  const report: string[] = [];
  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/080-motion.txt', report.join('\n\n'));
  });

  for (const { boss, arena } of [{ boss: 'pylon-warden', arena: 'shrine' }, ...SANDBOX_BOSSES]) {
    test(`${boss}'s full intro in real time`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: 1280, height: 720 });
      if (boss === 'pylon-warden') await intoShrine(page);
      else await intoSandboxArena(page, arena);
      report.push(await strip(page, `03-intro-${boss}`, 172, null, null, { name: `03-intro-${boss}-body`, crop: { boss, w: boss === 'conductor' ? 200 : 170, h: boss === 'conductor' ? 220 : 170 } }));
    });
  }

  test("the Bulwark's short intro after an altar summon", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?start=hollows');
    const A = HOLLOWS.arena;
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
      g.step(1);
    });
    await enterArena(page, A);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const b = g?.getState().enemies.find((e) => e.enemyId === 'bulwark');
      if (g && b) g.setEnemyHealth(b.id, 0);
      g?.step(200);
    });
    if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
      await clickRow(page, 'keepPlaying');
      await flowIs(page, 'play');
    }
    await page.evaluate((at) => window.__helpers?.walkTo((at.tx + 1.5) * 32, (at.ty + 0.5) * 32), A.altar);
    await page.evaluate(([altar, ticks]) => window.__GAME__?.step(1, { summon: altar }) && window.__GAME__?.step(ticks - 30), [A.altar.id, A.summonTicks] as const);
    report.push(await strip(page, '04-short-intro-bulwark', 100, null, null, { name: '04-short-intro-bulwark-body', crop: { boss: 'bulwark', w: 170, h: 170 } }));
  });

  test("the Bulwark's call and its roar into enrage", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await intoSandboxArena(page, 'sunken-forum');
    await stepUntil(page, "s.enemies.some((e) => e.enemyId === 'bulwark' && e.mode === 'chase')", 400);
    await faceBoss(page, 'bulwark');
    report.push(await strip(page, '05-phase-bulwark-1-called', 60, { boss: 'bulwark', ...BOSS_CROP }, { tick: 12, boss: 'bulwark', health: Math.floor(BW.maxHealth * (BW.adds.below - 0.02)) }));
    report.push(await strip(page, '05-phase-bulwark-2-roar', 84, { boss: 'bulwark', ...BOSS_CROP }, { tick: 12, boss: 'bulwark', health: Math.floor(BW.maxHealth * (BW.enrage.below - 0.02)) }));
  });

  test("the Forgewright's heat bands, its vent and its enrage flare", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await intoSandboxArena(page, 'anvil-hall');
    const crop = { boss: 'forgewright', ...BOSS_CROP };
    await faceBoss(page, 'forgewright', 130);
    for (const [i, edge] of [0.25, 0.5, 0.9].entries()) {
      // Stepped to just under the band's edge, then about a second of real time across it.
      await stepUntil(page, `(s.bosses.find((b) => b.enemyId === 'forgewright')?.heat ?? 0) >= ${edge * FW.heat.max - 1}`, 4000);
      report.push(await strip(page, `06-phase-forgewright-${i + 1}-heat-${edge * 100}`, 60, crop));
    }
    // Its bellows broken by the fan (forgePage's, stepped), then the vent in real time from its first frames.
    await page.evaluate((spot) => window.__helpers?.walkTo(spot.x, spot.y), FAN_SPOT);
    expect(await fanUntilVent(page, 3000)).toBeGreaterThan(0);
    report.push(await strip(page, '06-phase-forgewright-4-vent', 60, crop));
    report.push(await strip(page, '06-phase-forgewright-5-enrage', 60, crop, { tick: 12, boss: 'forgewright', health: Math.floor(FW.maxHealth * (FW.enrage.below - 0.05)) }));
  });

  test("the Conductor's shield breaking and returning, its grounding and its enrage flare", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await intoSandboxArena(page, 'crown-spire');
    const crop = { boss: 'conductor', w: 200, h: 220 };
    // Down to three standing (still shielded), then the fourth breaks (stepped, nothing drawn between): the player steps
    // to face him and the first drawn frames show the dome shatter.
    expect(await breakTo(page, 3)).toBe(3);
    expect(await breakTo(page, 2)).toBe(2);
    await faceBoss(page, 'conductor', 90);
    report.push(await strip(page, '07-phase-conductor-1-shield-breaks', 50, crop));
    // A rod about to regrow to make three: the dome comes back.
    await stepUntil(page, "(s.bosses.find((b) => b.enemyId === 'conductor')?.rods ?? []).some((r) => r.regrow > 0 && r.regrow < 30)", 4000);
    report.push(await strip(page, '07-phase-conductor-2-shield-returns', 70, crop));
    expect(await breakTo(page, 1)).toBe(1);
    await faceBoss(page, 'conductor', 90);
    report.push(await strip(page, '07-phase-conductor-3-grounded', 50, crop));
    report.push(await strip(page, '07-phase-conductor-4-enrage', 60, crop, { tick: 12, boss: 'conductor', health: Math.floor(enemyDef('conductor').maxHealth * 0.45) }));
  });
});
