import { PLAYTEST_START } from '../data/playtest';
import { DEFAULT_START, TUTORIAL_START, type StartDef } from '../data/player';

/**
 * The start a URL asks for: `?playtest` the boosted playtest start (007), `?start=hall`
 * the sandbox start in the ruin hall (what the e2e tests use; `&attuned` attunes
 * it), and otherwise the real game: waking in the clearing (012).
 */
export function parseStart(search: string): StartDef {
  const params = new URLSearchParams(search);
  if (params.has('playtest')) return PLAYTEST_START;
  // `&attuned` too: the sandbox with every recipe known, for tests of the bomb and ley bolt chains.
  if (params.get('start') === 'hall') return params.has('attuned') ? { ...DEFAULT_START, attuned: true } : DEFAULT_START;
  return TUTORIAL_START;
}
