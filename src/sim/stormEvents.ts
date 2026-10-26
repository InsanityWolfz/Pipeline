// The Stormcrown's events (064), joined into SimEvents (src/sim/events.ts, kept under 300 lines): what render plays and
// tests read. Each is where it happened, px.

export interface StormEvents {
  /** Lightning struck a storm rod (its node id and base): it is charged now. */
  rodStrikes: { id: number; x: number; y: number }[];
  /** A lightning arc leapt from one enemy to another (their ids and feet, px): render draws its bolt. */
  arcs: { from: number; to: number; fromX: number; fromY: number; toX: number; toY: number }[];
  /** A strike from above landed (the caller's id, its centre and radius, px). */
  strikes: { id: number; x: number; y: number; r: number }[];
  /** The Conductor's: a rod broke (its index and base), a rod regrew; a blink's warning began (the target rod), and the blink itself (from, to). */
  rodBreaks: { id: number; rod: number; x: number; y: number }[];
  rodRegrows: { id: number; rod: number }[];
  blinkWarns: { id: number; rod: number }[];
  blinks: { id: number; rod: number; fromX: number; fromY: number; toX: number; toY: number }[];
  /** Its attacks: the wind-up began (0 lash, 1 storm call, 2 rod chain), and the lash and chain struck. */
  conductorWindups: { id: number; attack: number }[];
  lashes: { id: number; x0: number; y0: number; x1: number; y1: number }[];
  chains: { id: number }[];
  /** 065: a thunderhawk set off down its dive line: its start, unit direction and the line's length. */
  dives: { id: number; x: number; y: number; dx: number; dy: number; length: number }[];
  /** 065: a static mite zapped (its point and the pulse's radius); a killed mite discharged (its point, radius, and the mites it hit, with their feet). */
  zaps: { id: number; x: number; y: number; radius: number }[];
  discharges: { id: number; x: number; y: number; radius: number; hit: { id: number; x: number; y: number }[] }[];
}

export function createStormEvents(): StormEvents {
  return { rodStrikes: [], arcs: [], strikes: [], rodBreaks: [], rodRegrows: [], blinkWarns: [], blinks: [], conductorWindups: [], lashes: [], chains: [], dives: [], zaps: [], discharges: [] };
}
