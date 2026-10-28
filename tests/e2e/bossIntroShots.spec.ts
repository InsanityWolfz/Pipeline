import { test, type Page } from '@playwright/test';
import { enemyDef, type BulwarkDef, type ConductorDef, type ForgewrightDef } from '../../src/data/enemies';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { intoSandboxArena, intoShrine, SANDBOX_BOSSES, tickDrawn } from './bossIntroPage';
import { FAN_SPOT, fanUntilVent } from './forgePage';

const BW = enemyDef('bulwark') as BulwarkDef;
const FW = enemyDef('forgewright') as ForgewrightDef;
const CD = enemyDef('conductor') as ConductorDef;

/** Stands the player `dy` px south of the boss and lets a frame draw (tweens held), for a shot of the boss. */
async function shoot(page: Page, boss: string, path: string, dy = 90): Promise<void> {
  await page.evaluate(
    ([id, d]) => {
      const g = window.__GAME__;
      const e = g?.getState().enemies.find((x) => x.enemyId === id);
      // Where it can be reached (a wall or the hall's edge can stand there): south, else beside it.
      for (const [x, y] of e ? [[e.x, e.y + d], [e.x - d, e.y + 20], [e.x + d, e.y + 20]] : []) {
        try {
          window.__helpers?.walkTo(x ?? 0, y ?? 0);
          return;
        } catch {
          continue;
        }
      }
    },
    [boss, dy] as const,
  );
  await tickDrawn(page, 2, {}, boss);
  await tickDrawn(page, 1, {}, boss);
  await page.screenshot({ path });
}

async function setHealth(page: Page, boss: string, share: number, max: number): Promise<void> {
  await page.evaluate(
    ([id, h]) => {
      const g = window.__GAME__;
      const e = g?.getState().enemies.find((x) => x.enemyId === id);
      if (g && e) g.setEnemyHealth(e.id, h);
    },
    [boss, Math.floor(max * share)] as const,
  );
}

/** Breaks the Conductor's rods (never the one he stands at) until `standing` stand. */
const breakTo = (page: Page, standing: number) =>
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

// Review screenshots for 080 (REVIEW_SHOTS=1, into docs/review/080): the intro poses and phase parts on the contact
// sheet at 4×; each boss dormant, mid-rise, on the beat and ready with its card at game size; each phase look per boss
// on Medium; the card with Flashes off. Short effects are held (tweens at 0) for the stills.

const SHOTS = 'docs/review/080';

/** Shows only the sheet's figures whose label matches `match`, canvases at `k` of their 4×. */
async function sheetOnly(page: Page, match: string, k: number): Promise<void> {
  await page.evaluate(
    ([m, scale]) => {
      const re = new RegExp(m);
      const kids = [...(document.getElementById('sheet')?.children ?? [])];
      for (let i = 0; i + 1 < kids.length; i += 2) {
        let any = false;
        for (const fig of kids[i + 1]?.querySelectorAll('figure') ?? []) {
          const keep = re.test(fig.querySelector('figcaption')?.textContent ?? '');
          any ||= keep;
          if (fig instanceof HTMLElement) fig.style.display = keep ? '' : 'none';
        }
        for (const el of [kids[i], kids[i + 1]]) if (el instanceof HTMLElement) el.style.display = any ? '' : 'none';
      }
      for (const c of document.querySelectorAll('canvas')) c.style.width = `${c.width * scale}px`;
    },
    [match, k] as const,
  );
}

