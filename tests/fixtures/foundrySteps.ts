// The foundry tutorial's steps (027) as the spec words them, and the goal after them,
// shared by the sim test and both e2e runs so the wording is checked in one place.

export const FOUNDRY_STEPS = [
  'Press B and place a hopper',
  'Put wood in the hopper (E)',
  'Place a cutter in front of the hopper',
  'Make arrowheads: hopper of stone → knapper',
  'Make rope: hopper of fiber → spinner',
  'Feed all three into an assembler',
  'Run a conduit from the assembler into the intake',
] as const;

/** The goal the line moves on to once the seven steps are done. */
export const AFTER_STEPS = 'Fill the tube from your line';
