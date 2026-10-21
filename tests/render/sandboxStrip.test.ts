import { describe, expect, it } from 'vitest';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { MINIMAP } from '../../src/data/minimap';
import { OVERWORLD } from '../../src/data/overworld';
import { PICKUP_FEED } from '../../src/data/hudPanels';
import { SANDBOX_KEY_LIST } from '../../src/data/sandbox';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { hotbarBox, tubeSlotBox, type ScreenBox } from '../../src/render/bottomHud';
import { healthBlockBox } from '../../src/render/healthLayout';
import { keyListLines, sandboxFeedAt, stripLayout } from '../../src/render/sandboxStrip';

// 056: the sandbox's controls always on screen: the strip down the left (the loadout's rows, then the key list) and the
// spawn column on the right, clear of the HUD; and the key list read from the bindings, so a rebind shows at once.

const overlaps = (a: ScreenBox, b: ScreenBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inView = (b: ScreenBox) => b.x >= 0 && b.y >= 0 && b.x + b.w <= VIEW_WIDTH && b.y + b.h <= VIEW_HEIGHT;

/** The minimap's frame (MinimapView.box) where it shows. */
const MAP: ScreenBox = (() => {
  const f = MINIMAP.frame.width;
  const w = OVERWORLD.width * MINIMAP.scale;
  return { x: VIEW_WIDTH - MINIMAP.margin - w - f, y: MINIMAP.margin - f, w: w + 2 * f, h: OVERWORLD.height * MINIMAP.scale + 2 * f };
})();

/** The boss bar with its name over it (BossBar), generously: from the top of the view to its frame's bottom. */
const BOSS: ScreenBox = (() => {
  const B = HOLLOWS_LOOK.bossBar;
  return { x: (VIEW_WIDTH - B.w) / 2 - B.border, y: 0, w: B.w + 2 * B.border, h: B.top + B.h + B.border };
})();

/** The player, the camera centred on them (056.3): two tiles square round the view's centre. */
const PLAYER: ScreenBox = { x: VIEW_WIDTH / 2 - TILE_SIZE, y: VIEW_HEIGHT / 2 - TILE_SIZE, w: 2 * TILE_SIZE, h: 2 * TILE_SIZE };

describe("the sandbox's controls (056)", () => {
  const L = stripLayout();
  const hud: [string, ScreenBox][] = [
    ['the HP block', healthBlockBox(null)],
    ['the carried bar', hotbarBox()],
    ...[1, 2, 3, 4, 5].map((n): [string, ScreenBox] => [`the tube slot (${n})`, tubeSlotBox(n)]),
    ['the minimap', MAP],
    ['the boss bar', BOSS],
    ['the player', PLAYER],
  ];

  it('puts the strip at the left edge and the spawn column at the right, inside the view', () => {
    expect(L.left.x).toBeLessThan(VIEW_WIDTH / 4);
    expect(L.right.x + L.right.w).toBeGreaterThan((VIEW_WIDTH * 3) / 4);
    expect(inView(L.left)).toBe(true);
    expect(inView(L.right)).toBe(true);
    // The key list runs under the loadout's rows, inside the strip.
    expect(L.keysY).toBeGreaterThan(L.ruleY);
    expect(L.ruleY).toBeGreaterThan(L.left.y);
    expect(L.keysY).toBeLessThan(L.left.y + L.left.h);
  });

  it("keeps both clear of the HUD's boxes, the minimap and the player", () => {
    for (const [name, box] of hud) {
      expect(overlaps(L.left, box), `the strip over ${name}`).toBe(false);
      expect(overlaps(L.right, box), `the spawn column over ${name}`).toBe(false);
    }
  });

  it('runs the spawn column from under the minimap (056.3)', () => {
    expect(L.right.y).toBeGreaterThanOrEqual(MAP.y + MAP.h);
  });

  it('moves the pickup feed right of the strip in the sandbox (056.4), clear of the player and the spawn column', () => {
    const at = sandboxFeedAt();
    const feed = { x: at.x, y: at.y, w: PICKUP_FEED.width, h: PICKUP_FEED.maxLines * PICKUP_FEED.lineStep };
    for (const box of [L.left, L.right, PLAYER, BOSS]) expect(overlaps(feed, box)).toBe(false);
  });

  it("lists the sandbox's actions with today's keys (056.2)", () => {
    expect(keyListLines(DEFAULT_BINDINGS)).toEqual([
      { label: 'Move', keys: 'W A S D' },
      { label: 'Roll', keys: 'Space' },
      { label: 'Interact', keys: 'E' },
      { label: 'Crafting menu', keys: 'C' },
      { label: 'Inventory', keys: 'I' },
      { label: 'Talents', keys: 'T' },
      { label: 'Use carried item', keys: 'Right click' },
      { label: 'Carried slots', keys: '1 2 3 4 5' },
      { label: 'Feedback note', keys: 'F' },
      { label: 'Hide controls', keys: '`' },
      { label: 'Fire', keys: 'Left click' },
      { label: 'Pause', keys: 'Esc' },
    ]);
  });

  it('leaves off the foundry-only actions', () => {
    const actions = SANDBOX_KEY_LIST.flatMap((l) => ('actions' in l ? l.actions : []));
    for (const a of ['build', 'research', 'rotate', 'flip'] as const) expect(actions).not.toContain(a);
  });

  it('follows a rebind, and shows an unbound action as a dash', () => {
    const lines = keyListLines({ ...DEFAULT_BINDINGS, dodge: 'SHIFT', up: 'UP', sandbox: '' });
    expect(lines.find((l) => l.label === 'Roll')?.keys).toBe('Shift');
    expect(lines.find((l) => l.label === 'Move')?.keys).toBe('Up A S D');
    expect(lines.find((l) => l.label === 'Hide controls')?.keys).toBe('—');
  });
});
