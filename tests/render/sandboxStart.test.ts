import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../src/data/save';
import { SANDBOX_START } from '../../src/data/sandbox';
import { DEFAULT_BINDINGS, SANDBOX_ONLY } from '../../src/data/settings';
import { TUTORIAL_START } from '../../src/data/player';
import { isSandboxUrl, skipsTitle } from '../../src/render/flow/flowTypes';
import { SaveStore } from '../../src/render/flow/saveStore';
import { parseSettings, rebind } from '../../src/render/flow/settingsStore';
import { parseStart, simForUrl } from '../../src/render/playtest';
import { damagePlayer } from '../../src/sim/health';
import { makeEnvelope, snapshot } from '../../src/sim/save';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { NO_COMMAND } from '../../src/sim/input';
import { installStorage } from './memoryStorage';

// 044: `?sandbox` parses to the sandbox start, skips the title, and never reads or writes the save slot, its backup or
// the settings' save rows (it hides them); the panel's key is a binding the key list shows only in the sandbox.

let store: Map<string, string>;

beforeEach(() => {
  store = installStorage();
});

/** Every storage key read, written or removed while `run` runs. */
function touched(run: () => void): Set<string> {
  const keys = new Set<string>();
  const real = window.localStorage;
  const spy = {
    getItem: (k: string) => (keys.add(k), real.getItem(k)),
    setItem: (k: string, v: string) => (keys.add(k), real.setItem(k, v)),
    removeItem: (k: string) => (keys.add(k), real.removeItem(k)),
  };
  Object.defineProperty(globalThis, 'window', { value: { localStorage: spy }, configurable: true, writable: true });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, 'window', { value: { localStorage: real }, configurable: true, writable: true });
  }
  return keys;
}

describe('the ?sandbox start (044)', () => {
  it('parses to the sandbox start and skips the title', () => {
    expect(parseStart('?sandbox')).toBe(SANDBOX_START);
    expect(skipsTitle('?sandbox')).toBe(true);
    expect(isSandboxUrl('?sandbox')).toBe(true);
    expect(isSandboxUrl('')).toBe(false);
    expect(isSandboxUrl('?start=field')).toBe(false);
    expect(skipsTitle('')).toBe(false);
    expect(parseStart('')).toBe(TUTORIAL_START);
    expect(simForUrl('?sandbox', 4).sandbox).toBeDefined();
    expect(simForUrl('?start=field', 4).sandbox).toBeUndefined();
  });

  it('never reads or writes the save slot or its backup, and a real save is untouched', () => {
    const real = JSON.stringify(makeEnvelope(snapshot(createSim(9, { start: TUTORIAL_START })), { build: 'test', savedAt: 'then', endCardSeen: false }));
    store.set(STORAGE_KEYS.save, real);
    store.set(STORAGE_KEYS.backup, 'backup');
    const keys = touched(() => {
      // As the flow does: its store is off under a title-skipping URL, and it writes after every tick.
      const saves = new SaveStore(!skipsTitle('?sandbox'));
      expect(saves.read().status).toBe('none');
      const sim = simForUrl('?sandbox', 3);
      for (let t = 0; t < 200; t++) {
        if (t === 10) damagePlayer(sim, 10_000, 1, 0, 0, 0);
        stepSim(sim, { ...NO_COMMAND, fire: t % 2 === 0, aimX: sim.player.x + 100, aimY: sim.player.y });
        expect(saves.write(sim, false, new Date(0))).toBe('skipped');
      }
      expect(saves.clearToBackup()).toBe(true);
      expect(saves.replace(makeEnvelope(snapshot(sim), { build: 'x', savedAt: 'now', endCardSeen: false }))).toBe(false);
    });
    expect([...keys].filter((k) => k === STORAGE_KEYS.save || k === STORAGE_KEYS.backup)).toEqual([]);
    expect(store.get(STORAGE_KEYS.save)).toBe(real);
    expect(store.get(STORAGE_KEYS.backup)).toBe('backup');
  });

  it('binds the panel to the backquote, shown only in the sandbox; an older file whose keys clash leaves it unbound', () => {
    expect(DEFAULT_BINDINGS.sandbox).toBe('BACKTICK');
    expect(SANDBOX_ONLY).toEqual(['sandbox']);
    const old = parseSettings(JSON.stringify({ bindings: { ...DEFAULT_BINDINGS, sandbox: undefined, dodge: 'BACKTICK' } }));
    expect(old?.bindings.dodge).toBe('BACKTICK');
    expect(old?.bindings.sandbox).toBe('');
    expect(old?.bindings.interact).toBe('E');
  });

  it('never swaps the hidden panel action onto another key outside the sandbox', () => {
    const outside = rebind(DEFAULT_BINDINGS, 'dodge', 'BACKTICK');
    expect(outside?.dodge).toBe('BACKTICK');
    expect(outside?.sandbox).toBe('');
    const inside = rebind(DEFAULT_BINDINGS, 'dodge', 'BACKTICK', true);
    expect(inside?.sandbox).toBe(DEFAULT_BINDINGS.dodge);
  });
});
