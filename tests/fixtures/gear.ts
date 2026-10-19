import type { Affix, GearPiece, GearSlot, GearWeight, Rarity } from '../../src/data/gear';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { fixtureDef } from '../../src/sim/fixtures';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';

// Gear for tests (036): a Common body piece stands in for 010's single armor piece (its old
// armor as `baseArmor`, one affix), and pieces of any slot, rarity and affixes are built here.

/** An affix that touches neither health, armor nor the walk: a little off the roll's cooldown. */
export const QUIET_AFFIX: Affix = { kind: 'roll-cooldown', value: 3 };

/** A Common body piece: 010's piece as 036 builds it. */
export function bodyPiece(id: number, weight: GearWeight, baseArmor: number, affix: Affix = QUIET_AFFIX, name = 'Test Plate'): GearPiece {
  return { id, slot: 'body', rarity: 'common', weight, baseArmor, affixes: [affix], relic: null, name };
}

/** Any piece. A body piece is light unless told otherwise; the others carry no weight. */
export function piece(id: number, slot: GearSlot, o: { baseArmor?: number; affixes?: Affix[]; rarity?: Rarity; weight?: GearWeight; relic?: string | null; name?: string } = {}): GearPiece {
  return {
    id,
    slot,
    rarity: o.rarity ?? 'common',
    weight: slot === 'body' ? (o.weight ?? 'light') : null,
    baseArmor: o.baseArmor ?? 0,
    affixes: o.affixes ?? [],
    relic: o.relic ?? null,
    name: o.name ?? `Test ${slot}`,
  };
}

/** Gives the player these pieces and wears every one (the last of a slot wins), outside the bench. */
export function wear(s: SimState, ...pieces: GearPiece[]): SimState {
  s.gear.push(...pieces);
  for (const p of pieces) s.equipped[p.slot] = p.id;
  s.nextGearId = Math.max(s.nextGearId, ...pieces.map((p) => p.id + 1));
  return s;
}

/** Puts the player in the foundry beside the identification bench. */
export function standAtBench(s: SimState): SimState {
  s.roomId = FOUNDRY_ROOM;
  s.link.attuned = true;
  const bench = fixtureDef('identification-bench');
  const at = tileCentre({ tx: bench.tx + 1, ty: bench.ty });
  s.player.x = at.x;
  s.player.y = at.y;
  s.player.aimX = at.x;
  s.player.aimY = at.y;
  return s;
}
