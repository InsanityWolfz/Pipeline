// Claiming (009): the pylon, the supply ports (028) and the foundry's fixed furniture
// (with 010's identification bench).
// Starting values from spec 009; tune in playtest.

/** How close the player's feet box must be to a pylon to use it, px. */
export const PYLON_REACH = 20;

/** Ticks of standing still at a cleared pylon to claim it. */
export const CLAIM_TICKS = 120;

/** Ticks the pylon's activation plays after a claim. */
export const ACTIVATE_TICKS = 60;

/**
 * Supply ports (028): one fixed port per raw on the foundry's west wall. Each claimed site's pylon sends the raws of
 * its own area (every raw it lists has a node of that raw in its safe zone). A port pushes one of its raw every
 * round(SUPPLY_TICKS / N) ticks, N being how many claimed sites supply it: 15 a minute per pylon (starting value).
 */
export const SUPPLY_TICKS = 240;

/** The raws each claimable site's pylon sends home, by site id: a resource site (032) sends only its own. */
export const SITE_SUPPLY: Readonly<Record<string, readonly string[]>> = {
  shrine: ['wood', 'stone', 'fiber', 'ley-crystal'],
  quarry: ['stone'],
  'old-grove': ['wood'],
  'reed-marsh': ['fiber'],
  'ley-grotto': ['ley-crystal'],
};

/** A resource site's safe radius, tiles (032): smaller than the shrine's 10, so five claims don't starve spawning. */
export const SITE_SAFE_RADIUS = 7;

/** The site a resource-site pylon waits on: dormant until it's claimed (032). */
export const SITE_WAKES = 'shrine';

/** How close the player's feet box must be to a fixture to use it, px. */
export const FIXTURE_REACH = 20;

export type FixtureKind = 'stash' | 'port' | 'waystone' | 'bench';

/**
 * Fixed foundry furniture: never placed or picked up. `claim` names the site whose claim adds it; a port has a `raw`
 * instead, and stands while its pylon count is above 0 (028). With neither, it's there from the start.
 */
export interface FixtureDef {
  id: string;
  kind: FixtureKind;
  name: string;
  tx: number;
  ty: number;
  facing: 'up' | 'down' | 'left' | 'right';
  claim?: string;
  /** A supply port's raw. */
  raw?: string;
}

export const FIXTURES: readonly FixtureDef[] = [
  { id: 'stash', kind: 'stash', name: 'Stash', tx: 22, ty: 11, facing: 'down' },
  { id: 'identification-bench', kind: 'bench', name: 'Identification bench', tx: 1, ty: 12, facing: 'right' },
  { id: 'wood-port', kind: 'port', name: 'Wood port', tx: 1, ty: 4, facing: 'right', raw: 'wood' },
  { id: 'stone-port', kind: 'port', name: 'Stone port', tx: 1, ty: 6, facing: 'right', raw: 'stone' },
  { id: 'fiber-port', kind: 'port', name: 'Fiber port', tx: 1, ty: 8, facing: 'right', raw: 'fiber' },
  { id: 'ley-crystal-port', kind: 'port', name: 'Ley crystal port', tx: 1, ty: 10, facing: 'right', raw: 'ley-crystal' },
  { id: 'waystone', kind: 'waystone', name: 'Waystone', tx: 22, ty: 4, facing: 'down', claim: 'shrine' },
];
