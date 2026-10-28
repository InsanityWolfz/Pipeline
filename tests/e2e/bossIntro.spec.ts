import { expect, test, type Page } from '@playwright/test';
import { ARENAS } from '../../src/data/arenas';
import { BOSS_LOOK } from '../../src/data/arenaAssets';
import { BOSS_INTRO } from '../../src/data/bossIntro';
import { enemyDef } from '../../src/data/enemies';
import { INTRO_SHAKE } from '../../src/data/juice';
import { INTRO_LOOK } from '../../src/data/art/bossIntro';
import { HOLLOWS } from '../../src/data/hollows';
import { clickRow, flowIs } from './flowPage';
import { boot, watchErrors } from './helpers';
import { enterArena } from './arenaHelpers';
import { intoSandboxArena, intoShrine, SANDBOX_BOSSES, tickDrawn } from './bossIntroPage';

// 080: each boss's intro in the browser: the beats on their ticks, the card's text, one shake (suppressed with Flashes
// off), the pan holding the boss in view and handing back to the lift, the boss untargetable, and the short intro
// after an altar summon. Every check polls drawn state at fixed intro ticks.

const FULL = BOSS_INTRO.fullTicks;
const VIEW = { w: 640, h: 360 };
/** The most the camera may move across the pan's hand-back to the follow and lift, px (it eases on by the lift and the follow's lerp). */
const HAND_BACK = 3;

/** Walks a full intro, checking the beats, card, bar, shake and pan on the way. */
async function walkIntro(page: Page, boss: string): Promise<void> {
  const arena = ARENAS.find((a) => a.boss === boss);
  const h = BOSS_LOOK.heights[boss] ?? BOSS_LOOK.height;
  let s = await tickDrawn(page, 1, {}, boss);
  expect(s.boss?.mode).toBe('intro');
  if (boss === 'conductor') expect(s.phase.find((p) => p.boss === 'conductor')?.dome).toBe(0);
  expect(s.intro).toMatchObject({ boss, short: false, ticks: 1, beat: 'stir' });
  const health = s.boss?.health;
  /** Steps to intro tick `n` (its `modeTicks`), firing at the boss on the way if asked. */
  const to = async (n: number, fire = false) => {
    const b = s.boss;
    s = await tickDrawn(page, n - (s.intro?.ticks ?? n), fire && b ? { fire: true, aimX: b.x, aimY: b.y - 30 } : {}, boss);
    return s;
  };
  const inView = () => {
    const b = s.boss;
    return b !== null && Math.abs(b.x - s.camera.x) + 30 <= VIEW.w / 2 && b.y - h >= s.camera.y - VIEW.h / 2 && b.y <= s.camera.y + VIEW.h / 2;
  };
  // Arrows at it pass through: it can't be hit.
  expect((await to(18, true)).intro?.beat).toBe('stir');
  expect(s.boss?.health).toBe(health);
  expect((await to(19)).intro).toMatchObject({ beat: 'rise', frame: 0 });
  await to(25);
  expect(s.intro?.pan.active).toBe(true);
  expect(inView()).toBe(true);
  const shakes = s.shakes.length;
  const cams = s.cameraShakes;
  expect((await to(73)).intro?.beat).toBe('beat');
  expect(s.camera.shaking).toBe(true);
  expect(s.shakes.slice(shakes)).toEqual([{ kind: 'intro', ms: INTRO_SHAKE.full.ms, intensity: INTRO_SHAKE.full.intensity, suppressed: false }]);
  expect(s.cameraShakes - cams).toBe(1);
  // The card holds still while the world camera shakes: on to tick 90 in one step (one frame later the shake still
  // runs), then frames drawn with no tick: the card's place is the same in each, drawn by the UI camera, unshaken.
  expect((await to(90)).intro?.beat).toBe('ready');
  const held: { x: number; y: number }[] = [];
  for (let f = 0; f < 6 && s.camera.shaking; f++) {
    expect(s.intro?.card).toMatchObject({ shown: true, onUiCamera: true, uiShaking: false });
    if (s.intro?.card.at) held.push(s.intro.card.at);
    s = await tickDrawn(page, 0, {}, boss);
  }
  expect(held.length).toBeGreaterThan(0);
  for (const at of held) expect(at).toEqual(held[0]);
  // 080 review: the Conductor's dome is gone while he sleeps and stirs, and gathers through his rise.
  if (boss === 'conductor') expect(s.phase.find((p) => p.boss === 'conductor')?.dome).toBeGreaterThan(0);
  // The card: in by tick 96, the boss's name over its arena's; the region bosses' bar shows the sim's health.
  await to(97);
  expect(s.intro?.card).toMatchObject({ shown: true, alpha: 1, name: enemyDef(boss).name, arena: arena?.name });
  expect(inView()).toBe(true);
  if (boss !== 'pylon-warden') expect(s.bar?.health).toBe(enemyDef(boss).maxHealth);
  await to(141);
  expect(inView()).toBe(true);
  // The pan out hands back to the follow and its lift with no jump (each tick moving at most the pan's cap, the hand-back
  // about none), and the card is gone before it could cover the boss.
  let last = s;
  while (last.boss?.mode === 'intro') {
    const next = await tickDrawn(page, 1, {}, boss);
    expect(Math.abs(next.camera.y - last.camera.y), `tick ${next.intro?.ticks ?? 'fight'}`).toBeLessThanOrEqual(INTRO_LOOK.pan.capPx);
    expect(Math.abs(next.camera.x - last.camera.x), `tick ${next.intro?.ticks ?? 'fight'}`).toBeLessThanOrEqual(INTRO_LOOK.pan.capPx);
    if ((next.intro?.ticks ?? FULL) > INTRO_LOOK.card.out[1]) expect(next.intro?.card.shown ?? false).toBe(false);
    last = next;
  }
  expect(last.intro).toBeNull();
  const after = await tickDrawn(page, 2, {}, boss);
  expect(Math.abs(after.camera.y - last.camera.y)).toBeLessThanOrEqual(HAND_BACK);
  expect(Math.abs(after.camera.x - last.camera.x)).toBeLessThanOrEqual(HAND_BACK);
  expect(after.shakes.length).toBe(shakes + 1);
}

