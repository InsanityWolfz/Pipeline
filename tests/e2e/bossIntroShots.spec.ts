import { test, type Page } from '@playwright/test';
import { intoSandboxArena, intoShrine, SANDBOX_BOSSES, tickDrawn } from './bossIntroPage';

// Review screenshots for 080 (REVIEW_SHOTS=1, into docs/review/080): the intro poses and phase parts on the contact
// sheet at 4×; each boss dormant, mid-rise, on the beat and ready with its card at game size; each phase look per boss
// on Medium; the card with Flashes off.

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
});
