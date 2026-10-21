import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { ENEMIES } from '../../src/data/enemies';
import { SANDBOX } from '../../src/data/sandbox';
import { ROUNDS } from '../../src/data/tags';
import { DEFAULT_PICK, ENEMY_CHOICES, ROUND_CHOICES, sandboxClick, sandboxColumns } from '../../src/render/sandboxRows';

// 044: the Sandbox panel's rows: every round (from AMMO) and every enemy (from ENEMIES) are choices, and each click
// becomes the panel's next choice or the command the sim gets.

const sb = { loadout: ['arrow', null, 'bomb+cluster'], god: false };
const up = (id: string) => ({ id, part: 'up' as const });
const down = (id: string) => ({ id, part: 'down' as const });
const row = (id: string) => ({ id, part: 'row' as const });

describe('the Sandbox panel rows (044)', () => {
  it('offers every round and tagged round, and every enemy, bosses included', () => {
    expect(ROUND_CHOICES).toEqual([null, ...Object.keys(AMMO)]);
    for (const r of ROUNDS) expect(ROUND_CHOICES).toContain(r);
    expect(ENEMY_CHOICES).toEqual(Object.keys(ENEMIES));
    expect(ENEMY_CHOICES).toContain('bulwark');
  });

  it('lays out the loadout column and the spawn column', () => {
    const [loadout, spawn] = sandboxColumns(sb, DEFAULT_PICK);
    expect(loadout.map((r) => r.id)).toEqual(['entrance-0', 'entrance-1', 'entrance-2', 'god', 'reset-pylon-warden', 'reset-bulwark']);
    expect(loadout.map((r) => r.label).slice(0, 3)).toEqual(['Arrow', 'Empty', 'Cluster bomb']);
    expect(spawn.map((r) => r.id)).toEqual(['enemy', 'ring', 'champion', 'count', 'spawn', 'clear']);
  });

  it('steps an entrance through the rounds, wrapping round', () => {
    expect(sandboxClick(up('entrance-0'), sb, DEFAULT_PICK).command).toEqual({ kind: 'loadout', entrance: 0, round: ROUND_CHOICES[2] });
    expect(sandboxClick(down('entrance-1'), sb, DEFAULT_PICK).command).toEqual({ kind: 'loadout', entrance: 1, round: ROUND_CHOICES[ROUND_CHOICES.length - 1] });
    expect(sandboxClick(up('entrance-1'), sb, DEFAULT_PICK).command).toEqual({ kind: 'loadout', entrance: 1, round: 'arrow' });
    // Onto Empty both ways (a null choice is a choice, not a miss).
    expect(sandboxClick(down('entrance-0'), sb, DEFAULT_PICK).command).toEqual({ kind: 'loadout', entrance: 0, round: null });
    const last = { loadout: [ROUND_CHOICES[ROUND_CHOICES.length - 1] ?? null], god: false };
    expect(sandboxClick(up('entrance-0'), last, DEFAULT_PICK).command).toEqual({ kind: 'loadout', entrance: 0, round: null });
  });

  it('toggles god mode and resets a boss', () => {
    expect(sandboxClick(row('god'), sb, DEFAULT_PICK).command).toEqual({ kind: 'god', on: true });
    expect(sandboxClick(row('reset-bulwark'), sb, DEFAULT_PICK).command).toEqual({ kind: 'reset', boss: 'bulwark' });
  });

  it('changes the spawn choices without a command, then Spawn and Clear send them', () => {
    let pick = DEFAULT_PICK;
    pick = sandboxClick(up('enemy'), sb, pick).pick;
    expect(pick.enemyId).toBe(ENEMY_CHOICES[1]);
    pick = sandboxClick(down('ring'), sb, pick).pick;
    expect(pick.ring).toBe(3);
    pick = sandboxClick(row('champion'), sb, pick).pick;
    expect(pick.champion).toBe(true);
    for (let i = 0; i < 20; i++) pick = sandboxClick(up('count'), sb, pick).pick;
    expect(pick.count).toBe(SANDBOX.maxCount);
    for (let i = 0; i < 20; i++) pick = sandboxClick(down('count'), sb, pick).pick;
    expect(pick.count).toBe(1);
    expect(sandboxClick(up('ring'), sb, pick).command).toBeNull();
    expect(sandboxClick(row('spawn'), sb, pick).command).toEqual({ kind: 'spawn', enemyId: ENEMY_CHOICES[1], ring: 3, champion: true, count: 1 });
    expect(sandboxClick(row('clear'), sb, pick).command).toEqual({ kind: 'clear' });
  });
});
