import { describe, expect, it } from 'vitest';
import { SCHEMATIC_REGIONS } from '../../src/data/drops';
import { LOGISTICS_ICONS } from '../../src/data/foundryAssets';
import { INTERACT_KINDS } from '../../src/data/interact';
import { ITEMS } from '../../src/data/items';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { RESEARCH_NODES, RESEARCH_PIECES } from '../../src/data/research';
import { RESEARCH_SPRITES } from '../../src/data/researchAssets';
import { vectorFrames } from '../../src/render/vector/catalog';

// 052 (C.2): the sorter and the merger are gone, with the merger's research, schematic and art (Shaun: "the sorter
// needs removed entirely", "I think the merger goes").

const GONE = /sorter|merger/;

describe('the sorter and the merger (052)', () => {
  it('are no pieces, build bar cells, interactables or icons', () => {
    for (const id of Object.keys(PIECES)) expect(id, id).not.toMatch(GONE);
    for (const def of Object.values(PIECES)) expect(def.kind, def.id).not.toMatch(GONE);
    for (const id of BUILD_BAR) expect(id).not.toMatch(GONE);
    for (const kind of INTERACT_KINDS) expect(kind).not.toMatch(GONE);
    expect(Object.keys(LOGISTICS_ICONS).sort()).toEqual(Object.values(PIECES).filter((p) => p.kind !== 'machine').map((p) => p.id).sort());
  });

  it("leave no research node, schematic, drop region or wall art behind", () => {
    for (const n of RESEARCH_NODES) {
      expect(n.id).not.toMatch(GONE);
      expect(n.reveal).not.toMatch(GONE);
      for (const itemId of Object.keys(n.cost)) expect(itemId).not.toMatch(GONE);
    }
    expect(RESEARCH_PIECES).toEqual([]);
    for (const id of Object.keys(ITEMS)) expect(id).not.toMatch(GONE);
    for (const id of Object.keys(SCHEMATIC_REGIONS)) expect(id).not.toMatch(GONE);
    expect(JSON.stringify(RESEARCH_SPRITES)).not.toMatch(GONE);
  });

  it('leave no drawn frame behind', () => {
    for (const f of vectorFrames()) expect(f.name).not.toMatch(GONE);
  });
});
