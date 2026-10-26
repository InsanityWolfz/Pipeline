import { describe, expect, it } from 'vitest';
import { MECHANISMS } from '../../src/data/art/mechanisms';
import { MACHINE_IDS, machineLook } from '../../src/data/foundryAssets';
import { ITEMS } from '../../src/data/items';
import { BUILD_BAR, machineRecipeIds, PIECES } from '../../src/data/pieces';
import { RECIPES } from '../../src/data/recipes';
import { TIER_SPRITES } from '../../src/data/tierAssets';
import { vectorFrames } from '../../src/render/vector/catalog';

// 066 as data: the storm tier's parts (stormsteel, storm glass and the three stormsteel parts) each with an icon of its
// own, the Tempering coil in the Forge group with its mechanism, and each tiered machine's stormsteel recipe.

const PARTS = {
  stormsteel: 'Stormsteel',
  'storm-glass': 'Storm glass',
  'stormsteel-arrowhead': 'Stormsteel arrowhead',
  'stormsteel-casing': 'Stormsteel casing',
  'stormsteel-plate': 'Stormsteel plate',
} as const;
const frames = new Set(vectorFrames().map((f) => f.name));

describe('the storm tier’s parts (066)', () => {
  it('are parts with their own names and icons, none shared with another item', () => {
    for (const [id, name] of Object.entries(PARTS)) {
      expect(ITEMS[id], id).toMatchObject({ id, name, kind: 'part', group: 'parts' });
      const icon = ITEMS[id]?.icon ?? '';
      expect(Object.values(TIER_SPRITES)).toContain(icon);
      expect(frames.has(icon), icon).toBe(true);
    }
    const icons = Object.values(ITEMS).filter((it) => it.kind !== 'ammo').map((it) => it.icon);
    for (const id of Object.keys(PARTS)) expect(icons.filter((i) => i === ITEMS[id]?.icon), id).toHaveLength(1);
  });

  it('have their recipes: the coil’s two, and each family’s stormsteel part and round in steel’s counts', () => {
    const pairs: [string, string][] = [
      ['stormsteel-arrowhead', 'steel-arrowhead'],
      ['stormsteel-arrow', 'steel-arrow'],
      ['stormsteel-casing', 'steel-casing'],
      ['stormsteel-bomb', 'steel-bomb'],
      ['stormsteel-plate', 'steel-plate'],
      ['stormsteel-landmine', 'steel-landmine'],
      ['storm-glass-bolt', 'glass-bolt'],
    ];
    const swap = (id: string): string => ({ 'ley-steel': 'stormsteel', 'ley-glass': 'storm-glass', 'steel-arrowhead': 'stormsteel-arrowhead', 'steel-casing': 'stormsteel-casing', 'steel-plate': 'stormsteel-plate' })[id] ?? id;
    for (const [storm, steel] of pairs) {
      const r = RECIPES[storm];
      const s = RECIPES[steel];
      if (!r || !s) throw new Error(`no ${storm} or ${steel}`);
      expect(r.inputs, storm).toEqual(Object.fromEntries(Object.entries(s.inputs).map(([k, n]) => [swap(k), n])));
      expect(r.output.count, storm).toBe(s.output.count);
      expect(r.requires, storm).toBe(s.requires);
    }
    expect(RECIPES['stormsteel-arrow']?.output.itemId).toBe('arrow+stormsteel');
    expect(RECIPES['storm-glass-bolt']?.output.itemId).toBe('ley-bolt+storm-glass');
    expect(RECIPES['storm-glass']?.requires).toBe('attuned');
  });
});

describe('the Tempering coil’s piece (066)', () => {
  it('sits in the Forge group after the Smelter and the kiln, with a mechanism and frames in every view', () => {
    expect(BUILD_BAR.filter((id) => PIECES[id]?.category === 'forge')).toEqual(['smelter', 'kiln', 'tempering-coil']);
    expect(MACHINE_IDS).toContain('tempering-coil');
    expect(MECHANISMS['tempering-coil']).toBeDefined();
    for (const view of ['down', 'up', 'side'] as const) {
      const look = machineLook('tempering-coil', view);
      for (const key of [look.idle, look.jammed, `${look.working.key}/0`]) expect(frames.has(key), key).toBe(true);
    }
  });

  it('names what each tiered machine makes from the storm tier in its build-bar text', () => {
    for (const id of ['knapper', 'assembler', 'shaper', 'packer', 'focuser', 'plate-press', 'mine-packer', 'tempering-coil']) {
      const def = PIECES[id];
      if (def?.kind !== 'machine') throw new Error(id);
      expect(def.description, id).toMatch(/storm/i);
      expect(machineRecipeIds(def).length, id).toBeGreaterThanOrEqual(2);
    }
  });
});
