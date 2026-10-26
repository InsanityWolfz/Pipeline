// Leveling (037): XP from fighting and exploring, never from the factory. Each level
// gives one talent point (src/data/talents.ts). Starting values from spec 037, all
// flagged for playtest; Shaun edits them after. An enemy's own XP is on its def.

/** XP needed for each level, level 1→2 first: the curve's length is LEVEL_CAP − 1. */
export const XP_CURVE: readonly number[] = [40, 70, 100, 130, 160, 200, 240, 280, 330, 380, 440, 500, 570, 650, 740, 840];

/** The highest level for now; raised as each region adds nodes. At the cap XP stops counting. */
export const LEVEL_CAP = 17;

/** A kill's XP multiplier by its danger ring (017): ring 0 (no packs today), 1, 2, 3 (Stonefall Hollows, Region 2), 4 (060: the Emberworks, Region 3) and 5 (064: the Stormcrown, Region 4). */
export const RING_XP: readonly number[] = [1, 1, 2, 3, 4, 10];

/** A champion's kill (032) gives this many times its XP. */
export const CHAMPION_XP = 3;

/** Claiming a pylon (once per pylon: claims are permanent). */
export const CLAIM_XP = 50;

/** A landmark's first discovery (032's event, once per landmark). */
export const LANDMARK_XP = 25;

/** The Forgewright's first kill (060). */
export const FORGEWRIGHT_XP = 500;

/** A boss killed again (034's altar refight) gives this share of its XP. */
export const BOSS_REFIGHT_XP = 0.5;

/** Where XP came from, on its event. */
export type XpSource = 'kill' | 'boss' | 'claim' | 'landmark';
