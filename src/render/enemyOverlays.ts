import type { GameObjects } from 'phaser';
import { DEPTHS } from '../data/assets';
import { HUSK_RIG, RESIN } from '../data/art/husk';
import { CORE, WARDEN_RIG } from '../data/art/warden';
import { CHILL_TINT } from '../data/stageAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// Lights and drips drawn over an enemy's baked frames (018), split out of EnemyView in 076: a Husk's resin drip and
// glint, the Warden's core halo, and a chilled enemy's tint (029).

/** A slow drop of resin falling from the binding, and a glint on the bead; out of step from Husk to Husk. Hidden from behind. */
export function drawResin(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
  g.clear();
  if (view === 'up') return;
  const k = HUSK_RIG.scale;
  const x = e.x + RESIN.blob[0] * k * (e.facing === 'left' ? -1 : 1);
  const y = bottom + RESIN.blob[1] * k;
  g.setDepth(bottom + DEPTHS.overlayNudge);
  const { glint: gl, drop } = RESIN;
  const glint = (Math.sin(((now + e.id * RESIN.phase.glint) / RESIN.glintMs) * Math.PI * 2) + 1) / 2;
  g.fillStyle(colorOf(gl.color), glint * gl.alpha).fillCircle(x + gl.at[0] * k, y + gl.at[1] * k, gl.r);
  const t = (now + e.id * RESIN.phase.drip) % RESIN.dripMs;
  if (t >= RESIN.fallMs) return;
  const p = t / RESIN.fallMs;
  g.fillStyle(colorOf(drop.color), 1 - p).fillEllipse(x + drop.at[0] * k, y + drop.at[1] * k + RESIN.fallPx * p * p, drop.size[0], drop.size[1]);
}

/** A halo round the Warden's chest core: a faint glow at rest, pulsing hard through the wind-up. Hidden from behind. */
export function drawCore(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
  g.clear();
  if (view === 'up') return;
  const k = WARDEN_RIG.scale;
  const x = e.x + (view === 'side' ? CORE.side * (e.facing === 'left' ? -1 : 1) : CORE.at[0]) * k;
  const y = bottom + CORE.at[1] * k;
  const pulse = e.mode === 'windup' ? (Math.sin((now / CORE.pulseMs) * Math.PI * 2) + 1) / 2 : 0;
  g.setDepth(bottom + DEPTHS.overlayNudge);
  g.fillStyle(colorOf(CORE.haloColor), CORE.rest + (CORE.peak - CORE.rest) * pulse).fillCircle(x, y, CORE.halo * k * (1 + CORE.swell * pulse));
}

/** A chilled enemy's multiply tint (029): white toward the chill colour, deeper per stack. */
export function chillTint(stacks: number): number {
  const k = Math.min(1, stacks * CHILL_TINT.perStack);
  const to = colorOf(CHILL_TINT.color);
  const mix = (shift: number): number => Math.round(255 + (((to >> shift) & 0xff) - 255) * k) << shift;
  return mix(16) | mix(8) | mix(0);
}
