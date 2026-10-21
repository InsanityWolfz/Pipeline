import { describe, expect, it } from 'vitest';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { MINIMAP } from '../../src/data/minimap';
import { OVERWORLD } from '../../src/data/overworld';
import { SANDBOX_KEY_LIST } from '../../src/data/sandbox';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { hotbarBox, tubeSlotBox, type ScreenBox } from '../../src/render/bottomHud';
import { healthBlockBox } from '../../src/render/healthLayout';
import { DEFAULT_PICK, sandboxColumns } from '../../src/render/sandboxRows';
import { keyListLines, LOADOUT_ROWS, SPAWN_ROWS, stripLayout } from '../../src/render/sandboxStrip';
import { SANDBOX, SANDBOX_PANEL } from '../../src/data/sandbox';
import { PICKUP_FEED } from '../../src/data/hudPanels';
import { PANEL_IDS, popoutPlace, PopoutState, sandboxFeedAt } from '../../src/render/sandboxPopout';

// 056: the sandbox's controls always on screen: the strip down the left (the loadout's rows, then the key list) and the
// spawn column on the right, clear of the HUD; and the key list read from the bindings, so a rebind shows at once.
// 057: both are click-open pop-outs, each with a tab on its edge that's always shown.

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

/**
 * The player while the camera is centred on them (056.3): two tiles square round the view's centre. Near the room's
 * walls the camera clamps to the room (RoomViews), the player walks off centre and can pass under a strip (056.9); this
 * box covers the centred case only.
 */
const PLAYER: ScreenBox = { x: VIEW_WIDTH / 2 - TILE_SIZE, y: VIEW_HEIGHT / 2 - TILE_SIZE, w: 2 * TILE_SIZE, h: 2 * TILE_SIZE };

