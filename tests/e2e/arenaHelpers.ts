import type { Page } from '@playwright/test';
import { ARENAS } from '../../src/data/arenas';
import type {} from './helpers';

// 055: in and out of the boss arenas by their doors, as a player does (E at the door). In-page helpers added to
// `window.__helpers` once the main helpers are installed (an init script run after theirs, so walkTo is there).

declare module './helpers' {
  interface Helpers {
    /** Into a boss arena by its door: walks to the floor just outside the door's middle and presses E. Does nothing if already inside; fails if the door didn't open. */
    enterArena(id: string): void;
    /** Out of a boss arena by its door: walks to the floor just inside the door's middle and presses E. Does nothing outside it. */
    leaveArena(id: string): void;
  }
}

/** What the in-page helpers need from each arena's data (they can't import it). */
interface ArenaDoorSpots {
  id: string;
  /** Outside: the tile E leaving puts the player on (`leaveTo`), walked to first. */
  out: { tx: number; ty: number };
  /** The floor tile just outside the door's middle, in E's reach. */
  by: { tx: number; ty: number };
  /** The floor tile just inside the door's middle, in E's reach. */
  in: { tx: number; ty: number };
}

function installArenaDoors(arenas: ArenaDoorSpots[]): void {
  const h = window.__helpers;
  const g = () => {
    const game = window.__GAME__;
    if (!game) throw new Error('no game');
    return game;
  };
  if (!h) throw new Error('no helpers');
  const find = (id: string) => {
    const a = arenas.find((x) => x.id === id);
    if (!a) throw new Error(`no arena ${id}`);
    return a;
  };
  const inside = (id: string) => g().getState().arenas.find((x) => x.id === id)?.inside ?? false;
  h.enterArena = (id) => {
    const a = find(id);
    if (inside(id)) return;
    h.walkTo((a.out.tx + 0.5) * 32, (a.out.ty + 0.5) * 32);
    h.walkTo((a.by.tx + 0.5) * 32, (a.by.ty + 0.5) * 32);
    if (g().step(1, { interact: true }).events.arenaEnters.length === 0) throw new Error(`the door of ${id} did not open`);
  };
  h.leaveArena = (id) => {
    const a = find(id);
    if (!inside(id)) return;
    h.walkTo((a.in.tx + 0.5) * 32, (a.in.ty + 0.5) * 32);
    if (g().step(1, { interact: true }).events.arenaLeaves.length === 0) throw new Error(`could not leave ${id}`);
  };
}

/** Adds the arena door helpers to the page's helpers (after installHelpers' init script). */
export async function installArenaHelpers(page: Page): Promise<void> {
  const spots = ARENAS.map((a) => {
    const mid = a.door.tiles[Math.floor(a.door.tiles.length / 2)] ?? a.door.leaveTo;
    const side = Math.sign(a.door.leaveTo.ty - mid.ty);
    return { id: a.id, out: a.door.leaveTo, by: { tx: mid.tx, ty: mid.ty + side }, in: { tx: mid.tx, ty: mid.ty - side } };
  });
  await page.addInitScript(installArenaDoors, spots);
}

/** Into a boss arena by E at its door (the in-page `enterArena`). */
export async function enterArena(page: Page, arena: { id: string }): Promise<void> {
  await page.evaluate((id) => window.__helpers?.enterArena(id), arena.id);
}
