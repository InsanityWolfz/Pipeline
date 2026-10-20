import { SAVE_FORMAT, SAVE_VERSION } from '../data/save';
import type { StartDef } from '../data/player';
import { createEvents } from './events';
import { createSim, resetWorld, type SimState } from './state';
import { wakeRoom } from './tutorial';
import { stepSim } from './step';

// Saving (042.3): the save is the whole sim state as plain JSON, with the tick's events emptied. Pure: no storage,
// no clock; render stores the text and stamps the time. Loading fills anything an older save lacks from a fresh
// sim, runs the migrations up to SAVE_VERSION, and reports a bad save as a status instead of throwing.

/** The save as it's stored: the snapshot in an envelope with render's extras (042.3: never in the sim state). */
export interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  version: number;
  /** The build that wrote it. */
  build: string;
  /** When it was written, ISO 8601. */
  savedAt: string;
  meta: { endCardSeen: boolean };
  state: unknown;
}

/** Upgrades an envelope one version: from its key's version to the next. */
export type Migration = (env: SaveEnvelope) => SaveEnvelope;

/**
 * Each version's upgrade to the next, by the version it upgrades from. Empty at version 1. An added field needs none
 * (it's filled from a fresh sim); a rename or reshape of SimState adds one here and bumps SAVE_VERSION.
 */
export const SAVE_MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type SaveStatus = 'ok' | 'corrupt' | 'newer' | 'too-old';

/** A save read back: loaded, or why not. */
export type SaveRead = { status: 'ok'; envelope: SaveEnvelope; state: SimState } | { status: Exclude<SaveStatus, 'ok'>; reason: string };

/** The whole state as plain JSON-safe data, the tick's events emptied. The state itself is left as it is. */
export function snapshot(state: SimState): SimState {
  const plain = JSON.parse(JSON.stringify({ ...state, events: createEvents() })) as SimState;
  return plain;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * `value` checked against the fresh sim's `def` and filled from it: an object keeps its own keys and gains any it
 * lacks; an array or a scalar must be the same kind as the default. A null default (an empty slot, like the
 * harvest in progress) takes whatever was saved. Throws, with the path, on a mismatch.
 */
function fill(def: unknown, value: unknown, path: string): unknown {
  if (value === undefined) return def;
  if (def === null || def === undefined) return value;
  if (Array.isArray(def)) {
    if (!Array.isArray(value)) throw new Error(`${path} should be a list`);
    // A light check on the items (042.21): each the same kind as the fresh list's first, objects not filled.
    const kind = def.length > 0 ? kindOf(def[0]) : null;
    value.forEach((v: unknown, i) => {
      if (kind !== null && kindOf(v) !== kind) throw new Error(`${path}[${i}] should be a ${kind}`);
    });
    return value;
  }
  if (isRecord(def)) {
    if (!isRecord(value)) throw new Error(`${path} should be an object`);
    const out: Record<string, unknown> = { ...value };
    for (const [k, d] of Object.entries(def)) out[k] = fill(d, value[k], `${path}.${k}`);
    return out;
  }
  if (typeof value !== typeof def) throw new Error(`${path} should be a ${typeof def}`);
  return value;
}

/** A value's kind for the list check: object, list, null or its typeof. */
const kindOf = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v);

/** A SimState from saved data, filled from a fresh sim of its seed and start. Throws if it can't be. */
export function restore(data: unknown): SimState {
  if (!isRecord(data)) throw new Error('state should be an object');
  if (typeof data.seed !== 'number' || !Number.isInteger(data.seed)) throw new Error('state.seed should be a whole number');
  if (!isRecord(data.start)) throw new Error('state.start should be an object');
  const fresh = createSim(data.seed, { start: data.start as unknown as StartDef });
  const state = fill(fresh, data, 'state') as SimState;
  state.events = createEvents();
  return state;
}

/**
 * Continue (042): wakes the player in the foundry as a KO's wake does (the same spot, the world outside reset), with
 * nothing to lose: the save was taken as the haul was banked.
 */
export function wakeInFoundry(state: SimState): void {
  resetWorld(state, wakeRoom(state));
  state.banked = { ...state.inventory };
  state.events.woke = true;
}

/** Wraps a snapshot for storage. */
export function makeEnvelope(state: SimState, extras: { build: string; savedAt: string; endCardSeen: boolean }): SaveEnvelope {
  return { format: SAVE_FORMAT, version: SAVE_VERSION, build: extras.build, savedAt: extras.savedAt, meta: { endCardSeen: extras.endCardSeen }, state };
}

export interface SaveReadOptions {
  version: number;
  migrations: Readonly<Record<number, Migration>>;
}

const DEFAULT_READ: SaveReadOptions = { version: SAVE_VERSION, migrations: SAVE_MIGRATIONS };

/** Reads a stored save's text: parsed, version-checked, migrated, filled and restored, or the reason it can't be. */
export function readSave(text: string, opts: SaveReadOptions = DEFAULT_READ): SaveRead {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { status: 'corrupt', reason: 'not JSON' };
  }
  return readEnvelope(data, opts);
}

/** As readSave, for data already parsed (an import file's `save`). */
export function readEnvelope(data: unknown, opts: SaveReadOptions = DEFAULT_READ): SaveRead {
  if (!isRecord(data) || data.format !== SAVE_FORMAT) return { status: 'corrupt', reason: 'not a Pipeline save' };
  const version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return { status: 'corrupt', reason: 'no version' };
  if (version > opts.version) return { status: 'newer', reason: `version ${version} is newer than ${opts.version}` };
  try {
    let env = checkEnvelope(data);
    while (env.version < opts.version) {
      const step = opts.migrations[env.version];
      if (!step) return { status: 'too-old', reason: `no migration from version ${env.version}` };
      env = checkEnvelope(step(env));
    }
    const state = restore(env.state);
    // A dry run of Continue on a copy (the wake and one tick), so a save that would break the first frame reads as
    // corrupt here, with its damaged-save path, instead of crashing the game.
    const probe = structuredClone(state);
    wakeInFoundry(probe);
    stepSim(probe);
    return { status: 'ok', envelope: { ...env, state }, state };
  } catch (e) {
    return { status: 'corrupt', reason: e instanceof Error ? e.message : 'unreadable' };
  }
}

/** The envelope's own fields, typed; throws on a missing or wrong-typed one. */
function checkEnvelope(data: unknown): SaveEnvelope {
  if (!isRecord(data)) throw new Error('save should be an object');
  const { version, build, savedAt, meta, state } = data;
  if (typeof version !== 'number') throw new Error('version should be a number');
  if (typeof build !== 'string' || typeof savedAt !== 'string') throw new Error('build and savedAt should be text');
  if (!isRecord(meta) || typeof meta.endCardSeen !== 'boolean') throw new Error('meta should hold endCardSeen');
  if (!isRecord(state)) throw new Error('state should be an object');
  return { format: SAVE_FORMAT, version, build, savedAt, meta: { endCardSeen: meta.endCardSeen }, state };
}
