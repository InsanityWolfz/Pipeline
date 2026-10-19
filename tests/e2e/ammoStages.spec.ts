import { expect, test, type Page } from '@playwright/test';
import { GROTTO } from '../../src/data/grotto';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, cameraSettled, watchErrors } from './helpers';
import { screenPoint } from './foundryPage';
import { ui } from './intakePage';

// Ammo stages (029): from ?playtest, a frost rune in an arrow line (a rime-shard
// hopper at its side) feeds frost arrows into the intake, and a frost volley freezes
// what it hits; at the bench, once the shrine is claimed, a click on the frost rune's
// row hand-applies it. With REVIEW_SHOTS=1, the review screenshots in docs/review/029.
//
// A frost arrow deals 10 and a Husk has 40 health, so the 4th stack (the freeze) lands
// on the hit that kills it: the freeze is shown on the shrine's Pylon Warden, the one
// M1 enemy that outlasts four arrows (noted for Shaun). A Husk shows its chill stacks.

const SHOTS = 'docs/review/029';

/** Arrow hopper (12, 3) → frost rune (12, 2) → conduit (12, 1) → the centre entrance; rime hopper (11, 2) at the rune's side. */
function buildFrostLine(page: Page) {
  return page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    if (g.step(0).room !== 'foundry') h.toFoundry();
    h.walkTo(13.5 * 32, 4.5 * 32);
    g.step(1, { place: { pieceId: 'conduit', tx: 12, ty: 1, facing: 'up' } });
    g.step(1, { place: { pieceId: 'frost-rune', tx: 12, ty: 2, facing: 'up' } });
    g.step(1, { place: { pieceId: 'hopper', tx: 12, ty: 3, facing: 'up' } });
    let s = g.step(1, { place: { pieceId: 'hopper', tx: 11, ty: 2, facing: 'right' } });
    const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
    const arrows = at(12, 3);
    const rime = at(11, 2);
    if (!arrows || !rime) throw new Error(`line not built: ${JSON.stringify(s.events.placeFails)}`);
    // Just below the arrow hopper, then just left of the rime hopper: each in reach for E.
    h.walkTo(12.5 * 32, 4.3 * 32);
    g.step(1, { deposit: { id: arrows.id, itemId: 'arrow', amount: 'half' } });
    h.walkTo(10.6 * 32, 2.5 * 32);
    s = g.step(1, { deposit: { id: rime.id, itemId: 'rime-shard', amount: 'half' } });
    const rune = () => s.foundry.pieces.find((p) => p.pieceId === 'frost-rune');
    let working = false;
    for (let t = 0; t < 1200 && (s.intake.entrances[1]?.count ?? 0) < 8; t++) {
      s = g.step(1);
      const r = rune();
      if (r?.kind === 'machine' && r.status === 'working') working = true;
    }
    return { entrance: s.intake.entrances[1], made: s.machineMade['arrow+frost'] ?? 0, working, unlocked: s.stagesUnlocked, pieces: JSON.stringify(s.foundry.pieces) };
  });
}

test('a frost rune line feeds frost arrows to the tube, and a frost volley freezes what it hits; the bench hand-applies the rune', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const line = await buildFrostLine(page);
  expect(line.working, line.pieces).toBe(true);
  expect(line.made).toBeGreaterThanOrEqual(8);
  expect(line.entrance).toMatchObject({ ammo: 'arrow+frost' });

  // Out to the shrine's Warden (the shrine still unclaimed), firing frost volleys until it freezes; a Husk on the way chills.
  const fight = await page.evaluate(
    ([pylon]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toHall();
      h.walkTo((pylon.tx + 0.5) * 32, (pylon.ty + 9.5) * 32);
      let s = g.step(1);
      let chilled = 0;
      let frozen: { enemyId: string; frozen: number } | null = null;
      for (let t = 0; t < 3000 && !frozen; t++) {
        const p = s.player;
        const warden = s.enemies.find((e) => e.enemyId === 'pylon-warden');
        if (!warden) throw new Error('no Warden');
        const d = Math.hypot(warden.x - p.x, warden.y - p.y);
        // Keep 110–200 px off, closing in or backing away, and fire at it while in range.
        const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
        const sign = d > 200 ? 1 : d < 110 ? -1 : 0;
        s = g.step(1, {
          moveX: (toward(p.x, warden.x) * sign) as -1 | 0 | 1,
          moveY: (toward(p.y, warden.y) * sign) as -1 | 0 | 1,
          fire: d < 260,
          aimX: warden.x,
          aimY: warden.y - 14,
        });
        for (const e of s.enemies) {
          chilled = Math.max(chilled, e.chill);
          if (e.frozen > 0) frozen = { enemyId: e.enemyId, frozen: e.frozen };
        }
        if (s.player.ko) throw new Error('KO');
      }
      const shots = s.arrows.map((a) => a.ammoId);
      return { frozen, chilled, shots };
    },
    [OVERWORLD.shrine.pylon] as const,
  );
  expect(fight.frozen?.enemyId).toBe('pylon-warden');
  expect(fight.frozen?.frozen).toBeGreaterThan(0);
  expect(fight.chilled).toBeGreaterThan(0);

  // Claim the shrine, and at the bench the Stages section shows: a click on the frost rune row hand-applies it.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
    h.walkTo(2.3 * 32, 12.5 * 32);
  });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
  const before = await page.evaluate(() => window.__GAME__?.getState().inventory['arrow+frost'] ?? 0);
  const row = (await ui(page))?.tagged.benchStages?.rows.find((r) => r.stageId === 'frost-rune');
  if (!row) throw new Error('no frost rune row');
  expect(row.dimmed).toBe(false);
  expect(row.texts).toEqual(expect.arrayContaining(['Frost rune', 'Arrow', 'Rime shard', 'Frost arrow', '+4']));
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(async () => page.evaluate(() => window.__GAME__?.step(1).inventory['arrow+frost'] ?? 0))
    .toBe(before + 4);
  const s = await page.evaluate(() => window.__GAME__?.getState());
  expect(s?.stagesUnlocked).toContain('frost-rune');
  expect(s?.unlocked).toContain('frost-rune');
  expect(errors).toEqual([]);
});

