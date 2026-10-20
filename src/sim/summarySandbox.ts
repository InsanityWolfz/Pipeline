import { SANDBOX_PENS } from '../data/sandbox';
import { PEN_GROUP } from './sandbox';
import type { SimState } from './state';

// The sandbox's part of getState() (044): whether this is the sandbox, each entrance's
// round, god mode, and each pen's enemy and refill countdown.

export interface SandboxSummary {
  /** `?sandbox` is running (044). */
  sandbox: boolean;
  /** Each entrance's round (an AMMO id, or null for empty), in INTAKE.entrances order; null outside the sandbox. */
  loadout: (string | null)[] | null;
  god: boolean;
  /** Each pen: its enemy, whether it's there, and the ticks until it refills (null while there). Empty outside the sandbox. */
  pens: { enemyId: string; alive: boolean; refillIn: number | null }[];
}

export function sandboxSummary(state: SimState): SandboxSummary {
  const sb = state.sandbox;
  if (!sb) return { sandbox: false, loadout: null, god: false, pens: [] };
  return {
    sandbox: true,
    loadout: [...sb.loadout],
    god: sb.god,
    pens: SANDBOX_PENS.map((p, i) => ({ enemyId: p.enemyId, alive: state.enemies.some((e) => e.group === PEN_GROUP(i) && e.health > 0), refillIn: sb.pens[i] ?? null })),
  };
}
