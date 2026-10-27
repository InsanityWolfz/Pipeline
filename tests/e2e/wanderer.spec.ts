import { expect, test, type Page } from '@playwright/test';
import { WANDERER_SCHEMES, WANDERER_TRIM } from '../../src/data/art/wanderer';
import { RARITY_ORDER, type GearPiece, type Rarity } from '../../src/data/gear';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import { RELICS } from '../../src/data/relics';
import type { SimSummary } from '../../src/sim/summary';
import { boot, cameraSettled, watchErrors } from './helpers';

// 075: the arcane ranger in the game: what ui().player reports, the rarity trim from the sim's worn rarity (and no
// weight tint), the standing height, the hit and KO at game size, a camera that never shakes, and a sim untouched by
// the scheme.

const player = (page: Page) => page.evaluate(() => window.__GAME__?.ui().player ?? null);

/** Waits for a frame drawn from the sim's current tick. */
async function drawn(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = window.__GAME__;
        return !!g && g.ui().drawnTick === g.getState().tick;
      }),
    )
    .toBe(true);
}

/** Steps `n` ticks holding the aim this far from the player (no move), then waits for the frame. */
async function aimAt(page: Page, dx: number, dy: number, n = 1): Promise<void> {
  await page.evaluate(
    (a) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      g.step(a.n, { aimX: p.x + a.dx, aimY: p.y + a.dy });
    },
    { dx, dy, n },
  );
  await drawn(page);
}

/** The trim colour a hem pixel is nearest to: a rarity, or `none` (the scheme's cloth light). */
function nearestTrim(rgb: readonly [number, number, number]): Rarity | 'none' {
  const options: [Rarity | 'none', string][] = [['none', WANDERER_SCHEMES.cobalt.cloth.light], ...RARITY_ORDER.map((r): [Rarity, string] => [r, WANDERER_TRIM[r].color ?? ''])];
  let best: [Rarity | 'none', number] = ['none', Infinity];
  for (const [name, id] of options) {
    const [r, g, b] = hexToRgb(paletteHex(id));
    const d = Math.hypot(r - rgb[0], g - rgb[1], b - rgb[2]);
    if (d < best[1]) best = [name, d];
  }
  return best[0];
}

test('ui().player reports the view, animation, scheme, trim and squash', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await aimAt(page, 200, -14, 30);
  await expect.poll(async () => (await player(page))?.anim).toBe('idle');
  const p = await player(page);
  expect(p).toMatchObject({ view: 'side', scheme: 'cobalt', trim: null });
  expect(typeof p?.squash).toBe('number');
  await aimAt(page, 0, 200);
  expect((await player(page))?.view).toBe('down');
  await aimAt(page, 0, -200);
  expect((await player(page))?.view).toBe('up');
  await page.evaluate(() => window.__GAME__?.step(12, { moveX: 1 }));
  await drawn(page);
  expect((await player(page))?.anim).toBe('run');
  await page.evaluate(() => window.__GAME__?.step(1, { dodge: true, moveX: 1 }));
  await drawn(page);
  expect((await player(page))?.anim).toBe('roll');
  expect(errors).toEqual([]);
});

test('the trim follows the best rarity worn, from the sim; nothing worn is the plain hem, and heavy plate never tints the body', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // A body relic (Featherplate), so it takes no slot the other pieces use.
  const relic = RELICS.find((r) => r.slot === 'body');
  if (!relic) throw new Error('no body relic');
  const ids = await page.evaluate(
    ([relicId, relicSlot]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1);
      const add = (piece: Omit<GearPiece, 'id'>) => g.addGear(piece).gear.at(-1)?.id ?? -1;
      const common = add({ slot: 'helm', rarity: 'common', weight: null, baseArmor: 1, affixes: [{ kind: 'armor', value: 1 }], relic: null, name: 'Plain Cowl' });
      const fine = add({ slot: 'boots', rarity: 'fine', weight: null, baseArmor: 1, affixes: [{ kind: 'armor', value: 1 }], relic: null, name: 'Fine Boots' });
      const rare = add({ slot: 'trinket', rarity: 'rare', weight: null, baseArmor: 0, affixes: [{ kind: 'armor', value: 1 }], relic: null, name: 'Rare Charm' });
      const relicPiece = add({ slot: relicSlot, rarity: 'relic', weight: relicSlot === 'body' ? 'light' : null, baseArmor: 1, affixes: [{ kind: 'armor', value: 1 }], relic: relicId, name: 'The Relic' });
      const heavy = add({ slot: 'body', rarity: 'common', weight: 'heavy', baseArmor: 12, affixes: [{ kind: 'armor', value: 1 }], relic: null, name: 'Granite Plate' });
      h.toFoundry();
      h.walkTo(21.7 * 32, 9.5 * 32);
      return { common, fine, rare, relic: relicPiece, heavy };
    },
    [relic.id, relic.slot] as const,
  );
  // Facing up, the cape's hem shows across the back.
  await aimAt(page, 0, -200);
  const wear = async (id: number) => {
    await page.evaluate((pieceId) => window.__GAME__?.step(1, { equip: { id: pieceId } }), id);
    await aimAt(page, 0, -200);
  };
  const expectTrim = async (want: Rarity | null) => {
    expect((await page.evaluate(() => window.__GAME__?.getState().wornRarity)) ?? null).toBe(want);
    await expect.poll(async () => (await player(page))?.trim ?? null).toBe(want);
    await expect.poll(async () => {
      const c = (await player(page))?.hemColor;
      return c ? nearestTrim(c) : null;
    }).toBe(want ?? 'none');
  };
  await expectTrim(null);
  for (const [rarity, id] of [['common', ids.common], ['fine', ids.fine], ['rare', ids.rare], ['relic', ids.relic]] as const) {
    await wear(id);
    await expectTrim(rarity);
  }
  // Everything off: the plain hem.
  for (const id of [ids.common, ids.fine, ids.rare, ids.relic]) await wear(id);
  await expectTrim(null);
  // Heavy plate on the body: the trim is its rarity, and the body carries no tint.
  await wear(ids.heavy);
  await expectTrim('common');
  expect((await player(page))?.tinted).toBe(false);
  expect(errors).toEqual([]);
});

