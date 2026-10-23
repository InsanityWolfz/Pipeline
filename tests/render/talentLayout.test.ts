import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { KEYSTONE_ICONS, LANE_ICONS, NODE_ICONS, TALENT_PANEL, TALENT_SPRITES, talentHeader, levelUpLine } from '../../src/data/talentAssets';
import { TALENT_SPRITES_VECTOR } from '../../src/data/art/talents';
import { inksOf } from '../../src/data/art/types';
import { TALENTS } from '../../src/data/talents';
import { onRect, talentAt, talentPanelLayout } from '../../src/render/talentLayout';
import { placeTip } from '../../src/render/tipPlace';
import { TIP } from '../../src/data/legibility';

// The tree panel's layout (037): on screen under its title card, every node inside the
// tablet and clear of the header and the info strip, none overlapping, each hit by a click on it.

const L = talentPanelLayout();
const inside = (outer: { x: number; y: number; w: number; h: number }, x: number, y: number, r = 0) => x - r >= outer.x && y - r >= outer.y && x + r <= outer.x + outer.w && y + r <= outer.y + outer.h;

describe('the tree panel', () => {
  it('sits on screen, the title card above the tablet', () => {
    for (const r of [L.title, L.panel]) expect(inside({ x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT }, r.x, r.y) && inside({ x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT }, r.x + r.w, r.y + r.h)).toBe(true);
    expect(L.title.y + L.title.h).toBeLessThanOrEqual(L.panel.y);
    expect(L.centre.x).toBe(L.panel.x + L.panel.w / 2);
  });

  it('keeps every node inside the tablet, below the header and above the info strip, none overlapping', () => {
    for (const n of L.nodes) {
      expect(inside(L.panel, n.x, n.y, n.r + 2), n.id).toBe(true);
      expect(n.y - n.r, n.id).toBeGreaterThan(L.header.y + 10);
      expect(n.y + n.r, n.id).toBeLessThan(L.info.y);
    }
    for (const a of L.nodes) for (const b of L.nodes) if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} ${b.id}`).toBeGreaterThan(a.r + b.r + 4);
    expect(L.reset.y).toBeGreaterThan(L.info.y + 18);
    expect(inside(L.panel, L.reset.x, L.reset.y) && inside(L.panel, L.reset.x + L.reset.w, L.reset.y + L.reset.h)).toBe(true);
  });

  it('its info strip holds a four-row summary, and a summary docked there never covers a node (040)', () => {
    const tallest = TIP.nameRow + (TIP.summaryRows - 1) * TIP.lineHeight + 2 * TIP.pad;
    expect(L.info.h).toBeGreaterThanOrEqual(tallest);
    for (const hovered of L.nodes) {
      for (const [w, h] of [[TIP.summaryW, tallest], [120, 30]] as const) {
        const box = { x: hovered.x - hovered.r, y: hovered.y - hovered.r, w: 2 * hovered.r, h: 2 * hovered.r };
        const at = placeTip({ box, prefer: [], dock: L.info }, w, Math.min(h, L.info.h));
        for (const n of L.nodes) {
          const clear = at.x >= n.x + n.r || at.x + w <= n.x - n.r || at.y >= n.y + n.r || at.y + h <= n.y - n.r;
          expect(clear, `${hovered.id}'s tip over ${n.id}`).toBe(true);
        }
      }
    }
  });

  it('in the foundry the docked summary stays left of the reset button, so a click there always respecs', () => {
    const dock = { ...L.info, w: L.reset.x - TALENT_PANEL.info.gap - L.info.x };
    expect(dock.w).toBeGreaterThan(150);
    for (const hovered of L.nodes) {
      const at = placeTip({ box: { x: hovered.x, y: hovered.y, w: 1, h: 1 }, prefer: [], dock }, dock.w, dock.h);
      expect(at.x + dock.w).toBeLessThanOrEqual(L.reset.x);
    }
  });

  it('hits each node at its centre and nothing between them', () => {
    for (const n of L.nodes) expect(talentAt(L, n.x, n.y)).toBe(n.id);
    expect(talentAt(L, L.panel.x + 2, L.panel.y + 2)).toBeNull();
    expect(onRect(L.reset, L.reset.x + 1, L.reset.y + 1)).toBe(true);
    expect(onRect(L.reset, L.reset.x - 1, L.reset.y)).toBe(false);
  });

  it('keystones are the larger rune-stones', () => {
    const r = (id: string) => L.nodes.find((n) => n.id === id)?.r ?? 0;
    expect(r('k1')).toBeGreaterThan(r('a1'));
    expect(TALENTS.k1?.kind).toBe('keystone');
  });

  it('reads its header and the level-up line', () => {
    expect(talentHeader(7, 120, 240, 2)).toBe('Level 7 · 120 / 240 XP · 2 points');
    expect(talentHeader(17, 0, 0, 1)).toBe('Level 17 · max level · 1 point');
    expect(levelUpLine(7)).toBe('Level 7 · talent point (T)');
  });
});

describe('the talent art', () => {
  it('draws every key once, in palette colours, and every lane and keystone has an icon', () => {
    expect(TALENT_SPRITES_VECTOR.map((s) => s.key).sort()).toEqual(Object.values(TALENT_SPRITES).sort());
    const ids = new Set(DAYLIGHT_PALETTE.map((c) => c.id));
    for (const s of TALENT_SPRITES_VECTOR) for (const id of s.frames.flat().flatMap(inksOf)) expect(ids.has(id), `${s.key}: ${id}`).toBe(true);
    for (const key of [...Object.values(LANE_ICONS), ...Object.values(KEYSTONE_ICONS), ...Object.values(NODE_ICONS)]) expect(Object.values(TALENT_SPRITES)).toContain(key);
    // 060: the two Fire nodes show their own icons; a node's own icon is only ever a minor node's.
    expect(Object.keys(NODE_ICONS)).toEqual(['b4', 'b5']);
    for (const id of Object.keys(NODE_ICONS)) expect(TALENTS[id]?.kind).toBe('minor');
    for (const c of Object.values(TALENT_PANEL.colors)) expect(ids.has(c), c).toBe(true);
  });
});
