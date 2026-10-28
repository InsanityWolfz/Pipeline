import { expect, test, type Page } from '@playwright/test';
import { enemyDef, type BulwarkDef, type ConductorDef, type ForgewrightDef } from '../../src/data/enemies';
import { SHAKE_ON } from '../../src/data/juice';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { heatBand } from '../../src/render/bossPhase';
import { FAN_SPOT, fanUntilVent } from './forgePage';
import { boot, watchErrors } from './helpers';
import { intoSandboxArena, intoShrine, tickDrawn } from './bossIntroPage';

// 080: each phase flip, staged with the sandbox's controls (god mode, the hook's health, rods broken), shows within a
// frame in `ui().bossPhase`, and the calm look comes straight back on a reset (leaving by the door). Through every
// scripted fight the camera shakes only on an intro's beat (wind-ups, hits, the roar, every phase flip and the death
// don't), and the same seed and commands give the same state through an intro on Low and High.

const BW = enemyDef('bulwark') as BulwarkDef;
const FW = enemyDef('forgewright') as ForgewrightDef;
const CD = enemyDef('conductor') as ConductorDef;

/** One tick drawn; that boss's phase look as drawn, the sim's own flags beside it, and the shakes so far. */
async function look(page: Page, boss: string, n = 1, command: Record<string, unknown> = {}) {
  const s = await tickDrawn(page, n, command, boss);
  const sim = await page.evaluate((id) => window.__GAME__?.getState().bosses.find((b) => b.enemyId === id) ?? null, boss);
  return { shown: s.phase.find((p) => p.boss === boss) ?? null, sim, cameraShakes: s.cameraShakes };
}

async function setHealth(page: Page, boss: string, health: number): Promise<void> {
  await page.evaluate(
    ([id, h]) => {
      const g = window.__GAME__;
      const e = g?.getState().enemies.find((x) => x.enemyId === id);
      if (g && e) g.setEnemyHealth(e.id, h);
    },
    [boss, health] as const,
  );
}

const leave = (page: Page, arena: string) => page.evaluate((id) => window.__helpers?.leaveArena(id), arena);

test('080: the Bulwark: called as its adds rise, enraged through its roar, calm again on a reset; no shake', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await intoSandboxArena(page, 'sunken-forum', false);
  const start = await look(page, 'bulwark');
  expect(start.shown).toMatchObject({ look: 'calm', enraged: false });
  await setHealth(page, 'bulwark', Math.floor(BW.maxHealth * BW.adds.below) - 1);
  const called = await look(page, 'bulwark', 2);
  expect(called.shown?.look).toBe('called');
  await setHealth(page, 'bulwark', Math.floor(BW.maxHealth * BW.enrage.below) - 1);
  let s = called;
  for (let t = 0; t < 400 && !s.shown?.roar; t++) s = await look(page, 'bulwark', 1);
  expect(s.shown).toMatchObject({ look: 'enraged', enraged: true, roar: true });
  for (let t = 0; t < 80 && s.shown?.roar; t++) s = await look(page, 'bulwark', 1);
  expect(s.shown).toMatchObject({ look: 'enraged', roar: false });
  await leave(page, 'sunken-forum');
  const reset = await look(page, 'bulwark');
  expect(reset.shown).toMatchObject({ look: 'calm', enraged: false, flare: false });
  expect(reset.cameraShakes).toBe(start.cameraShakes);
  expect(SHAKE_ON).toBe(false);
  expect(errors).toEqual([]);
});

test('080: the Forgewright: its heat bands, its vent and its enrage, calm again on a reset; no shake', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await intoSandboxArena(page, 'anvil-hall', false);
  const start = await look(page, 'forgewright');
  // Each band follows the sim's heat within a frame.
  let s = start;
  for (let t = 0; t < 1000 && (s.sim?.heat ?? 0) < FW.heat.max * 0.5; t++) {
    s = await look(page, 'forgewright', 10);
    const share = (s.sim?.heat ?? 0) / FW.heat.max;
    // The summary rounds heat to a tenth: a reading that close to a band's edge is skipped.
    if ([0.25, 0.5, 0.9].every((edge) => Math.abs(share - edge) * FW.heat.max > 0.1)) expect(s.shown?.heatBand, `heat ${s.sim?.heat}`).toBe(heatBand(share));
  }
  expect(s.shown?.heatBand).toBe(2);
  await page.evaluate((spot) => window.__helpers?.walkTo(spot.x, spot.y), FAN_SPOT);
  expect(await fanUntilVent(page, 3000)).toBeGreaterThan(0);
  const vent = await look(page, 'forgewright');
  expect(vent.shown).toMatchObject({ vent: true });
  await setHealth(page, 'forgewright', Math.floor(FW.maxHealth * FW.enrage.below) - 1);
  const enraged = await look(page, 'forgewright', 1);
  expect(enraged.shown).toMatchObject({ look: 'enraged', enraged: true, flare: true });
  await leave(page, 'anvil-hall');
  const reset = await look(page, 'forgewright');
  expect(reset.shown).toMatchObject({ look: 'heat', heatBand: 0, enraged: false, vent: false });
  expect(reset.cameraShakes).toBe(start.cameraShakes);
  expect(errors).toEqual([]);
});

