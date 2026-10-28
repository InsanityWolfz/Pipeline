import { BOSS_PHASE_LOOK } from '../data/art/bossPhases';
import { enemyDef } from '../data/enemies';
import { grounded, stormShielded } from '../sim/conductorRods';
import type { EnemyState } from '../sim/enemies';

// 080: which phase look a boss shows, read from flags the sim already keeps (`enraged`, `addsRisen`, the roar, `heat`,
// `vent`, the Conductor's standing rods). Render never decides a phase and never compares health to a threshold: a
// boss at low health with its flag unset shows calm. BossPhaseView draws the look and plays a transition when it flips.

/** A boss's phase look, as `ui().bossPhase` reports it (`flare` is filled in by the view, from its own clock). */
export interface BossPhaseShown {
  boss: 'bulwark' | 'forgewright' | 'conductor';
  /** Bulwark: calm, called, enraged. Forgewright: heat, vent, enraged. Conductor: shielded, open, grounded. */
  look: string;
  /** The Forgewright's heat band (0: dull, 1: cinder, 2: cinder-light, 3: white-hot); null for the others. */
  heatBand: number | null;
  /** The Conductor's storm shield and grounding; null for the others. */
  shield: boolean | null;
  grounded: boolean | null;
  enraged: boolean;
  /** The Bulwark mid-roar (its enrage's transition). */
  roar: boolean;
  /** The Forgewright venting (its plates drawn open, enraged or not). */
  vent: boolean;
}

/** The Forgewright's heat band for a share of its gauge (0..1): the last band whose start it has reached. */
export function heatBand(share: number): number {
  const bands = BOSS_PHASE_LOOK.forgewright.bands;
  let band = 0;
  bands.forEach((b, i) => {
    if (share >= b.from - 1e-9) band = i;
  });
  return band;
}

/** The phase look of a region boss (null for any other enemy, the Warden included: the sim gives it no phase, 080.6). */
export function bossPhase(e: EnemyState): BossPhaseShown | null {
  const def = enemyDef(e.enemyId);
  if (def.kind === 'bulwark') {
    return { boss: 'bulwark', look: e.enraged ? 'enraged' : e.addsRisen ? 'called' : 'calm', heatBand: null, shield: null, grounded: null, enraged: e.enraged, roar: e.mode === 'roar', vent: false };
  }
  if (def.kind === 'forgewright') {
    const venting = e.vent > 0 || e.mode === 'vent';
    return { boss: 'forgewright', look: e.enraged ? 'enraged' : venting ? 'vent' : 'heat', heatBand: heatBand(e.heat / def.heat.max), shield: null, grounded: null, enraged: e.enraged, roar: false, vent: venting };
  }
  if (def.kind === 'conductor') {
    const shield = stormShielded(e);
    const down = grounded(e);
    return { boss: 'conductor', look: down ? 'grounded' : shield ? 'shielded' : 'open', heatBand: null, shield, grounded: down, enraged: e.enraged, roar: false, vent: false };
  }
  return null;
}
