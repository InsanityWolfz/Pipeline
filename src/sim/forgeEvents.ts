// The Forgewright's events (060), joined into SimEvents (src/sim/events.ts, kept under 300 lines): what render plays
// and tests read. Each is where it happened, px, with the Forgewright's id.

export interface ForgeEvents {
  /** A bellows broke (its part, 0 left, 1 right, and its hurtbox's middle); one patched itself whole. */
  bellowsBreaks: { id: number; part: number; x: number; y: number }[];
  bellowsPatches: { id: number; part: number }[];
  /** Both bellows broken at once: it vents (its feet); the vent ended, both bellows whole. */
  vents: { id: number; x: number; y: number }[];
  ventEnds: { id: number }[];
  /** Its hammer slam landed: the circle's centre and radius. */
  slams: { id: number; x: number; y: number; radius: number }[];
  /** Its ember spray left its hammer: where, and how many embers. */
  sprays: { id: number; x: number; y: number; count: number }[];
  /** Its Forge Flood's wind-up began (the half shaded), and its pools spread (the half they cover, px). */
  floodStarts: { id: number }[];
  floods: { id: number; x0: number; y0: number; x1: number; y1: number }[];
}

export function createForgeEvents(): ForgeEvents {
  return { bellowsBreaks: [], bellowsPatches: [], vents: [], ventEnds: [], slams: [], sprays: [], floodStarts: [], floods: [] };
}
