import { expect, test, type Page } from '@playwright/test';
import { EMBERWORKS } from '../../src/data/emberworks';
import { STORMCROWN } from '../../src/data/stormcrown';
import { polar } from '../../src/data/worldShape';
import { WANDERER_SCHEMES } from '../../src/data/art/wanderer';
import { RARITY_ORDER, type GearPiece } from '../../src/data/gear';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';

// Review screenshots for 075 (REVIEW_SHOTS=1, into docs/review/075): the contact sheet's wanderer sections at 4×; the
// wanderer idle, running and firing in Region 1, the Hollows, the Emberworks and the Stormcrown, in schemes A, B and C;
// each rarity's trim; and a roll, a hit and a KO at game size (1 world px a pixel), each with a 4× copy. 074's moods
// aren't merged yet, so the regions show in today's daylight.

const SHOTS = 'docs/review/075';
const SP = 2; // screen px per world px at 1280×720

interface Crop {
  label: string;
  png: string;
}

/** Steps `n` ticks with `cmd` built from the player each tick, then waits for that frame. */
async function step(page: Page, n: number, cmd: string): Promise<void> {
  await page.evaluate(
    ([n, cmd]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const make = new Function('p', 'i', `return (${cmd});`) as (p: { x: number; y: number }, i: number) => Record<string, unknown>;
      for (let i = 0; i < Number(n); i++) g.step(1, make(g.getState().player, i));
    },
    [String(n), cmd],
  );
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().drawnTick === window.__GAME__?.getState().tick)).toBe(true);
}

/** A crop `size` world px square around the player, as a data URL. */
async function crop(page: Page, label: string, size = 64, scale = SP): Promise<Crop> {
  const cam = await page.evaluate(() => window.__GAME__?.ui().camera);
  if (!cam) throw new Error('no camera');
  const vw = page.viewportSize() ?? { width: 1280, height: 720 };
  const k = scale * (cam.zoom || 1);
  const x = vw.width / 2 + (cam.player.x - cam.x) * k;
  const y = vw.height / 2 + (cam.player.y - cam.y) * k - 20 * k;
  const buf = await page.screenshot({ clip: { x: x - (size * k) / 2, y: y - (size * k) / 2, width: size * k, height: size * k } });
  return { label, png: `data:image/png;base64,${buf.toString('base64')}` };
}

/** Lays crops out in a row (each drawn `px` px wide, nearest-neighbour when enlarged) and saves the strip. */
async function strip(page: Page, crops: Crop[], file: string, px = 256): Promise<void> {
  const sheet = await page.context().newPage();
  await sheet.setViewportSize({ width: Math.min(1900, crops.length * (px + 6) + 10), height: px + 40 });
  await sheet.setContent(
    `<body style="margin:0;padding:4px;background:#1e1a2e;display:flex;flex-wrap:wrap;gap:6px;font:12px sans-serif;color:#e9dcc0">${crops
      .map((c) => `<figure style="margin:0"><img src="${c.png}" style="width:${px}px;height:${px}px;image-rendering:pixelated;display:block"><figcaption>${c.label}</figcaption></figure>`)
      .join('')}</body>`,
  );
  await sheet.screenshot({ path: `${SHOTS}/${file}`, fullPage: true });
  await sheet.close();
}

/** Every enemy gone but the Conductor (the Bulwark and the Forgewright too, so both barriers are down, as 064's shots do), the end card closed. */
async function clearField(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let k = 0; k < 3; k++) {
      for (const e of g.getState().enemies) if (e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
      g.step(1);
    }
    g.step(200);
  });
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
}

/** Idle, mid-run and firing (a shot's flash), side on, where the player stands. */
async function threePoses(page: Page): Promise<Crop[]> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await step(page, 40, '{ aimX: p.x + 300, aimY: p.y - 14 }');
  await cameraSettled(page, 20_000);
  const idle = await crop(page, 'idle');
  await step(page, 9, '{ moveX: 1, aimX: p.x + 300, aimY: p.y - 14 }');
  const run = await crop(page, 'running');
  await step(page, 30, '{ aimX: p.x + 300, aimY: p.y - 14 }');
  await cameraSettled(page, 20_000);
  // Holds fire until a shot leaves, then shows its first frame.
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 120; t++) {
      const p = g.getState().player;
      const s = g.step(1, { fire: true, use: true, aimX: p.x + 300, aimY: p.y - 14 });
      if (t > 10 && s.tube.shotCount > 0) return;
    }
  });
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().drawnTick === window.__GAME__?.getState().tick)).toBe(true);
  const fire = await crop(page, 'firing');
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  return [idle, run, fire];
}

const REGIONS: { name: string; file: string; query: string; to?: { tx: number; ty: number } }[] = [
  { name: 'Region 1', file: 'region1', query: '?start=field&attuned' },
  { name: 'the Hollows', file: 'hollows', query: '?start=hollows' },
  { name: 'the Emberworks', file: 'emberworks', query: '?start=hollows', to: polar(EMBERWORKS.ramps.find((r) => r.id === 'west-ramp')?.bearing ?? 270, EMBERWORKS.ramp.to + 3) },
  { name: 'the Stormcrown', file: 'stormcrown', query: '?start=hollows', to: polar(STORMCROWN.ramps[0]?.bearing ?? 0, STORMCROWN.ramp.to + 3) },
];