test.describe('review screenshots (029)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/029');

  test('the three stage machines working', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      // Stand clear of the lines, below them.
      h.walkTo(11.5 * 32, 12.5 * 32);
      // Each stage fed by a hopper of rounds behind it and a hopper of its material at its side, out into a crate.
      const lines = [
        { tx: 8, stage: 'frost-rune', round: 'arrow', material: 'rime-shard' },
        { tx: 11, stage: 'ley-guide', round: 'ley-bolt', material: 'ley-crystal' },
        { tx: 14, stage: 'shatter-lens', round: 'ley-bolt', material: 'ley-crystal' },
      ];
      for (const l of lines) {
        g.step(1, { place: { pieceId: 'hopper', tx: l.tx, ty: 8, facing: 'down' } });
        g.step(1, { place: { pieceId: l.stage, tx: l.tx, ty: 9, facing: 'down' } });
        g.step(1, { place: { pieceId: 'hopper', tx: l.tx - 1, ty: 9, facing: 'right' } });
        g.step(1, { place: { pieceId: 'crate', tx: l.tx, ty: 10, facing: 'down' } });
      }
      let s = g.step(1);
      if (s.foundry.pieces.length !== 12) throw new Error(`placed ${s.foundry.pieces.length}`);
      for (const l of lines) {
        const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
        // Just above the rounds' hopper, then just left of the material's: each in reach for E.
        h.walkTo((l.tx + 0.5) * 32, 7.6 * 32);
        s = g.step(1, { deposit: { id: at(l.tx, 8)?.id ?? -1, itemId: l.round, amount: 'half' } });
        h.walkTo((l.tx - 1.4) * 32, 9.5 * 32);
        s = g.step(1, { deposit: { id: at(l.tx - 1, 9)?.id ?? -1, itemId: l.material, amount: 'half' } });
      }
      h.walkTo(11.5 * 32, 12.6 * 32);
      const working = () => s.foundry.pieces.filter((p) => p.kind === 'machine' && p.status === 'working').length;
      for (let t = 0; t < 600 && working() < 3; t++) s = g.step(1);
      if (working() < 3) throw new Error('the stages never all worked at once');
    });
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/01-stages-working.png` });
  });

  test('the bench Stages section, a homing bolt mid-curve and a star burst', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      h.toFoundry();
      h.walkTo(2.3 * 32, 12.5 * 32);
      // Some frost arrows already made, so the frost rune's row shows what's held.
      g.step(1, { applyStage: 'frost-rune' });
    });
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/02-bench-stages.png` });
    await page.keyboard.press('Escape');

    // Hand-apply both ley stages, then out to the meadow.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1, { applyStage: 'ley-guide' });
      g.step(1, { applyStage: 'shatter-lens' });
      h.toHall();
      // South of the ruin field's Husks (017), which stand a few tiles north, on screen.
      h.walkTo(44.5 * 32, 19.5 * 32);
      g.step(1, { selectAmmo: 'ley-bolt' });
    });
    // The nearest Husk; the cursor beside it, inside the lock radius, so the bolt sets off wide and bends in.
    const shot = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(0);
      const nearest = () => s.enemies.filter((e) => e.room === s.room && e.enemyId === 'husk').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
      // The Husks come on; wait for one about 110 px off, then aim 60 px to its side, across the line to it.
      for (let t = 0; t < 600 && Math.hypot((nearest()?.x ?? 1e9) - s.player.x, (nearest()?.y ?? 1e9) - s.player.y) > 110; t++) s = g.step(1);
      const husk = nearest();
      if (!husk) throw new Error('no Husk');
      const dx = husk.x - s.player.x;
      const dy = husk.y - s.player.y;
      const len = Math.hypot(dx, dy);
      return g.step(1, { fire: true, aimX: husk.x - (dy / len) * 60, aimY: husk.y + (dx / len) * 60 });
    });
    expect(shot.arrows.some((a) => a.ammoId === 'ley-bolt+homing' && a.targetId !== null)).toBe(true);
    // A tick per drawn frame, so the trail gathers its points.
    for (let i = 0; i < 8; i++) {
      const longest = (await ui(page))?.tagged.trails.longest ?? 0;
      await page.evaluate(() => window.__GAME__?.step(1));
      await expect.poll(async () => (await ui(page))?.tagged.trails.longest ?? 0).toBeGreaterThan(Math.min(longest, 17));
    }
    await page.screenshot({ path: `${SHOTS}/03-homing-mid-curve.png` });

    // Spend the homing bolts, then a star bolt at the nearest Husk; the flash slowed so the capture catches it.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(30);
      const homing = s.inventory['ley-bolt+homing'] ?? 0;
      for (let i = 0; i < homing; i++) s = g.step(25, { fire: true, aimX: s.player.x - 300, aimY: s.player.y - 200 });
      g.step(60);
      g.tweenSpeed(0.02);
    });
    const burst = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(0);
      for (let t = 0; t < 600 && s.events.starBursts.length === 0; t++) {
        const husk = s.enemies.filter((e) => e.room === s.room && e.enemyId === 'husk').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
        if (!husk) break;
        // Only at a Husk well off, so the burst stands clear of the player; backing off while one is close.
        const d = Math.hypot(husk.x - s.player.x, husk.y - s.player.y);
        const back = d < 120 ? { moveY: (husk.y > s.player.y ? -1 : 1) as -1 | 1 } : {};
        s = g.step(1, { ...back, fire: s.arrows.length === 0 && d >= 120 && d < 220, aimX: husk.x, aimY: husk.y - 8 });
      }
      return s.events.starBursts.length;
    });
    expect(burst).toBe(1);
    await expect.poll(async () => (await ui(page))?.tagged.starFlashes).toBeGreaterThan(0);
    await page.evaluate(() => window.__GAME__?.step(2));
    await page.screenshot({ path: `${SHOTS}/04-star-burst.png` });
  });

  test('a frozen Husk, and the Frozen Grotto', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?playtest');
    // A Husk dies to the hit that would freeze it (40 health, 10 a frost arrow), so this one is topped up between hits
    // through the hook, to show the ice. Frost arrows from the bench.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.claim('shrine');
      h.toFoundry();
      h.walkTo(2.3 * 32, 12.5 * 32);
      g.step(1, { applyStage: 'frost-rune' });
      h.toHall();
      h.walkTo(44.5 * 32, 19.5 * 32);
      let s = g.step(0);
      for (let t = 0; t < 1500 && !s.enemies.some((e) => e.frozen > 30); t++) {
        const husk = s.enemies.filter((e) => e.room === s.room && e.enemyId === 'husk').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
        if (!husk) break;
        g.setEnemyHealth(husk.id, 40);
        s = g.step(1, { fire: Math.hypot(husk.x - s.player.x, husk.y - s.player.y) < 200, aimX: husk.x, aimY: husk.y - 8 });
      }
      if (!s.enemies.some((e) => e.frozen > 0)) throw new Error('no Husk froze');
    });
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/05-frozen-husk.png` });

    // The Grotto: up the new path from the west path's end, into its frosted clearing.
    await page.evaluate(
      ([mouth]) => {
        const h = window.__helpers;
        if (!h) throw new Error('no helpers');
        h.walkTo((mouth.tx + 0.5) * 32, (mouth.ty + 1.5) * 32);
        // Into the clearing, between the clusters, so the camera holds all of it.
        h.walkTo(15.5 * 32, 10.5 * 32);
      },
      [GROTTO.path[1] ?? { tx: 14, ty: 14 }] as const,
    );
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/06-frozen-grotto.png` });
  });

  test('the stage machines, rime and ice on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    for (const [title, file] of [
      ['Machine: frost-rune', '07-sheet-frost-rune'],
      ['Machine: ley-guide', '08-sheet-ley-guide'],
      ['Machine: shatter-lens', '09-sheet-shatter-lens'],
      ['Cold and the star split', '10-sheet-ice-and-shards'],
    ] as const) {
      await expect(row(title)).toBeVisible();
      await row(title).screenshot({ path: `${SHOTS}/${file}.png` });
    }
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    for (const [name, file] of [
      ['item-rime-shard', '11-sheet-rime-shard'],
      ['icon-arrow-frost', '12-sheet-frost-arrow'],
      ['icon-ley-bolt-homing', '13-sheet-homing-bolt'],
      ['icon-ley-bolt-star', '14-sheet-star-bolt'],
      ['node-rime-cluster-3', '15-sheet-rime-cluster-full'],
      ['node-rime-cluster-1', '16-sheet-rime-cluster-last'],
      ['node-rime-cluster-regrow-0', '17-sheet-rime-cluster-bare'],
      ['node-rime-cluster-regrow-2', '18-sheet-rime-cluster-regrowing'],
    ] as const) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/${file}.png` });
    }
  });
});
