import { expect, test, type Page } from '@playwright/test';
import { fxSandbox } from './ammoFxPage';
import { drawn } from './lightingPage';
import { stepUntil } from './hollowsSandbox';
import { steelArrowLine } from './tierPage';

// Review screenshots for 078 (REVIEW_SHOTS=1, into docs/review/078): each family in flight and landing; each element on
// an arrow and a bomb; each tier on each family it takes; a homing bolt's curve; a Split's star and Shards; a cluster
// bomb's bomblets; a landmine's burst; the same volley on Low and High; a volley over a telegraph; machine sparks; the
// projectile bodies at 4×. Effects are held on the tween clock for the capture. Motion strips (30 frames over a second,
// two ticks a frame, Phaser's time locked to the sim's: a virtual clock gives each frame exactly 33 ms): an arrow volley,
// a ley bolt, a bomb's arc and blast, frost, homing, a Split and the tiers.

const SHOTS = 'docs/review/078';

/** The view's middle (a 320×180 world box round the player and the targets), or the whole screen. */
async function shot(page: Page, name: string, whole = false): Promise<void> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const clip = whole ? undefined : { x: size.width * 0.3, y: size.height * 0.22, width: size.width * 0.5, height: size.height * 0.5 };
  await page.screenshot({ path: `${SHOTS}/${name}.png`, ...(clip ? { clip } : {}) });
}

/** Fires at `aim` for `fire` ticks and steps until `until` holds (a tick a drawn frame), then slows the tween clock to hold what shows. */
async function fireUntil(page: Page, aim: readonly [number, number], fire: number, until: string, limit = 300): Promise<void> {
  const ok = await page.evaluate(
    async ([a, f, cond, max]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.tweenSpeed(1);
      const p = g.getState().player;
      const check = new Function('g', `return ${cond};`) as (game: typeof g) => boolean;
      for (let i = 0; i < max; i++) {
        g.step(1, { fire: i < f, aimX: p.x + a[0], aimY: p.y + a[1] });
        await new Promise((r) => requestAnimationFrame(r));
        if (check(g)) {
          g.tweenSpeed(0.05);
          await new Promise((r) => requestAnimationFrame(r));
          return true;
        }
      }
      return false;
    },
    [aim, fire, until, limit] as const,
  );
  expect(ok, until).toBe(true);
}

const flying = (n: number) => `g.getState().arrows.length + g.getState().bombs.length >= ${n} && g.getState().arrows.every((a) => a.travelled > 45)`;
const impacted = (kind: string) => `g.ui().ammoFx.impacts.some((i) => i.kind === '${kind}')`;

