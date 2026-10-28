import type { Scene } from 'phaser';
import type { Quality } from '../../data/settings';
import type { EnemyState } from '../../sim/enemies';
import type { SimEvents } from '../../sim/events';
import type { SimState } from '../../sim/state';
import { ArrowView } from '../ArrowView';
import { BombView } from '../BombView';
import { settings } from '../flow/settingsStore';
import { inRoom } from '../inRoom';
import type { Particles } from '../Particles';
import type { PlayerView } from '../PlayerView';
import { ShotFxView } from './ShotFxView';
import { TrailView } from './TrailView';

// 078: the player's rounds and everything they show: the trails (fed by ArrowView), the arrows, bombs and landmines in
// flight, and the shot effects (impacts, blasts, ends, sparks, marks, fuse glints).

export class ShotLayer {
  readonly trails: TrailView;
  readonly arrows: ArrowView;
  readonly bombs: BombView;
  readonly fx: ShotFxView;

  /** `particles`: the feel's pool (made after this); `lastOf`: an enemy as last drawn (a hit's hurtbox). */
  constructor(scene: Scene, particles: () => Particles | undefined, lastOf: (id: number) => EnemyState | undefined) {
    this.trails = new TrailView(scene);
    this.arrows = new ArrowView(scene, this.trails);
    this.bombs = new BombView(scene);
    this.fx = new ShotFxView(scene, this.trails, particles, lastOf);
  }

  /**
   * After the player is posed: the trails begin, the rounds are drawn (a new one's trail from the posed muzzle), the shot
   * effects play from this frame's events and rounds, and the trails are drawn. `tweenMs` is the tween clock's step (a
   * review shot can slow it).
   */
  draw(sim: SimState, events: SimEvents, shown: string, quality: Quality, tweenMs: number, player: PlayerView | undefined): void {
    const muzzle = shown === sim.roomId ? (player?.muzzle ?? null) : null;
    this.trails.begin(quality);
    this.arrows.update(inRoom(sim.arrows, shown), muzzle, !this.fx.off);
    this.bombs.update(inRoom(sim.bombs, shown));
    if (events.woke) this.fx.clear();
    const flashes = settings().flashes;
    this.fx.update(sim, events, shown, { muzzle, looks: (id) => this.arrows.lookOf(id), quality, flashes, deltaMs: tweenMs });
    this.trails.end(tweenMs, quality, flashes);
  }
}
