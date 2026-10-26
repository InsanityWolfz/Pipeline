import { describe, expect, it } from 'vitest';
import { SPRITES } from '../../src/data/assets';
import { BOMB_SPHERE, ICON_BOMB, ITEM_SPRITES_VECTOR } from '../../src/data/art/items';
import { inksOf } from '../../src/data/art/types';
import { HUD_SPRITES_VECTOR } from '../../src/data/art/hud';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { HP_BAR, HUD_HEALTH_LAYOUT } from '../../src/data/hudPanels';
import { gridSize, INVENTORY_GRID, INVENTORY_GROUPS, inventoryPanelSize, PICKUP_FEED } from '../../src/data/hudPanels';
import { widthOf } from './textFit';
import { ITEMS } from '../../src/data/items';
import { ROUNDS, roundTier } from '../../src/data/tags';
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
    // 034: ley-iron, the first metal, is a raw.
    expect(byGroup('raw')).toEqual(['cinderite', 'fiber', 'husk-resin', 'ley-crystal', 'ley-iron', 'rimestone', 'stone', 'wood']);
    // 033: machine parts and schematics go in Parts, cores in Cores.
    expect(byGroup('parts')).toEqual([
      'ancient-gear',
      'aqueduct-valve',
      'arrowhead',
      'casing',
      // 060: Region 3's machine part.
      'forge-rivet',
      'fuse',
      // 038: the landmine chain's plate.
      'iron-plate',
      'ley-dust',
      'rope',
      'schematic-machine-speed',
      'schematic-reservoir-2',
      'shaft',
    ]);
    // 039: the six Frost rounds of every family. 060: the seven Fire rounds. 062: each also at its tier, in Ammo too.
    expect(byGroup('ammo').filter((id) => roundTier(id) === 'stone')).toEqual([
      'arrow',
      'arrow+fire',
      'arrow+frost',
      'bomb',
      'bomb+cluster',
      'bomb+fire',
      'bomb+fire+cluster',
      'bomb+frost',
      'bomb+frost+cluster',
      'landmine',
      'landmine+fire',
      'landmine+frost',
      'ley-bolt',
      'ley-bolt+fire',
      'ley-bolt+fire+homing',
      'ley-bolt+fire+split',
      'ley-bolt+frost',
      'ley-bolt+frost+homing',
      'ley-bolt+frost+split',
      'ley-bolt+homing',
      'ley-bolt+split',
    ]);
    expect(byGroup('ammo').filter((id) => roundTier(id) !== 'stone')).toEqual(ROUNDS.filter((id) => roundTier(id) !== 'stone').sort());
    expect(byGroup('gear')).toEqual(['unidentified-armor']);
    expect(byGroup('cores')).toEqual(['bulwark-core', 'forgewright-core', 'warden-core']);
    // The warden core's kind stays a part: only the panel's group places it.
    expect(ITEMS['warden-core']?.kind).toBe('part');
  });

  it('the grid shows 8×5 slots (047.2), each the HUD\'s cell, and the panel with a hopper\'s row or the stash\'s grid (052) fits the view', () => {
    const G = INVENTORY_GRID;
    expect([G.cols, G.rows]).toEqual([8, 5]);
    expect(gridSize()).toEqual({ w: 7 * G.cell.stepX + G.cell.w, h: 4 * G.cell.stepY + G.cell.h });
    for (const mode of ['bag', 'container', 'stash'] as const) {
      const { w, h } = inventoryPanelSize(mode);
      expect(w).toBeLessThanOrEqual(VIEW_WIDTH - 2 * HUD_LAYOUT.margin);
      expect(h + G.title.gap + G.title.h).toBeLessThanOrEqual(VIEW_HEIGHT - 2 * HUD_LAYOUT.margin);
    }
  });

  it('a slot\'s count and warning mark never overlap (the 031 panel\'s Wood row bug, 045.11), and the footer lines fit', () => {
    const C = INVENTORY_GRID.cell;
    // The widest count a slot shows is a full stack of 100.
    expect(C.count.x + widthOf('100', 'count')).toBeLessThanOrEqual(C.warn.x);
    expect(C.warn.x + C.warn.w).toBeLessThanOrEqual(C.w);
    expect(C.count.y + 8).toBeLessThanOrEqual(C.h);
    const inner = inventoryPanelSize().w - 2 * INVENTORY_GRID.pad;
    for (const line of INVENTORY_GRID.footer.text) expect(widthOf(line, 'body') * 0.8, line).toBeLessThanOrEqual(inner);
  });

  it('never prints the click controls (Shaun: "don\'t show those controls on the menu it looks bad")', () => {
    expect(JSON.stringify(INVENTORY_GRID)).not.toMatch(/shift|ctrl|click/i);
  });

  it('the panel colours are daylight ids', () => {
    for (const c of Object.values(INVENTORY_GRID.colors)) expect(daylight.has(c), c).toBe(true);
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

  it('fills red (045: a palette red, not 031\'s green), hit-red when low, below a quarter of max health', () => {
    expect(HUD_HEALTH_LAYOUT.fillColor).toBe('danger');
    expect(HUD_HEALTH_LAYOUT.fillColor).not.toBe(HUD_HEALTH_LAYOUT.lowColor);
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
    for (const key of [SPRITES.hudHealth, SPRITES.hudHealthGlow, SPRITES.hudShield, SPRITES.hudWarn, SPRITES.inventoryTitle]) {
      expect(keys.has(key), key).toBe(true);
    }
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