test.describe('078 review shots', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/078');

  test('01–03: each family, element and tier in flight and landing', async ({ page }) => {
    test.setTimeout(600_000);
    const targets = [['husk', 100, -30], ['husk', 110, 10], ['husk', 100, 45]] as const;
    await fxSandbox(page, ['arrow', 'ley-bolt', 'bomb', 'landmine', null], targets, { quality: 'medium' });
    await fireUntil(page, [100, 10], 1, flying(4));
    await shot(page, '01-families-in-flight');
    await fxSandbox(page, ['ley-bolt', 'arrow', 'ley-bolt', 'arrow', 'ley-bolt'], targets, { quality: 'medium' });
    await fireUntil(page, [100, 10], 40, `${impacted('splinter')} && ${impacted('ley-splash')}`);
    await shot(page, '01-families-landing');
    await fxSandbox(page, ['bomb', null, null, null, null], targets, { quality: 'medium' });
    await fireUntil(page, [100, 10], 1, impacted('blast'));
    await shot(page, '01-bomb-blast');
    await fxSandbox(page, ['arrow+frost', 'arrow+fire', 'arrow+lightning', null, null], targets, { quality: 'medium' });
    await fireUntil(page, [100, 10], 1, flying(3));
    await shot(page, '02-elements-arrows-in-flight');
    await fxSandbox(page, ['bomb+frost', 'bomb+fire', 'bomb+lightning', null, null], [['husk', 90, -40], ['husk', 100, 10], ['husk', 90, 55]], { quality: 'medium' });
    await fireUntil(page, [100, 10], 1, `g.ui().ammoFx.impacts.filter((i) => i.kind === 'blast').length >= 2`);
    await shot(page, '02-elements-bombs-blasting');
    await fxSandbox(page, ['arrow+steel', 'arrow+stormsteel', 'ley-bolt+glass', 'ley-bolt+storm-glass', 'bomb+stormsteel'], targets, { quality: 'medium' });
    await fireUntil(page, [100, 10], 1, flying(5));
    await shot(page, '03-tiers-in-flight');
    await fireUntil(page, [100, 10], 0, `g.ui().ammoFx.impacts.filter((i) => i.glints > 0).length >= 2`);
    await shot(page, '03-tiers-landing');
    await fxSandbox(page, ['bomb+steel', 'landmine+stormsteel', 'arrow+steel', null, null], targets, { quality: 'medium' });
    await fireUntil(page, [100, 10], 1, impacted('blast'));
    await shot(page, '03-steel-bomb-blast');
  });

  test('04–08: homing, Split, cluster, landmine, and one volley on Low and on High', async ({ page }) => {
    test.setTimeout(600_000);
    await fxSandbox(page, ['ley-bolt+homing', null, null, null, null], [['husk', 110, -45]], { quality: 'medium' });
    await fireUntil(page, [110, 5], 1, 'g.ui().ammoFx.bend > 10 && g.getState().arrows.every((a) => a.travelled > 50)');
    await shot(page, '04-homing-curve');
    await fxSandbox(page, ['ley-bolt+split', null, null, null, null], [['husk', 70, 0], ['husk', 120, 50], ['husk', 120, -50]], { quality: 'medium' });
    await fireUntil(page, [70, 0], 1, 'g.ui().tagged.shards >= 3 && g.getState().arrows.every((a) => a.travelled > 30)');
    await shot(page, '05-split-star-and-shards');
    await fxSandbox(page, ['bomb+cluster', null, null, null, null], [['husk', 100, 0]], { quality: 'medium' });
    await fireUntil(page, [100, 0], 1, `g.ui().ammoFx.impacts.filter((i) => i.kind === 'mini-blast').length >= 3`);
    await shot(page, '06-cluster-bomblets');
    await fxSandbox(page, ['landmine+fire', null, null, null, null], [['husk', 70, 0]], { quality: 'medium' });
    await fireUntil(page, [60, 0], 1, impacted('mine-blast'), 500);
    await shot(page, '07-landmine-burst');
    for (const q of ['low', 'high'] as const) {
      await fxSandbox(page, ['bomb+fire', 'arrow+frost', 'ley-bolt+lightning', 'arrow+stormsteel', 'ley-bolt+homing'], [['husk', 100, -30], ['husk', 110, 10], ['husk', 100, 45]], { quality: q });
      await fireUntil(page, [100, 10], 30, `g.getState().tick % 1 === 0 && g.ui().ammoFx.played >= 4`);
      await shot(page, `08-volley-${q}`);
    }
  });

  test('09: a volley over a Husk’s swipe telegraph', async ({ page }) => {
    test.setTimeout(300_000);
    const [id] = await fxSandbox(page, ['arrow+fire', 'ley-bolt+lightning', 'bomb+frost', 'arrow', 'ley-bolt+homing'], [['husk', 26, 0]], { quality: 'high' });
    if (id === undefined) throw new Error('no husk');
    const husk: number = id;
    await page.evaluate(async (hid) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      for (let i = 0; i < 300; i++) {
        const e = g.getState().enemies.find((x) => x.id === hid);
        if (e && e.mode === 'windup' && e.modeTicks >= 20) break;
        g.setEnemyHealth(hid, 500);
        g.setPlayerHealth(100);
        g.step(1, { fire: true, aimX: p.x + 160, aimY: p.y - 28 });
        if (i % 2 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
    }, husk);
    await stepUntil(page, husk, 'windup', 32);
    await drawn(page);
    await shot(page, '09-volley-over-a-telegraph');
  });

  test('10: machine sparks as a machine finishes a craft', async ({ page }) => {
    test.setTimeout(300_000);
    await steelArrowLine(page);
    const ok = await page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const before = g.ui().ammoFx.machineSparks;
      for (let i = 0; i < 600; i++) {
        g.step(1);
        await new Promise((r) => requestAnimationFrame(r));
        if (g.ui().ammoFx.machineSparks > before) {
          g.tweenSpeed(0.05);
          await new Promise((r) => requestAnimationFrame(r));
          return true;
        }
      }
      return false;
    });
    expect(ok).toBe(true);
    await shot(page, '10-machine-sparks', true);
  });

  test('11: the projectile bodies at 4× on the contact sheet', async ({ page }) => {
    await page.goto('/sheet.html');
    const names = ['arrow', 'arrow-steel', 'arrow-stormsteel', 'ley-bolt', 'ley-bolt-glass', 'ley-bolt-storm-glass', 'bomb', 'bomb-steel', 'bomb-stormsteel', 'landmine', 'landmine-steel', 'landmine-stormsteel', 'shard', 'shard-cold', 'bomblet'];
    const pics: string[] = [];
    for (const name of names) {
      const fig = page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) }).first();
      if ((await fig.count()) === 0) continue;
      pics.push((await fig.screenshot()).toString('base64'));
    }
    expect(pics.length).toBeGreaterThanOrEqual(13);
    const sheet = await page.context().newPage();
    await sheet.setViewportSize({ width: 1000, height: 600 });
    await sheet.setContent(`<body style="margin:8px;background:#e8e2d4;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">${pics.map((b) => `<img src="data:image/png;base64,${b}">`).join('')}</body>`);
    await sheet.screenshot({ path: `${SHOTS}/11-sheet-projectile-bodies.png`, fullPage: true });
    await sheet.close();
  });

  test('motion strips: 30 frames over a second of each, at real speed', async ({ page }) => {
    test.setTimeout(900_000);
    await page.addInitScript(virtualTime);
    const scenes: [string, (string | null)[], (readonly [string, number, number])[], readonly [number, number], number][] = [
      ['20-strip-arrow-volley', ['arrow', 'arrow', 'arrow', 'arrow', 'arrow'], [['husk', 90, 0], ['husk', 110, 30]], [100, 10], 6],
      ['21-strip-ley-bolt', ['ley-bolt', null, null, null, null], [['husk', 100, 0]], [100, 0], 6],
      ['22-strip-bomb-arc-and-blast', ['bomb', null, null, null, null], [['husk', 100, 0]], [100, 0], 2],
      ['23-strip-frost', ['arrow+frost', 'ley-bolt+frost', 'bomb+frost', null, null], [['husk', 100, 0]], [100, 0], 2],
      ['24-strip-homing', ['ley-bolt+homing', null, null, null, null], [['husk', 110, -45]], [110, 5], 2],
      ['25-strip-split', ['ley-bolt+split', null, null, null, null], [['husk', 80, 0], ['husk', 130, 45], ['husk', 130, -45]], [80, 0], 2],
      ['26-strip-tiers', ['arrow+steel', 'arrow+stormsteel', 'ley-bolt+glass', 'ley-bolt+storm-glass', 'bomb+steel'], [['husk', 95, 0], ['husk', 105, 35]], [100, 15], 2],
    ];
    const only = process.env.STRIPS?.split(',');
    for (const [name, rounds, enemies, aim, fire] of scenes) {
      if (only && !only.some((n) => name.startsWith(n))) continue;
      // A fresh boot each, so no earlier scene's drops or dissolves show.
      await fxSandbox(page, rounds, enemies, { quality: 'medium' });
      await strip(page, name, aim, fire);
    }
  });
});

