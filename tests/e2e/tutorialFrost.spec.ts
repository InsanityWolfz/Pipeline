import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';
import { enterArena } from './arenaHelpers';
import { clickRow, flowIs } from './flowPage';
import { craftLeyByHand, goalTo, newGameInFoundry } from './guidedPage';
import { buildGhosts, CHAIN, expectGoal, fell, harvestNear, installRunHelpers, T, trek, walk } from './tutorialPage';
import { CLAIM_TICKS } from '../../src/data/claims';
import { GROTTO, GROTTO_GROUP } from '../../src/data/grotto';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_SITES } from '../../src/data/hollowsSites';
import { landmarkDef } from '../../src/data/landmarks';

// The tutorial end to end (012; 058's chain), second file (tutorial.spec.ts plays a New game until it leaves the
// foundry). A New game staged through the hook to the right entrance's goal (ley bolts crafted by hand, the shrine
// claimed, a Warden core and what the first half would carry), the ley bolt line built on its ghosts again, then
// every goal from leaving the foundry to the end: the frost rune on its ghosts with the first underground pair, and
// from the Frozen Grotto on the guards and the Bulwark felled through the hook (hollows.spec.ts fights the Bulwark),
// so the run stays inside its time.

const HIVE = landmarkDef('husk-hive');
const TERRACE = HOLLOWS_SITES.find((l) => l.id === 'cistern-terrace')?.pylon ?? { tx: 0, ty: 0 };

/** What the first half carries into the second: the Warden's core, arrows to frost, raws for the line, ley bolts to feed. */
const CARRIED: readonly (readonly [string, number])[] = [
  ['warden-core', 1],
  ['arrow', 6],
  ['wood', 6],
  ['stone', 6],
  ['fiber', 6],
  ['ley-bolt', 12],
];

/**
 * Claims the pylon the player stands at, felling whatever is near first; a hit breaks the hold (032), so it tries
 * again a few times (a shot from beyond the felled ring can still land).
 */
async function claimHere(page: Page): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await fell(page, [], 900);
    const claimed = await page.evaluate((ticks) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const before = g.getState().claims.length;
      g.step(1, { interact: true });
      return g.step(ticks + 10).claims.length > before;
    }, CLAIM_TICKS);
    if (claimed) return;
  }
  throw new Error('could not claim the pylon');
}

