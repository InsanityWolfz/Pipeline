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
    expect(affixLabel({ kind: 'max-health', value: 12 })).toBe('+12 max HP');
    expect(affixLabel({ kind: 'regen', value: 0.5 })).toBe('+0.5 regen/s');
    expect(affixLabel({ kind: 'move-speed', value: 0.04 })).toBe('+4% speed');
    expect(affixLabel({ kind: 'armor', value: 2 })).toBe('+2 armor');
    expect(affixLabel({ kind: 'roll-cooldown', value: 4 })).toBe('−4 roll cooldown');
    expect(affixLabel({ kind: 'roll-distance', value: 12 })).toBe('+12 roll distance');
  });

  it('a row reads its name, the worn mark, a body piece’s weight and its armor, its affixes, and a relic’s rule', () => {
    const plate = { ...bodyPiece(0, 'heavy', 12, { kind: 'max-health', value: 12 }, 'Granite Plate'), affixes: [{ kind: 'max-health' as const, value: 12 }, { kind: 'regen' as const, value: 0.5 }] };
    expect(pieceLines(plate, true)).toEqual({ name: 'Granite Plate', detail: 'worn · heavy · armor 12', affixes: '+12 max HP · +0.5 regen/s', rule: null });
    const helm = piece(1, 'helm', { baseArmor: 1, rarity: 'relic', relic: WARDSTONE.id, name: WARDSTONE.name, affixes: [{ kind: 'armor', value: 3 }] });
    expect(pieceLines(helm, false)).toEqual({ name: WARDSTONE.name, detail: 'armor 1', affixes: '+3 armor', rule: WARDSTONE.text });
  });

  it('icons: a relic’s own, the body’s by weight, the others by slot; frames and colours by rarity', () => {
    expect(pieceIcon(piece(0, 'helm', { relic: WARDSTONE.id }))).toBe(WARDSTONE.icon);
    expect(pieceIcon(bodyPiece(0, 'heavy', 10))).toBe(SPRITES.iconArmorHeavy);
    expect(pieceIcon(bodyPiece(0, 'light', 5))).toBe(SPRITES.iconArmorLight);
    expect(pieceIcon(piece(0, 'boots'))).toBe(GEAR_SPRITES.boots);
    expect(rarityLook({ rarity: 'relic' })).toEqual({ frame: GEAR_SPRITES.frameRelic, color: 'wisp-light' });
    expect(rarityLook({ rarity: 'common' })).toEqual({ frame: GEAR_SPRITES.frameCommon, color: 'rock-light' });
  });

  it('totals: armor, max HP, regen, walk speed, the roll’s cooldown and distance', () => {
    expect(totalsLines(playerStats(createSim(1)))).toEqual([`Armor 0 · Max HP ${MAX_HEALTH} · Regen 0.0/s`, `Speed 100% · Roll cooldown ${ROLL_COOLDOWN_TICKS} · Roll ${ROLL_DISTANCE} px`]);
    const s = wear(createSim(1), bodyPiece(0, 'heavy', 12, { kind: 'roll-distance', value: 12 }), piece(1, 'trinket', { affixes: [{ kind: 'regen', value: 0.6 }, { kind: 'max-health', value: 10 }] }));
    expect(totalsLines(playerStats(s))).toEqual(['Armor 12 · Max HP 110 · Regen 0.6/s', 'Speed 85% · Roll cooldown 30 · Roll 108 px']);
  });
});
