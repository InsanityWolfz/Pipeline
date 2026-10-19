import { describe, expect, it } from 'vitest';
import { SPRITES } from '../../src/data/assets';
import { GEAR_SPRITES } from '../../src/data/gearAssets';
import { WARDSTONE } from '../../src/data/relics';
import { MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE } from '../../src/data/player';
import { affixLabel, pieceIcon, pieceLines, rarityLook, totalsLines } from '../../src/render/gearText';
import { playerStats } from '../../src/sim/stats';
import { createSim } from '../../src/sim/state';
import { bodyPiece, piece, wear } from '../fixtures/gear';

// The bench's gear panel words (036).

describe('the gear panel’s words', () => {
  it('labels each affix kind', () => {
    // 039: generated from each affix's stat line, one label per stat (STATS).
    expect(affixLabel({ kind: 'max-health', value: 12 })).toBe('+12 max health');
    expect(affixLabel({ kind: 'regen', value: 0.5 })).toBe('+0.5 HP/s field regen');
    expect(affixLabel({ kind: 'move-speed', value: 0.04 })).toBe('+4% move speed');
    expect(affixLabel({ kind: 'armor', value: 2 })).toBe('+2 armor');
    expect(affixLabel({ kind: 'roll-cooldown', value: -0.15 })).toBe('−15% roll cooldown');
    expect(affixLabel({ kind: 'roll-distance', value: 0.12 })).toBe('+12% roll distance');
  });

  it('a row reads its name, the worn mark, a body piece’s weight and its armor, its affixes, and a relic’s rule', () => {
    const plate = { ...bodyPiece(0, 'heavy', 12, { kind: 'max-health', value: 12 }, 'Granite Plate'), affixes: [{ kind: 'max-health' as const, value: 12 }, { kind: 'regen' as const, value: 0.5 }] };
    expect(pieceLines(plate, true)).toEqual({ name: 'Granite Plate', detail: 'Common · worn · heavy · armor 12', affixes: '+12 max health · +0.5 HP/s field regen', rule: null });
    const helm = piece(1, 'helm', { baseArmor: 1, rarity: 'relic', relic: WARDSTONE.id, name: WARDSTONE.name, affixes: [{ kind: 'armor', value: 3 }] });
    expect(pieceLines(helm, false)).toEqual({ name: WARDSTONE.name, detail: 'Relic · armor 1', affixes: '+3 armor', rule: 'After 6.0 s unhit, the next hit is blocked' });
  });

  it('icons: a relic’s own, the body’s by weight, the others by slot; frames and colours by rarity', () => {
    expect(pieceIcon(piece(0, 'helm', { relic: WARDSTONE.id }))).toBe(WARDSTONE.icon);
    expect(pieceIcon(bodyPiece(0, 'heavy', 10))).toBe(SPRITES.iconArmorHeavy);
    expect(pieceIcon(bodyPiece(0, 'light', 5))).toBe(SPRITES.iconArmorLight);
    expect(pieceIcon(piece(0, 'boots'))).toBe(GEAR_SPRITES.boots);
    expect(rarityLook({ rarity: 'relic' })).toEqual({ frame: GEAR_SPRITES.frameRelic, color: 'wisp-light' });
    expect(rarityLook({ rarity: 'common' })).toEqual({ frame: GEAR_SPRITES.frameCommon, color: 'rock-light' });
  });

  it('totals: armor, max health, field regen, move speed, the roll’s cooldown and distance, by their one label each (039)', () => {
    expect(totalsLines(playerStats(createSim(1)))).toEqual([`Armor 0 · Max health ${MAX_HEALTH} · Field regen 0.0 HP/s`, `Move speed 100% · Roll cooldown ${(ROLL_COOLDOWN_TICKS / 60).toFixed(1)} s · Roll distance 100%`]);
    const s = wear(createSim(1), bodyPiece(0, 'heavy', 12, { kind: 'roll-distance', value: 0.12 }), piece(1, 'trinket', { affixes: [{ kind: 'regen', value: 0.6 }, { kind: 'max-health', value: 10 }] }));
    expect(totalsLines(playerStats(s))).toEqual(['Armor 12 · Max health 110 · Field regen 0.6 HP/s', 'Move speed 85% · Roll cooldown 0.5 s · Roll distance 112%']);
    expect(ROLL_DISTANCE).toBe(96);
  });
});
