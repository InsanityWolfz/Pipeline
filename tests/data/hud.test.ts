import { describe, expect, it } from 'vitest';
import { SPRITES } from '../../src/data/assets';
import { BOMB_SPHERE, ICON_BOMB, ITEM_SPRITES_VECTOR } from '../../src/data/art/items';
import { inksOf } from '../../src/data/art/types';
import { HUD_SPRITES_VECTOR } from '../../src/data/art/hud';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { HP_BAR, HUD_HEALTH_LAYOUT } from '../../src/data/hudPanels';
import { INVENTORY_GROUPS, INVENTORY_PANEL, inventoryColumns, inventoryPanelSize, PICKUP_FEED, reservedRows } from '../../src/data/hudPanels';
import { ITEMS } from '../../src/data/items';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';

// 031's data: every item's panel group, the panel's size and columns, the HP bar and
// feed numbers, and the casing drawn as the bomb's plain sphere.

const daylight = new Set(DAYLIGHT_PALETTE.map((c) => c.id));

describe('inventory panel groups (031)', () => {
  it('the groups run Raw, Parts, Ammo, Gear, Cores', () => {
    expect(INVENTORY_GROUPS.map((g) => g.id)).toEqual(['raw', 'parts', 'ammo', 'gear', 'cores']);
    expect(INVENTORY_GROUPS.map((g) => g.label)).toEqual(['Raw', 'Parts', 'Ammo', 'Gear', 'Cores']);
  });

  it('every item has a panel group', () => {
    const groups = new Set<string>(INVENTORY_GROUPS.map((g) => g.id));
    for (const item of Object.values(ITEMS)) expect(groups.has(item.group), `${item.id} has no panel group`).toBe(true);
  });

  it('maps the items as the spec lists them', () => {
    const byGroup = (g: string) => Object.values(ITEMS).filter((it) => it.group === g).map((it) => it.id).sort();
    expect(byGroup('raw')).toEqual(['fiber', 'husk-resin', 'ley-crystal', 'rime-shard', 'stone', 'wood']);
    // 033: machine parts and schematics go in Parts, cores in Cores.
    expect(byGroup('parts')).toEqual([
      'ancient-gear',
      'aqueduct-valve',
      'arrowhead',
      'casing',
      'fuse',
      'ley-shard',
      'rope',
      'schematic-machine-speed',
      'schematic-merger',
      'schematic-reservoir-2',
      'schematic-splitter',
      'shaft',
    ]);
    expect(byGroup('ammo')).toEqual(['arrow', 'arrow+frost', 'bomb', 'ley-bolt', 'ley-bolt+homing', 'ley-bolt+star']);
    expect(byGroup('gear')).toEqual(['unidentified-armor']);
    expect(byGroup('cores')).toEqual(['bulwark-core', 'warden-core']);
    // The warden core's kind stays a part: only the panel's group places it.
    expect(ITEMS['warden-core']?.kind).toBe('part');
  });

  it('reserves a row per item of a group, and Gear two more for the worn and spare lines', () => {
    expect(reservedRows('raw')).toBe(6);
    expect(reservedRows('gear')).toBe(2 + 1);
    expect(reservedRows('cores')).toBe(2);
    // 033: the schematics share one row.
    expect(reservedRows('parts')).toBe(6 + 2 + 1);
  });

  it('the panel and its title card fit the 640x360 view, in two columns as one does not fit', () => {
    const { w, h } = inventoryPanelSize();
    const T = INVENTORY_PANEL.title;
    expect(w).toBeLessThanOrEqual(VIEW_WIDTH - 2 * HUD_LAYOUT.margin);
    expect(h + T.gap + T.h).toBeLessThanOrEqual(VIEW_HEIGHT - 2 * HUD_LAYOUT.margin);
    const columns = inventoryColumns();
    expect(columns).toHaveLength(2);
    // Groups stay whole and in order across the columns.
    expect(columns.flat()).toEqual(INVENTORY_GROUPS.map((g) => g.id));
  });

  it('the panel colours are daylight ids', () => {
    for (const c of Object.values(INVENTORY_PANEL.colors)) expect(daylight.has(c), c).toBe(true);
  });
});

