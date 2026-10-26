import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { buildGhosts, CHAIN, cutIn, expectGoal, installRunHelpers, T } from './tutorialPage';
import { OVERWORLD } from '../../src/data/overworld';

// The tutorial end to end (012; 058's chain; 067's opening), in two files. This one: a New game, no ?playtest, every
// goal from the tube to leaving the foundry played through the hook in order, checking each one comes up and ticks
// off. Bombs and ley bolts are made by hand before the foundry, which opens only on the shrine's claim. The arrow line
// and the ley bolt line are built on their ghosts, piece by piece, as getState() lists them, with the build lock
// refusing anything else. The ruin field's Husks and the shrine's Warden are fought by the bot. tutorialFrost.spec.ts
// plays on from there.

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

  // 4–6. The bombs need Husk resin, which the ruin field's Husks drop: round the foundry ruin's east side into the ruin
  // field and clear its pack (6 ticks off on the way; 067: the land's packs come out). The first talent point's cut-in
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
  const field = await page.evaluate(() => window.__GAME__?.step(1));
  expect(field).toMatchObject({ fieldCleared: true, populated: true, gates: { foundry: false } });
  expect(field?.inventory['husk-resin'] ?? 0).toBeGreaterThan(0);
  await expectGoal(page, 4);

  // 4–5. Bombs, then ley bolts, by hand (067: their rows show once stone, resin and ley crystal have been carried; the
  // meadow's vein gave the crystal).
  await page.evaluate(() => {
    const g = window.__GAME__;
    for (const r of ['casing', 'fuse', 'ley-dust', 'bomb']) g?.craft(r);
  });
  await expectGoal(page, 5);
  await page.evaluate(() => window.__GAME__?.craft('ley-bolt'));
  // 6 is done already: the line goes on to the Warden.
  await expectGoal(page, 7);
  expect(await page.evaluate(() => window.__GAME__?.getState().link.attuned)).toBe(false);

  // 7–8. To the shrine (its door open from the start, 067), E in, the Warden and its guards fought, then the pylon claimed.
  await page.evaluate(
    ([tile, gate, pylon]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      const w = window as unknown as { clearGroup: (group: string) => void };
      if (!g || !h) throw new Error('no game');
      h.walkTo((gate.tx + 0.5) * tile, (gate.ty + 2.5) * tile);
      h.walkTo((gate.tx + 0.5) * tile, (gate.ty + 1.5) * tile);
      if (g.step(1, { interact: true }).events.arenaEnters.length === 0) throw new Error('the shrine door did not open');
      w.clearGroup('shrine');
      const { tx, ty } = pylon;
      h.walkTo((tx + 2.5) * tile, g.getState().player.y);
      h.walkTo((tx + 2.5) * tile, (ty + 1.5) * tile);
      h.walkTo((tx + 0.5) * tile, (ty + 1.5) * tile);
    },
    [T, OVERWORLD.shrine.door[1] ?? OVERWORLD.shrine.pylon, OVERWORLD.shrine.pylon] as const,
  );
  await expectGoal(page, 8);
  // The foundry's stairs are still sealed.
  expect(await page.evaluate(() => window.__GAME__?.getState().gates.foundry)).toBe(false);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const w = window as unknown as { clearGroup: (group: string) => void };
    if (!g) throw new Error('no game');
    const pylon = g.getState().player;
    for (let i = 0; i < 3; i++) {
      const s = g.getState();
      const near = s.enemies.find((e) => e.room === s.room && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 200);
      if (!near) break;
      w.clearGroup(near.group);
      window.__helpers?.walkTo(pylon.x, pylon.y);
    }
    g.step(1, { interact: true });
    g.step(130);
  });
  const claimed = await page.evaluate(() => window.__GAME__?.step(1));
  expect(claimed?.claims).toContain('shrine');
  expect(claimed?.gates.foundry).toBe(true);
  await expectGoal(page, 9);

  // 9. Home by the pylon's fast travel: the tube attunes on this first entry, and the foundry floor is bare.
  const home = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { pylon: 'travel' });
    let s = g?.step(1, { takeStash: { itemId: null } });
    for (let t = 0; t < 600 && s && s.link.attunePulse > 0; t++) s = g?.step(1);
    return s;
  });
  expect(home?.room).toBe('foundry');
  expect(home?.link.attuned).toBe(true);
  expect(home?.foundry.pieces).toEqual([]);
  await expectGoal(page, 10);

  // 10. The arrow line, piece by piece on its ghosts, from the wood, stone and fiber ports (067).
  const arrows = await buildGhosts(page);
  expect(arrows).toEqual({ placed: 42, refused: 1 });
  await expectGoal(page, 11);

  // 11. The ports feed it: the tube fills with arrows, no hopper anywhere.
  const filled = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    for (let t = 0; t < 6000 && s && !s.firstLineFull; t++) s = g?.step(1);
    return { full: s?.firstLineFull, hoppers: s?.foundry.pieces.filter((p) => p.kind === 'hopper').length };
  });
  expect(filled).toEqual({ full: true, hoppers: 0 });
  // The build lock holds on: building is refused, with the line still standing.
  const locked = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { toggleBuild: true });
    const s = g?.step(1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    const p = g?.step(1, { pickUp: { tx: 12, ty: 1 } });
    g?.step(1, { toggleBuild: true });
    return { locked: s?.guided.locked, fails: s?.events.placeFails.map((f) => f.reason), pickUpFails: p?.events.pickUpFails.length, pieces: p?.foundry.pieces.length };
  });
  expect(locked).toEqual({ locked: true, fails: ['tutorial'], pickUpFails: 1, pieces: 42 });
  await expectGoal(page, 12);

  // 12-13. Identify the first Husk's armor at the bench (by the door), then wear it.
  await page.evaluate((tile) => {
    window.__helpers?.walkTo(21.7 * tile, 9.5 * tile);
    window.__GAME__?.step(1, { identify: true });
  }, T);
  await expectGoal(page, 13);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const piece = g?.getState().gear[0];
    if (piece) g?.step(1, { equip: { id: piece.id } });
  });
  await expectGoal(page, 14);

  // 14. The Warden's core restores the right entrance: only its cap takes it during the tutorial (058.5).
  const opened = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(14.5 * tile, 1.5 * tile);
    const s = g.step(1, { restore: 'entrance-2' });
    return s.intake.entrances.map((e) => e.open);
  }, T);
  expect(opened).toEqual([false, true, true, false, false]);
  await expectGoal(page, 15);

  // 15. The ley bolt line, piece by piece on its ghosts, until ley bolts reach the right entrance.
  const ley = await buildGhosts(page);
  expect(ley).toEqual({ placed: 25, refused: 1 });
  const bolts = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.step(1);
    for (let t = 0; t < 6000 && s && s.intake.entrances[2]?.ammo !== 'ley-bolt'; t++) s = g?.step(1);
    return s?.intake.entrances[2]?.ammo;
  });
  expect(bolts).toBe('ley-bolt');
  await expectGoal(page, 16);

  // 16. Out of the foundry: done on the step outside, and the Grotto's goal at once.
  await page.evaluate(() => (window as unknown as { through: (...a: unknown[]) => void }).through(23, 8, 1, 0, 'overworld'));
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.objective.text).toBe(CHAIN[16]);
  // The first talent point came and was spent through its cut-in.
  expect(cutIn.at).not.toBeNull();
  test.info().annotations.push({ type: 'talent cut-in', description: cutIn.at ?? '' });
  expect(errors).toEqual([]);
});
