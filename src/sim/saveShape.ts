// The save's shape (042.7): every key path in a saved state and the kinds of value found there, so a test can
// notice when SimState's shape changes and ask for SAVE_VERSION to be bumped (no migration since
// 047: an older save reads as too old). List items share one path (`[]`); a keyed lookup (an inventory, counts by item) shares one (`{}`), so
// what's in them isn't shape.

/** Paths whose keys are data (item ids, slots by id), not shape. */
export const KEYED_PATHS: readonly string[] = [
  'state.inventory',
  'state.banked',
  'state.stash',
  'state.machineMade',
  'state.start.inventory',
  'state.research',
  'state.foundry.pieces[].buffer',
  'state.foundry.pieces[].contents',
  'state.events.lost',
];

/** The sorted list of `path: kind` in `value`, kinds being object, array, string, number, boolean or null. */
export function saveShape(value: unknown, keyed: readonly string[] = KEYED_PATHS): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, path: string): void => {
    if (Array.isArray(v)) {
      out.add(`${path}: array`);
      for (const x of v) walk(x, `${path}[]`);
    } else if (v === null) {
      out.add(`${path}: null`);
    } else if (typeof v === 'object') {
      out.add(`${path}: object`);
      const isKeyed = keyed.includes(path);
      for (const [k, x] of Object.entries(v)) walk(x, isKeyed ? `${path}{}` : `${path}.${k}`);
    } else {
      out.add(`${path}: ${typeof v}`);
    }
  };
  walk(value, 'state');
  return [...out].sort();
}
