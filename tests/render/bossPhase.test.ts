import { describe, expect, it } from 'vitest';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { bossPhase, heatBand } from '../../src/render/bossPhase';

// 080: the phase looks read flags the sim keeps and nothing else: a boss at low health with its flag unset is calm.

const at = { x: 100, y: 100 };
const boss = (id: string, set: Partial<EnemyState> = {}): EnemyState => Object.assign(createEnemy(1, id, at, 'overworld'), set);
/** The Conductor with only `n` of its rods standing. */
function rods(n: number, set: Partial<EnemyState> = {}): EnemyState {
  const c = boss('conductor', set);
  c.conductor.rods.forEach((r, i) => {
    if (i >= n) r.regrow = 100;
  });
  return c;
}

describe('080: bossPhase reads the sim\'s flags', () => {
  it('the Bulwark: calm, called (adds risen), enraged (either way), the roar', () => {
    expect(bossPhase(boss('bulwark'))?.look).toBe('calm');
    expect(bossPhase(boss('bulwark', { addsRisen: true }))?.look).toBe('called');
    expect(bossPhase(boss('bulwark', { enraged: true }))?.look).toBe('enraged');
    expect(bossPhase(boss('bulwark', { enraged: true, addsRisen: true }))).toMatchObject({ look: 'enraged', enraged: true });
    expect(bossPhase(boss('bulwark', { enraged: true, mode: 'roar' }))?.roar).toBe(true);
  });

  it('the Forgewright: its heat bands, vent and enrage', () => {
    expect([0, 0.24, 0.25, 0.49, 0.5, 0.89, 0.9, 1].map(heatBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(bossPhase(boss('forgewright', { heat: 95 }))).toMatchObject({ look: 'heat', heatBand: 3, vent: false });
    expect(bossPhase(boss('forgewright', { vent: 60, mode: 'vent', heat: 30 }))).toMatchObject({ look: 'vent', heatBand: 1, vent: true });
    expect(bossPhase(boss('forgewright', { enraged: true }))).toMatchObject({ look: 'enraged', enraged: true });
    expect(bossPhase(boss('forgewright', { enraged: true, vent: 30 }))).toMatchObject({ look: 'enraged', vent: true });
  });

  it('the Conductor: shielded (3+ rods), open (2), grounded (under 2), each with or without its enrage', () => {
    expect(CROWN_SPIRE.sockets.length).toBe(6);
    for (const enraged of [false, true]) {
      expect(bossPhase(rods(6, { enraged }))).toMatchObject({ look: 'shielded', shield: true, grounded: false, enraged });
      expect(bossPhase(rods(3, { enraged }))).toMatchObject({ look: 'shielded', shield: true });
      expect(bossPhase(rods(2, { enraged }))).toMatchObject({ look: 'open', shield: false, grounded: false, enraged });
      expect(bossPhase(rods(1, { enraged }))).toMatchObject({ look: 'grounded', shield: false, grounded: true, enraged });
    }
  });

  it('shows calm at low health with no flag set, and none for the Warden or any other enemy', () => {
    expect(bossPhase(boss('bulwark', { health: 10 }))?.look).toBe('calm');
    expect(bossPhase(boss('forgewright', { health: 10 }))).toMatchObject({ look: 'heat', enraged: false });
    expect(bossPhase(rods(6, { health: 10 }))).toMatchObject({ look: 'shielded', enraged: false });
    expect(bossPhase(boss('pylon-warden', { health: 1 }))).toBeNull();
    expect(bossPhase(boss('husk'))).toBeNull();
  });
});
