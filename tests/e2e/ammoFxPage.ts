import { expect, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import type { ImpactShown } from '../../src/render/fx/ammoFxShown';
import { bootSandbox } from './sandboxPage';

// 078: helpers for the shot effects' e2e, shots and probe: the sandbox with a loadout and a few targets, volleys fired
// a tick a drawn frame (so every frame's effects are seen), and what the frames showed.

/** The sandbox (god mode, its own pens cleared near the player) with `rounds` in the entrances and `enemies` placed by offset. */
export async function fxSandbox(page: Page, rounds: (string | null)[], enemies: readonly (readonly [string, number, number])[], look: { quality?: Quality; flashes?: boolean } = {}, boot = true): Promise<number[]> {
  if (boot) await bootSandbox(page);
  return page.evaluate(
    ([rs, es, l]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setLook(l);
      for (let i = 0; i < 5; i++) g.step(1, { sandbox: { kind: 'loadout', entrance: i, round: rs[i] ?? null } });
      g.step(1, { sandbox: { kind: 'god', on: true } });
      const p0 = g.getState().player;
      for (const e of g.getState().enemies) if (Math.hypot(e.x - p0.x, e.y - p0.y) < 420) g.setEnemyHealth(e.id, 0);
      // Long enough for the tube's cooldown from an earlier shot and every round in flight to run out.
      g.step(60);
      const p = g.getState().player;
      const before = new Set(g.getState().enemies.map((e) => e.id));
      for (const [id, dx, dy] of es) g.spawnEnemy(id, p.x + dx, p.y + dy);
      g.step(1);
      return g.getState().enemies.filter((e) => !before.has(e.id)).map((e) => e.id);
    },
    [rounds, enemies, look] as const,
  );
}

/** What the frames of a volley showed: trail kinds seen, every impact played, the most trails bent, the muzzle sparks. */
export interface Seen {
  kinds: string[];
  impacts: ImpactShown[];
  bend: number;
  muzzleSparks: number;
  /** Each shot's sparks: where, the rig's drawn muzzle then, the feet, the lane. */
  muzzles: { x: number; y: number; posed: { x: number; y: number } | null; feet: { x: number; y: number }; angle: number }[];
  /** Each new muzzle-begun trail's first point, and the rig's drawn muzzle on that frame. */
  starts: { x: number; y: number; posed: { x: number; y: number } | null }[];
  /** Each frame: trails drawn for flying rounds, the tier's cap, and the rounds flying. */
  trails: { drawn: number; cap: number; rounds: number }[];
  ends: number;
  splitFlashes: number;
  shards: number;
  most: { effects: number; total: number; deaths: number; weather: number };
}

/** Fires at a point `aim` px from the player for `fireFor` ticks, a tick a drawn frame for `frames` frames. */
export function fire(page: Page, aim: readonly [number, number], frames: number, fireFor: number): Promise<Seen> {
  return page.evaluate(
    async ([a, n, f]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const kinds = new Set<string>();
      const impacts: ImpactShown[] = [];
      const muzzles: Seen['muzzles'] = [];
      const starts: Seen['starts'] = [];
      const trails: Seen['trails'] = [];
      let lastStart: unknown = g.ui().ammoFx.start;
      let played = g.ui().ammoFx.played;
      let sparks = 0;
      let lastMuzzle: unknown = g.ui().ammoFx.muzzle;
      let bend = 0;
      let splitFlashes = 0;
      let shards = 0;
      const most = { effects: 0, total: 0, deaths: 0, weather: 0 };
      const ends0 = g.ui().ammoFx.ends;
      const p0 = g.getState().player;
      for (let i = 0; i < n; i++) {
        const sim = g.step(1, { fire: i < f, aimX: p0.x + a[0], aimY: p0.y + a[1] });
        await new Promise((r) => requestAnimationFrame(r));
        const u = g.ui();
        const fx = u.ammoFx;
        for (const k of Object.keys(fx.trails)) kinds.add(k);
        const fresh = fx.played - played;
        if (fresh > 0) impacts.push(...fx.impacts.slice(-Math.min(fresh, fx.impacts.length)));
        played = fx.played;
        if (fx.muzzle && JSON.stringify(fx.muzzle) !== JSON.stringify(lastMuzzle)) {
          sparks += fx.muzzle.sparks;
          const feet = { x: sim.player.x, y: sim.player.y };
          muzzles.push({ x: fx.muzzle.x, y: fx.muzzle.y, posed: u.player?.muzzle ?? null, feet, angle: fx.muzzle.angle });
        }
        lastMuzzle = fx.muzzle;
        if (fx.start && JSON.stringify(fx.start) !== JSON.stringify(lastStart)) starts.push({ ...fx.start, posed: u.player?.muzzle ?? null });
        lastStart = fx.start;
        trails.push({ drawn: fx.drawn, cap: fx.trailCap, rounds: sim.arrows.length });
        bend = Math.max(bend, fx.bend);
        splitFlashes = Math.max(splitFlashes, u.tagged.splitFlashes);
        shards = Math.max(shards, u.tagged.shards);
        const pt = u.particles;
        most.effects = Math.max(most.effects, pt.effects);
        most.deaths = Math.max(most.deaths, pt.deathMotes);
        most.weather = Math.max(most.weather, pt.weather);
        most.total = Math.max(most.total, pt.effects + pt.deathMotes + pt.weather);
      }
      return { kinds: [...kinds], impacts, bend, muzzleSparks: sparks, muzzles, starts, trails, ends: g.ui().ammoFx.ends - ends0, splitFlashes, shards, most };
    },
    [aim, frames, fireFor] as const,
  );
}

/** Waits until the drawn frame shows the sim's tick. */
export async function drawn(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().drawnTick ?? -1) === (window.__GAME__?.getState().tick ?? -2))).toBe(true);
}
