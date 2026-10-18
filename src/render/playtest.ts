import { PLAYTEST_START } from '../data/playtest';
import { DEFAULT_START, type StartDef } from '../data/player';

/** Reads `?playtest` from a URL query string: the boosted playtest start (spec 007), else the normal one. */
export function parseStart(search: string): StartDef {
  return new URLSearchParams(search).has('playtest') ? PLAYTEST_START : DEFAULT_START;
}