test.describe('review screenshots (075)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/075');

  test('the contact sheet\'s wanderer sections at 4×', async ({ page }) => {
    await page.setViewportSize({ width: 1900, height: 1000 });
    await page.goto('/sheet.html');
    await page.waitForSelector('h2');
    for (const view of ['side', 'down', 'up']) {
      await page.evaluate((v) => {
        for (const h of document.querySelectorAll('h2')) {
          const mine = h.textContent?.startsWith(`Wanderer ${v}:`) ?? false;
          (h as HTMLElement).style.display = mine ? '' : 'none';
          const row = h.nextElementSibling as HTMLElement | null;
          if (row) row.style.display = mine ? '' : 'none';
        }
      }, view);
      await page.screenshot({ path: `${SHOTS}/01-sheet-${view}.png`, fullPage: true });
    }
  });

  for (const [i, region] of REGIONS.entries()) {
    for (const scheme of Object.keys(WANDERER_SCHEMES)) {
      test(`idle, running and firing in ${region.name}, scheme ${scheme}`, async ({ page }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({ width: 1280, height: 720 });
        await boot(page, `${region.query}&scheme=${scheme}`);
        if (region.query.includes('hollows')) await clearField(page);
        if (region.to) {
          const to = region.to;
          await page.evaluate((t) => window.__helpers?.walkTo((t.tx + 0.5) * 32, (t.ty + 0.5) * 32), to);
          await clearField(page);
        }
        await strip(page, await threePoses(page), `0${i + 2}-${region.file}-${scheme}.png`);
      });
    }
  }

  test('each rarity\'s trim, from the front, side on and from behind', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    const ids = await page.evaluate((order) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1);
      const slots = { common: 'helm', fine: 'boots', rare: 'trinket', relic: 'body' } as const;
      const out: number[] = [];
      for (const r of order) {
        const slot = slots[r as keyof typeof slots];
        const piece: Omit<GearPiece, 'id'> = { slot, rarity: r as GearPiece['rarity'], weight: slot === 'body' ? 'light' : null, baseArmor: 1, affixes: [{ kind: 'armor', value: 1 }], relic: r === 'relic' ? 'featherplate' : null, name: r };
        out.push(g.addGear(piece).gear.at(-1)?.id ?? -1);
      }
      h.toFoundry();
      h.walkTo(21.7 * 32, 9.5 * 32);
      return out;
    }, RARITY_ORDER as readonly string[]);
    const crops: Crop[] = [];
    const views: [string, string][] = [['front', '{ aimX: p.x, aimY: p.y + 200 }'], ['side', '{ aimX: p.x + 200, aimY: p.y - 14 }'], ['back', '{ aimX: p.x, aimY: p.y - 200 }']];
    const shoot = async (label: string) => {
      for (const [view, cmd] of views) {
        await step(page, 2, cmd);
        crops.push(await crop(page, `${label}, ${view}`, 56));
      }
    };
    await shoot('nothing worn');
    for (const [k, id] of ids.entries()) {
      await page.evaluate((pieceId) => window.__GAME__?.step(1, { equip: { id: pieceId } }), id);
      await shoot(RARITY_ORDER[k] ?? '');
    }
    await strip(page, crops.slice(0, 9), '06-trims-1.png', 200);
    await strip(page, crops.slice(9), '06-trims-2.png', 200);
  });

  test('a roll, a hit and a KO at game size, with 4× copies', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 640, height: 360 });
    await boot(page, '?start=field&attuned');
    await step(page, 30, '{ aimX: p.x + 300, aimY: p.y - 14 }');
    await cameraSettled(page);
    const at1 = (label: string) => crop(page, label, 72, 1);
    const roll: Crop[] = [];
    await step(page, 1, '{ dodge: true, moveX: 1, aimX: p.x + 300, aimY: p.y - 14 }');
    roll.push(await at1('roll 1'));
    for (const r of [4, 7, 10, 13, 17]) {
      await step(page, r - Number(roll.at(-1)?.label.split(' ')[1] ?? 0), '{ moveX: 1, aimX: p.x + 300, aimY: p.y - 14 }');
      roll.push(await at1(`roll ${r}`));
    }
    await step(page, 40, '{ aimX: p.x + 300, aimY: p.y - 14 }');
    await cameraSettled(page);
    const hit: Crop[] = [];
    const landed = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.getState();
      s = g.spawnEnemy('husk', s.player.x + 26, s.player.y);
      for (let t = 0; t < 900; t++) {
        s = g.step(1, { aimX: s.player.x + 300, aimY: s.player.y - 14 });
        if (s.player.hitInvulnerable) return true;
      }
      return false;
    });
    expect(landed).toBe(true);
    await step(page, 0, '{}');
    hit.push(await at1('hit 0'));
    for (const n of [2, 3]) {
      await step(page, n, '{ aimX: p.x + 300, aimY: p.y - 14 }');
      hit.push(await at1(`hit ${n === 2 ? 2 : 5}`));
    }
    const ko: Crop[] = [];
    await page.evaluate(() => {
      window.__GAME__?.setPlayerHealth(0);
      window.__GAME__?.step(1);
    });
    let at = 0;
    for (const k of [5, 16, 27, 33, 40, 59]) {
      await step(page, k - at, '{}');
      at = k;
      ko.push(await at1(`ko ${k}`));
    }
    await strip(page, [...roll, ...hit], '07-roll-hit-1x.png', 72);
    await strip(page, ko, '08-ko-1x.png', 72);
    await strip(page, [...roll, ...hit], '07-roll-hit-4x.png', 288);
    await strip(page, ko, '08-ko-4x.png', 288);
  });
});
