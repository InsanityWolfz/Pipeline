import { HOLLOWS_START, PLAYTEST_START } from '../data/playtest';
import { DEFAULT_START, TUTORIAL_START, type StartDef } from '../data/player';
import { SANDBOX_START } from '../data/sandbox';
import { createSandboxSim } from '../sim/sandbox';
import { createSim, type SimState } from '../sim/state';

/**
 * The start a URL asks for: `?playtest` the boosted playtest start (007), `?start=field`
 * the sandbox start in the meadow beside the ruin field (017; what the e2e tests use;
 * `&attuned` attunes it), `?start=hollows` the kit inside Stonefall Hollows' gap (034), and otherwise the real game:
 * waking by the tube's stone (012). `?start=tutorial` is that real start without the title (042), for tests.
 * `?sandbox` (044) is the sandbox, in dev and production builds alike.
 */
export function parseStart(search: string): StartDef {
  const params = new URLSearchParams(search);
  if (params.has('sandbox')) return SANDBOX_START;
  if (params.has('playtest')) return PLAYTEST_START;
  // `&attuned` too: the sandbox with every recipe known, for tests of the bomb and ley bolt chains.
  if (params.get('start') === 'hollows') return HOLLOWS_START;
  if (params.get('start') === 'field') return params.has('attuned') ? { ...DEFAULT_START, attuned: true } : DEFAULT_START;
  return TUTORIAL_START;
}

/** The sim a title-skipping URL starts on `seed`: the sandbox's (044, set up past its start), else a plain start's. */
export function simForUrl(search: string, seed: number): SimState {
  const start = parseStart(search);
  return start.sandbox ? createSandboxSim(seed) : createSim(seed, { start });
}
