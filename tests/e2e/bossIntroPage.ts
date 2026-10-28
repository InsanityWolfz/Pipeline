import type { Page } from '@playwright/test';
import { SHRINE_ARENA } from '../../src/data/arenas';
import { enterArena } from './arenaHelpers';
import { boot } from './helpers';
import { bootSandbox, hidePanel } from './sandboxPage';

// 080: the boss intros in the browser: the sandbox's arenas (the Bulwark's forum, the Forgewright's hall, the
// Conductor's spire) and the Warden at its shrine (`?playtest`, as bossDoors.spec does), entered by the door with the
// intro left to play; and a tick stepped with its frame drawn, so ui() shows that tick.

export const SANDBOX_BOSSES = [
  { boss: 'bulwark', arena: 'sunken-forum' },
  { boss: 'forgewright', arena: 'anvil-hall' },
  { boss: 'conductor', arena: 'crown-spire' },
] as const;

/** The sandbox in god mode with three arrow lanes, into an arena by its door, the intro not yet started. */
export async function intoSandboxArena(page: Page, arena: string): Promise<void> {
  await bootSandbox(page);
  await hidePanel(page);
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'god', on: true } });
    ['arrow', 'arrow', 'arrow', null, null].forEach((round, entrance) => g.step(1, { sandbox: { kind: 'loadout', entrance, round } }));
  });
  await enterArena(page, { id: arena }, true);
}

/** `?playtest` with the shrine's guards and any wanderers cleared, through the Warden's door, its intro not yet started. */
export async function intoShrine(page: Page): Promise<void> {
  await boot(page, '?playtest');
  await page.evaluate((boss) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    for (const e of g.getState().enemies) if ((e.group === 'shrine' && e.enemyId !== boss) || e.group.startsWith('pop-')) g.setEnemyHealth(e.id, 0);
    g.step(1);
    h.walkTo((41.5 + h.ox) * 32, g.getState().player.y);
  }, SHRINE_ARENA.boss);
  await enterArena(page, SHRINE_ARENA, true);
}

/** Steps `n` ticks (the command on each), keeps the player topped up, and waits for the last tick's frame to draw; `bossId` the boss to report (else the one in its intro). */
export async function tickDrawn(page: Page, n: number, command: Record<string, unknown> = {}, bossId = '') {
  return page.evaluate(
    async ([count, c, which]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let s = g.getState();
      for (let i = 0; i < count; i++) s = g.step(1, c);
      g.setPlayerHealth(100);
      for (let i = 0; i < 10 && (g.ui().drawnTick ?? -1) < s.tick; i++) await new Promise((r) => requestAnimationFrame(r));
      const ui = g.ui();
      const shown = ui.bossIntro?.boss;
      const boss = s.enemies.find((e) => e.room === s.room && e.enemyId === (which || shown || 'none'));
      return {
        tick: s.tick,
        boss: boss ? { id: boss.id, x: boss.x, y: boss.y, mode: boss.mode, modeTicks: boss.modeTicks, health: boss.health } : null,
        player: s.player,
        hits: s.events.hits,
        intro: ui.bossIntro,
        phase: ui.bossPhase,
        bar: ui.bossBar,
        camera: ui.camera,
        shakes: ui.introShakes,
        cameraShakes: ui.cameraShakes,
        art: boss ? (ui.enemyArt.find((a) => a.id === boss.id) ?? null) : null,
      };
    },
    [n, command, bossId] as const,
  );
}
