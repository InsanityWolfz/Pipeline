import type { BindAction } from './settings';

// The build controls strip's data (045, note 9), beside hudLayout.ts's build bar.

/**
 * The build controls strip (045, note 9): in build mode only, a line of controls centred `gap` px above the build
 * bar's group labels, `h` px tall: each entry its input in `keyColor` (a bound action's key, 042, or a fixed mouse
 * input), then `keyGap` px on what it does, entries `entryGap` px apart, on a faint ink back `pad` px round them at
 * `backAlpha`. Text at the top of its capitals `textY` px down. The tube slot sits `gap` px above it while building.
 */
export const BUILD_STRIP = {
  entries: [
    { input: { mouse: 'Click' }, does: 'place' },
    { input: { action: 'rotate' }, does: 'rotate' },
    { input: { action: 'flip' }, does: 'flip' },
    { input: { mouse: 'Right-click' }, does: 'pick up' },
    { input: { mouse: 'Drag' }, does: 'line' },
    { input: { action: 'build' }, does: 'exit' },
  ] as readonly { input: { action: BindAction } | { mouse: string }; does: string }[],
  h: 9,
  gap: 2,
  textY: 1,
  keyGap: 2,
  entryGap: 6,
  pad: 2,
  keyColor: 'gold-trim',
  backColor: 'ink',
  backAlpha: 0.55,
} as const;
