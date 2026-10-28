import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ENEMY_FAMILIES } from '../../src/data/art/enemyFamilies';
import { enemyDef } from '../../src/data/enemies';
import { boot, cameraSettled } from './helpers';

// Review strips for 076's locomotion audit (REVIEW_SHOTS=1, into docs/review/076): every enemy that moves, walking
// at its own pace in the sandbox, 30 frames over one second of game time, a crop that follows it (so its bob and
// stride read against the frame), a row per enemy; and what each did over that second (the walk frames it showed,
// how far it went, per second of game time) in test-results/076-gait.txt. The page runs on Playwright's clock, run on
// until the sim has stepped 2 more ticks for each frame, so the strip is the game's own time however slowly a loaded
// machine draws.

const SHOTS = 'docs/review/076';
/** GAIT_SUFFIX=-before names a run on the rigs before the calming (076.11). */
const SUFFIX = process.env.GAIT_SUFFIX ?? '';
const N = 30;
/** Sim ticks a frame of the strip (60 a second). */
const TICKS = 2;
/** The crop round each enemy, world px (bosses wider). */
const CROP = { w: 64, h: 72, bossW: 110, bossH: 120 } as const;

interface Sample {
  tick: number;
  x: number;
  y: number;
  frame: string;
  pose: string;
}

test.describe('locomotion strips (076)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/076');

  test('every moving enemy walking, 30 frames over a second of game time', async ({ browser }) => {
    test.setTimeout(900_000);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await boot(page, '?sandbox');
    await cameraSettled(page, 20_000);
    await page.clock.install();
    const report: string[] = [];
    for (const [fi, f] of ENEMY_FAMILIES.entries()) {
      const rows: string[] = [];
      for (const enemyId of f.members) {
        const def = enemyDef(enemyId);
        if (def.walkSpeed <= 0) continue;
        const id = await page.evaluate((eid) => {
          const g = window.__GAME__;
          if (!g) throw new Error('no game');
          for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
          g.step(1);
          g.setPlayerHealth(1e6);
          const p = g.getState().player;
          // On the left, clear of the sandbox panel on the right.
          const s = g.spawnEnemy(eid, p.x - 260, p.y + 10);
          g.resume();
          return s.enemies[s.enemies.length - 1]?.id ?? -1;
        }, enemyId);
        // Under way (and the last one's dissolve gone) before the strip starts.
        await page.clock.runFor(600);
        const w = def.boss ? CROP.bossW : CROP.w;
        const h = def.boss ? CROP.bossH : CROP.h;
        const cells: string[] = [];
        const log: Sample[] = [];
        const start = await page.evaluate(() => window.__GAME__?.getState().tick ?? 0);
        for (let i = 0; i < N; i++) {
          for (let guard = 0; guard < 200; guard++) {
            await page.clock.runFor(8);
            if ((await page.evaluate(() => window.__GAME__?.getState().tick ?? 0)) >= start + TICKS * (i + 1)) break;
          }
          const at = await page.evaluate((eid) => {
            const g = window.__GAME__;
            const canvas = document.querySelector('canvas');
            const e = g?.getState().enemies.find((x) => x.id === eid);
            const cam = g?.ui().camera;
            const art = g?.ui().enemyArt.find((a) => a.id === eid);
            if (!g || !canvas || !e || !cam) return null;
            const r = canvas.getBoundingClientRect();
            return { tick: g.getState().tick, x: e.x, y: e.y, frame: art?.frame ?? '', pose: art?.pose ?? '', sx: r.left + (320 + (e.x - cam.x) * cam.zoom) * (r.width / 640), sy: r.top + (180 + (e.y - cam.y) * cam.zoom) * (r.height / 360), k: r.width / 640 };
          }, id);
          if (!at) break;
          log.push({ tick: at.tick, x: at.x, y: at.y, frame: at.frame, pose: at.pose });
          const clip = { x: Math.max(0, at.sx - (w / 2) * at.k), y: Math.max(0, at.sy - (h - 12) * at.k), width: w * at.k, height: h * at.k };
          cells.push((await page.screenshot({ clip, animations: 'allow' })).toString('base64'));
        }
        const walking = log.filter((s) => s.pose === 'walk');
        // A walk frame stepping on, not the walk turning to another view.
        let changes = 0;
        for (let j = 1; j < log.length; j++) {
          const [pa, fa] = (log[j - 1]?.frame ?? '').split('/');
          const [pb, fb] = (log[j]?.frame ?? '').split('/');
          if (log[j]?.pose === 'walk' && pa === pb && fa !== fb) changes += 1;
        }
        const a = log[0];
        const b = log[log.length - 1];
        const moved = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
        const secs = a && b ? (b.tick - a.tick) / 60 : 0;
        const poses = [...new Set(log.map((s) => s.pose))].join('/');
        report.push(`${enemyId}: ${walking.length}/${log.length} frames walking (${poses}), ${(changes / Math.max(secs, 0.001)).toFixed(1)} walk-frame changes/s, ${(moved / Math.max(secs, 0.001)).toFixed(0)} px/s (walkSpeed ${def.walkSpeed})`);
        rows.push(`<div style="display:flex;gap:2px;align-items:end"><span style="width:110px;font:12px sans-serif">${enemyId}</span>${cells.map((c) => `<img src="data:image/png;base64,${c}" style="width:${w * 2}px;image-rendering:pixelated">`).join('')}</div>`);
      }
      const out = await ctx.newPage();
      await out.setViewportSize({ width: 4200, height: 400 });
      await out.setContent(`<body style="margin:8px;background:#5cc850">${rows.join('')}</body>`);
      await out.screenshot({ path: `${SHOTS}/06-walk-${fi + 1}-${f.id}${SUFFIX}.png`, fullPage: true });
      await out.close();
    }
    mkdirSync('test-results', { recursive: true });
    writeFileSync(`test-results/076-gait${SUFFIX}.txt`, report.join('\n'));
    console.log(report.join('\n'));
    await ctx.close();
  });
});
