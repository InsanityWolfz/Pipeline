import type { GearPiece } from '../../src/data/gear';
import { TALENT_START } from '../../src/data/talents';
import { entranceCap } from '../../src/sim/research';
import type { SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';

// Builds for 041's scripted targets (test code): what a player has when they get there.
// "A line" is an intake entrance kept fed to its cap each tick, as a line that keeps up
// with the fire rate does (041.7's arithmetic assumes it).

/** 041.7's decent build: level 7, six talents along the Arrows, Bombs and Tube lanes (Fletcher's Eye, Quick Nock, Black Powder, Hard Bore, and the Tube lane's first two, which Hard Bore needs). */
export const DECENT_TALENTS = ['a1', 'a2', 'b1', 't1', 't2', 't3'] as const;

/** Four Common pieces (one affix each), base armor and affix at mid-roll (the range's middle, a whole step, rounded down where it falls between). */
export const DECENT_GEAR: readonly GearPiece[] = [
  { id: 0, slot: 'helm', rarity: 'common', weight: null, baseArmor: 1, relic: null, name: 'Worn Hood', affixes: [{ kind: 'max-health', value: 14 }] },
  { id: 1, slot: 'body', rarity: 'common', weight: 'light', baseArmor: 6, relic: null, name: 'Worn Vest', affixes: [{ kind: 'armor', value: 2 }] },
  { id: 2, slot: 'boots', rarity: 'common', weight: null, baseArmor: 1, relic: null, name: 'Worn Boots', affixes: [{ kind: 'roll-cooldown', value: -0.15 }] },
  { id: 3, slot: 'trinket', rarity: 'common', weight: null, baseArmor: 0, relic: null, name: 'Old Charm', affixes: [{ kind: 'regen', value: 0.5 }] },
];

/** Level 7 with the decent talents, the four pieces worn, at full health. */
export function decentBuild(s: SimState): void {
  s.level = 7;
  s.talentPoints = 0;
  s.talents = [TALENT_START, ...DECENT_TALENTS];
  s.gear = DECENT_GEAR.map((g) => structuredClone(g));
  s.equipped = { helm: 0, body: 1, boots: 2, trinket: 3 };
  s.player.health = playerStats(s).maxHealth;
}

/**
 * The tube linked with one entrance per ammo id given (in the intake's order), nothing carried. The first full line
 * counts as already seen, so feeding these doesn't fill the land with packs (017): a scenario fights only what it places.
 */
export function lines(s: SimState, ...ammoIds: string[]): void {
  s.link.attuned = true;
  s.firstLineFull = true;
  s.inventory = {};
  s.link.entrances.forEach((e, i) => {
    e.open = i < ammoIds.length;
    e.ammoId = ammoIds[i] ?? null;
    e.count = 0;
  });
  feed(s);
}

/** Each line keeps its entrance at its cap. */
export function feed(s: SimState): void {
  for (const e of s.link.entrances) if (e.open && e.ammoId) e.count = entranceCap(s);
}
