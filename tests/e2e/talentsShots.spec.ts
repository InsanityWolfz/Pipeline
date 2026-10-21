import { expect, test, type Page } from '@playwright/test';
import { VIEW_WIDTH } from '../../src/data/config';
import { XP_CURVE } from '../../src/data/leveling';
import { boot, cameraSettled } from './helpers';
import { screenPoint } from './foundryPage';

// Review screenshots for 037 (REVIEW_SHOTS=1, into docs/review/037): the tree panel
// with taken, available and dim nodes and a hover; the XP bar with its level and pip;
// the level-up flash and line (held on the tween clock); Blastfletch's Pool,
// Shatterpoint's ice burst and Overpressure's heat; and the new sprites on the sheet.

const SHOTS = 'docs/review/037';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** ?playtest at the wake stone, settled, with `xp` gained and these talents taken (each with a point). */
async function start(page: Page, xp: number, talents: string[] = []): Promise<void> {
  await boot(page, '?playtest');
  await page.evaluate(
    ([amount, ids]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1);
      g.gainXp(amount);
      for (const id of ids) g.step(1, { takeTalent: id });
    },
    [xp, talents] as const,
  );
  await cameraSettled(page, 20_000);
}

/** XP for reaching `level` from level 1. */
const toLevel = (level: number): number => XP_CURVE.slice(0, level - 1).reduce((n, x) => n + x, 0);

/** Shoots a Husk spawned to the right until it dies, with the given ammo selected first. */
async function shootHusk(page: Page, dx = 150): Promise<void> {
  await page.evaluate((off) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    const id = g.spawnEnemy('husk', p.x + off, p.y).enemies.at(-1)?.id;
    for (let t = 0; t < 600; t++) {
      const e = g.getState().enemies.find((en) => en.id === id);
      if (!e) return;
      g.step(1, { fire: true, use: true, aimX: e.x, aimY: e.y - 4 });
    }
  }, dx);
}