test('stands 40–44 world px tall side on and from the front', async ({ page }) => {
  await boot(page, '?start=field&attuned');
  for (const [dx, dy, view] of [[200, -14, 'side'], [0, 200, 'down']] as const) {
    await aimAt(page, dx, dy, 20);
    await expect.poll(async () => (await player(page))?.view).toBe(view);
    const top = (await player(page))?.bounds?.top ?? 0;
    // From the soles (the feet's point) to the hood's tip.
    expect(-top, view).toBeGreaterThanOrEqual(40);
    expect(-top, view).toBeLessThanOrEqual(44);
  }
});

test('at game size the hit moves the hood 3 px or more and the KO ends lying down; the camera never shakes', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  await aimAt(page, 200, -14, 30);
  await cameraSettled(page);
  const cam = async () => {
    const c = (await page.evaluate(() => window.__GAME__?.ui().camera)) ?? { x: 0, y: 0, player: { x: 0, y: 0 } };
    return { x: c.x - c.player.x, y: c.y - c.player.y, at: [c.x, c.y] };
  };
  const rest = await cam();
  const idleHood = (await player(page))?.hood ?? [0, 0];

  // Firing in place: the camera holds still.
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    g.step(1, { use: true, aimX: p.x + 200, aimY: p.y - 14 });
  });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      const g = window.__GAME__;
      const p = g?.getState().player;
      if (g && p) g.step(4, { use: true, aimX: p.x + 200, aimY: p.y - 14 });
    });
    await drawn(page);
    expect((await cam()).at).toEqual(rest.at);
  }

  // A hit: a Husk beside the player swings until it lands.
  const hit = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s: SimSummary = g.step(30);
    s = g.spawnEnemy('husk', s.player.x + 26, s.player.y);
    for (let t = 0; t < 900; t++) {
      s = g.step(1, { aimX: s.player.x + 200, aimY: s.player.y - 14 });
      if (s.player.hitInvulnerable) return true;
    }
    return false;
  });
  expect(hit).toBe(true);
  await drawn(page);
  const hitPose = await player(page);
  expect(hitPose?.anim).toBe('hit');
  const hood = hitPose?.hood ?? [0, 0];
  expect(Math.hypot(hood[0] - idleHood[0], hood[1] - idleHood[1])).toBeGreaterThanOrEqual(3);

  // The KO: flat on its last frame, at least 1.4 times as wide as tall; the camera holds on the fallen wanderer.
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setPlayerHealth(0);
    g.step(1);
  });
  await drawn(page);
  const koStart = await cam();
  await page.evaluate(() => window.__GAME__?.step(58));
  await drawn(page);
  const ko = await player(page);
  expect(ko?.anim).toBe('ko');
  expect(ko?.view).toBe('side');
  const b = ko?.bounds;
  expect(b).not.toBeNull();
  expect((b?.w ?? 0) / (b?.h ?? 1)).toBeGreaterThanOrEqual(1.4);
  expect((await cam()).at).toEqual(koStart.at);
  expect(errors).toEqual([]);
});

test('the scheme changes nothing in the sim: the same seed and commands give the same getState() in every scheme', async ({ page }) => {
  test.setTimeout(120_000);
  const run = async (query: string): Promise<SimSummary> => {
    await boot(page, `?start=field&attuned${query}`);
    return page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      // The live loop may have run a tick or two before the first step takes the clock: count from there.
      let s = g.step(0);
      const start = s.tick;
      s = g.step(40, { moveX: 1, aimX: s.player.x + 200, aimY: s.player.y });
      s = g.step(20, { use: true, aimX: s.player.x + 200, aimY: s.player.y + 40 });
      s = g.step(1, { dodge: true, moveY: 1, aimX: s.player.x, aimY: s.player.y + 100 });
      const end = g.step(40, { moveX: -1, aimX: s.player.x - 100, aimY: s.player.y });
      return { ...end, tick: end.tick - start };
    });
  };
  const plain = await run('');
  for (const scheme of Object.keys(WANDERER_SCHEMES)) {
    expect(await run(`&scheme=${scheme}`), scheme).toEqual(plain);
    expect((await player(page))?.scheme).toBe(scheme);
  }
  await run('&scheme=purple');
  expect((await player(page))?.scheme).toBe('cobalt');
});
