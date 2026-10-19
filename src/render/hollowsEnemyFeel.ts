import { HOLLOWS_ENEMY_LOOK } from '../data/hollowsEnemyAssets';
import { enemyDef } from '../data/enemies';
import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

// Region 2's four's feel (035), for FeelView: a Charger kicking dust down its lane and
// slamming into a wall (a crack of stone, chips and a shake). Their wind-up cues are
// WINDUP_SOUNDS'; this plays what happens after.

export class HollowsEnemyFeel {
  /** Each enemy's mode last frame, and ms since it last kicked up dust. */
  private readonly modes = new Map<number, string>();
  private readonly dust = new Map<number, number>();

  /** What the sim's events say happened: a Charger setting off throws up a burst of dust. */
  events(ev: SimEvents, j: JuiceView, s: SoundView): void {
    for (const c of ev.charges) j.burst('chargeDust', c.x, c.y, c.y - 1);
    if (ev.charges.length > 0) s.play(SOUNDS.roll);
  }

  /** Changes with no event, frame to frame, for the enemies in the shown room. */
  watch(sim: SimState, shown: string, deltaMs: number, j: JuiceView, s: SoundView): void {
    const live = new Set<number>();
    for (const e of sim.enemies) {
      if (e.roomId !== shown) continue;
      live.add(e.id);
      const kind = enemyDef(e.enemyId).kind;
      const was = this.modes.get(e.id);
      this.modes.set(e.id, e.mode);
      if (kind !== 'charger') continue;
      if (was !== undefined && was !== 'stun' && e.mode === 'stun') {
        s.play(SOUNDS.chargerImpact);
        j.burst('chargeImpact', e.x + e.swipeDirX * 12, e.y + e.swipeDirY * 12);
        j.shake('medium');
      }
      const since = (this.dust.get(e.id) ?? 0) + deltaMs;
      const kicking = e.mode === 'swipe' || (e.mode === 'windup' && e.modeTicks % 20 < 10);
      if (kicking && since >= HOLLOWS_ENEMY_LOOK.ripple.dustMs) {
        j.burst('chargeDust', e.x, e.y, e.y - 1);
        this.dust.set(e.id, 0);
      } else this.dust.set(e.id, since);
    }
    for (const id of [...this.modes.keys()]) {
      if (live.has(id)) continue;
      this.modes.delete(id);
      this.dust.delete(id);
    }
  }
}
