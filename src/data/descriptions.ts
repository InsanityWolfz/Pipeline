// One-line descriptions on mouse-over (018) for the things that explain where
// materials come from. Wording is a first draft for Shaun to edit. The bundled faces
// (020) draw full Latin text with digits and + − % × · ° / (the body face → too; 040's
// data test checks the glyphs), so any of them may be used here.

export const DESCRIPTIONS = {
  pylon: 'Harvests the land round it, sends it home.',
  /** An unclaimed pylon does nothing yet. */
  pylonDormant: 'Claim it to harvest the land round it.',
  /** fix-playtest-ui (Shaun: "a mouse over when it needs cleared has just a message that says kill all enemies"): its guards live. */
  pylonGuarded: 'Kill all enemies to claim it.',
  leyLine: "Carries the pylon's haul to the foundry.",
  /** The Ruined Cache's reliquary (032): sealed while its guards live, ready once they're dead, then empty until it re-arms. */
  cacheSealed: 'Sealed by its guards. Clear them to open it.',
  cacheReady: 'Hold E to break the seal.',
  cacheEmpty: 'Empty. It fills again in time.',
  /** The forum's altar (034): dim before the Bulwark's first kill, then an offering summons it again. */
  altarDim: 'Cold stone. Something here must fall first.',
  altarAwake: 'Offer 8 ley-iron (E) to call the Bulwark back.',
  altarSpent: 'The Bulwark walks. The altar waits.',
} as const;

/**
 * A landmark pylon's hover line (032): what it sends home, by landmark and item name, e.g. "Quarry pylon: sends stone
 * home." Before its claim, what it would send; before the shrine's, that it's dormant.
 */
export function sitePylonLine(landmark: string, item: string, state: 'claimed' | 'awake' | 'dormant'): string {
  if (state === 'dormant') return `${landmark} pylon: dormant until the shrine is claimed.`;
  return `${landmark} pylon: ${state === 'claimed' ? 'sends' : 'claim it to send'} ${item.toLowerCase()} home.`;
}

/** Between the parts of a port's plate and hover line (028). */
const PORT_SEPARATOR = ' · ';

/** A supply port's plate (028): how many pylons feed it and its rate, e.g. "×1 pylon · 15/min". */
export function portPlate(pylons: number, perMinute: number): string {
  return `×${pylons} ${pylons === 1 ? 'pylon' : 'pylons'}${PORT_SEPARATOR}${perMinute}/min`;
}

/** A port's hover line (028): its plate, and "waiting" while a refused raw waits in it. */
export function portHover(plate: string, waiting: boolean): string {
  return waiting ? `${plate}${PORT_SEPARATOR}waiting` : plate;
}

/**
 * 069: a recipe card's words, e.g. "1 wood → 2 shafts · 1.0 s", and a running machine's items a minute ("120 shafts/min",
 * as a port's plate reads its rate). Item names are lower case; a count other than one is plural, except raw materials
 * and these items, which read as amounts ("2 ley dust", "1 rope").
 */
export const RECIPE_CARD = {
  join: ' + ',
  arrow: ' → ',
  sep: ' · ',
  seconds: (s: string): string => `${s} s`,
  perMinute: (n: number, item: string): string => `${n} ${item}/min`,
  /** Decimal places of a craft's seconds. */
  places: 1,
  uncounted: ['rope', 'ley-dust', 'ley-steel', 'ley-glass', 'stormsteel', 'storm-glass'] as readonly string[],
} as const;