test.describe('review screenshots (037)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/037');

  test('the tree panel: taken, available and dim nodes, glowing links, a hover; the XP bar with its pip', async ({ page }) => {
    test.setTimeout(120_000);
    // Level 9: eight points, seven spent along Arrows to Shatterpoint, Survival and the Tube's first node.
    await start(page, toLevel(9) + 120, ['a1', 'a2', 'a3', 'k2', 's1', 's2', 't1']);
    await page.keyboard.press('t');
    await expect.poll(async () => (await ui(page))?.talents.open).toBe(true);
    const k1 = (await ui(page))?.talents.nodes.find((n) => n.id === 'k1');
    if (!k1) throw new Error('no Blastfletch');
    const at = await screenPoint(page, k1.x, k1.y);
    await page.mouse.move(at.x, at.y);
    await expect.poll(async () => (await ui(page))?.talents.hover?.id).toBe('k1');
    const panel = (await ui(page))?.talents;
    expect(panel?.nodes.filter((n) => n.state === 'taken')).toHaveLength(8);
    expect(panel?.nodes.some((n) => n.state === 'available')).toBe(true);
    expect(panel?.nodes.some((n) => n.state === 'dim')).toBe(true);
    await page.screenshot({ path: `${SHOTS}/01-tree-panel.png` });
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await ui(page))?.talents.open).toBe(false);
    // The XP bar under the HP bar: "Lv 9" and the pip for the unspent point.
    const health = (await ui(page))?.health;
    if (!health) throw new Error('no HP block');
    expect(health.xp.text).toBe('Lv 9');
    expect(health.xp.pip).toBe(true);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('no canvas');
    const zoom = canvas.width / VIEW_WIDTH;
    await page.screenshot({ path: `${SHOTS}/02-xp-bar.png`, clip: { x: canvas.x, y: canvas.y + (health.box.y - 6) * zoom, width: (health.box.w + 40) * zoom, height: (health.box.h + 12) * zoom } });
  });

  test('the level-up: the cyan ring on the player and the line over the HUD, held mid-flash', async ({ page }) => {
    test.setTimeout(120_000);
    // One XP short of level 2: the next Husk kill levels up.
    await start(page, (XP_CURVE[0] ?? 0) - 1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.5));
    await shootHusk(page);
    expect((await page.evaluate(() => window.__GAME__?.getState()))?.level).toBe(2);
    await expect.poll(async () => (await ui(page))?.talentFx.levelRings).toBeGreaterThan(0);
    // Into the ring's growth before holding it.
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    expect((await ui(page))?.talentFx.levelLine).toBe('Level 2 · talent point (T)');
    await page.screenshot({ path: `${SHOTS}/03-level-up.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('Blastfletch’s Pool with a pooled arrow crossing it, then its burst on a Husk', async ({ page }) => {
    test.setTimeout(120_000);
    // Reached through the Arrows lane, so the bomb keeps its full flight: it lands after the tube's 40-tick bomb
    // interval runs out, and the arrows loosed then meet its Pool.
    await start(page, toLevel(5), ['a1', 'a2', 'a3', 'k1']);
    const crossing = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      window.__helpers?.hold('bomb');
      const p = g.step(0).player;
      g.step(1, { use: true, aimX: p.x + 192, aimY: p.y });
      window.__helpers?.hold('arrow');
      // Arrows held at the blast's spot: the sim is held the tick one takes the Pool and still well inside the ground.
      for (let t = 0; t < 120; t++) {
        const s = g.step(1, { use: true, aimX: p.x + 300, aimY: p.y });
        const c = s.pools[0];
        const a = s.arrows.find((r) => r.pooled);
        if (c && a && Math.hypot(a.x - c.x, a.y - c.y) < c.radius - 12) return true;
      }
      return false;
    });
    expect(crossing).toBe(true);
    await expect.poll(async () => (await ui(page))?.talentFx.pools).toBeGreaterThan(0);
    // The sim is held, so the charge and the arrow stay; let the bomb's own fire burst play out first so the shimmer shows.
    await page.waitForTimeout(800);
    expect((await ui(page))?.talentFx.pools).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/04-blastfletch-charge.png` });
    // On: the pooled arrow bursts on a Husk in its path, held mid-flash on the tween clock.
    const burst = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const a = g.getState().arrows.find((r) => r.pooled);
      if (!a) return false;
      g.spawnEnemy('husk', a.x + 50, a.y);
      g.tweenSpeed(0.25);
      for (let t = 0; t < 30; t++) if (g.step(1).events.poolBursts.length > 0) return true;
      return false;
    });
    expect(burst).toBe(true);
    await expect.poll(async () => (await ui(page))?.talentFx.poolBursts).toBeGreaterThan(0);
    await page.waitForTimeout(250);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/04b-blastfletch-burst.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('Shatterpoint’s ice burst on a frozen Husk', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page, toLevel(5), ['a1', 'a2', 'a3', 'k2']);
    const shattered = await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const p = g.step(1).player;
      for (let i = 0; i < 6; i++) g.drop('arrow+frost', p.x, p.y + 4);
      h.collect();
      // Selected by name: the hotbar's first slot holds the plain arrows ?playtest carries.
      h.hold('arrow+frost');
      const q = g.getState().player;
      const id = g.spawnEnemy('husk', q.x + 120, q.y).enemies.at(-1)?.id;
      // Frost arrows until it freezes (its health topped up), then a ley bolt.
      for (let t = 0; t < 400; t++) {
        const e = g.getState().enemies.find((en) => en.id === id);
        if (!e) return false;
        g.setEnemyHealth(e.id, 40);
        if (e.frozen > 0) break;
        g.step(1, { use: true, aimX: e.x, aimY: e.y - 4 });
      }
      g.tweenSpeed(0.5);
      window.__helpers?.hold('ley-bolt');
      for (let t = 0; t < 120; t++) {
        const e = g.getState().enemies.find((en) => en.id === id);
        if (!e) return false;
        if (g.step(1, { use: true, aimX: e.x, aimY: e.y - 4 }).events.shatters.length > 0) return true;
      }
      return false;
    });
    expect(shattered).toBe(true);
    await expect.poll(async () => (await ui(page))?.talentFx.iceBursts).toBeGreaterThan(0);
    // Into the burst's growth before holding it.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/05-shatterpoint-ice-burst.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('Overpressure’s heat on the tube once the ramp is up', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page, toLevel(5), ['t1', 't2', 't3', 'k3']);
    const ramp = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      return g.step(120, { use: true, aimX: p.x + 200, aimY: p.y - 20 }).overpressure;
    });
    expect(ramp.ticks).toBe(120);
    await expect.poll(async () => (await ui(page))?.talentFx.heat).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/06-overpressure-heat.png` });
  });

  test('the new sprites on the contact sheet', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    const names = ['talent-node', 'talent-keystone', 'talent-start', 'talent-halo', 'talent-ring', 'talent-lane-arrows', 'talent-lane-bombs', 'talent-lane-ley', 'talent-lane-survival', 'talent-lane-tube', 'talent-blastfletch', 'talent-shatterpoint', 'talent-overpressure', 'talent-pip', 'level-ring', 'pool', 'ice-burst', 'shard-cold', 'heat-shimmer'];
    for (const [i, name] of names.entries()) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/sheet-${String(i + 1).padStart(2, '0')}-${name}.png` });
    }
  });
});
