import type { Page } from '@playwright/test';
import type {} from '../../src/render/testHook';

// Page helpers shared by the e2e specs. They run inside the page, so they're
// installed there before the game boots.

export interface Helpers {
  /** Walks to a world point, failing if it can't get there. */
  walkTo(x: number, y: number): void;
  /** Walks to just below a node and harvests it `times` times, collecting each drop. */
  harvest(nodeIndex: number, times: number): void;
  /** Walks onto every ground item in the player's room. */
  collect(): void;
  /** Shoots the nearest Husk until one dies, then collects its drops. */
  killHusk(): void;
  /** Walks out of the foundry's door to the overworld (017), where the tube can fire (015). */
  toHall(): void;
  /** Walks to the front of the foundry's stairs in the overworld and down them (017). */
  toFoundry(): void;
}

declare global {
  interface Window {
    __helpers?: Helpers;
  }
}

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

function installHelpers(): void {
  const game = () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    return g;
  };
  const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
  // Straight toward the point; when something solid stops the player, sidestep along one axis for a
  // while, then try again.
  const walkStraight = (x: number, y: number): void => {
    const g = game();
    let stuck = 0;
    let detour = 0;
    let tries = 0;
    let side: { moveX: -1 | 0 | 1; moveY: -1 | 0 | 1 } = { moveX: 0, moveY: 0 };
    for (let t = 0; t < 1500; t++) {
      const p = g.getState().player;
      const moveX = toward(p.x, x);
      const moveY = toward(p.y, y);
      if (moveX === 0 && moveY === 0) return;
      if (detour > 0) {
        detour -= 1;
        g.step(1, side);
        continue;
      }
      const after = g.step(1, { moveX, moveY }).player;
      stuck = Math.hypot(after.x - p.x, after.y - p.y) < 0.1 ? stuck + 1 : 0;
      if (stuck > 4) {
        stuck = 0;
        tries += 1;
        // Slide past across the line to the point: toward it first, then the other way, further each time.
        detour = 20 * Math.ceil(tries / 2);
        const flip = tries % 2 === 1 ? 1 : -1;
        side =
          Math.abs(x - p.x) > Math.abs(y - p.y)
            ? { moveX: 0, moveY: ((y >= p.y ? 1 : -1) * flip) as -1 | 1 }
            : { moveX: ((x >= p.x ? 1 : -1) * flip) as -1 | 1, moveY: 0 };
      }
    }
    throw new Error(`could not reach (${x}, ${y})`);
  };
  // Finds a way round what's in the way (018: groves, rock fields and ponds stand by the nodes): a
  // shortest path over the tiles the player can stand on, walked corner to corner, then the last
  // straight bit to the point. With no path (e.g. the point is in a solid thing), it walks straight.
  const walkTo = (x: number, y: number): void => {
    const g = game();
    const rows = g.passable();
    const T = 32;
    const p = g.getState().player;
    const from = { tx: Math.floor(p.x / T), ty: Math.floor(p.y / T) };
    const goal = { tx: Math.floor(x / T), ty: Math.floor(y / T) };
    const open = (tx: number, ty: number) => rows[ty]?.[tx] === '.';
    const key = (tx: number, ty: number) => ty * 1000 + tx;
    const came = new Map<number, number>([[key(from.tx, from.ty), -1]]);
    const queue = [from];
    let end: { tx: number; ty: number } | undefined;
    // The goal tile, or one beside it when the goal itself is solid.
    const reached = (t: { tx: number; ty: number }) => Math.abs(t.tx - goal.tx) + Math.abs(t.ty - goal.ty) <= (open(goal.tx, goal.ty) ? 0 : 1);
    for (let i = 0; i < queue.length && !end; i++) {
      const t = queue[i];
      if (!t) break;
      if (reached(t)) end = t;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = { tx: t.tx + dx, ty: t.ty + dy };
        if (!open(n.tx, n.ty) || came.has(key(n.tx, n.ty))) continue;
        came.set(key(n.tx, n.ty), key(t.tx, t.ty));
        queue.push(n);
      }
    }
    if (!end) {
      walkStraight(x, y);
      return;
    }
    const tiles: { tx: number; ty: number }[] = [];
    for (let k = key(end.tx, end.ty); k !== -1; k = came.get(k) ?? -1) tiles.unshift({ tx: k % 1000, ty: Math.floor(k / 1000) });
    // Walk to each corner of the path (where it turns), from the tile after the start.
    for (let i = 1; i < tiles.length - 1; i++) {
      const [a, b, c] = [tiles[i - 1], tiles[i], tiles[i + 1]];
      if (!a || !b || !c) continue;
      if (b.tx - a.tx !== c.tx - b.tx || b.ty - a.ty !== c.ty - b.ty) walkStraight((b.tx + 0.5) * T, (b.ty + 0.5) * T);
    }
    const last = tiles[tiles.length - 1];
    if (last && tiles.length > 1) walkStraight((last.tx + 0.5) * T, (last.ty + 0.5) * T);
    walkStraight(x, y);
  };
  const collect = (): void => {
    const g = game();
    let best = Infinity;
    let since = 0;
    let target = -1;
    for (let t = 0; t < 1800; t++) {
      const s = g.getState();
      const item = s.groundItems.find((it) => it.room === s.room);
      if (!item) return;
      if (item.id !== target) {
        target = item.id;
        best = Infinity;
        since = 0;
      }
      const d = Math.hypot(item.x - s.player.x, item.y - s.player.y);
      if (d < best - 1) {
        best = d;
        since = 0;
      } else since += 1;
      if (since > 15) {
        // Blocked (a drop can land against its node): walk round to a spot beside it, inside the pickup radius
        // (feet box 16x8, radius 8), trying above, below, left and right.
        for (const [dx, dy] of [[0, -10], [0, 10], [-14, 0], [14, 0]] as const) {
          try {
            walkTo(item.x + dx, item.y + dy);
          } catch {
            continue;
          }
          if (!g.getState().groundItems.some((it) => it.id === item.id)) break;
        }
        best = Infinity;
        since = 0;
        continue;
      }
      g.step(1, { moveX: toward(s.player.x, item.x), moveY: toward(s.player.y, item.y) });
    }
    const s = g.getState();
    throw new Error(`could not collect the drops: ${JSON.stringify(s.groundItems.filter((it) => it.room === s.room))} from ${s.player.x},${s.player.y}`);
  };
  window.__helpers = {
    walkTo,
    collect,
    harvest(nodeIndex, times) {
      const g = game();
      for (let i = 0; i < times; i++) {
        const n = g.getState().nodes[nodeIndex];
        if (!n) throw new Error(`no node ${nodeIndex}`);
        walkTo(n.x, n.y + 16);
        g.step(1, { interact: true });
        g.step(30);
        collect();
      }
    },
    toFoundry() {
      const g = game();
      // The stairs' door tile is (40, 20); its arrival tile (40, 21) is in front (src/data/overworld.ts).
      // From the north, round the mound's east side (blocks at x 38–42, y 18–20); from the south,
      // up the column beside the path, clear of the tube's stone at (40, 33).
      const y = game().getState().player.y;
      if (y < 22 * 32) {
        walkTo(43.5 * 32, y);
        walkTo(43.5 * 32, 22.5 * 32);
      } else walkTo(41.5 * 32, y);
      walkTo(41.5 * 32, 21.5 * 32);
      walkTo(40.5 * 32, 21.5 * 32);
      for (let t = 0; t < 60 && g.getState().room !== 'foundry'; t++) g.step(1, { moveY: -1 });
      if (g.getState().room !== 'foundry') throw new Error('could not reach the foundry');
    },
    toHall() {
      const g = game();
      // The foundry's door is on its right wall at row 8 (src/data/rooms.ts); stand inside it and walk out.
      walkTo(22.5 * 32, 8.5 * 32);
      for (let t = 0; t < 60 && g.getState().room === 'foundry'; t++) g.step(1, { moveX: 1 });
      if (g.getState().room === 'foundry') throw new Error('could not leave the foundry');
    },
    killHusk() {
      const g = game();
      let s = g.getState();
      const before = s.enemies.filter((e) => e.room === s.room).length;
      let pathed = true;
      for (let t = 0; t < 2400 && s.enemies.filter((e) => e.room === s.room).length === before; t++) {
        const p = s.player;
        const target = [...s.enemies.filter((e) => e.room === s.room)].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!target) break;
        const far = Math.hypot(target.x - p.x, target.y - p.y) > 200;
        // Far off, walk most of the way by path, round whatever's in between (018); once that fails, only straight.
        if (Math.hypot(target.x - p.x, target.y - p.y) > 320) {
          try {
            if (pathed) walkTo(target.x, target.y + 160);
          } catch {
            // No way there from here: close in straight from now on, rather than retrying a long failing walk.
            pathed = false;
          }
          s = g.getState();
          if (Math.hypot(target.x - s.player.x, target.y - s.player.y) > 320) {
            s = g.step(1, { moveX: toward(s.player.x, target.x), moveY: toward(s.player.y, target.y) });
          }
          continue;
        }
        s = g.step(1, {
          moveX: far ? toward(p.x, target.x) : 0,
          moveY: far ? toward(p.y, target.y) : 0,
          fire: !far,
          aimX: target.x,
          aimY: target.y,
        });
      }
      collect();
    },
  };
}

/**
 * Opens the game with the helpers installed: at `query` (e.g. `?playtest`), or by
 * default the sandbox start in the ruin hall that most specs are written for.
 */
export async function boot(page: Page, query = '?start=field'): Promise<void> {
  await page.addInitScript(installHelpers);
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__GAME__ !== undefined);
}