test('080: the Conductor: shielded, open, grounded and enraged, shielded again on a reset; no shake', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await intoSandboxArena(page, 'crown-spire', false);
  const start = await look(page, 'conductor');
  expect(start.shown).toMatchObject({ look: 'shielded', shield: true, grounded: false });
  const breakTo = (standing: number) =>
    page.evaluate(
      ([sockets, m, want]) => {
        const g = window.__GAME__;
        const h = window.__helpers;
        if (!g || !h) throw new Error('no game');
        const boss = () => g.getState().bosses.find((b) => b.enemyId === 'conductor');
        const up = () => (boss()?.rods ?? []).filter((r) => r.regrow <= 0).length;
        for (let pass = 0; pass < 3 && up() > want; pass++) {
          for (const [i, at] of sockets.entries()) {
            const b = boss();
            if (!b || up() <= want || (b.rods[i]?.regrow ?? 1) > 0 || b.rod === i) continue;
            const d = Math.hypot(m.x - at.x, m.y - at.y) || 1;
            h.walkTo(at.x - ((m.y - at.y) / d) * 44, at.y + ((m.x - at.x) / d) * 44);
            for (let t = 0; t < 600 && (boss()?.rods[i]?.regrow ?? 1) <= 0; t++) g.step(1, { fire: true, aimX: at.x, aimY: at.y - 30 });
          }
        }
        return up();
      },
      [CROWN_SPIRE.sockets, { x: (CROWN_SPIRE.middle.tx + 0.5) * 32, y: (CROWN_SPIRE.middle.ty + 0.5) * 32 }, standing] as const,
    );
  expect(await breakTo(CD.shieldRods - 1)).toBe(CD.shieldRods - 1);
  expect((await look(page, 'conductor')).shown).toMatchObject({ look: 'open', shield: false, grounded: false, flare: true });
  expect(await breakTo(CD.blink.minRods - 1)).toBe(CD.blink.minRods - 1);
  expect((await look(page, 'conductor')).shown).toMatchObject({ look: 'grounded', grounded: true });
  await setHealth(page, 'conductor', Math.floor(CD.maxHealth * CD.enrage.below) - 1);
  expect((await look(page, 'conductor', 1)).shown).toMatchObject({ look: 'grounded', enraged: true, flare: true });
  await leave(page, 'crown-spire');
  const reset = await look(page, 'conductor');
  expect(reset.shown).toMatchObject({ look: 'shielded', shield: true, enraged: false });
  expect(reset.cameraShakes).toBe(start.cameraShakes);
  expect(errors).toEqual([]);
});

test('080: the Warden: one shake on its intro\'s beat, and none through its fight and its death', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await intoShrine(page);
  const before = await tickDrawn(page, 0);
  const run = await page.evaluate(async () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.getState();
    // The intro, then its fight: the player stands and fires, kept up, until the Warden falls.
    for (let t = 0; t < 2400; t++) {
      const w = s.enemies.find((e) => e.enemyId === 'pylon-warden');
      if (!w) break;
      s = g.step(1, t > 170 ? { use: true, aimX: w.x, aimY: w.y - 20 } : {});
      g.setPlayerHealth(100);
      if (t === 1200) g.setEnemyHealth(w.id, 1);
      if (t % 30 === 0) await new Promise((r) => requestAnimationFrame(r));
    }
    for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));
    return { dead: !g.getState().enemies.some((e) => e.enemyId === 'pylon-warden'), shakes: g.ui().introShakes, cameraShakes: g.ui().cameraShakes };
  });
  expect(run.dead).toBe(true);
  expect(run.shakes.slice(before.shakes.length).map((x) => x.kind)).toEqual(['intro']);
  expect(run.cameraShakes - before.cameraShakes).toBe(1);
  expect(errors).toEqual([]);
});

test('080: the same seed and commands give the same state through an intro on Low and High', async ({ page }) => {
  test.setTimeout(120_000);
  const run = async (quality: 'low' | 'high') => {
    await boot(page, '?start=hollows&seed=5');
    await page.evaluate((q) => window.__GAME__?.setLook({ quality: q }), quality);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      g.step(1);
    });
    await page.evaluate(() => window.__helpers?.enterArena('sunken-forum', true));
    return page.evaluate(async () => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.step(0);
      for (let t = 0; t < 260; t++) {
        const b = s.enemies.find((e) => e.enemyId === 'bulwark');
        s = g.step(1, { use: t % 3 === 0, aimX: b?.x ?? 0, aimY: b?.y ?? 0, moveX: t % 80 < 40 ? 1 : -1 });
        if (t % 20 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
      return JSON.stringify(g.getState());
    });
  };
  const low = await run('low');
  expect(low).toContain('"mode":"chase"');
  expect(low).toBe(await run('high'));
});
