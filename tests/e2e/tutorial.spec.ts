import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { buildGhosts, CHAIN, cutIn, expectGoal, installRunHelpers, T } from './tutorialPage';
import { OVERWORLD } from '../../src/data/overworld';

// The tutorial end to end (012; 058's chain), in two files. This one: a New game, no ?playtest, every goal from the
// tube to leaving the foundry played through the hook in order, checking each one comes up and ticks off. The ley bolt
// line is built on its ghosts, piece by piece, as getState() lists them, with the build lock refusing anything else.
// The ruin field's Husks and the shrine's Warden are fought by the bot. tutorialFrost.spec.ts plays on from there.

test('the guided tutorial plays from a New game until it leaves the foundry', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  await installRunHelpers(page);

  // 1. The tube from its stone, just north of where the player wakes.
  await expectGoal(page, 1);
  await page.evaluate((tile) => {
    window.__helpers?.walkTo((40.5 + (window.__helpers?.ox ?? 0)) * tile, (34.5 + (window.__helpers?.oy ?? 0)) * tile);
    window.__GAME__?.step(1, { interact: true });
  }, T);
  await expectGoal(page, 2);

  // 2. Gather in the meadow (nodes 0-8, src/data/overworld.ts): the ley vein, then east and back west.
  await page.evaluate(() => {
    for (const i of [8, 3, 7, 5, 6, 1, 0]) window.__helpers?.harvest(i, 3);
  });
  await expectGoal(page, 3);

  // 3. Craft arrows.
  await page.evaluate(() => {
    const g = window.__GAME__;
    for (const r of ['shaft', 'shaft', 'shaft', 'arrowhead', 'arrowhead', 'arrowhead', 'rope', 'rope', 'rope']) g?.craft(r);
    for (let i = 0; i < 6; i++) g?.craft('arrow');
  });
  await expectGoal(page, 4);

  // 4. Round the foundry ruin's east side into the ruin field, and clear the Husk pack. The first talent point's cut-in
  // is answered by `goal` wherever it comes (T, a talent linked to the start).
  await page.evaluate(() => {
    const w = window as unknown as { clearGroup: (group: string) => void };
    const h = window.__helpers;
    const X = h?.ox ?? 0;
    const Y = h?.oy ?? 0;
    h?.walkTo((41.5 + X) * 32, window.__GAME__?.getState().player.y ?? 0);
    h?.walkTo((41.5 + X) * 32, (22.5 + Y) * 32);
    h?.walkTo((45.5 + X) * 32, (22.5 + Y) * 32);
    h?.walkTo((45.5 + X) * 32, (17.5 + Y) * 32);
    w.clearGroup('field');
  });
  await expectGoal(page, 5);

  // 5. The meadow vein grows back three times over (waited out): crystals for ley bolts; raws for the refill later.
  await page.evaluate(() => {
    const h = window.__helpers;
    const g = window.__GAME__;
    for (let i = 0; i < 3; i++) {
      g?.step(1800);
      h?.harvest(8, 3);
    }
    for (const node of [1, 6]) h?.harvest(node, 2);
    h?.harvest(5, 3);
    for (const r of ['ley-dust', 'casing', 'fuse', 'bomb', 'ley-bolt']) g?.craft(r);
  });
  await expectGoal(page, 6);

  // 6. Down the foundry's stairs: the tube attunes and the example line stands there, running.
  await page.evaluate(() => window.__helpers?.toFoundry());
  expect(await page.evaluate(() => window.__GAME__?.getState().foundry.pieces.length)).toBe(9);
  // 7. The line fills the tube on its own.
  await expectGoal(page, 7);
  const filled = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    for (let t = 0; t < 4000 && s && !s.firstLineFull; t++) s = g?.step(1);
    return s?.firstLineFull;
  });
  expect(filled).toBe(true);
  // The build lock holds: building is refused, with the line still standing.
  const locked = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { toggleBuild: true });
    const s = g?.step(1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    const p = g?.step(1, { pickUp: { tx: 12, ty: 1 } });
    g?.step(1, { toggleBuild: true });
    return { locked: s?.guided.locked, fails: s?.events.placeFails.map((f) => f.reason), pickUpFails: p?.events.pickUpFails.length, pieces: p?.foundry.pieces.length };
  });
  expect(locked).toEqual({ locked: true, fails: ['tutorial'], pickUpFails: 1, pieces: 9 });
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) return;
    for (let i = 0; i < 20 && (g.getState().inventory['ley-crystal'] ?? 0) > 0; i++) g.craft('ley-dust');
    for (let i = 0; i < 40 && (g.getState().inventory['ley-dust'] ?? 0) > 0; i++) g.craft('ley-bolt');
  });
  await expectGoal(page, 8);

  // 8-9. Identify the first Husk's armor at the bench (by the door), then wear it.
  await page.evaluate((tile) => {
    window.__helpers?.walkTo(21.7 * tile, 9.5 * tile);
    window.__GAME__?.step(1, { identify: true });
  }, T);
  await expectGoal(page, 9);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const piece = g?.getState().gear[0];
    if (piece) g?.step(1, { equip: { id: piece.id } });
  });
  await expectGoal(page, 10);

  // 10. Up the stairs to the shrine (its door opened with the full line, 055), E in, clear it and claim the pylon; the
  // tube fires off the rest of the line's arrows, so it has run dry by the time the player is home.
  await page.evaluate(
    ([tile, gate, pylon]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      const w = window as unknown as { through: (...a: unknown[]) => void; clearGroup: (group: string) => void };
      if (!g || !h) throw new Error('no game');
      w.through(23, 8, 1, 0, 'overworld');
      h.walkTo((gate.tx + 0.5) * tile, (gate.ty + 2.5) * tile);
      h.walkTo((gate.tx + 0.5) * tile, (gate.ty + 1.5) * tile);
      if (g.step(1, { interact: true }).events.arenaEnters.length === 0) throw new Error('the shrine door did not open');
      w.clearGroup('shrine');
      const { tx, ty } = pylon;
      h.walkTo((tx + 2.5) * tile, g.getState().player.y);
      h.walkTo((tx + 2.5) * tile, (ty + 1.5) * tile);
      h.walkTo((tx + 0.5) * tile, (ty + 1.5) * tile);
      for (let i = 0; i < 3; i++) {
        const s = g.getState();
        const near = s.enemies.find((e) => e.room === s.room && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 200);
        if (!near) break;
        w.clearGroup(near.group);
        h.walkTo((tx + 0.5) * tile, (ty + 1.5) * tile);
      }
      g.step(1, { interact: true });
      g.step(130);
      for (let t = 0; t < 6000 && !g.getState().lineRanDry; t++) {
        const p = g.getState().player;
        g.step(1, { fire: true, aimX: p.x, aimY: p.y - 96 });
      }
    },
    [T, OVERWORLD.shrine.door[1] ?? OVERWORLD.shrine.pylon, OVERWORLD.shrine.pylon] as const,
  );
  expect(await page.evaluate(() => window.__GAME__?.getState().claims)).toContain('shrine');
  await expectGoal(page, 11);

  // 11. Home by the pylon's fast travel; the line ran dry first, so 12, the refill, shows.
  const home = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { pylon: 'travel' });
    return g?.step(1, { takeStash: { itemId: null } });
  });
  expect(home?.room).toBe('foundry');
  await expectGoal(page, 12);
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const [tx, raw] of [[11, 'wood'], [12, 'stone'], [13, 'fiber']] as const) {
      h.walkTo((tx + 0.5) * tile, 6.25 * tile);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
      if (!hopper) throw new Error(`no hopper at ${tx},5`);
      g.step(1, { deposit: { id: hopper.id, itemId: raw, amount: 'all' } });
    }
  }, T);
  await expectGoal(page, 13);

  // 13. The Warden's core restores the right entrance: only its cap takes it during the tutorial (058.5).
  const opened = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(14.5 * tile, 1.5 * tile);
    const s = g.step(1, { restore: 'entrance-2' });
    return s.intake.entrances.map((e) => e.open);
  }, T);
  expect(opened).toEqual([false, true, true, false]);
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
  // The first talent point came and was spent through its cut-in.
  expect(cutIn.at).not.toBeNull();
  test.info().annotations.push({ type: 'talent cut-in', description: cutIn.at ?? '' });
  expect(errors).toEqual([]);
});