for (const { boss, arena } of SANDBOX_BOSSES) {
  test(`080: the ${boss}'s intro in the sandbox walks its beats, card, shake and pan`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await intoSandboxArena(page, arena);
    await walkIntro(page, boss);
    expect(errors).toEqual([]);
  });
}

test("080: the Pylon Warden's intro at its shrine, its pack held with it", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await intoShrine(page);
  await walkIntro(page, 'pylon-warden');
  expect(errors).toEqual([]);
});

test('080: with Flashes off the intro shake is logged as suppressed and the camera never shakes; the card still shows', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await intoSandboxArena(page, 'sunken-forum');
  await page.evaluate(() => window.__GAME__?.setLook({ flashes: false }));
  const start = await tickDrawn(page, 1);
  const end = await tickDrawn(page, 100);
  expect(end.shakes.slice(start.shakes.length)).toEqual([{ kind: 'intro', ms: INTRO_SHAKE.full.ms, intensity: INTRO_SHAKE.full.intensity, suppressed: true }]);
  expect(end.cameraShakes).toBe(start.cameraShakes);
  expect(end.camera).toMatchObject({ shaking: false });
  expect(end.intro?.card.shown).toBe(true);
  expect(errors).toEqual([]);
});

test('080: an altar summon raises the Bulwark into its short intro: no card, no pan, a smaller shake', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  const A = HOLLOWS.arena;
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
    g.step(1);
  });
  await enterArena(page, A);
  // Its first kill (through the hook: the fight itself is hollows.spec's), then the end card closed.
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (b) g.setEnemyHealth(b.id, 0);
    g.step(200);
  });
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  await page.evaluate((at) => window.__helpers?.walkTo((at.tx + 1.5) * 32, (at.ty + 0.5) * 32), A.altar);
  const summoned = await page.evaluate(
    ([altar, ticks]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { summon: altar });
      return g.step(ticks - 1).enemies.find((e) => e.enemyId === 'bulwark')?.mode ?? 'none';
    },
    [A.altar.id, A.summonTicks] as const,
  );
  expect(summoned).toBe('idle');
  const start = await tickDrawn(page, 1, {}, 'bulwark');
  expect(start.intro).toMatchObject({ boss: 'bulwark', short: true, ticks: 1, beat: 'rise' });
  let seenCard = false;
  let seenPan = false;
  let s = start;
  while (s.boss?.mode === 'intro') {
    s = await tickDrawn(page, 5, {}, 'bulwark');
    seenCard ||= s.intro?.card.shown === true;
    seenPan ||= s.intro?.pan.active === true;
  }
  expect(seenCard).toBe(false);
  expect(seenPan).toBe(false);
  expect(s.shakes.slice(start.shakes.length)).toEqual([{ kind: 'intro-short', ms: INTRO_SHAKE.short.ms, intensity: INTRO_SHAKE.short.intensity, suppressed: false }]);
  expect(s.tick - start.tick).toBeLessThanOrEqual(BOSS_INTRO.shortTicks + 5);
  expect(errors).toEqual([]);
});

test('080: during an intro the player moves and takes no damage, and the door is locked', async ({ page }) => {
  test.setTimeout(120_000);
  await intoSandboxArena(page, 'anvil-hall');
  const run = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const x0 = g.step(1).player.x;
    let hits = 0;
    let s = g.getState();
    for (let t = 0; t < 120; t++) {
      s = g.step(1, { moveX: t < 30 ? 1 : 0 });
      hits += s.events.hits.filter((x) => x.target === 'player').length;
    }
    return { moved: s.player.x - x0, hits, mode: s.enemies.find((e) => e.enemyId === 'forgewright')?.mode, locked: s.arenas.find((a) => a.id === 'anvil-hall')?.locked };
  });
  expect(run).toMatchObject({ hits: 0, mode: 'intro', locked: true });
  expect(run.moved).toBeGreaterThan(0);
  expect(FULL).toBe(165);
});
