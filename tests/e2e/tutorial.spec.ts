import { expect, test, type Page } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { enterArena } from './arenaHelpers';
import { clickRow, flowIs } from './flowPage';
import { CLAIM_TICKS } from '../../src/data/claims';
import { GROTTO, GROTTO_GROUP } from '../../src/data/grotto';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_SITES } from '../../src/data/hollowsSites';
import { landmarkDef } from '../../src/data/landmarks';
import { OVERWORLD } from '../../src/data/overworld';
import { OBJECTIVES } from '../../src/data/objectives';
import { TALENT_START, TALENTS } from '../../src/data/talents';

// The tutorial end to end (012; 058's chain): a New game, no ?playtest, every goal played through the hook in order,
// checking each one comes up and ticks off. Both guided builds are built on their ghosts, piece by piece, as getState()
// lists them, with the build lock refusing anything else. The ruin field's Husks and the shrine's Warden are fought by
// the bot; from the Frozen Grotto on, guards and the Bulwark fall through the hook (hollows.spec.ts fights the Bulwark),
// so the run stays inside its time.

const T = 32;
const CHAIN = OBJECTIVES.filter((o) => !o.cutIn).map((o) => o.text);
const TALENT_GOAL = OBJECTIVES.find((o) => o.cutIn)?.text ?? '';
/** A talent linked to the start: the first point goes there. */
const FIRST_TALENT = Object.values(TALENTS).find((t) => t.id !== TALENT_START && t.links.includes(TALENT_START))?.id ?? '';
const HIVE = landmarkDef('husk-hive');
const TERRACE = HOLLOWS_SITES.find((l) => l.id === 'cistern-terrace')?.pylon ?? { tx: 0, ty: 0 };

/** The level and the goal the line went back to after the talent cut-in, for the run's notes. */
let talentAt: string | null = null;

/** The goal the line shows after one more tick (crafts land between ticks); the talent cut-in is answered at once. */
async function goal(page: Page): Promise<string> {
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  if (s?.objective.text === TALENT_GOAL) {
    const after = await page.evaluate((id) => {
      const g = window.__GAME__;
      g?.step(1, { takeTalent: id });
      return g?.step(1);
    }, FIRST_TALENT);
    expect(after?.talents).toContain(FIRST_TALENT);
    talentAt = `level ${after?.level}, back to "${after?.objective.text}"`;
    return after?.objective.text ?? '';
  }
  return s?.objective.text ?? '';
}

/** Expects the line to show chain goal `n` (1-based, the spec's numbering). */
async function expectGoal(page: Page, n: number): Promise<void> {
  expect(await goal(page)).toBe(CHAIN[n - 1]);
}

/** Walks the player through tile points (absolute tiles). */
async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    for (const [tx, ty] of pts) window.__helpers?.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
  }, points);
}

/** Fells, through the hook, every enemy in these groups, and any other within `near` px of the player, healed: the long walks stay quiet. */
async function fell(page: Page, groups: readonly string[], near = 480): Promise<void> {
  await page.evaluate(
    ([gs, r]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const s = g.getState();
      for (const e of s.enemies) if (gs.includes(e.group) || (e.room === s.room && e.enemyId !== 'bulwark' && Math.hypot(e.x - s.player.x, e.y - s.player.y) < r)) g.setEnemyHealth(e.id, 0);
      g.setPlayerHealth(100);
      g.step(1);
    },
    [groups, near] as const,
  );
}

/** Walks through tile points, felling whatever comes near (through the hook) every few tiles of the way. */
async function trek(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  for (const [tx, ty] of points) {
    await fell(page, []);
    await walk(page, [[tx, ty]]);
  }
}

/** Harvests the first live node of a kind `times` times, picking up only what drops beside it (the world's other drops stay). */
async function harvestNear(page: Page, nodeId: string, times: number): Promise<void> {
  await page.evaluate(
    ([id, n]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (let i = 0; i < n; i++) {
        const node = g.getState().nodes.find((x) => x.nodeId === id && x.uses > 0 && x.room === g.getState().room);
        if (!node) throw new Error(`no ${id} left`);
        h.walkTo(node.x, node.y + 16);
        g.step(1, { interact: true });
        g.step(30);
        const p = g.getState().player;
        for (const item of g.getState().groundItems.filter((x) => Math.hypot(x.x - p.x, x.y - p.y) < 96)) {
          try {
            h.walkTo(item.x, item.y);
          } catch {
            // Under the node: its pull brings it in.
          }
        }
        g.step(30);
      }
    },
    [nodeId, times] as const,
  );
}

