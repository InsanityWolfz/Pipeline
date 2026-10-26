import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { EMBER_ENEMY_LOOK } from '../../src/data/emberworksEnemyAssets';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { cameraSettled, watchErrors } from './helpers';
import { screenPoint } from './foundryPage';
import { bootSandbox } from './sandboxPage';
import { frames, stepUntil } from './hollowsSandbox';

// The Emberworks' enemies (061) in the sandbox (044), each with its answer: a cinder mote killed beside a pack sets it
// burning; a sidestep dodges a bellows hound's dash; a slag golem splits into two whelps; and a shot at a kiln-tender
// breaks its beam (its target reading "Being repaired" on hover while it channels). Every check reads the sim's state.

/** Spawns an enemy through the dev hook `dx`, `dy` px from the player (group `dev`), at `health` if given; returns its id. */
async function spawnAt(page: Page, enemyId: string, dx: number, dy: number, health?: number): Promise<number> {
  return page.evaluate(
    ([id, x, y, hp]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const s = g.spawnEnemy(id, p.x + x, p.y + y);
      const e = s.enemies[s.enemies.length - 1];
      if (!e) throw new Error('no spawn');
      if (hp !== null) g.setEnemyHealth(e.id, hp);
      return e.id;
    },
    [enemyId, dx, dy, health ?? null] as const,
  );
}

const god = (page: Page) => page.evaluate(() => window.__GAME__?.step(1, { sandbox: { kind: 'god', on: true } }));

test("a cinder mote killed beside a pack bursts on it, setting it burning (and never the player)", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await god(page);
  const burst = await page.evaluate((group) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Two ring 4 Husks, 2 tiles apart: the mote between them, a tile from each.
    g.step(1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 4, champion: false, count: 2 } });
    const [a, b] = g.getState().enemies.filter((e) => e.group === group);
    if (!a || !b) throw new Error('no pack');
    const s = g.spawnEnemy('cinder-mote', (a.x + b.x) / 2, (a.y + b.y) / 2);
    const mote = s.enemies[s.enemies.length - 1];
    if (!mote) throw new Error('no mote');
    g.setEnemyHealth(mote.id, 0);
    const after = g.step(1);
    return { hit: after.events.deathBursts[0]?.hit.slice().sort(), pack: [a.id, b.id].sort(), burning: after.enemies.filter((e) => e.group === group && e.burn > 0).length, health: after.player.health, pools: after.floodPools.length };
  }, SPAWN_GROUP);
  expect(burst).toEqual({ hit: burst.pack, pack: burst.pack, burning: 2, health: 100, pools: 0 });
  // Drawn: flames on both.
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().enemyFlames)) ?? 0).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('a bellows hound: sidestep its lane during the wind-up and the dash runs past, leaving its trail', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  const id = await spawnAt(page, 'bellows-hound', 150, 0);
  await stepUntil(page, id, 'windup');
  const lane = await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.lane, id);
  expect(lane).toMatchObject({ dx: -1, length: 200, width: 24 });
  const run = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(25, { moveY: 1 });
    let dashed = 0;
    for (let t = 0; t < 120; t++) {
      const s = g.step(1);
      dashed += s.events.dashes.length;
      if (s.enemies.find((e) => e.id === eid)?.mode === 'recover') break;
    }
    const s = g.getState();
    return { dashed, health: s.player.health, mode: s.enemies.find((e) => e.id === eid)?.mode, trail: s.floodPools.filter((p) => p.owner === eid).map((p) => p.shape) };
  }, id);
  expect(run).toEqual({ dashed: 1, health: 100, mode: 'recover', trail: ['capsule'] });
  await frames(page);
  expect(errors).toEqual([]);
});

test('a slag golem splits as it dies: two whelps rise in its pack', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await god(page);
  const id = await spawnAt(page, 'slag-golem', 140, 0);
  const split = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setEnemyHealth(eid, 0);
    const s = g.step(1);
    // The whelp's own pen (044) holds one too: only the new ones count.
    const whelps = s.enemies.filter((e) => e.enemyId === 'slag-whelp' && !e.group.startsWith('sandbox-pen'));
    return { splits: s.events.golemSplits.length, whelps: whelps.length, groups: [...new Set(whelps.map((w) => w.group))], golem: s.enemies.some((e) => e.id === eid) };
  }, id);
  expect(split).toEqual({ splits: 1, whelps: 2, groups: ['dev'], golem: false });
  await frames(page, 8);
  expect(errors).toEqual([]);
});

test("a kiln-tender's beam: its hurt packmate reads as repaired, and a shot at the tender breaks the channel", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await bootSandbox(page);
  await god(page);
  const golem = await spawnAt(page, 'slag-golem', 90, 60, 30);
  const tender = await spawnAt(page, 'kiln-tender', 150, -110);
  await stepUntil(page, tender, 'swipe');
  const beam = await page.evaluate((tid) => window.__GAME__?.getState().enemies.find((e) => e.id === tid)?.beam, tender);
  expect(beam).toEqual({ target: golem, phase: 'channel' });
  await frames(page);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.beams)) ?? []).toEqual([{ id: tender, target: golem, channel: true }]);
  // Hovering the golem: "Being repaired" under its name.
  await cameraSettled(page, 20_000);
  const hovered = async () => {
    const ui = await page.evaluate(() => window.__GAME__?.ui());
    const g = await page.evaluate((gid) => window.__GAME__?.getState().enemies.find((e) => e.id === gid), golem);
    if (!ui || !g) return null;
    const p = await screenPoint(page, g.x - (ui.camera.x - VIEW_WIDTH / 2), g.y - 14 - (ui.camera.y - VIEW_HEIGHT / 2));
    await page.mouse.move(p.x, p.y);
    const after = await page.evaluate(() => window.__GAME__?.ui());
    return { name: after?.hoverName, line: after?.hoverDescription };
  };
  await expect.poll(hovered, { timeout: 20_000 }).toEqual({ name: 'Slag golem', line: EMBER_ENEMY_LOOK.beam.hoverLine });
  // A carried arrow at the tender: the hit breaks its channel.
  const broke = await page.evaluate((tid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 90; t++) {
      const e = g.getState().enemies.find((x) => x.id === tid);
      if (!e) return null;
      const s = g.step(1, { use: true, aimX: e.x, aimY: e.y - 12 });
      const b = s.events.beamBreaks[0];
      if (b) return { reason: b.reason, mode: s.enemies.find((x) => x.id === tid)?.mode, beam: s.enemies.find((x) => x.id === tid)?.beam };
    }
    return null;
  }, tender);
  expect(broke).toEqual({ reason: 'hurt', mode: 'recover', beam: null });
  expect(errors).toEqual([]);
});
