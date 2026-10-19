// One-line descriptions on mouse-over (018) for the things that explain where
// materials come from. Wording is a first draft for Shaun to edit; the HUD font
// has letters, digits and . , ' ! ? ( ) : — only.

export const DESCRIPTIONS = {
  pylon: 'Harvests the land round it, sends it home.',
  /** An unclaimed pylon does nothing yet. */
  pylonDormant: 'Claim it to harvest the land round it.',
  leyLine: "Carries the pylon's haul to the foundry.",
} as const;

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
