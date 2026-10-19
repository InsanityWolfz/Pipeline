import type { GameObjects } from 'phaser';
import { DEPTHS } from '../data/assets';
import { IDLE_SPEED } from '../data/config';
import { BULWARK_RIG, BULWARK_SEAM } from '../data/art/bulwark';
import { enemyDef } from '../data/enemies';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// How the Bulwark reads on screen (034), for EnemyView: its pose (the extras it has:
// shuffling round, rearing back to lob, the throw, rocking behind its shield on a block),
// the gold halo of the core seam on its back whenever its back shows (the place to hit),
// and its pound's red ground circle, filling through the wind-up in the Warden's style.

export type BulwarkPose = 'idle' | 'walk' | 'turn' | 'lob' | 'throw' | 'windup' | 'swipe' | 'recover' | 'hit' | 'block';

/** The pose for its mode; `turned` says its shield turned since the last frame. */
export function bulwarkPose(e: EnemyState, turned: boolean): BulwarkPose {
  if (e.mode === 'lob' || e.mode === 'throw' || e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover') return e.mode;
  if (e.blockFlash > 0) return 'block';
  if (e.flash > 0) return 'hit';
  if (Math.hypot(e.vx, e.vy) >= IDLE_SPEED) return 'walk';
  return turned ? 'turn' : 'idle';
}

/** The seam's gold halo on its back (side view: its back edge; from behind: its middle), pulsing; none face-on. */
export function drawSeam(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
  g.clear();
  if (view === 'down') return;
  const S = HOLLOWS_LOOK.seam;
  const k = BULWARK_RIG.scale;
  const back = view === 'side' ? BULWARK_SEAM.side * (e.facing === 'left' ? -1 : 1) : BULWARK_SEAM.at[0];
  const pulse = (Math.sin((now / S.pulseMs) * Math.PI * 2) + 1) / 2;
  g.setDepth(bottom + DEPTHS.overlayNudge);
  g.fillStyle(colorOf(S.color), S.alpha[0] + (S.alpha[1] - S.alpha[0]) * pulse).fillCircle(e.x + back * k, bottom + BULWARK_SEAM.at[1] * k, S.radius * (view === 'side' ? S.sideScale : 1));
}

/** The pound's telegraph: the full circle faint, a disc filling it as the wind-up runs. */
export function drawPound(g: GameObjects.Graphics, e: EnemyState): void {
  const def = enemyDef(e.enemyId);
  if (def.kind !== 'bulwark' || e.mode !== 'windup') return;
  const P = HOLLOWS_LOOK.pound;
  const progress = Math.min(1, e.modeTicks / def.pound.windupTicks);
  const color = colorOf(P.color);
  g.fillStyle(color, P.alpha).fillCircle(e.x, e.y, def.pound.radius);
  g.fillStyle(color, P.fillAlpha).fillCircle(e.x, e.y, def.pound.radius * progress);
}
