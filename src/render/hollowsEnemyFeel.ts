import { HOLLOWS_ENEMY_LOOK } from '../data/hollowsEnemyAssets';
import { enemyDef } from '../data/enemies';
import { SOUNDS } from '../data/sounds';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';

const B = HOLLOWS_ENEMY_LOOK.bursts;
const D = HOLLOWS_ENEMY_LOOK.dust;

// Region 2's four's feel (035), for FeelView: a Charger kicking dust down its lane and
// slamming into a wall (a crack of stone, chips and a shake); a Burrower's ripple trailing
// dust and its eruption throwing up rock; a Shardback's bash; a Sniper's lock beep and its
// bolt's crack with a flash at its lens. Their wind-up cues are
// WINDUP_SOUNDS'; this plays what happens after.

export class HollowsEnemyFeel {
  /** Each enemy's mode last frame, and ms since it last kicked up dust. */
  private readonly modes = new Map<number, string>();
  private readonly dust = new Map<number, number>();
  /** Snipers whose sight is locked, so the lock beeps once. */
  private readonly locked = new Set<number>();

  /** What the sim's events say happened: a Charger setting off throws up dust; a Burrower erupting, rock and a jolt. */
  events(ev: SimEvents, j: JuiceView, s: SoundView): void {
    for (const c of ev.charges) j.burst('chargeDust', c.x, c.y, c.y - 1);
    for (const sn of ev.snipes) {
      s.play(SOUNDS.sniperBolt);
      j.burst('boltFlash', sn.x + sn.dx * B.boltAhead, sn.y + sn.dy * B.boltAhead);
    }
    for (const er of ev.eruptions) {
      s.play(SOUNDS.burrowErupt);
      j.burst('eruption', er.x, er.y);
      j.shake('small');
    }
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
      if (kind === 'burrower') {
        this.trail(e.id, e.underground && Math.hypot(e.vx, e.vy) > HOLLOWS_ENEMY_LOOK.ripple.minSpeed, deltaMs, () => j.burst('rippleDust', e.x, e.y + D.rippleDrop, e.y - 1));
        continue;
      }
      if (kind === 'sniper') {
        const def = enemyDef(e.enemyId);
        const lockAt = def.kind === 'sniper' ? def.snipe.trackTicks : 0;
        // The sight locks: two quick beeps, the cue to dodge.
        const locked = e.mode === 'windup' && e.modeTicks >= lockAt;
        if (locked && !this.locked.has(e.id)) s.play(SOUNDS.laserLock);
        if (locked) this.locked.add(e.id);
        else this.locked.delete(e.id);
        continue;
      }
      if (kind === 'shardback') {
        if (was !== undefined && was !== 'swipe' && e.mode === 'swipe') {
          s.play(SOUNDS.shieldBash);
          j.burst('bashSpark', e.x + Math.cos(e.angle) * B.bashAhead, e.y + Math.sin(e.angle) * B.bashAhead);
        }
        continue;
      }
      if (kind !== 'charger') continue;
      if (was !== undefined && was !== 'stun' && e.mode === 'stun') {
        s.play(SOUNDS.chargerImpact);
        j.burst('chargeImpact', e.x + e.swipeDirX * B.impactAhead, e.y + e.swipeDirY * B.impactAhead);
        j.shake('medium');
      }
      const kicking = e.mode === 'swipe' || (e.mode === 'windup' && e.modeTicks % D.pawTicks < D.pawOn);
      this.trail(e.id, kicking, deltaMs, () => j.burst('chargeDust', e.x, e.y, e.y - 1));
    }
    this.forget(live);
  }

  /** While `on`, kicks up dust every `dust.ms` (counted per enemy). */
  private trail(id: number, on: boolean, deltaMs: number, kick: () => void): void {
    const since = (this.dust.get(id) ?? 0) + deltaMs;
    if (on && since >= D.ms) {
      kick();
      this.dust.set(id, 0);
    } else this.dust.set(id, since);
  }

  private forget(live: Set<number>): void {
    for (const id of [...this.modes.keys()]) {
      if (live.has(id)) continue;
      this.modes.delete(id);
      this.dust.delete(id);
      this.locked.delete(id);
    }
  }
}
