import { TILE_SIZE } from '../../data/config';
import { TILE, type Room } from '../../data/rooms';
import { setPieceAnchor, SET_PIECES } from '../../data/setPieces';
import type { Quality } from '../../data/settings';
import { WEATHER_LIGHTNING } from '../../data/weather';
import { nextFloat, type RngState } from '../../sim/rng';
import { setPieceOnTile } from './decorPlace';

// 077: weather lightning in the Stormcrown (render only, no game effect): when it strikes, from the render-side
// stream, and what it strikes in view: the Storm Tower's crown first, else an iron rod at least `playerMargin` tiles
// from the player, else a cairn or a cliff top (also clear of the player); never a Rod Field storm rod or within
// `rodNodeMargin` tiles of one, so it can't be mistaken for a rod's charge. Pure but for the stream.

const T = TILE_SIZE;
const L = WEATHER_LIGHTNING;

type View = { x: number; y: number; width: number; height: number };

/** Whether weather lightning may strike now: the tier, Flashes, the Stormcrown's weight, no boss fight and not in an arena. */
export function lightningActive(o: { quality: Quality; flashes: boolean; stormWeight: number; fight: boolean; inArena: boolean; overworld: boolean }): boolean {
  return o.overworld && o.quality !== 'low' && o.flashes && o.stormWeight >= L.minWeight && !o.fight && !o.inArena;
}

/** The strike clock: counts down while active, then strikes and sets the next wait from the stream. */
export class LightningClock {
  private readonly rng: RngState;
  /** Ms until the next strike. */
  wait: number;

  constructor(rng: RngState) {
    this.rng = rng;
    this.wait = this.draw();
  }

  private draw(): number {
    return L.everyMs[0] + nextFloat(this.rng) * (L.everyMs[1] - L.everyMs[0]);
  }

  /** True when a strike is due this frame (and the next is set); never while inactive (the clock holds). */
  step(dt: number, active: boolean): boolean {
    if (!active) return false;
    this.wait -= dt;
    if (this.wait > 0) return false;
    this.wait = this.draw();
    return true;
  }

  /** Strikes now (the test hook's `strikeWeather()`): the next wait starts again. */
  force(): void {
    this.wait = this.draw();
  }
}

/** A strike's target: what, and where the bolt lands (world px). */
export interface StrikeTarget {
  kind: 'tower' | 'rod' | 'cairn' | 'cliff';
  x: number;
  y: number;
}

const inside = (v: View, x: number, y: number): boolean => x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height;

/**
 * What a strike hits in `view`: the Storm Tower's crown if in view; else a rod, then a cairn or cliff top, in view,
 * at least `playerMargin` tiles from the player and `rodNodeMargin` from every storm-rod node; null to skip.
 */
export function strikeTarget(room: Room, view: View, player: { x: number; y: number }, rodNodes: readonly { x: number; y: number }[], rng: RngState): StrikeTarget | null {
  const tower = SET_PIECES.find((p) => p.strikeAt);
  if (tower?.strikeAt) {
    const a = setPieceAnchor(tower, T);
    const x = a.x + tower.strikeAt[0];
    const y = a.y + tower.strikeAt[1];
    if (inside(view, x, y)) return { kind: 'tower', x, y };
  }
  const clear = (tx: number, ty: number) => {
    const x = (tx + 0.5) * T;
    const y = (ty + 0.5) * T;
    if (Math.hypot(x - player.x, y - player.y) < L.playerMargin * T) return false;
    return rodNodes.every((n) => Math.hypot(n.x - x, n.y - y) > L.rodNodeMargin * T);
  };
  const rods: StrikeTarget[] = [];
  const tops: StrikeTarget[] = [];
  for (let ty = Math.floor(view.y / T); ty <= Math.floor((view.y + view.height) / T); ty++) {
    for (let tx = Math.floor(view.x / T); tx <= Math.floor((view.x + view.width) / T); tx++) {
      const s = room.rows[ty]?.[tx];
      if (s !== TILE.ironRod && s !== TILE.cairn && s !== TILE.cliff) continue;
      if (setPieceOnTile(tx, ty) || !clear(tx, ty)) continue;
      const x = (tx + 0.5) * T;
      const bottom = (ty + 1) * T;
      if (s === TILE.ironRod) rods.push({ kind: 'rod', x, y: bottom - L.riseRod });
      // A cairn's or cliff's top: one with nothing of its kind behind it (north), so the bolt lands on what you see.
      else if (room.rows[ty - 1]?.[tx] !== s) tops.push({ kind: s === TILE.cairn ? 'cairn' : 'cliff', x, y: bottom - (s === TILE.cairn ? L.riseCairn : L.riseCliff) });
    }
  }
  const list = rods.length > 0 ? rods : tops;
  const hit = list[Math.floor(nextFloat(rng) * list.length)];
  return hit && inside(view, hit.x, hit.y) ? hit : null;
}
