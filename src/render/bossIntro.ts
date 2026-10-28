import { INTRO_LOOK, type IntroBeats } from '../data/art/bossIntro';
import type { IntroPose } from '../data/enemyAnims';
import { INTRO_SHAKE } from '../data/juice';
import { VIEW_WIDTH } from '../data/config';
import { BOSS_LOOK } from '../data/arenaAssets';
import { enemyDef } from '../data/enemies';
import { introShort } from '../sim/bossIntro';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';

// 080: a boss intro as drawn, pure, by intro ticks (`modeTicks` in `intro`, 1 on its first): which beat and frame the
// boss shows, the card's fade and scale, the boss bar's fill, the pan's weight and the shake's gate. The views
// (BossIntroView, SceneCameras, BossBar, enemyArt) draw what these say; tests sample them at fixed ticks.

export type IntroBeat = IntroPose;

/** The beats for a full or short intro. */
export const beatsOf = (short: boolean): IntroBeats => (short ? INTRO_LOOK.short : INTRO_LOOK.full);

/** The beat `modeTicks` into an intro shows, and how far into it (ticks from its start, and its length). */
export function introBeat(modeTicks: number, short: boolean): { beat: IntroBeat; at: number; length: number } {
  const b = beatsOf(short);
  const t = Math.max(0, modeTicks - 1);
  if (t >= b.ready) return { beat: 'ready', at: t - b.ready, length: b.end - b.ready };
  if (t >= b.beat) return { beat: 'beat', at: t - b.beat, length: b.ready - b.beat };
  if (t >= b.rise) return { beat: 'rise', at: t - b.rise, length: b.beat - b.rise };
  return { beat: 'stir', at: t - b.stir, length: b.rise - b.stir };
}

/** The frame of the beat's pose: the rise's three by progress (a short intro's last half of them), ready's two on a slow breathe. */
export function introFrame(beat: IntroBeat, at: number, length: number, short: boolean): number {
  if (beat === 'rise') {
    const p = length > 0 ? at / length : 1;
    const from = short ? INTRO_LOOK.shortRiseFrom * 3 : 0;
    return Math.min(2, Math.floor(from + p * (3 - from)));
  }
  if (beat === 'ready') return Math.floor(at / INTRO_LOOK.breatheTicks) % 2;
  return 0;
}

/** Ticks since the rise last changed frame (a new pose arrives with a snap that settles). */
function riseFrameAge(at: number, length: number, short: boolean): number {
  const frame = introFrame('rise', at, length, short);
  for (let k = 0; k <= at; k++) if (introFrame('rise', at - k, length, short) !== frame) return k - 1;
  return at;
}

/** The squash about the feet on top of the pose: each rise pose arrives stretched and settles (snappy, 076's look). */
export function introSquash(beat: IntroBeat, at: number, length: number, short: boolean): number {
  if (beat !== 'rise') return 0;
  const age = riseFrameAge(at, length, short);
  const n = INTRO_LOOK.riseSettleTicks;
  return age < n ? -0.06 * (1 - age / n) : 0;
}

/** A smooth 0 → 1 over [0, 1] (smoothstep), clamped. */
export const smooth = (x: number): number => {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
};

/** How far through [a, b] tick `t` is, clamped to [0, 1]. */
const through = (t: number, [a, b]: readonly [number, number]): number => Math.max(0, Math.min(1, (t - a) / (b - a)));

/** The name card's alpha and scale `modeTicks` into a full intro (none in a short one): in snappy, held, out. */
export function cardCurve(modeTicks: number, short: boolean): { alpha: number; scale: number } {
  if (short) return { alpha: 0, scale: 1 };
  const C = INTRO_LOOK.card;
  const t = modeTicks - 1;
  if (t < C.in[0]) return { alpha: 0, scale: C.scaleFrom };
  if (t < C.out[0]) {
    const p = through(t, C.in);
    // Snappy: an ease-out cubic on the scale, so it lands fast and settles.
    return { alpha: p, scale: C.scaleFrom + (1 - C.scaleFrom) * (1 - (1 - p) ** 3) };
  }
  return { alpha: 1 - through(t, C.out), scale: 1 };
}

/** The boss bar's frame and name: they fade in with the card in a full intro (shown from the start of a short one). */
export function barAlpha(modeTicks: number, short: boolean): number {
  return short ? 1 : through(modeTicks - 1, INTRO_LOOK.card.in);
}

/** The boss bar's fill `modeTicks` into an intro, 0 to 1 (full outside one). */
export function barFill(modeTicks: number, short: boolean): number {
  return through(modeTicks - 1, short ? INTRO_LOOK.bar.short : INTRO_LOOK.bar.full);
}

/** How far the camera sits toward the boss `modeTicks` into a full intro, 0 to 1 (none in a short one). */
export function panWeight(modeTicks: number, short: boolean): number {
  if (short) return 0;
  const P = INTRO_LOOK.pan;
  const t = modeTicks - 1;
  if (t < P.out[0]) return smooth(through(t, P.in));
  return 1 - smooth(through(t, P.out));
}

/** A step toward `to` from `from`, at most `cap` px along each axis (the pan's per-frame cap). */
export function capped(from: number, to: number, cap: number): number {
  return from + Math.max(-cap, Math.min(cap, to - from));
}

/** The intro's shake, or null where the setting or a reduced-motion system stops it (logged as suppressed). */
export function introShake(short: boolean, flashes: boolean, reducedMotion: boolean): { ms: number; intensity: number } | null {
  if (!flashes || reducedMotion) return null;
  return short ? INTRO_SHAKE.short : INTRO_SHAKE.full;
}

/** Where the card's tablet sits, view px: centred across, its top `gap` under the bar's bottom, sized to its lines. */
export function cardBox(nameW: number, arenaW: number, linesH: number, barBottom: number): { x: number; y: number; w: number; h: number } {
  const C = INTRO_LOOK.card;
  const w = Math.max(C.minWidth, Math.ceil(Math.max(nameW, arenaW)) + 2 * C.pad);
  return { x: Math.round((VIEW_WIDTH - w) / 2), y: barBottom + C.gap, w, h: Math.ceil(linesH) + 2 * C.padY };
}

/** The boss in its intro in the room on screen, if any, and whether its intro is the short one. */
export function introNow(sim: SimState, shown: string): { boss: EnemyState; short: boolean } | null {
  const boss = sim.enemies.find((e) => e.roomId === shown && e.mode === 'intro' && e.health > 0 && enemyDef(e.enemyId).boss);
  return boss ? { boss, short: introShort(sim, boss) } : null;
}

/** The pan's focus (the boss's body middle: its feet raised by half its drawn height, BOSS_LOOK) and weight, or null. */
export function introPan(sim: SimState, shown: string): { x: number; y: number; weight: number } | null {
  const now = introNow(sim, shown);
  if (!now) return null;
  const h = BOSS_LOOK.heights[now.boss.enemyId] ?? BOSS_LOOK.height;
  return { x: now.boss.x, y: now.boss.y - h / 2, weight: panWeight(now.boss.modeTicks, now.short) };
}
