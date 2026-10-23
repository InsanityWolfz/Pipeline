import { expect, test } from '@playwright/test';
import { CLAIM_TICKS } from '../../src/data/claims';
import { EMBERWORKS } from '../../src/data/emberworks';
import { landmarkDef } from '../../src/data/landmarks';
import { polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { boot, watchErrors } from './helpers';
import { clickRow, flowIs } from './flowPage';
import { step } from './foundryPage';

// The Emberworks (060): its ley barrier stands across the top of each ramp up through the Hollows' cliff edge until
// the Bulwark's first kill; then it collapses and the player walks up the ramp into ring 4, region 3. Up there, the
// Ash Kilns' pylon is claimed by holding E (no guards until 061), and sends cinderite home up its new port.

const RAMP = EMBERWORKS.ramps.find((r) => r.id === 'west-ramp') ?? { bearing: 0 };
const FOOT = polar(RAMP.bearing, EMBERWORKS.ramp.from + 1);
const TOP = polar(RAMP.bearing, EMBERWORKS.ramp.to + 2);

test('the Bulwark’s first kill drops the ramps’ barrier, and the player walks up into the Emberworks', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  // At the ramp's foot with the barrier up: walking up it stops at the barrier.
  const blocked = await page.evaluate(
    ([foot, top, c]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      g.step(1);
      h.walkTo((foot.tx + 0.5) * 32, (foot.ty + 0.5) * 32);
      // No way up while it stands: the walk gives up against it.
      try {
        h.walkTo((top.tx + 0.5) * 32, (top.ty + 0.5) * 32);
      } catch {
        // Expected: the barrier stops the walk.
      }
      const s = g.getState();
      return { gate: s.gates.emberworks, out: Math.hypot(s.player.x / 32 - 0.5 - c.tx, s.player.y / 32 - 0.5 - c.ty) };
    },
    [FOOT, TOP, WORLD_SHAPE.centre] as const,
  );
  expect(blocked.gate).toBe(false);
  expect(blocked.out).toBeLessThan(EMBERWORKS.ramp.gateAt);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.barrier).toBe('shut');

  // The Bulwark falls: the barrier drops with its gate event and collapses.
  const fell = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const boss = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (!boss) throw new Error('no Bulwark');
    g.setEnemyHealth(boss.id, 0);
    for (let t = 0; t < 120; t++) {
      const s = g.step(1);
      if (s.events.gates.some((x) => x.gate === 'emberworks')) return { gate: s.gates.emberworks, defeats: s.bossDefeats };
    }
    return null;
  });
  expect(fell).toEqual({ gate: true, defeats: ['bulwark'] });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.barrier).not.toBe('shut');
  // 042: the first kill's end card shows 180 ticks on; Keep playing closes it.
  await page.evaluate(() => window.__GAME__?.step(200));
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }

  // Up the ramp, into ring 4 and region 3.
  const up = await page.evaluate((top) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo((top.tx + 0.5) * 32, (top.ty + 0.5) * 32);
    const s = g.getState();
    return { tile: { tx: Math.floor(s.player.x / 32), ty: Math.floor(s.player.y / 32) }, ring: s.area.ring, region: s.area.region };
  }, TOP);
  expect(up).toEqual({ tile: TOP, ring: 4, region: 3 });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.barrier, { timeout: 20_000 }).toBe('down');
  expect(errors).toEqual([]);
});

test('claim the Ash Kilns: held E at its pylon, and its cinderite port counts it', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  const pylon = landmarkDef('ash-kilns').pylon ?? { tx: 0, ty: 0 };
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    g.step(1);
  });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.getState().gates.emberworks)) ?? false).toBe(true);
  // 042: the Bulwark's first kill's end card shows 180 ticks on; Keep playing closes it.
  await page.evaluate(() => window.__GAME__?.step(200));
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  await page.evaluate(([tx, ty]) => window.__helpers?.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32), [pylon.tx, pylon.ty] as const);
  const there = await step(page, 1, { interact: true });
  expect(there.area).toMatchObject({ ring: 4, region: 3 });
  const claimed = await step(page, CLAIM_TICKS + 2);
  expect(claimed.claims).toContain('ash-kilns');
  expect(claimed.landmarks.find((l) => l.id === 'ash-kilns')).toMatchObject({ claimed: true });
  expect(claimed.ports.find((p) => p.raw === 'cinderite')).toMatchObject({ pylons: 1, perMinute: 15 });
  expect(errors).toEqual([]);
});
