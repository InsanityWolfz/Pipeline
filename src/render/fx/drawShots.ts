import type { Quality } from '../../data/settings';
import type { SimEvents } from '../../sim/events';
import type { SimState } from '../../sim/state';
import type { ArrowView } from '../ArrowView';
import type { BombView } from '../BombView';
import { settings } from '../flow/settingsStore';
import type { PlayerView } from '../PlayerView';
import type { ShotFxView } from './ShotFxView';
import type { TrailView } from './TrailView';

/** The views a frame's rounds and shot effects draw through (any may be missing before the scene is built). */
export interface ShotViews {
  trails: TrailView | undefined;
  arrows: ArrowView | undefined;
  bombs: BombView | undefined;
  shotFx: ShotFxView | undefined;
  player: PlayerView | undefined;
}

/**
 * 078: a frame's rounds and shot effects, after the player is posed: the trails begin, the rounds are drawn (a new one's
 * trail from the posed muzzle), the shot effects play from this frame's events and rounds, and the trails are drawn.
 * `tweenMs` is the tween clock's step (a review shot can slow it).
 */
export function drawShots(v: ShotViews, sim: SimState, events: SimEvents, shown: string, quality: Quality, tweenMs: number): void {
  const here = shown === sim.roomId;
  const fx = !(v.shotFx?.off ?? false);
  const muzzle = here ? (v.player?.muzzle ?? null) : null;
  const inRoom = <T extends { roomId: string }>(list: readonly T[]): T[] => list.filter((o) => o.roomId === shown);
  v.trails?.begin(quality);
  v.arrows?.update(inRoom(sim.arrows), muzzle, fx);
  v.bombs?.update(inRoom(sim.bombs));
  if (events.woke) v.shotFx?.clear();
  const flashes = settings().flashes;
  v.shotFx?.update(sim, events, shown, { muzzle, looks: (id) => v.arrows?.lookOf(id), quality, flashes, deltaMs: tweenMs });
  v.trails?.end(tweenMs, quality, flashes);
}
