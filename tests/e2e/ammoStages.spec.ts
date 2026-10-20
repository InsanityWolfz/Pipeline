import { expect, test, type Page } from '@playwright/test';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, watchErrors } from './helpers';
import { screenPoint } from './foundryPage';
import { feedLines, toIntake, ui } from './intakePage';

// Ammo stages (029): from ?playtest, a frost rune in an arrow line (a rimestone
// hopper at its side) feeds frost arrows into the intake, and a frost volley freezes
// what it hits; at the bench, once the shrine is claimed, a click on the frost rune's
// row hand-applies it (?playtest already has every stage unlocked; the sim tests cover the
// unlock itself). The review screenshots are in ammoStagesShots.spec.ts.
//
// A frost arrow deals 10 and a Husk has 40 health, so the 4th stack (the freeze) lands
// on the hit that kills it: the freeze is shown on the shrine's Pylon Warden, the one
// M1 enemy that outlasts four arrows (noted for Shaun). A Husk shows its chill stacks.

/** Where the player stands to use the identification bench, world px (in reach of it). */
const BENCH_SPOT = { x: 2.3 * 32, y: 12.5 * 32 };

/** Claims the shrine (029: the Stages rows show from then on) and stands at the bench in the foundry. */
function claimShrineAtBench(page: Page) {
  return page.evaluate((at) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    if (g.step(0).room !== 'foundry') h.toFoundry();
    h.walkTo(at.x, at.y);
  }, BENCH_SPOT);
}

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
    s = g.step(1, { deposit: { id: rime.id, itemId: 'rimestone', amount: 'half' } });
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
  await claimShrineAtBench(page);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
  const before = await page.evaluate(() => window.__GAME__?.getState().inventory['arrow+frost'] ?? 0);
  const row = (await ui(page))?.tagged.benchStages?.rows.find((r) => r.stageId === 'frost-rune-arrow');
  if (!row) throw new Error('no frost rune row');
  expect(row.dimmed).toBe(false);
  expect(row.texts).toEqual(expect.arrayContaining(['Frost rune', 'Arrow', 'Rimestone', 'Frost arrow', '+4']));
  const p = await screenPoint(page, row.x + row.w / 2, row.y + row.h / 2);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(async () => page.evaluate(() => window.__GAME__?.step(1).inventory['arrow+frost'] ?? 0))
    .toBe(before + 4);
  expect(errors).toEqual([]);
});

// Bug (Shaun, 2026-10-20): the panel showed "0/4 arrows" with arrows in an intake entrance. Its count is what the
// sim reads as held: carried plus the entrances' reservoirs (029, raised after the build).
test("the Stages panel's arrow count includes the arrows in an intake entrance", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await toIntake(page);
  // Every carried arrow goes into a hopper line, which fills the centre entrance to its cap and stops.
  const fed = await feedLines(page, [{ tx: 12, itemId: 'arrow', amount: 'all' }], 30);
  expect(fed.intake.entrances[1]).toMatchObject({ ammo: 'arrow', count: 30 });
  await claimShrineAtBench(page);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
  const row = async () => (await ui(page))?.tagged.benchStages?.rows.find((r) => r.stageId === 'frost-rune-arrow');
  // No arrows carried, 30 in the centre entrance: the old count read "0/4".
  expect(await page.evaluate(() => window.__GAME__?.getState().inventory['arrow'] ?? 0)).toBe(0);
  await expect.poll(async () => (await row())?.texts[0]).toBe('30/4');
  expect((await row())?.dimmed).toBe(false);
  expect(errors).toEqual([]);
});
