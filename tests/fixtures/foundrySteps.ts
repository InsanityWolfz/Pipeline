// The foundry tutorial's goals (046: 027's build steps gave way to the example line) as the spec words them,
// shared by the sim test and the e2e runs so the wording is checked in one place.

/** Shown once the example line has run dry: refill its hoppers by hand. */
export const REFILL_GOAL = 'Refill the hoppers with wood, stone and fiber (E)';

/** The goal after it in the chain, done by the example line on its own. */
export const AFTER_REFILL = 'Fill the tube from your line';

/** After the Warden's core restores the second entrance (046.3): a second line of the player's own. */
export const SECOND_LINE_GOAL = 'Build a second arrow line into the new entrance';
