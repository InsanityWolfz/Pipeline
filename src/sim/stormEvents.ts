// The Stormcrown's events (064), joined into SimEvents (src/sim/events.ts, kept under 300 lines): what render plays and
// tests read. Each is where it happened, px.

export interface StormEvents {
  /** Lightning struck a storm rod (its node id and base): it is charged now. */
  rodStrikes: { id: number; x: number; y: number }[];
  /** A lightning arc leapt from one enemy to another (their ids and feet, px): render draws its bolt. */
  arcs: { from: number; to: number; fromX: number; fromY: number; toX: number; toY: number }[];
}

export function createStormEvents(): StormEvents {
  return { rodStrikes: [], arcs: [] };
}
