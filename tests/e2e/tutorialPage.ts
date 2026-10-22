import { expect, type Page } from '@playwright/test';
import { OBJECTIVES } from '../../src/data/objectives';
import { TALENT_START, TALENTS } from '../../src/data/talents';

// 058: the tutorial run's helpers, shared by tutorial.spec.ts (a New game until it leaves the foundry) and
// tutorialFrost.spec.ts (from leaving the foundry to the end).

export const T = 32;
/** The chain's goal texts in order (the talent cut-in apart). */
export const CHAIN = OBJECTIVES.filter((o) => !o.cutIn).map((o) => o.text);
const TALENT_GOAL = OBJECTIVES.find((o) => o.cutIn)?.text ?? '';
/** A talent linked to the start: the first point goes there. */
const FIRST_TALENT = Object.values(TALENTS).find((t) => t.id !== TALENT_START && t.links.includes(TALENT_START))?.id ?? '';

/** The level and the goal the line went back to after the talent cut-in, for the run's notes. */
export const cutIn: { at: string | null } = { at: null };

/** The goal the line shows after one more tick (crafts land between ticks); the talent cut-in is answered at once. */
export async function goal(page: Page): Promise<string> {
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  if (s?.objective.text === TALENT_GOAL) {
    const after = await page.evaluate((id) => {
      const g = window.__GAME__;
      g?.step(1, { takeTalent: id });
      return g?.step(1);
    }, FIRST_TALENT);
    expect(after?.talents).toContain(FIRST_TALENT);
    cutIn.at = `level ${after?.level}, back to "${after?.objective.text}"`;
    return after?.objective.text ?? '';
  }
  return s?.objective.text ?? '';
}

/** Expects the line to show chain goal `n` (1-based, the spec's numbering). */
export async function expectGoal(page: Page, n: number): Promise<void> {
  expect(await goal(page)).toBe(CHAIN[n - 1]);
}

/** Walks the player through tile points (absolute tiles). */
export async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    for (const [tx, ty] of pts) window.__helpers?.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
  }, points);
}

/** Fells, through the hook, every enemy in these groups, and any other within `near` px of the player, healed: the long walks stay quiet. */
export async function fell(page: Page, groups: readonly string[], near = 480): Promise<void> {
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
export async function trek(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  for (const [tx, ty] of points) {
    await fell(page, []);
    await walk(page, [[tx, ty]]);
  }
}

/** Harvests the first live node of a kind `times` times, picking up only what drops beside it (the world's other drops stay). */
export async function harvestNear(page: Page, nodeId: string, times: number): Promise<void> {
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
export async function buildGhosts(page: Page): Promise<{ placed: number; refused: number }> {
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

/** Page-side helpers for a run: `through` a door tile, and `clearGroup` to fight a group clear (017). */
export async function installRunHelpers(page: Page): Promise<void> {
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
}
