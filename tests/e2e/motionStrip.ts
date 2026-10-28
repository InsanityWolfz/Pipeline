import type { Page } from '@playwright/test';

// Motion strips (the render rule: motion is judged in motion; 079's motion check). Phaser's time is locked to the
// sim with a virtual clock: requestAnimationFrame and performance.now are replaced before the page boots, so once
// started each strip frame advances the drawn time exactly `ms` and steps the sim `ticks` ticks, whatever the machine's
// load. (Playwright's own fake clock distorts Phaser's timing; this drives Phaser's loop directly.)

interface VirtualClock {
  start(): void;
  tick(ms: number): number;
  stop(): void;
}

declare global {
  interface Window {
    __vt?: VirtualClock;
  }
}

/** Installs the virtual clock (off until started). Call before the page boots. */
export async function virtualClock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const realRAF = window.requestAnimationFrame.bind(window);
    const realNow = performance.now.bind(performance);
    let on = false;
    let now = 0;
    let queue: FrameRequestCallback[] = [];
    performance.now = () => (on ? now : realNow());
    window.requestAnimationFrame = (cb) => {
      if (on) {
        queue.push(cb);
        return 1;
      }
      return realRAF((t) => (on ? queue.push(cb) : cb(t)));
    };
    window.__vt = {
      start: () => {
        now = realNow();
        on = true;
      },
      tick: (ms: number) => {
        now += ms;
        const q = queue;
        queue = [];
        for (const cb of q) cb(now);
        return q.length;
      },
      stop: () => {
        on = false;
        const q = queue;
        queue = [];
        for (const cb of q) realRAF(cb);
      },
    };
  });
}

/** Starts the virtual clock and runs `n` frames of `ms`, `ticks` sim ticks each (to settle before a capture). */
export async function clockFrames(page: Page, n: number, ms = 1000 / 30, ticks = 2): Promise<void> {
  await page.evaluate(
    ([count, dt, k]) => {
      const vt = window.__vt;
      if (!vt) throw new Error('no virtual clock');
      vt.start();
      for (let i = 0; i < count; i++) {
        window.__GAME__?.step(k);
        vt.tick(dt);
      }
    },
    [n, ms, ticks] as const,
  );
}

/** A world box's page clip through the camera as drawn. */
export async function worldClip(page: Page, centre: { x: number; y: number }, size: { w: number; h: number }): Promise<{ x: number; y: number; width: number; height: number }> {
  return page.evaluate(
    ([cx, cy, w, h]) => {
      const c = document.querySelector('canvas');
      const cam = window.__GAME__?.ui().camera;
      if (!c || !cam) throw new Error('no canvas');
      const r = c.getBoundingClientRect();
      const k = (r.width / 640) * cam.zoom;
      return { x: r.left + (320 + (cx - cam.x) * cam.zoom) * (r.width / 640) - (w / 2) * k, y: r.top + (180 + (cy - cam.y) * cam.zoom) * (r.height / 360) - (h / 2) * k, width: w * k, height: h * k };
    },
    [centre.x, centre.y, size.w, size.h] as const,
  );
}

/**
 * Captures `frames` frames on the virtual clock (33 ms and two sim ticks each), the world box round `centre` in each,
 * and lays them out in rows of `perRow` at `scale`, each labelled with its ms, into `path`. Returns `info` per frame.
 */
export async function motionStrip<T>(page: Page, path: string, opts: { title: string; frames: number; centre: { x: number; y: number }; size: { w: number; h: number }; perRow?: number; scale?: number; info?: () => T }): Promise<T[]> {
  await clockFrames(page, 3);
  const clip = await worldClip(page, opts.centre, opts.size);
  const cells: string[] = [];
  const infos: T[] = [];
  for (let i = 0; i < opts.frames; i++) {
    await page.evaluate(() => {
      window.__GAME__?.step(2);
      window.__vt?.tick(1000 / 30);
    });
    if (opts.info) infos.push(await page.evaluate(opts.info));
    cells.push((await page.screenshot({ clip })).toString('base64'));
  }
  await page.evaluate(() => window.__vt?.stop());
  const per = opts.perRow ?? 10;
  const scale = opts.scale ?? 2;
  const w = opts.size.w * scale;
  const rows: string[] = [];
  for (let r = 0; r < Math.ceil(cells.length / per); r++) {
    const row = cells.slice(r * per, r * per + per).map((c, j) => `<div style="font:10px monospace;color:#ccc"><img src="data:image/png;base64,${c}" style="width:${w}px;display:block"><div>${Math.round((r * per + j) * (1000 / 30))} ms</div></div>`);
    rows.push(`<div style="display:flex;gap:2px;margin-bottom:3px">${row.join('')}</div>`);
  }
  const out = await page.context().newPage();
  await out.setViewportSize({ width: per * (w + 2) + 16, height: 200 });
  await out.setContent(`<body style="margin:6px;background:#1d1a17"><div style="font:13px sans-serif;color:#eee;margin-bottom:5px">${opts.title}</div>${rows.join('')}</body>`);
  await out.screenshot({ path, fullPage: true });
  await out.close();
  return infos;
}
