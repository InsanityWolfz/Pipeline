import { stagesUnlocked } from '../sim/stages';
import type { SimState } from '../sim/state';

// What changes a description or a Build tab row (040), as one key: the talents, the worn and
// carried gear, what the player knows (crafted, machine-made, carried) and the stages unlocked.
// Tablets re-describe only when it changes.

export const loadoutKey = (s: Pick<SimState, 'talents' | 'equipped' | 'gear' | 'crafted' | 'carried' | 'machineMade'>): string =>
  [s.talents.join(), Object.values(s.equipped).join(), s.gear.map((g) => g.id).join(), s.crafted.join(), s.carried.join(), Object.keys(s.machineMade).join(), stagesUnlocked(s).join()].join('|');
