// The Emberworks enemies' events (061), joined into SimEvents (src/sim/events.ts, kept under 300 lines): what render
// plays and tests read. Each is where it happened, px, with the enemy's id.

export interface EmberEvents {
  /** A cinder mote burst on its own (its living burst): its point and the burst's radius; its pool lies there. */
  moteBursts: { id: number; x: number; y: number; radius: number }[];
  /** A killed mote's death burst: its point, radius, and the enemies it hit. */
  deathBursts: { id: number; x: number; y: number; radius: number; hit: number[] }[];
  /** A bellows hound set off down its lane: its start, unit direction and the lane's length. */
  dashes: { id: number; x: number; y: number; dx: number; dy: number; length: number }[];
  /** A slag golem's slam landed: the circle's centre and radius. */
  golemSlams: { id: number; x: number; y: number; radius: number }[];
  /** A slag golem died and split (`splits` is the Split round's): where, and its whelps' ids. */
  golemSplits: { id: number; x: number; y: number; whelps: number[] }[];
  /** A kiln-tender's beam began its wind-up on a packmate, and its beam broke (`blocked`, `died`, `hurt`, or a Stun's `stunned`). */
  beams: { id: number; target: number }[];
  beamBreaks: { id: number; target: number; reason: 'blocked' | 'died' | 'hurt' | 'stunned' }[];
}

export function createEmberEvents(): EmberEvents {
  return { moteBursts: [], deathBursts: [], dashes: [], golemSlams: [], golemSplits: [], beams: [], beamBreaks: [] };
}
