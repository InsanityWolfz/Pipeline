import { LIGHT_BUDGET, LIGHT_SOURCES, ROUND_LIGHTS, type LightSourceId } from '../../data/lights';
import type { Quality } from '../../data/settings';

// 074: which lights the scene places. Phaser's own cull keeps the lights nearest the camera's centre and ignores
// priority, so render picks first: the tier's sources only, by priority, then by distance from the centre, up to the
// tier's budget. Pure, so tests pin it down.

/** A light that could be placed this frame: where, its source, colour (palette id), radius px and intensity. */
export interface LightCandidate {
  source: LightSourceId;
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  priority: number;
}

const tiersOf = (source: LightSourceId): readonly Quality[] => (source === 'round' ? ROUND_LIGHTS.tiers : LIGHT_SOURCES[source].tiers);

/** The lights to place on `quality`, best first. */
export function pickLights(candidates: readonly LightCandidate[], quality: Quality, centre: { x: number; y: number }): LightCandidate[] {
  const budget = LIGHT_BUDGET[quality];
  if (budget === 0) return [];
  const d2 = (l: LightCandidate) => (l.x - centre.x) ** 2 + (l.y - centre.y) ** 2;
  return candidates
    .filter((l) => tiersOf(l.source).includes(quality))
    .map((l) => ({ l, d: d2(l) }))
    .sort((a, b) => a.l.priority - b.l.priority || a.d - b.d)
    .slice(0, budget)
    .map((e) => e.l);
}
