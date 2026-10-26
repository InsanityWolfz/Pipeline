import { describe, expect, it } from 'vitest';
import { RECIPES } from '../../src/data/recipes';
import { BUILD_BAR, machineDef, pieceDef, PIECE_CATEGORIES } from '../../src/data/pieces';
import { itemDef } from '../../src/data/items';
import { PLAYTEST_START } from '../../src/data/playtest';
import { canCraft, craft } from '../../src/sim/crafting';
import type { CrateState, HopperState } from '../../src/sim/pieces';
import { unlockedPieces } from '../../src/sim/placement';
import { createSim } from '../../src/sim/state';
import { knownRecipe } from '../../src/sim/tutorial';
import { nodeDef } from '../../src/data/nodes';
import { die, placeNode, run, runUntil, arena, PLAYER_AT } from './fight';
import { foundry, put } from './foundryKit';

// The landmine chain (038): ley-iron into a plate press makes 2 iron plates; an iron
// plate, a fuse and ley dust into a mine packer make 2 landmines. Hand-crafting each
// once unlocks its machine; the recipes show once ley-iron has been picked up.

describe('the landmine chain', () => {
  it('has the specced recipes and items', () => {
    expect(RECIPES['iron-plate']).toMatchObject({ inputs: { 'ley-iron': 1 }, output: { itemId: 'iron-plate', count: 2 }, shownAfter: 'ley-iron' });
    expect(RECIPES.landmine).toMatchObject({ inputs: { 'iron-plate': 1, fuse: 1, 'ley-dust': 1 }, output: { itemId: 'landmine', count: 2 }, shownAfter: 'ley-iron' });
    expect(itemDef('iron-plate')).toMatchObject({ name: 'Iron plate', kind: 'part', group: 'parts' });
    expect(itemDef('landmine')).toMatchObject({ name: 'Landmine', kind: 'ammo', group: 'ammo' });
  });

  it('runs on a plate press (1×1, 60 ticks) and a mine packer (3×1, 90 ticks) in a Mines group, last of the ammo chains (062: the Forge group follows)', () => {
    expect(machineDef('plate-press')).toMatchObject({ name: 'Plate press', recipeId: 'iron-plate', footprint: '1x1', craftTicks: 60, category: 'mines' });
    expect(machineDef('mine-packer')).toMatchObject({ name: 'Mine packer', recipeId: 'landmine', footprint: '3x1', craftTicks: 90, category: 'mines' });
    // 062: the Forge group comes after it.
    expect(PIECE_CATEGORIES.at(-2)).toEqual({ id: 'mines', label: 'Mines' });
    expect(BUILD_BAR.slice(-4, -2)).toEqual(['plate-press', 'mine-packer']);
    expect(pieceDef('cluster-die').category).toBe('bombs');
  });

  it('hides its recipes until ley-iron is picked up, then knows them for good', () => {
    const s = arena();
    s.link.attuned = true;
    s.inventory = { 'ley-iron': 0, fuse: 1, 'ley-dust': 1 };
    expect(knownRecipe(s, 'iron-plate')).toBe(false);
    expect(knownRecipe(s, 'landmine')).toBe(false);
    expect(knownRecipe(s, 'bomb')).toBe(true);
    // A seam harvested: ley-iron in the inventory.
    const n = placeNode(s, 'ley-iron-seam', PLAYER_AT.x, PLAYER_AT.y - 16);
    run(s, 1, { interact: true });
    run(s, nodeDef(n.nodeId).harvestTicks);
    runUntil(s, (t) => (t.inventory['ley-iron'] ?? 0) > 0, 30);
    expect(s.found).toContain('ley-iron');
    expect(knownRecipe(s, 'iron-plate')).toBe(true);
    expect(canCraft(s, 'iron-plate')).toBe(true);
    s.inventory['ley-iron'] = 0;
    die(s);
    expect(knownRecipe(s, 'landmine')).toBe(true);
  });

  it('knows them from a start that carries ley-iron', () => {
    expect(createSim(1, { start: PLAYTEST_START }).found).toContain('ley-iron');
    expect(createSim(1).found).toEqual([]);
  });

  it('unlocks the plate press and the mine packer by hand-crafting their parts once', () => {
    const s = foundry(false);
    s.found = ['ley-iron'];
    s.inventory = { 'ley-iron': 1, fuse: 1, 'ley-dust': 1 };
    expect(unlockedPieces(s)).not.toContain('plate-press');
    expect(craft(s, 'iron-plate')).toBe(true);
    expect(unlockedPieces(s)).toContain('plate-press');
    expect(unlockedPieces(s)).not.toContain('mine-packer');
    expect(craft(s, 'landmine')).toBe(true);
    expect(s.inventory).toMatchObject({ 'iron-plate': 1, landmine: 2 });
    expect(unlockedPieces(s)).toContain('mine-packer');
  });

  it('makes landmines in a line: ley-iron hopper → plate press → mine packer, with fuses and shards', () => {
    const s = foundry();
    // As 006's bomb line: three rows into the packer's back, ley-iron through the plate press, fuses and shards from hoppers.
    const fill = (tx: number, ty: number, item: string, count: number) => Object.assign(put<HopperState>(s, 'hopper', tx, ty, 'right'), { item, count });
    put(s, 'mine-packer', 10, 6, 'right');
    const crate = put<CrateState>(s, 'crate', 11, 6);
    fill(7, 5, 'ley-iron', 2);
    put(s, 'plate-press', 8, 5);
    put(s, 'conduit', 9, 5);
    fill(9, 6, 'fuse', 4);
    fill(9, 7, 'ley-dust', 4);
    run(s, 900);
    expect(s.machineMade['iron-plate']).toBeGreaterThanOrEqual(2);
    expect(crate.contents.landmine ?? 0).toBeGreaterThanOrEqual(2);
  });
});
