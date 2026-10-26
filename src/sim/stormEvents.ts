// The Stormcrown's events (064), joined into SimEvents (src/sim/events.ts, kept under 300 lines): what render plays and
// tests read. Each is where it happened, px.

export interface StormEvents {
  /** Lightning struck a storm rod (its node id and base): it is charged now. */
  rodStrikes: { id: number; x: number; y: number }[];
}

export function createStormEvents(): StormEvents {
  return { rodStrikes: [] };
}