describe('the HP bar data (031)', () => {
  it('is a 144x12 fill in a larger carved frame', () => {
    const L = HUD_HEALTH_LAYOUT;
    expect(L.fill.w).toBe(144);
    expect(L.fill.h).toBe(12);
    expect(L.fill.x + L.fill.w).toBeLessThan(L.frame.w);
    expect(L.fill.y + L.fill.h).toBeLessThan(L.frame.h);
    const frame = HUD_SPRITES_VECTOR.find((s) => s.key === SPRITES.hudHealth);
    expect(frame?.size).toEqual([L.frame.w, L.frame.h]);
  });

  it('fills leaf green, red when low, below a quarter of max health', () => {
    expect(HUD_HEALTH_LAYOUT.fillColor).toBe('leaf');
    expect(HUD_HEALTH_LAYOUT.lowColor).toBe('hit-red');
    expect(HP_BAR.lowFraction).toBe(0.25);
    expect(HP_BAR.pulseMs).toBe(900);
    expect(HP_BAR.chunkHoldMs).toBe(400);
    expect(HP_BAR.chunkDrainMs).toBe(300);
    for (const c of [HUD_HEALTH_LAYOUT.fillColor, HUD_HEALTH_LAYOUT.lowColor, HUD_HEALTH_LAYOUT.chunkColor, HP_BAR.edge.color, HP_BAR.glow.color]) {
      expect(daylight.has(c), c).toBe(true);
    }
  });

  it('the pulse never reaches the shield, and the healing glow stays inside the margin', () => {
    // The pulse grows the frame right from its bottom-left corner.
    expect(HUD_HEALTH_LAYOUT.frame.w * HP_BAR.pulseScale).toBeLessThan(HUD_HEALTH_LAYOUT.shield.gap);
    const G = HP_BAR.glow;
    expect(G.reach).toBeLessThanOrEqual(HUD_LAYOUT.margin);
    for (const r of G.rings) expect(r.out + r.width / 2 + r.blur).toBeLessThanOrEqual(G.reach);
    expect(G.pad).toBeGreaterThanOrEqual(G.reach);
  });

  it('draws the new HUD sprites', () => {
    const keys = new Set(HUD_SPRITES_VECTOR.map((s) => s.key));
    for (const key of [SPRITES.hudHealth, SPRITES.hudHealthGlow, SPRITES.hudShield, SPRITES.hudWarn, SPRITES.inventoryPanel, SPRITES.inventoryTitle]) {
      expect(keys.has(key), key).toBe(true);
    }
    const panel = HUD_SPRITES_VECTOR.find((s) => s.key === SPRITES.inventoryPanel);
    const { w, h } = inventoryPanelSize();
    expect(panel?.size).toEqual([w, h]);
  });
});

describe('the pickup feed data (031)', () => {
  it('holds 2500 ms, fades over 400 ms and shows at most 5 lines', () => {
    expect(PICKUP_FEED.holdMs).toBe(2500);
    expect(PICKUP_FEED.fadeMs).toBe(400);
    expect(PICKUP_FEED.maxLines).toBe(5);
  });

  it('sits top-left, clear of the minimap and the objective line (top-right)', () => {
    expect(PICKUP_FEED.x).toBe(HUD_LAYOUT.margin);
    expect(PICKUP_FEED.y).toBe(HUD_LAYOUT.margin);
    expect(PICKUP_FEED.x + PICKUP_FEED.width).toBeLessThan(VIEW_WIDTH / 2);
  });
});

describe('the casing icon (031)', () => {
  const shapesOf = (key: string) => ITEM_SPRITES_VECTOR.find((s) => s.key === key)?.frames[0] ?? [];

  it('is the bomb sphere alone: no fuse, no spark, no cinder band', () => {
    const casing = shapesOf(SPRITES.itemCasing);
    expect(casing).toEqual(BOMB_SPHERE);
    const inks = casing.flatMap(inksOf);
    for (const banned of ['cinder', 'cinder-light', 'wood', 'cyan', 'rock-pale']) expect(inks).not.toContain(banned);
  });

  it('the bomb is that sphere plus the band, the wick and the spark', () => {
    expect(shapesOf(SPRITES.iconBomb)).toBe(ICON_BOMB);
    for (const s of BOMB_SPHERE) expect(ICON_BOMB).toContainEqual(s);
    expect(ICON_BOMB).toHaveLength(BOMB_SPHERE.length + 3);
  });
});