test.describe('review screenshots (080)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/080');

  test('the intro poses, the roar and the phase parts on the contact sheet', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.goto('/sheet.html');
    await page.waitForFunction(() => document.querySelectorAll('canvas').length > 100);
    for (const rig of ['warden', 'bulwark', 'forgewright', 'conductor']) {
      await sheetOnly(page, `^${rig}-(dormant|stir|rise|beat|ready)-`, 0.5);
      await page.screenshot({ path: `${SHOTS}/01-sheet-intro-${rig}.png`, fullPage: true });
    }
    await sheetOnly(page, '^(bulwark-roar-|boss-phase-)', 0.5);
    await page.screenshot({ path: `${SHOTS}/01-sheet-roar-and-parts.png`, fullPage: true });
  });

  for (const { boss, arena } of [{ boss: 'pylon-warden', arena: 'shrine' }, ...SANDBOX_BOSSES]) {
    test(`${boss}: dormant, mid-rise, on the beat and ready with its card`, async ({ page }) => {
      test.setTimeout(120_000);
      if (boss === 'pylon-warden') await intoShrine(page);
      else await intoSandboxArena(page, arena);
      await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
      await page.screenshot({ path: `${SHOTS}/02-${boss}-0-dormant.png` });
      for (const [tick, name] of [
        [45, '1-rise'],
        [74, '2-beat'],
        [110, '3-ready-card'],
      ] as const) {
        const s = await tickDrawn(page, tick - ((await page.evaluate(() => window.__GAME__?.ui().bossIntro?.ticks ?? 0)) ?? 0), {}, boss);
        void s;
        await page.screenshot({ path: `${SHOTS}/02-${boss}-${name}.png` });
      }
    });
  }

  test('the Bulwark\'s phase looks on Medium: called, then enraged', async ({ page }) => {
    test.setTimeout(120_000);
    await intoSandboxArena(page, 'sunken-forum', false);
    await setHealth(page, 'bulwark', BW.adds.below - 0.02, BW.maxHealth);
    await tickDrawn(page, 40, {}, 'bulwark');
    await shoot(page, 'bulwark', `${SHOTS}/03-phase-bulwark-1-called.png`);
    await setHealth(page, 'bulwark', BW.enrage.below - 0.02, BW.maxHealth);
    await tickDrawn(page, 120, {}, 'bulwark');
    await shoot(page, 'bulwark', `${SHOTS}/03-phase-bulwark-2-enraged.png`);
  });

  test('the Forgewright\'s phase looks on Medium: white heat, venting, enraged', async ({ page }) => {
    test.setTimeout(180_000);
    await intoSandboxArena(page, 'anvil-hall', false);
    await page.evaluate((max) => {
      const g = window.__GAME__;
      for (let t = 0; t < 3000 && (g?.getState().bosses.find((b) => b.enemyId === 'forgewright')?.heat ?? 0) < max * 0.92; t++) g?.step(1);
    }, FW.heat.max);
    await shoot(page, 'forgewright', `${SHOTS}/04-phase-forgewright-1-white-heat.png`, 120);
    await page.evaluate((spot) => window.__helpers?.walkTo(spot.x, spot.y), FAN_SPOT);
    await fanUntilVent(page, 3000);
    await tickDrawn(page, 1, {}, 'forgewright');
    await page.screenshot({ path: `${SHOTS}/04-phase-forgewright-2-vent.png` });
    await setHealth(page, 'forgewright', FW.enrage.below - 0.05, FW.maxHealth);
    await tickDrawn(page, 60, {}, 'forgewright');
    await shoot(page, 'forgewright', `${SHOTS}/04-phase-forgewright-3-enraged.png`, 120);
  });

  test('the Conductor\'s phase looks on Medium: shielded, open, grounded and enraged', async ({ page }) => {
    test.setTimeout(180_000);
    await intoSandboxArena(page, 'crown-spire', false);
    await shoot(page, 'conductor', `${SHOTS}/05-phase-conductor-1-shielded.png`);
    await breakTo(page, CD.shieldRods - 1);
    await tickDrawn(page, 40, {}, 'conductor');
    await shoot(page, 'conductor', `${SHOTS}/05-phase-conductor-2-open.png`);
    await breakTo(page, CD.blink.minRods - 1);
    await shoot(page, 'conductor', `${SHOTS}/05-phase-conductor-3-grounded.png`);
    await setHealth(page, 'conductor', CD.enrage.below - 0.05, CD.maxHealth);
    await tickDrawn(page, 60, {}, 'conductor');
    await shoot(page, 'conductor', `${SHOTS}/05-phase-conductor-4-enraged-grounded.png`);
  });

  test('the card with Flashes off', async ({ page }) => {
    test.setTimeout(120_000);
    await intoSandboxArena(page, 'anvil-hall');
    await page.evaluate(() => window.__GAME__?.setLook({ flashes: false }));
    await tickDrawn(page, 110, {}, 'forgewright');
    await page.screenshot({ path: `${SHOTS}/06-card-flashes-off.png` });
  });
});
