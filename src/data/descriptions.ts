// One-line descriptions on mouse-over (018) for the things that explain where
// materials come from. Wording is a first draft for Shaun to edit; the HUD font
// has letters, digits and . , ' ! ? ( ) : — only.

export const DESCRIPTIONS = {
  pylon: 'Harvests the land round it, sends it home.',
  /** An unclaimed pylon does nothing yet. */
  pylonDormant: 'Claim it to harvest the land round it.',
  leyLine: "Carries the pylon's haul to the foundry.",
} as const;

/** A supply port's plate (028): how many pylons feed it and its rate, e.g. "×1 pylon · 15/min". */
export function portPlate(pylons: number, perMinute: number): string {
  return `×${pylons} ${pylons === 1 ? 'pylon' : 'pylons'} · ${perMinute}/min`;
}

/** Added to a port's hover line while a refused raw waits in it (028). */
export const PORT_WAITING = 'waiting';
