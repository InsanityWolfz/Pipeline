// The foundry tutorial's goals as the spec words them (046; 058's wording), shared by the sim test and the e2e runs
// so the wording is checked in one place.

/** 058: shown after the fast travel home only if the example line has run dry by then: refill its hoppers by hand. */
export const REFILL_GOAL = 'Refill the hoppers in the foundry with wood, stone and fiber (E)';

/** 058: the goal on the first foundry visit, done by the example line on its own. */
export const FILL_GOAL = 'Wait for the tube to fill with arrows';

/** 058: the fast travel home whose landing decides whether the refill goal shows. */
export const TRAVEL_GOAL = 'Fast-travel to the foundry from the pylon (E)';
