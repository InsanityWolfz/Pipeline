// Saving (042): the save's version, where things live in browser storage, the export file, the size budget and
// the feedback note limits. A change to SimState's shape bumps SAVE_VERSION with no migration (Shaun, 2026-10-20: an
// older save reads as too old and the player starts over). Fields only added need neither: they're filled from a fresh sim.

/**
 * The save format's version. Starts at 1. 047 made it 4 with no migration (Shaun, 2026-10-20: "do not account for
 * corrupting old saves or preserving their playability. If a feature breaks a save then the person just starts
 * over."): an older save reads as too old, Continue is unavailable, and a New game starts fresh. 047.9 made it 5
 * (the carried items' hint event), again with no migration. 049 made it 6 (the Husk Hive's goal shifts the saved goal
 * flags, and a new game holds a placed champion), again with no migration. 050 made it 7 (each entrance records the
 * research node that opened it), again with no migration. 051 made it 8 (the goal's sub-steps, the bomb goal moved
 * before the foundry, and the minimap's fog of war), again with no migration. 052 made it 9 (the sorter and merger
 * gone, the underground pair's pieces added), again with no migration. 053 made it 10 (the round world: every saved
 * position, and the fog's bitmap, are on a new map), again with no migration. 055 made it 11 (the arena doors' enter
 * event, the shrine's walls closed round a player who stood in its old gaps, and the Frozen Grotto's pylon and
 * rimestone port), again with no migration. 058 made it 12 (the tutorial's new goal chain shifts the saved goal flags,
 * and the fast-travel flag replaces the away clock), again with no migration. 060 made it 13 (the world grew and its
 * centre moved, so every saved position and the fog's bitmap are on a new map; the Emberworks' gate), again with no
 * migration. 061 made it 14 (enemies' spent and beam fields, pools' shapes and beats), again with no migration. 15: 063's
 * blueprints (the saved blueprints and the blueprint events, on its own branch); 16: 062's machine stall counter; 17: 064's
 * (the world grew again and its centre moved, so every saved position and the fog's bitmap are on a new map; the
 * Stormcrown's gate; boss parts and the storm call's strikes). 18: 065's (the thunderhawk's dive event, enemies' mite
 * trios, the storm sentinel's strike knockback and the player's slow). 19: 063 merged onto main (its blueprints and
 * blueprint events joined with 062–065's shape). 22: 069's (the intake's rate window, and the purge event; other
 * branches took 20 and 21). All with no migration.
 */
export const SAVE_VERSION = 22;

/** The envelope's and the export file's format tags. */
export const SAVE_FORMAT = 'pipeline-save';
export const EXPORT_FORMAT = 'pipeline-export';
/** The export file's own version (its wrapper, not the save inside it). */
export const EXPORT_VERSION = 1;

/** Browser storage keys (042.6: one backup of a replaced save, recoverable by hand). */
export const STORAGE_KEYS = {
  save: 'pipeline.save',
  backup: 'pipeline.save.backup',
  settings: 'pipeline.settings',
  feedback: 'pipeline.feedback',
} as const;

/** The export's file name for a day: `pipeline-save-YYYY-MM-DD.json`; a damaged save downloads as its raw text. */
export const EXPORT_FILE = (isoDate: string): string => `pipeline-save-${isoDate}.json`;
/** How long a download's object URL is kept before it's released, ms. */
export const DOWNLOAD_URL_MS = 1000;
export const DAMAGED_FILE = (isoDate: string): string => `pipeline-save-damaged-${isoDate}.txt`;

/** A late-game save stays under this much JSON, bytes. */
export const SAVE_BUDGET_BYTES = 1_000_000;

/** Feedback notes: the longest note, how many are kept (the oldest dropped), and when to warn the limit is near. */
export const NOTES = { maxChars: 2000, maxNotes: 50, warnAt: 45 } as const;

/** The note's words (042). */
export const NOTE_TEXT = {
  title: 'Feedback note',
  count: (n: number): string => `${n} / ${NOTES.maxChars}`,
  save: 'Save note',
  cancel: 'Cancel',
  saved: 'Note saved. It goes with your save when you export it (Settings → Export save).',
  nearLimit: (n: number): string => `${n} notes stored: past ${NOTES.maxNotes}, the oldest are dropped. Export your save to send them.`,
  failed: "Couldn't store the note: this browser is blocking storage.",
} as const;

/** What the player is told about saves. */
export const SAVE_TEXT = {
  failed: "Couldn't save. Export your save from Settings.",
  backupFailed: "Couldn't keep a backup of your save, so it wasn't replaced. Export it from Settings first.",
  blocked: "Settings and saves won't be kept: this browser is blocking storage.",
  importBad: { format: 'Not a Pipeline save.', newer: 'That save is from a newer version of the game.', corrupt: "That save couldn't be read." },
  imported: 'Save imported. Continue from the title to play it.',
} as const;
