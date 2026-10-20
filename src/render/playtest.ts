import { HOLLOWS_START, PLAYTEST_START } from '../data/playtest';
import { DEFAULT_START, TUTORIAL_START, type StartDef } from '../data/player';

/**
 * The start a URL asks for: `?playtest` the boosted playtest start (007), `?start=field`
 * the sandbox start in the meadow beside the ruin field (017; what the e2e tests use;
 * `&attuned` attunes it), `?start=hollows` the kit inside Stonefall Hollows' gap (034), and otherwise the real game:
 * waking by the tube's stone (012). `?start=tutorial` is that real start without the title (042), for tests.
 */
export function parseStart(search: string): StartDef {
  const params = new URLSearchParams(search);
  if (params.has('playtest')) return PLAYTEST_START;
  // `&attuned` too: the sandbox with every recipe known, for tests of the bomb and ley bolt chains.
  if (params.get('start') === 'hollows') return HOLLOWS_START;
  if (params.get('start') === 'field') return params.has('attuned') ? { ...DEFAULT_START, attuned: true } : DEFAULT_START;
  return TUTORIAL_START;
}