/** Builds the current guided step's ghosts in order, each by the command the build bar would send, standing clear. */
async function buildGhosts(page: Page): Promise<{ placed: number; refused: number }> {
  return page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(20.5 * 32, 13.5 * 32);
    if (!g.getState().building) g.step(1, { toggleBuild: true });
    // Off the ghost first: the lock refuses it.
    let refused = g.step(1, { place: { pieceId: 'conduit', tx: 18, ty: 13, facing: 'up' } }).events.placeFails.length;
    let placed = 0;
    for (let i = 0; i < 60; i++) {
      const next = g.getState().guided.ghosts[0];
      if (!next) break;
      const s = next.kind === 'remove' ? g.step(1, { pickUp: { tx: next.tx, ty: next.ty } }) : g.step(1, { place: { pieceId: next.piece, tx: next.tx, ty: next.ty, facing: next.facing } });
      if (s.events.placeFails.length > 0) throw new Error(`refused ${JSON.stringify(next)}: ${JSON.stringify(s.events.placeFails)}`);
      placed += 1;
    }
    refused += g.step(1, { toggleBuild: true }).events.placeFails.length;
    return { placed, refused };
  });
}

test('the guided tutorial plays through from a New game to its end', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  // Page-side helpers for this run: leaving the foundry, and fighting a group clear (017).
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    const w = window as unknown as Record<string, unknown>;
    const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
    /** Walks to a door tile's inside neighbour, then steps through it. */
    w.through = (tx: number, ty: number, dx: -1 | 0 | 1, dy: -1 | 0 | 1, to: string) => {
      h.walkTo((tx - dx + 0.5) * tile, (ty - dy + 0.5) * tile);
      for (let i = 0; i < 90 && g.getState().room !== to; i++) g.step(1, { moveX: dx, moveY: dy });
      if (g.getState().room !== to) throw new Error(`could not reach ${to}`);
    };
    /** Fights until a group is dead, kiting and rolling, picking ammo it has; anything else that comes close is fought first. */
    w.clearGroup = (group: string) => {
      let s = g.getState();
      let stuck = 0;
      for (let t = 0; t < 20000; t++) {
        const foes = s.enemies.filter((e) => e.group === group);
        if (foes.length === 0) break;
        if (s.events.ko) throw new Error(`knocked out clearing ${group}`);
        const p = s.player;
        const dist = (e: { x: number; y: number }) => Math.hypot(e.x - p.x, e.y - p.y);
        const near = s.enemies.filter((e) => dist(e) < 150).sort((a, b) => dist(a) - dist(b))[0] ?? foes.sort((a, b) => dist(a) - dist(b))[0];
        if (!near) break;
        const d = dist(near);
        const have = (id: string) => (s.inventory[id] ?? 0) + s.intake.entrances.reduce((n, e) => n + (e.ammo === id ? e.count : 0), 0);
        const ammo = have('arrow') > 0 ? 'arrow' : have('ley-bolt') > 0 ? 'ley-bolt' : 'bomb';
        if ((s.hotbar.slots[s.hotbar.selected] ?? '') !== ammo) h.hold(ammo);
        s = g.step(0);
        const dry = have('arrow') + have('ley-bolt') + have('bomb') === 0;
        const kite = !dry && d < 80;
        const close = dry ? d > 18 : d > 150;
        s = g.step(1, {
          moveX: kite ? toward(near.x, p.x) : close ? toward(p.x, near.x) : 0,
          moveY: kite ? toward(near.y, p.y) : close ? toward(p.y, near.y) : 0,
          dodge: near.mode === 'windup' && d < 90 && t % 20 === 0,
          fire: true,
          use: true,
          aimX: near.x,
          aimY: near.y - 8,
        });
        stuck = close && Math.hypot(s.player.x - p.x, s.player.y - p.y) < 0.1 ? stuck + 1 : 0;
        if (stuck > 20) {
          stuck = 0;
          try {
            h.walkTo(near.x, near.y + 64);
          } catch {
            // Unreachable from here; the fight goes on.
          }
          s = g.getState();
        }
      }
      h.collect();
    };
  }, T);

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
  await page.evaluate((ticks) => {
    const g = window.__GAME__;
    g?.step(1, { interact: true });
    g?.step(ticks + 10);
  }, CLAIM_TICKS);
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
  await page.evaluate((ticks) => {
    const g = window.__GAME__;
    g?.step(1, { interact: true });
    g?.step(ticks + 10);
  }, CLAIM_TICKS);
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
  await page.evaluate((ticks) => {
    const g = window.__GAME__;
    g?.step(1, { interact: true });
    g?.step(ticks + 10);
  }, CLAIM_TICKS);
  await expectGoal(page, 23);

  // 23. Into the Bulwark's arena by its door; it falls through the hook, and its core is picked up.
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
  // The first talent point came and was spent through its cut-in.
  expect(talentAt).not.toBeNull();
  test.info().annotations.push({ type: 'talent cut-in', description: talentAt ?? '' });
  expect(end.volley).toBe(3);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.objective.text).toBe('');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.waypoint).toBeNull();
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.foundryMap.shown).toBe(true);
  expect(errors).toEqual([]);
});
