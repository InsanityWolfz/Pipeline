import { FORGE_FX_MARGIN, FORGE_FX_MAX, HEAT, STEAM } from '../../data/foundryFx';
import { TILE_SIZE } from '../../data/config';
import type { Quality } from '../../data/settings';
import { nextFloat, type RngState } from '../../sim/rng';
import type { ForgeAt } from './runningForges';

// 079: which running forge machines get effects, and when steam puffs (pure, so tests pin it down). Only the running
// set is looked at: a machine on screen (its footprint inside the view grown by FORGE_FX_MARGIN) shows its glow and
// light; the tier's FORGE_FX_MAX of the hot ones nearest the view's centre also shimmer and steam. Steam's timing comes
// from the render-side seeded stream.

type View = { x: number; y: number; width: number; height: number };

const HALF = TILE_SIZE / 2;

/** A 1×1 forge machine's footprint is inside the view grown by the margin. */
export function forgeOnScreen(f: ForgeAt, v: View, margin = FORGE_FX_MARGIN): boolean {
  return f.x + HALF >= v.x - margin && f.x - HALF <= v.x + v.width + margin && f.bottom >= v.y - margin && f.bottom - TILE_SIZE <= v.y + v.height + margin;
}

export interface FxPick {
  /** Running forge machines on screen (glow, light, sparks). */
  onScreen: ForgeAt[];
  /** Those that also shimmer and steam: hot ones only, nearest the view's centre, up to the tier's max. */
  fx: ForgeAt[];
  /** Machines the effects step this frame (those on screen). */
  visited: number;
}

const HOT = new Set(HEAT.machines);

export function pickFx(running: Iterable<ForgeAt>, v: View, quality: Quality): FxPick {
  const onScreen: ForgeAt[] = [];
  for (const f of running) if (forgeOnScreen(f, v)) onScreen.push(f);
  const cx = v.x + v.width / 2;
  const cy = v.y + v.height / 2;
  const d2 = (f: ForgeAt) => (f.x - cx) ** 2 + (f.bottom - TILE_SIZE / 2 - cy) ** 2;
  const fx = onScreen
    .filter((f) => HOT.has(f.pieceId))
    .sort((a, b) => d2(a) - d2(b) || a.id - b.id)
    .slice(0, FORGE_FX_MAX[quality]);
  return { onScreen, fx, visited: onScreen.length };
}

/** A tier's count for a puff or burst, thinned to the budget's `room`. */
export function burstCount(count: Readonly<Record<Quality, number>>, quality: Quality, room: number): number {
  return Math.max(0, Math.min(count[quality], room));
}

/** Steam's schedule: each machine with effects puffs every STEAM.everyMs ± jitterMs, its gaps from the seeded stream. */
export class SteamClock {
  private readonly rng: RngState;
  private readonly left = new Map<number, number>();

  constructor(rng: RngState) {
    this.rng = rng;
  }

  private gap(): number {
    return STEAM.everyMs + (nextFloat(this.rng) * 2 - 1) * STEAM.jitterMs;
  }

  /** Advances `ms` for the machines with effects now; returns those that puff. Machines not listed are forgotten. */
  step(ms: number, ids: readonly number[]): number[] {
    for (const id of [...this.left.keys()]) if (!ids.includes(id)) this.left.delete(id);
    const out: number[] = [];
    for (const id of ids) {
      // A machine just joining starts part-way through a gap, so a row started together doesn't puff in step.
      const was = this.left.get(id) ?? nextFloat(this.rng) * this.gap();
      let now = was - ms;
      if (now <= 0) {
        out.push(id);
        now += this.gap();
      }
      this.left.set(id, now);
    }
    return out;
  }

  get size(): number {
    return this.left.size;
  }
}
