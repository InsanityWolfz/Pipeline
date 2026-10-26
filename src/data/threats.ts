import { ENEMY_FX } from './assets';
import type { EnemyDef } from './enemies';

// Off-screen threat markers (071): which wind-ups count as an attack on the player, and how the edge arrows look.
// src/sim/threats.ts lists the enemies off screen in one of these modes; src/render/ThreatView.ts draws an arrow at the
// screen's edge toward each. A new kind that should warn is a line here.

/** The enemy modes that are a wind-up (071: the Bulwark rears back to lob in `lob`; everything else winds up in `windup`). */
export type ThreatMode = 'windup' | 'lob';

/**
 * Each kind whose wind-up is aimed at the player from range, and the modes that are that wind-up: the Sniper's sight
 * (tracking, then locked), the storm sentinel's call, the Wisp's charge (`caster`), the thunderhawk's dive, the bellows
 * hound's and the Charger's lanes, and the Bulwark's lob (not its pound, whose `windup` lands only in reach).
 */
export const THREAT_WINDUPS: Readonly<Partial<Record<EnemyDef['kind'], readonly ThreatMode[]>>> = {
  sniper: ['windup'],
  sentinel: ['windup'],
  caster: ['windup'],
  hawk: ['windup'],
  hound: ['windup'],
  charger: ['windup'],
  bulwark: ['lob'],
};

/**
 * The edge arrow, world px (a world px is a view px): a filled triangle `length` from tip to base and `width` across,
 * in the shared enemy red with an ink outline `outline` px wide, its tip `edgeInset` in from the view's edge (or a HUD
 * box's). Arrows whose tips are closer than `mergeGap` merge into one. It pulses between the alphas once per `pulseMs`
 * through the wind-up, and fades out over `fadeMs` once the attack lands or is cancelled.
 */
export const THREAT_ARROW = {
  length: 14,
  width: 14,
  outline: 1.5,
  edgeInset: 6,
  mergeGap: 28,
  color: ENEMY_FX.telegraphColor,
  outlineColor: 'ink',
  pulse: { min: 0.55, max: 1, ms: 500 },
  fadeMs: 250,
} as const;
