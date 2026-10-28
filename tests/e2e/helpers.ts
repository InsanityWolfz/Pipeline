import { expect, type Page } from '@playwright/test';
import type {} from '../../src/render/testHook';
import { HOME_SHIFT, RUIN } from '../../src/data/home';
import { OVERWORLD } from '../../src/data/overworld';
import { installArenaHelpers } from './arenaHelpers';

// Page helpers shared by the e2e specs. They run inside the page, so they're
// installed there before the game boots.

export interface Helpers {
  /** Walks to a world point, failing if it can't get there. */
  walkTo(x: number, y: number): void;
  /** Walks to just below a node and harvests it `times` times, collecting each drop. */
  harvest(nodeIndex: number, times: number): void;
  /** Walks onto every ground item in the player's room. */
  collect(): void;
  /** Shoots the nearest Husk (of the ruin field's pack while it stands) until one dies, then collects its drops. */
  killHusk(): void;
  /** Walks out of the foundry's door to the overworld (017), where the tube can fire (015). */
  toHall(): void;
  /** Walks to the front of the foundry's stairs in the overworld and down them (017). */
  toFoundry(): void;
  /**
   * 047: puts an item kind on the carried bar (its own slot if it has one, else slot 1) and selects it, through the
   * sim's commands as a drag and a key press would; right click (`use`) then uses it.
   */
  hold(itemId: string): void;
  /**
   * The ground round the foundry, for tiles specs name by hand in its pre-034 tiles: add `ox` to a column and `oy` to a
   * row (034 moved it +40 columns, 053 to the round map's centre, +4 and +64 more).
   */
  ox: number;
  oy: number;
}

/** What the in-page helpers need from the map's data (they can't import it). */
interface MapData {
  ox: number;
  oy: number;
  /** The ruin over the stairs reaches this many tiles either side of the door (053). */
  half: number;
  door: { tx: number; ty: number };
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

function installHelpers(map: MapData): void {
  const game = () => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    return g;
  };
  // 047: an item kind on the carried bar and selected, as a drag and a key press would.
  const hold = (itemId: string): void => {
    const g = game();
    const at = g.getState().hotbar.slots.indexOf(itemId);
    const slot = at >= 0 ? at : 0;
    g.step(1, { assignSlot: { slot, itemId }, selectSlot: slot });
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
  const core: Omit<Helpers, 'enterArena' | 'leaveArena'> = {
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
    ox: map.ox,
    oy: map.oy,
    toFoundry() {
      const g = game();
      // The stairs' door tile; its arrival tile is the one in front (src/data/overworld.ts).
      // From the north, round the ruin's east side (053: `half` tiles either side of the door); from the south,
      // up the column beside the door, clear of the tube's stone.
      const { tx, ty } = map.door;
      const y = game().getState().player.y;
      if (y < (ty + 2) * 32) {
        walkTo((tx + map.half + 1.5) * 32, y);
        walkTo((tx + map.half + 1.5) * 32, (ty + 2.5) * 32);
      } else walkTo((tx + 1.5) * 32, y);
      walkTo((tx + 1.5) * 32, (ty + 1.5) * 32);
      walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
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
    hold,
    killHusk() {
      const g = game();
      if ((g.getState().inventory.arrow ?? 0) > 0) hold('arrow');
      let s = g.getState();
      const before = s.enemies.filter((e) => e.room === s.room).length;
      let pathed = true;
      for (let t = 0; t < 2400 && s.enemies.filter((e) => e.room === s.room).length === before; t++) {
        const p = s.player;
        // The ruin field's pack first while it stands: from the meadow's west (the reeds), the Ruined Cache's five guards
        // (032) are nearer than it, and walking into them is a KO.
        const field = s.enemies.filter((e) => e.room === s.room && e.group === 'field');
        const pool = field.length > 0 ? field : s.enemies.filter((e) => e.room === s.room);
        const target = [...pool].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
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
        // 047: the volley on left click, carried arrows on right click (the arrow slot is selected first).
        s = g.step(1, {
          moveX: far ? toward(p.x, target.x) : 0,
          moveY: far ? toward(p.y, target.y) : 0,
          fire: !far,
          use: !far,
          aimX: target.x,
          aimY: target.y,
        });
      }
      collect();
    },
  };
  // 055: the arena door helpers are arenaHelpers.ts's, added by its own init script right after this one.
  const notYet = (): void => {
    throw new Error('the arena helpers are not installed');
  };
  window.__helpers = { ...core, enterArena: notYet, leaveArena: notYet };
}

/**
 * Opens the game with the helpers installed: at `query` (e.g. `?playtest`), or by
 * default the sandbox start in the ruin hall that most specs are written for.
 */
/** Installs the in-page helpers (`window.__helpers`) before the page's game boots (042: for specs that boot the title). */
export async function installPageHelpers(page: Page): Promise<void> {
  await page.addInitScript(installHelpers, { ox: 40 + HOME_SHIFT.dx, oy: HOME_SHIFT.dy, half: Math.floor(RUIN.w / 2), door: OVERWORLD.entrance.door });
  await installArenaHelpers(page);
}

export async function boot(page: Page, query = '?start=field'): Promise<void> {
  await installPageHelpers(page);
  await page.goto(`/${query}`);
  // The scene builds its views once the fonts (020) have loaded.
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
}

/**
 * 078: waits by drawn frames, not wall time, until a frame shows the sim's tick with no door fade running. A door's
 * fade runs a set number of frames (a slow page's render clock steps at most one 60 fps frame a drawn frame), so on a
 * loaded runner it can outlast a poll's 5 s while every frame is right.
 */
export async function frameSettled(page: Page, maxFrames = 600): Promise<void> {
  const ok = await page.evaluate(async (n) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let i = 0; i < n; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const u = g.ui();
      if (u.drawnTick === g.getState().tick && !u.camera.fading) return true;
    }
    return false;
  }, maxFrames);
  expect(ok, `a frame showing the sim's tick, no fade, within ${maxFrames} frames`).toBe(true);
}

/** Waits until the camera, easing after the player in real time, has come to rest (`timeout` ms: a long ease under load needs more). */
export async function cameraSettled(page: Page, timeout = 5000): Promise<void> {
  let last = { x: NaN, y: NaN };
  await expect
    .poll(async () => {
      const cam = (await page.evaluate(() => window.__GAME__?.ui()))?.camera ?? { x: NaN, y: NaN };
      const still = Math.hypot(cam.x - last.x, cam.y - last.y) < 0.5;
      last = cam;
      return still;
    }, { timeout })
    .toBe(true);
}

/**
 * 046: waits until nothing passing covers a review shot: a door's fade over, and no discovery or schematic banner
 * showing (played out fast on the tween clock). `timeout` ms per wait: the banners queue and play one by one, and an
 * unfocused page's render clock advances at most one 60 fps frame per drawn frame, so a long queue on a slow page
 * (several landmarks found on one walk, under load) needs more than the default.
 */
export async function quietScreen(page: Page, timeout = 20_000): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().schematics.bannerIdle), { timeout }).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().landmarks.banner ?? null), { timeout }).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().camera.fading), { timeout }).toBe(false);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}
