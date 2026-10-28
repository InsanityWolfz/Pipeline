import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ENEMY_FAMILIES } from '../../src/data/art/enemyFamilies';
import { enemyDef } from '../../src/data/enemies';
import { boot, cameraSettled } from './helpers';

// Review strips for 076's locomotion audit (REVIEW_SHOTS=1, into docs/review/076): every enemy that moves, walking at
// its own pace in the sandbox in real time (the game's own loop and clocks, nothing faked), a frame copied off the
// game canvas every 1/30 s for one second as it's drawn (fewer where the machine draws slower: each cell is labelled
// with its ms), a crop that follows it, a row per enemy; and what each did over that second (the walk frames it
// showed, how far it went) in test-results/076-gait.txt.

const SHOTS = 'docs/review/076';
/** GAIT_SUFFIX=-before names a run on the rigs before the calming (076.11). */
const SUFFIX = process.env.GAIT_SUFFIX ?? '';
const N = 30;
const MS = 1000;
/** The crop round each enemy, world px (bosses wider). */
const CROP = { w: 64, h: 72, bossW: 110, bossH: 120 } as const;

interface Sample {
  t: number;
  x: number;
  y: number;
  frame: string;
  pose: string;
}

test.describe('locomotion strips (076)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/076');

  test('every moving enemy walking, a frame every 1/30 s for a second of real time', async ({ browser }) => {
    test.setTimeout(900_000);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await boot(page, '?sandbox');
    await cameraSettled(page, 20_000);
    // The sandbox's own pack cleared and dissolved away first, so the first strip isn't drawn under twenty deaths.
    await page.evaluate(() => {
      const g = window.__GAME__;
      for (let k = 0; k < 3; k++) {
        for (const e of g?.getState().enemies ?? []) g?.setEnemyHealth(e.id, 0);
        g?.step(30);
      }
    });
    await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().particles.dissolving ?? 1) + (window.__GAME__?.ui().particles.deathMotes ?? 1)), { timeout: 120_000 }).toBe(0);
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
          // The game loop steps the sim in real time from here.
          g.resume();
          return s.enemies[s.enemies.length - 1]?.id ?? -1;
        }, enemyId);
        // Under way before the strip starts (the bosses stand idle outside their arenas).
        await expect
          .poll(() => page.evaluate((eid) => window.__GAME__?.ui().enemyArt.find((a) => a.id === eid)?.pose ?? '', id), { timeout: 10_000 })
          .toBe('walk')
          .catch(() => undefined);
        const w = def.boss ? CROP.bossW : CROP.w;
        const h = def.boss ? CROP.bossH : CROP.h;
        const got = await page.evaluate(
          async ([eid, n, ms, cw, ch]) => {
            const g = window.__GAME__;
            const canvas = document.querySelector('canvas');
            if (!g || !canvas) throw new Error('no game');
            const k = canvas.width / 640;
            const strip = document.createElement('canvas');
            strip.width = Math.round(cw * k * n);
            strip.height = Math.round(ch * k);
            const c2 = strip.getContext('2d');
            const log: Sample[] = [];
            const times: number[] = [];
            const start = performance.now();
            let i = 0;
            while (i < n && performance.now() - start < ms * 1.5) {
              // Copied in the frame callback, after the game has drawn that frame.
              const done = await new Promise<boolean>((resolve) => {
                requestAnimationFrame(() => {
                  const t = performance.now() - start;
                  const e = g.getState().enemies.find((x) => x.id === eid);
                  const cam = g.ui().camera;
                  const art = g.ui().enemyArt.find((a) => a.id === eid);
                  if (!e) return resolve(true);
                  log.push({ t, x: e.x, y: e.y, frame: art?.frame ?? '', pose: art?.pose ?? '' });
                  if (t >= (i * ms) / n) {
                    const sx = (320 + (e.x - cam.x) * cam.zoom - cw / 2) * k;
                    const sy = (180 + (e.y - cam.y) * cam.zoom - ch + 12) * k;
                    c2?.drawImage(canvas, sx, sy, cw * k, ch * k, i * cw * k, 0, cw * k, ch * k);
                    times.push(Math.round(t));
                    i += 1;
                  }
                  resolve(false);
                });
              });
              if (done) break;
            }
            return { png: strip.toDataURL('image/png'), log, times, cells: i, cellW: cw * k };
          },
          [id, N, MS, w, h] as const,
        );
        const log = got.log;
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
        const secs = a && b ? (b.t - a.t) / 1000 : 0;
        const poses = [...new Set(log.map((s) => s.pose))].join('/');
        report.push(`${enemyId}: ${got.cells} cells, ${log.length} drawn frames over ${secs.toFixed(2)} s, ${walking.length} walking (${poses}), ${(changes / Math.max(secs, 0.001)).toFixed(1)} walk-frame changes/s, ${(moved / Math.max(secs, 0.001)).toFixed(0)} px/s (walkSpeed ${def.walkSpeed})`);
        const labels = got.times.map((t) => `<span style="display:inline-block;width:${w * 2}px;font:10px sans-serif">${t} ms</span>`).join('');
        rows.push(`<div style="display:flex;gap:6px;align-items:end"><span style="width:110px;font:12px sans-serif">${enemyId}</span><div><img src="${got.png}" style="height:${h * 2}px;image-rendering:pixelated"><div style="white-space:nowrap">${labels}</div></div></div>`);
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
