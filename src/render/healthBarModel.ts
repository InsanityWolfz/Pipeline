import { HP_BAR } from '../data/hudPanels';

// The HP bar's motion (031), pure so tests can drive it: the fill shown, the white
// damage chunk above it, and the low-HP pulse. Render time only; the sim's health
// is the truth and this just eases toward it.

/** What the bar shows: `shown` is the fill's value, `top` the damage chunk's top (the chunk runs from health up to it). */
export interface HealthBarModel {
  shown: number;
  top: number;
  /** The health the bar last saw. */
  last: number;
  /** Ms left holding the chunk before it drains, and its drain rate once draining, HP per ms. */
  holdMs: number;
  drainRate: number;
  /** Ms into the low-HP pulse; 0 while not low. */
  pulseMs: number;
  low: boolean;
}

export interface HealthBarInput {
  health: number;
  max: number;
  /** The sim says the player is healing (030): the fill rises smoothly. */
  healing: boolean;
  /** The player is KO'd: no low-HP pulse during the fade. */
  dying: boolean;
}

type Tuning = Pick<typeof HP_BAR, 'lowFraction' | 'pulseMs' | 'chunkHoldMs' | 'chunkDrainMs' | 'riseMs'>;

export function createHealthBar(health: number): HealthBarModel {
  return { shown: health, top: health, last: health, holdMs: 0, drainRate: 0, pulseMs: 0, low: false };
}

/** Below `lowFraction` of max health, and not while dying. */
export function isLow(health: number, max: number, dying: boolean, tuning: Tuning = HP_BAR): boolean {
  return !dying && health < max * tuning.lowFraction;
}

/** Advances the bar `dtMs` toward `input`. */
export function stepHealthBar(m: HealthBarModel, input: HealthBarInput, dtMs: number, tuning: Tuning = HP_BAR): void {
  const { health } = input;
  if (health < m.last) {
    // A drop: the old top stays white (a hit during the hold or drain grows the same chunk) and the hold starts over.
    m.top = Math.max(m.top, m.shown, m.last);
    m.holdMs = tuning.chunkHoldMs;
    m.drainRate = 0;
  }
  m.last = health;
  // The fill drops at once; it rises smoothly only while healing.
  if (health <= m.shown || !input.healing) m.shown = health;
  else {
    m.shown += (health - m.shown) * Math.min(1, dtMs / tuning.riseMs);
    if (health - m.shown < 0.05) m.shown = health;
  }
  // Healing past the chunk clears it.
  if (m.top <= health) {
    m.top = health;
    m.holdMs = 0;
  } else if (m.holdMs > 0) {
    m.holdMs -= dtMs;
    if (m.holdMs <= 0) {
      m.drainRate = (m.top - health) / tuning.chunkDrainMs;
      m.top = Math.max(health, m.top + m.holdMs * m.drainRate);
      m.holdMs = 0;
    }
  } else m.top = Math.max(health, m.top - dtMs * m.drainRate);
  m.low = isLow(health, input.max, input.dying, tuning);
  m.pulseMs = m.low ? (m.pulseMs + dtMs) % tuning.pulseMs : 0;
}

/** The white chunk's size now, HP (0 when there is none). */
export function chunkOf(m: HealthBarModel): number {
  return Math.max(0, m.top - m.last);
}

/** The pulse, 0 at rest to 1 at its peak, once per `pulseMs`; 0 while not low. */
export function pulseOf(m: HealthBarModel, tuning: Tuning = HP_BAR): number {
  if (!m.low) return 0;
  return (1 - Math.cos((2 * Math.PI * m.pulseMs) / tuning.pulseMs)) / 2;
}