test('the guided tutorial plays from leaving the foundry to its end', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = watchErrors(page);
  await newGameInFoundry(page);
  await craftLeyByHand(page);
  await installRunHelpers(page);
  await page.evaluate((carried) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.claim('shrine');
    const p = g.getState().player;
    for (const [id, n] of carried) for (let i = 0; i < n; i++) g.drop(id, p.x, p.y);
    g.step(30);
  }, CARRIED);
  await goalTo(page, CHAIN[12] ?? '');
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.inventory['warden-core']).toBe(1);

  // 13. The Warden's core restores the right entrance: only its cap takes it during the tutorial (058.5).
  const opened = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(14.5 * tile, 1.5 * tile);
    const s = g.step(1, { restore: 'entrance-2' });
    return s.intake.entrances.map((e) => e.open);
  }, T);
  expect(opened).toEqual([false, true, true]);
  await expectGoal(page, 14);

  // 14. The ley bolt line, piece by piece on its ghosts, until ley bolts reach the right entrance.
  const ley = await buildGhosts(page);
  expect(ley).toEqual({ placed: 25, refused: 1 });
  const bolts = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.step(1);
    for (let t = 0; t < 6000 && s && s.intake.entrances[2]?.ammo !== 'ley-bolt'; t++) s = g?.step(1);
    return s?.intake.entrances[2]?.ammo;
  });
  expect(bolts).toBe('ley-bolt');
  await expectGoal(page, 15);

  // 15. Out of the foundry: done on the step outside, and the Grotto's goal at once.
  await page.evaluate(() => (window as unknown as { through: (...a: unknown[]) => void }).through(23, 8, 1, 0, 'overworld'));
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.objective.text).toBe(CHAIN[15]);

  // 16. North to the Frozen Grotto, its guards felled, and its rimestone gathered.
  await fell(page, [GROTTO_GROUP]);
  await trek(page, [[GROTTO.pylon.tx, GROTTO.area.y1 + 2]]);
  await fell(page, [GROTTO_GROUP]);
  await harvestNear(page, 'rime-outcrop', 2);
  await expectGoal(page, 17);

  // 17. Its pylon, claimed.
  await walk(page, [[GROTTO.pylon.tx, GROTTO.pylon.ty + 1]]);
  await claimHere(page);
  await expectGoal(page, 18);

  // 18. Frost arrows by hand.
  await page.evaluate(() => window.__GAME__?.craft('frost-rune-arrow'));
  await expectGoal(page, 19);

  // 19. Home by the Grotto's pylon: the conduit out of the assembler comes out, the frost rune goes in, and the
  // rimestone line runs to it under the ley line by the first underground pair. The example line gets raws to run on.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { pylon: 'travel' });
  });
  const frost = await buildGhosts(page);
  expect(frost).toEqual({ placed: 21, refused: 1 });
  const made = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { takeStash: { itemId: null } });
    for (const [tx, raw] of [[11, 'wood'], [12, 'stone'], [13, 'fiber']] as const) {
      h.walkTo((tx + 0.5) * tile, 6.25 * tile);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
      if (hopper && (g.getState().inventory[raw] ?? 0) > 0) g.step(1, { deposit: { id: hopper.id, itemId: raw, amount: 'all' } });
    }
    let s = g.step(1);
    for (let t = 0; t < 8000 && s.guided.locked; t++) s = g.step(1);
    return { made: s.machineMade['arrow+frost'] ?? 0, locked: s.guided.locked };
  }, T);
  expect(made.locked).toBe(false);
  expect(made.made).toBeGreaterThan(0);
  await expectGoal(page, 20);

  // 20. The Husk Hive, its guards felled, its pylon claimed.
  await page.evaluate(() => (window as unknown as { through: (...a: unknown[]) => void }).through(23, 8, 1, 0, 'overworld'));
  await fell(page, ['husk-hive']);
  const hive = HIVE.pylon ?? { tx: 0, ty: 0 };
  await trek(page, [[Math.floor((HIVE.area.x0 + HIVE.area.x1) / 2), HIVE.area.y1 + 3]]);
  await fell(page, ['husk-hive']);
  await walk(page, [[hive.tx, hive.ty + 1]]);
  await claimHere(page);
  await expectGoal(page, 21);

  // 21. West to the barrier's crossing (down since the shrine's claim) and over into Stonefall Hollows.
  await trek(page, [[HOLLOWS.crossing.tx + 2, HOLLOWS.crossing.ty]]);
  await page.evaluate(() => {
    const g = window.__GAME__;
    for (let t = 0; t < 300 && g && g.getState().area.region !== 2; t++) g.step(1, { moveX: -1 });
  });
  await expectGoal(page, 22);

  // 22. The Cistern Terrace's pylon, its guards felled (all but the Bulwark).
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
    g.step(1);
  });
  await trek(page, [[TERRACE.tx, TERRACE.ty + 5], [TERRACE.tx, TERRACE.ty + 1]]);
  await claimHere(page);
  await expectGoal(page, 23);

  // 23. Into the Bulwark's arena by its door; it falls through the hook, and its core is picked up. 060: the way to the
  // door can pass a Hollows pack (the roads up into the Emberworks moved where packs stand), so it's felled at the door too.
  await fell(page, []);
  await walk(page, [[HOLLOWS.arena.door.leaveTo.tx, HOLLOWS.arena.door.leaveTo.ty]]);
  await fell(page, []);
  await enterArena(page, HOLLOWS.arena);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('no Bulwark');
    g.setEnemyHealth(b.id, 0);
    g.step(2);
    const core = g.getState().groundItems.find((i) => i.itemId === 'bulwark-core');
    if (core) h.walkTo(core.x, core.y + 12);
    g.step(200);
  });
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.inventory['bulwark-core'] ?? 0).toBeGreaterThan(0);
  await expectGoal(page, 24);

  // 24. Out of the arena, home by the Terrace's pylon, and the left cap restored with the Bulwark's core.
  // Whatever is still near after the fight is felled first: a hit on the way stops the walk out.
  await fell(page, [], 900);
  await page.evaluate((id) => window.__helpers?.leaveArena(id), HOLLOWS.arena.id);
  await fell(page, []);
  await walk(page, [[TERRACE.tx, TERRACE.ty + 1]]);
  const third = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { pylon: 'travel' });
    h.walkTo(11.5 * tile, 1.5 * tile);
    return g.step(1, { restore: 'entrance-3' }).intake.entrances.map((e) => e.open);
  }, T);
  expect(third).toEqual([true, true, true]);
  await expectGoal(page, 25);

  // 25. Building is open: the left entrance's floor tile is reached by an underground pair from below the example
  // line, fed from a hopper of ley bolts. All three entrances fed: the tutorial is over, and the goal panel and its
  // arrows are gone for good (the minimap stays).
  const end = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(13.5 * tile, 8.5 * tile);
    g.step(1, { place: { pieceId: 'underground-entrance', tx: 11, ty: 6, facing: 'up' } });
    g.step(1, { place: { pieceId: 'underground-exit', tx: 11, ty: 1, facing: 'up' } });
    const hopper = g.step(1, { place: { pieceId: 'hopper', tx: 11, ty: 7, facing: 'up' } }).foundry.pieces.find((p) => p.tx === 11 && p.ty === 7);
    if (!hopper) throw new Error('no hopper');
    h.walkTo(11.5 * tile, 8.4 * tile);
    const bolts = g.getState().inventory['ley-bolt'] ?? 0;
    g.step(1, { deposit: { id: hopper.id, itemId: (g.getState().inventory.bomb ?? 0) > 0 ? 'bomb' : 'ley-bolt', amount: 'all' } });
    let s = g.step(1);
    for (let t = 0; t < 2000 && s.objective.text !== ''; t++) s = g.step(1);
    return { bolts, objective: s.objective, volley: s.intake.volley.length };
  }, T);
  expect(end.objective).toEqual({ index: null, text: '' });
  expect(end.volley).toBe(3);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.objective.text).toBe('');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.waypoint).toBeNull();
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.foundryMap.shown).toBe(true);
  expect(errors).toEqual([]);
});
