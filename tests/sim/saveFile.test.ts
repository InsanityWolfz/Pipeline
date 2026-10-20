import { describe, expect, it } from 'vitest';
import { SAVE_FORMAT, SAVE_VERSION } from '../../src/data/save';
import { TUTORIAL_START } from '../../src/data/player';
import { createSim } from '../../src/sim/state';
import { makeEnvelope, readSave, SAVE_MIGRATIONS, snapshot, type SaveEnvelope } from '../../src/sim/save';

// 042: the save envelope, its versions and migrations, and bad saves: every bad case gives its status, never throws.

const META = { build: 'test', savedAt: '2026-10-19T21:40:00.000Z', endCardSeen: false };
const sim = () => createSim(5, { start: TUTORIAL_START });
const text = (env: unknown): string => JSON.stringify(env);
const good = (): SaveEnvelope => makeEnvelope(snapshot(sim()), META);

describe('save envelope (042)', () => {
  it('wraps the snapshot: format, version, build, savedAt, meta, state', () => {
    const env = good();
    expect(env).toMatchObject({ format: SAVE_FORMAT, version: SAVE_VERSION, build: 'test', savedAt: META.savedAt, meta: { endCardSeen: false } });
    const read = readSave(text(env));
    expect(read.status).toBe('ok');
    if (read.status === 'ok') {
      expect(read.envelope.meta.endCardSeen).toBe(false);
      expect(read.state.tick).toBe(sim().tick);
    }
  });

  it('runs migrations in order up to the current version (a synthetic v1 → v2)', () => {
    const v1 = { ...good(), version: 1 };
    const migrations = {
      1: (env: SaveEnvelope): SaveEnvelope => {
        const state = env.state as Record<string, unknown>;
        // v2 renamed `level` to `rank` in this made-up future, and back again for the test's v2 reader.
        return { ...env, version: 2, meta: { ...env.meta, endCardSeen: true }, state: { ...state, level: 7 } };
      },
    };
    const read = readSave(text(v1), { version: 2, migrations });
    expect(read.status).toBe('ok');
    if (read.status === 'ok') {
      expect(read.envelope.version).toBe(2);
      expect(read.envelope.meta.endCardSeen).toBe(true);
      expect(read.state.level).toBe(7);
    }
  });

  it('045: a version 1 save (ground items without the pull fields) reads as it is', () => {
    const s = sim();
    s.groundItems.push({ id: 1, itemId: 'wood', roomId: s.roomId, x: 10, y: 10 });
    const v1 = { ...makeEnvelope(snapshot(s), META), version: 1 };
    // Read as the game did before 047 (version 3): 047's version 4 has no migration (Shaun's rule).
    const read = readSave(text(v1), { version: 3, migrations: SAVE_MIGRATIONS });
    expect(read.status).toBe('ok');
    if (read.status === 'ok') {
      expect(read.envelope.version).toBe(3);
      expect(read.state.groundItems).toEqual([{ id: 1, itemId: 'wood', roomId: s.roomId, x: 10, y: 10 }]);
    }
  });

  it('047: a version 3 save (before the carried bar and the grid) reads as too old: no migration, by Shaun\'s rule', () => {
    const v3 = { ...makeEnvelope(snapshot(sim()), META), version: 3 };
    const read = readSave(text(v3));
    expect(read.status).toBe('too-old');
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(4);
  });

  it('047.9: a version 4 save (before the carried items\' hint) reads as too old: no migration, by Shaun\'s rule', () => {
    const v4 = { ...makeEnvelope(snapshot(sim()), META), version: 4 };
    expect(readSave(text(v4)).status).toBe('too-old');
    expect(SAVE_VERSION).toBe(6);
    expect(SAVE_MIGRATIONS[4]).toBeUndefined();
  });

  it("049: a version 5 save (before the Husk Hive's goal) reads as too old: no migration, by Shaun's rule", () => {
    const v5 = { ...makeEnvelope(snapshot(sim()), META), version: 5 };
    expect(readSave(text(v5)).status).toBe('too-old');
    expect(SAVE_MIGRATIONS[5]).toBeUndefined();
  });

  it('a save with no migration path is too old, and kept as unreadable', () => {
    expect(readSave(text({ ...good(), version: 1 }), { version: 3, migrations: { 1: (e: SaveEnvelope) => ({ ...e, version: 2 }) } }).status).toBe('too-old');
  });

  it('fills a field missing from an older save from a fresh sim', () => {
    const env = good();
    const state = { ...(env.state as unknown as Record<string, unknown>) };
    delete state.killedBosses;
    delete state.awayTicks;
    const player = { ...(state.player as Record<string, unknown>) };
    delete player.wardTicks;
    state.player = player;
    const read = readSave(text({ ...env, state }));
    expect(read.status).toBe('ok');
    if (read.status === 'ok') {
      expect(read.state.killedBosses).toEqual([]);
      expect(read.state.awayTicks).toBe(0);
      expect(read.state.player.wardTicks).toBe(sim().player.wardTicks);
    }
  });

  it('a save from a newer build is "newer"', () => {
    expect(readSave(text({ ...good(), version: SAVE_VERSION + 1 })).status).toBe('newer');
    expect(readSave(text({ ...good(), version: 999 })).status).toBe('newer');
  });

  it('garbage, a wrong format, a missing or wrong-typed field are "corrupt", without throwing', () => {
    const env = good();
    const state = env.state as unknown as Record<string, unknown>;
    const bad = [
      'not json {',
      '',
      'null',
      '42',
      text({ ...env, format: 'something-else' }),
      text({ ...env, version: 'one' }),
      text({ ...env, version: 0 }),
      text({ ...env, state: null }),
      text({ ...env, state: { ...state, seed: undefined } }),
      text({ ...env, state: { ...state, level: 'eight' } }),
      text({ ...env, state: { ...state, claims: { shrine: true } } }),
      text({ ...env, state: { ...state, player: 'here' } }),
      text({ ...env, meta: null }),
      // List items the wrong kind, and a piece the first tick would trip on (the dry run of Continue catches it).
      text({ ...env, state: { ...state, enemies: ['husk'] } }),
      text({ ...env, state: { ...state, foundry: { nextPieceId: 1, pieces: [{ id: 0, pieceId: 'no-such-piece', kind: 'machine', tx: 3, ty: 3, facing: 'right' }] } } }),
    ];
    for (const t of bad) {
      let status = '';
      expect(() => (status = readSave(t).status), t).not.toThrow();
      expect(status, t).toBe('corrupt');
    }
  });
});