/** The page's virtual clock (`virtualTime`): while on, animation frames run only on `tick`, and performance.now is its time. */
interface VirtualTime {
  start(): void;
  tick(ms: number): number;
  stop(): void;
}

/** Installed before the page loads: requestAnimationFrame and performance.now on a clock the strip advances 33 ms a frame. */
function virtualTime(): void {
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let on = false;
  let now = 0;
  let queue: FrameRequestCallback[] = [];
  performance.now = () => (on ? now : realNow());
  window.requestAnimationFrame = (cb) => {
    if (on) queue.push(cb);
    else return realRaf((t) => (on ? queue.push(cb) : cb(t)));
    return 1;
  };
  const run = (): FrameRequestCallback[] => {
    const q = queue;
    queue = [];
    return q;
  };
  const clock: VirtualTime = {
    start: () => {
      now = realNow();
      on = true;
    },
    tick: (ms) => {
      now += ms;
      const q = run();
      for (const cb of q) cb(now);
      return q.length;
    },
    stop: () => {
      on = false;
      for (const cb of run()) realRaf(cb);
    },
  };
  (window as unknown as { __vt: VirtualTime }).__vt = clock;
}

/** 30 frames, two ticks each and 33 ms of Phaser time (real speed at 30 fps), the view's middle, laid out 5 across in one image. */
async function strip(page: Page, name: string, aim: readonly [number, number], fireFrames: number): Promise<void> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  const clip = { x: size.width * 0.42, y: size.height * 0.28, width: size.width * 0.4, height: size.height * 0.44 };
  const shots: string[] = [];
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await page.evaluate(() => (window as unknown as { __vt: VirtualTime }).__vt.start());
  // A few settling frames: the loop's first virtual frame sees one 33 ms step, not the wait before it.
  for (let i = 0; i < 3; i++) await page.evaluate(() => (window as unknown as { __vt: VirtualTime }).__vt.tick(1000 / 30));
  for (let i = 0; i < 30; i++) {
    let ran = await page.evaluate(
      ([a, frame, f]) => {
        const g = window.__GAME__;
        if (!g) throw new Error('no game');
        const p = g.getState().player;
        for (let k = 0; k < 2; k++) g.step(1, { fire: frame * 2 + k < f * 2, aimX: p.x + a[0], aimY: p.y + a[1] });
        return (window as unknown as { __vt: VirtualTime }).__vt.tick(1000 / 30);
      },
      [aim, i, fireFrames] as const,
    );
    // A frame Phaser asked for before the clock went virtual may still be on its way: run it when it lands (the 33 ms
    // are already on the clock, so that frame still steps 33 ms).
    for (let wait = 0; ran === 0 && wait < 40; wait++) {
      await page.waitForTimeout(25);
      ran = await page.evaluate(() => (window as unknown as { __vt: VirtualTime }).__vt.tick(0));
    }
    expect(ran, 'a Phaser frame ran on the virtual clock').toBeGreaterThan(0);
    shots.push((await page.screenshot({ clip })).toString('base64'));
  }
  await page.evaluate(() => (window as unknown as { __vt: VirtualTime }).__vt.stop());
  const sheet = await page.context().newPage();
  const w = Math.round(clip.width * 0.75);
  const h = Math.round(clip.height * 0.75);
  await sheet.setViewportSize({ width: w * 5, height: h * 6 });
  await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(5,${w}px);background:#000">${shots.map((b) => `<img src="data:image/png;base64,${b}" style="width:${w}px;height:${h}px;display:block">`).join('')}</body>`);
  await sheet.screenshot({ path: `${SHOTS}/${name}.png` });
  await sheet.close();
}
