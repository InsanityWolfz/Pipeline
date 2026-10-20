import { TILE_SIZE } from '../data/config';
import { INTAKE } from '../data/foundry';
import { TUTORIAL_LAYOUT } from '../data/foundryAssets';
import { LANDMARK_LIST } from '../data/landmarks';
import type { MarkerTarget } from '../data/objectives';
import { fixtureDef } from '../sim/fixtures';
import type { SimState } from '../sim/state';

// Where the tutorial's arrow marker points (027, 028, 032). Pure, so tests can check it.

/** A world point, px: where a prompt's target stands. */
type Point = { x: number; y: number };

/**
 * Where an arrow marker's tip goes: over the middle one of the intake's open entrances, just above the mouth tile's
 * bottom (027); or over the first of the supply ports standing, clear of its head (028): the plates hang between the
 * ports, so only above the first is there room without covering one; or over the nearest discovered resource-site
 * pylon not yet claimed (032). Null with none there.
 */
export function markerPoint(sim: SimState, target: MarkerTarget): Point | null {
  const L = TUTORIAL_LAYOUT.marker;
  if (target === 'sitePylon') {
    // The nearest discovered resource-site pylon not yet claimed (032), its tip just over the pylon's crystal.
    const p = sim.player;
    const pylon = LANDMARK_LIST.flatMap((l) => (l.pylon && sim.discovered.includes(l.id) && !sim.claims.includes(l.pylon.site) ? [l.pylon] : []))
      .map((t) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE - L.pylonLift }))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    return pylon ?? null;
  }
  const middle = <T>(list: readonly T[]): T | undefined => list[Math.floor((list.length - 1) / 2)];
  if (target === 'intake') {
    const mouth = middle(INTAKE.entrances.filter((_, i) => sim.link.entrances[i]?.open));
    return mouth ? { x: (mouth.tx + 0.5) * TILE_SIZE, y: (mouth.ty + 1) * TILE_SIZE - L.lift } : null;
  }
  const port = sim.fixtures
    .map((f) => fixtureDef(f.id))
    .filter((d) => d.kind === 'port')
    .sort((a, b) => a.ty - b.ty)[0];
  return port ? { x: (port.tx + 0.5) * TILE_SIZE, y: (port.ty + 1) * TILE_SIZE - L.portLift } : null;
}

