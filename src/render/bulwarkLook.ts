import type { GameObjects } from 'phaser';
import { DEPTHS } from '../data/assets';
import { IDLE_SPEED } from '../data/config';
import { BULWARK_RIG, BULWARK_RUNES, BULWARK_SEAM } from '../data/art/bulwark';
import { BULWARK } from '../data/bulwark';
import { enemyDef } from '../data/enemies';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// How the Bulwark reads on screen (034), for EnemyView: its pose (the extras it has:
// shuffling round, rearing back to lob, the throw, rocking behind its shield on a block),
// the gold halo of the core seam on its back whenever its back shows (the place to hit),
// and its pound's red ground circle, filling through the wind-up in the Warden's style.
// 041: its enraged look, its rear stomp's half-disc and its adds' rising circles.

export type BulwarkPose = 'idle' | 'walk' | 'turn' | 'lob' | 'throw' | 'windup' | 'swipe' | 'recover' | 'hit' | 'block' | 'roar' | 'brace' | 'stomp';

/** The pose for its mode (041: the roar, and the stomp's brace, stamp and recovery); `turned` says its shield turned since the last frame. */
export function bulwarkPose(e: EnemyState, turned: boolean): BulwarkPose {
  if (e.mode === 'lob' || e.mode === 'throw' || e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover' || e.mode === 'roar' || e.mode === 'stomp') return e.mode;
  if (e.mode === 'stomp-windup') return 'brace';
  if (e.mode === 'stomp-recover') return 'recover';
  if (e.blockFlash > 0) return 'block';
  if (e.flash > 0) return 'hit';
  if (Math.hypot(e.vx, e.vy) >= IDLE_SPEED) return 'walk';
  return turned ? 'turn' : 'idle';
}

/**
 * The seam's gold halo on its back (side view: its back edge; from behind: its middle), pulsing; none face-on. Enraged
 * (041), the seam burns danger red and pulses faster, its shield's runes light red, and steam rises off it.
 */
export function drawSeam(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
  g.clear();
  g.setDepth(bottom + DEPTHS.overlayNudge);
  const E = HOLLOWS_LOOK.enraged;
  const k = BULWARK_RIG.scale;
  const flip = e.facing === 'left' ? -1 : 1;
  if (e.enraged) {
    drawRunes(g, e.x, bottom, view, flip);
    drawSteam(g, e, bottom, now);
  }
  if (view === 'down') return;
  const S = HOLLOWS_LOOK.seam;
  const back = view === 'side' ? BULWARK_SEAM.side * flip : BULWARK_SEAM.at[0];
  const pulseMs = e.enraged ? E.seamPulseMs : S.pulseMs;
  const pulse = (Math.sin((now / pulseMs) * Math.PI * 2) + 1) / 2;
  const [lo, hi] = e.enraged ? E.seamAlpha : S.alpha;
  g.fillStyle(colorOf(e.enraged ? E.color : S.color), lo + (hi - lo) * pulse).fillCircle(e.x + back * k, bottom + BULWARK_SEAM.at[1] * k, S.radius * (view === 'side' ? S.sideScale : 1));
}

/** Its shield's runes burning red (041): the face's chevrons face-on, the edge's line side-on; hidden behind it from the back. */
function drawRunes(g: GameObjects.Graphics, x: number, bottom: number, view: 'down' | 'up' | 'side', flip: number): void {
  if (view === 'up') return;
  const E = HOLLOWS_LOOK.enraged;
  const R = BULWARK_RUNES;
  const k = BULWARK_RIG.scale;
  g.lineStyle(E.runeWidth, colorOf(E.color), E.runeAlpha);
  if (view === 'side') {
    const rx = x + (R.side.x + R.side.dx) * k * flip;
    g.lineBetween(rx, bottom + R.side.y0 * k, rx, bottom + R.side.y1 * k);
    return;
  }
  for (const y of R.face) {
    g.beginPath();
    g.moveTo(x - R.half * k, bottom + y * k);
    g.lineTo(x, bottom + (y + R.dip) * k);
    g.lineTo(x + R.half * k, bottom + y * k);
    g.strokePath();
  }
}

/** Steam puffs rising off its shoulders while enraged (041), out of step with each other. */
function drawSteam(g: GameObjects.Graphics, e: EnemyState, bottom: number, now: number): void {
  const S = HOLLOWS_LOOK.enraged.steam;
  for (let i = 0; i < S.puffs; i++) {
    const t = ((now / S.riseMs + i / S.puffs) % 1 + 1) % 1;
    const side = i % 2 === 0 ? -1 : 1;
    g.fillStyle(colorOf(S.color), S.alpha * (1 - t)).fillCircle(e.x + side * S.spread * (0.5 + t * 0.5), bottom + S.top - S.rise * t, S.radius * (1 + t));
  }
}

/** The rear stomp's telegraph (041): a half-disc over its back in the pound circle's style, filling through the wind-up. */
export function drawStomp(g: GameObjects.Graphics, e: EnemyState): void {
  const def = enemyDef(e.enemyId);
  if (def.kind !== 'bulwark' || e.mode !== 'stomp-windup') return;
  const P = HOLLOWS_LOOK.stomp;
  const progress = Math.min(1, e.modeTicks / def.stomp.windupTicks);
  const angle = Math.atan2(e.swipeDirY, e.swipeDirX);
  const half = (def.stomp.arcDegrees * Math.PI) / 360;
  const color = colorOf(P.color);
  g.fillStyle(color, P.alpha);
  g.slice(e.x, e.y, def.stomp.radius, angle - half, angle + half, false);
  g.fillPath();
  g.fillStyle(color, P.fillAlpha);
  g.slice(e.x, e.y, def.stomp.radius * progress, angle - half, angle + half, false);
  g.fillPath();
}

/** An add rising (041): the summon's cracked red circle at its feet, smaller, its ring and cracks opening as it rises. */
export function drawRise(g: GameObjects.Graphics, e: EnemyState): void {
  if (e.rising <= 0) return;
  const S = HOLLOWS_LOOK.summon;
  const r = S.radius * HOLLOWS_LOOK.addRise.scale;
  const k = 1 - e.rising / BULWARK.adds.riseTicks;
  const color = colorOf(S.color);
  const ring = Math.min(1, k * 2);
  g.lineStyle(S.ringWidth, color, S.alpha).strokeEllipse(e.x, e.y, r * 2 * ring, r * ring);
  for (let i = 0; i < S.cracks; i++) {
    const a = (i / S.cracks) * Math.PI * 2 + S.crackStart;
    g.lineStyle(S.crackWidth, color, S.alpha).lineBetween(e.x, e.y, e.x + Math.cos(a) * r * k, e.y + (Math.sin(a) * r * k) / 2);
  }
}

/** How far up from the ground a rising add shows (041): 0 just begun, 1 up. */
export const riseShown = (e: Pick<EnemyState, 'rising'>): number => (e.rising > 0 ? 1 - e.rising / BULWARK.adds.riseTicks : 1);

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