describe("the sandbox's controls (056)", () => {
  const L = stripLayout();
  const hud: [string, ScreenBox][] = [
    ['the HP block', healthBlockBox(null)],
    ['the carried bar', hotbarBox()],
    ...[1, 2, 3, 4, 5].map((n): [string, ScreenBox] => [`the tube slot (${n})`, tubeSlotBox(n)]),
    ['the minimap', MAP],
    ['the boss bar', BOSS],
    ['the player, camera centred', PLAYER],
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

  it("sizes the tablets from sandboxColumns' rows, none with a sub line", () => {
    const sb = { loadout: [...SANDBOX.loadout], god: true };
    const [loadout, spawn] = sandboxColumns(sb, { ...DEFAULT_PICK, champion: true, count: 10 });
    expect(loadout).toHaveLength(LOADOUT_ROWS);
    expect(spawn).toHaveLength(SPAWN_ROWS);
    for (const r of [...loadout, ...spawn]) expect(r.sub, r.id).toBeUndefined();
  });

  it('runs the spawn column from under the minimap (056.3)', () => {
    expect(L.right.y).toBeGreaterThanOrEqual(MAP.y + MAP.h);
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
      { label: 'Sandbox panels', keys: '`' },
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
    expect(lines.find((l) => l.label === 'Sandbox panels')?.keys).toBe('—');
  });
});

describe("the sandbox's pop-outs (057)", () => {
  const L = stripLayout();
  const hud: [string, ScreenBox][] = [
    ['the HP block', healthBlockBox(null)],
    ['the carried bar', hotbarBox()],
    ...[1, 2, 3, 4, 5].map((n): [string, ScreenBox] => [`the tube slot (${n})`, tubeSlotBox(n)]),
    ['the minimap', MAP],
    ['the boss bar', BOSS],
    ['the player, camera centred', PLAYER],
  ];
  const T = SANDBOX_PANEL.tabs;

  it('closed, shows only the tabs, on their edges at the strips\' old tops, the panels off screen (057.5)', () => {
    const left = popoutPlace('loadout', 0);
    const right = popoutPlace('spawn', 0);
    expect(left.panel.x + left.panel.w).toBeLessThanOrEqual(0);
    expect(right.panel.x).toBeGreaterThanOrEqual(VIEW_WIDTH);
    expect(left.tab).toEqual({ x: 0, y: L.left.y, w: T.w, h: T.h });
    expect(right.tab).toEqual({ x: VIEW_WIDTH - T.w, y: L.right.y, w: T.w, h: T.h });
    // The left under the boss bar, the right under the minimap.
    expect(right.tab.y).toBeGreaterThanOrEqual(MAP.y + MAP.h);
  });

  it("open, the panels are 056's tablets, each tab on its panel's outer edge (057.4)", () => {
    const left = popoutPlace('loadout', 1);
    const right = popoutPlace('spawn', 1);
    expect(left.panel).toEqual(L.left);
    expect(right.panel).toEqual(L.right);
    expect(left.tab.x).toBe(L.left.x + L.left.w);
    expect(right.tab.x + right.tab.w).toBe(L.right.x);
    expect(left.tab.y).toBe(L.left.y);
    expect(right.tab.y).toBe(L.right.y);
  });

  it('slides out from the edge one way, whole px, the tab with the panel', () => {
    for (const id of PANEL_IDS) {
      let last = popoutPlace(id, 0);
      for (let t = 0.1; t <= 1.0001; t += 0.1) {
        const now = popoutPlace(id, t);
        const moved = now.panel.x - last.panel.x;
        expect(id === 'loadout' ? moved : -moved).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(now.panel.x)).toBe(true);
        expect(now.tab.x - now.panel.x).toBe(last.tab.x - last.panel.x);
        last = now;
      }
    }
  });

  it("keeps the tabs clear of the HUD's boxes, closed and open", () => {
    for (const id of PANEL_IDS)
      for (const t of [0, 1]) {
        const { tab } = popoutPlace(id, t);
        expect(inView(tab), `${id} tab at ${t} in view`).toBe(true);
        for (const [name, box] of hud) expect(overlaps(tab, box), `the ${id} tab (${t}) over ${name}`).toBe(false);
      }
  });

  it('starts closed (057.1); a tab toggles its own panel; the key opens and closes both (057.3)', () => {
    const s = new PopoutState();
    expect(s.anyOpen).toBe(false);
    expect(s.out('loadout')).toBe(0);
    s.toggle('loadout');
    expect(s.isOpen('loadout')).toBe(true);
    expect(s.isOpen('spawn')).toBe(false);
    s.setBoth(true);
    expect(PANEL_IDS.every((id) => s.isOpen(id))).toBe(true);
    s.toggle('spawn');
    expect(s.isOpen('spawn')).toBe(false);
    expect(s.isOpen('loadout')).toBe(true);
    s.setBoth(false);
    expect(s.anyOpen).toBe(false);
  });

  it('slides out over slideMs and back, and turns round mid-way (057.4)', () => {
    const s = new PopoutState();
    s.toggle('spawn');
    s.step(SANDBOX_PANEL.slideMs / 2);
    expect(s.out('spawn')).toBeCloseTo(0.5);
    expect(s.sliding).toBe(true);
    expect(s.fullyOut('spawn')).toBe(false);
    s.step(SANDBOX_PANEL.slideMs);
    expect(s.fullyOut('spawn')).toBe(true);
    expect(s.sliding).toBe(false);
    expect(s.out('loadout')).toBe(0);
    s.toggle('spawn');
    s.step(SANDBOX_PANEL.slideMs / 4);
    s.toggle('spawn');
    s.step(SANDBOX_PANEL.slideMs / 4);
    expect(s.fullyOut('spawn')).toBe(true);
    s.toggle('spawn');
    s.step(SANDBOX_PANEL.slideMs * 2);
    expect(s.out('spawn')).toBe(0);
  });

  it('puts the pickup feed right of the Loadout tab (056.4), closed or open, clear of the player and both columns', () => {
    for (const t of [0, 1]) {
      const at = sandboxFeedAt(t);
      const feed = { x: at.x, y: at.y, w: PICKUP_FEED.width, h: PICKUP_FEED.maxLines * PICKUP_FEED.lineStep };
      for (const id of PANEL_IDS) {
        const p = popoutPlace(id, t);
        expect(overlaps(feed, p.tab), `feed over the ${id} tab (${t})`).toBe(false);
        if (t === 1) expect(overlaps(feed, p.panel), `feed over the ${id} panel`).toBe(false);
      }
      for (const box of [PLAYER, BOSS]) expect(overlaps(feed, box)).toBe(false);
    }
  });
});
