// Claiming (009): the pylon, the supply line and the foundry's fixed furniture.
// Starting values from spec 009; tune in playtest.

/** How close the player's feet box must be to a pylon to use it, px. */
export const PYLON_REACH = 20;

/** Ticks of standing still at a cleared pylon to claim it. */
export const CLAIM_TICKS = 120;

/** Ticks the pylon's activation plays after a claim. */
export const ACTIVATE_TICKS = 60;

/** Ticks between the supply port's pushes. */
export const PORT_TICKS = 120;

/** What the shrine's supply line sends, in turn. */
export const PORT_CYCLE: readonly string[] = ['wood', 'stone', 'fiber', 'ley-crystal'];

/** How close the player's feet box must be to a fixture to use it, px. */
export const FIXTURE_REACH = 20;

export type FixtureKind = 'stash' | 'port' | 'waystone';

/** Fixed foundry furniture: never placed or picked up. `claim` names the room whose claim adds it; without one it's there from the start. */
export interface FixtureDef {
  id: string;
  kind: FixtureKind;
  name: string;
  tx: number;
  ty: number;
  facing: 'up' | 'down' | 'left' | 'right';
  claim?: string;
}

export const FIXTURES: readonly FixtureDef[] = [
  { id: 'stash', kind: 'stash', name: 'Stash', tx: 22, ty: 11, facing: 'down' },
  { id: 'supply-port', kind: 'port', name: 'Supply port', tx: 1, ty: 8, facing: 'right', claim: 'shrine' },
  { id: 'waystone', kind: 'waystone', name: 'Waystone', tx: 22, ty: 4, facing: 'down', claim: 'shrine' },
];
