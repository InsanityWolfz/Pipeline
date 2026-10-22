import { CRAFT_TABS, craftRecipeDef } from '../data/craftTabs';
import { itemDef } from '../data/items';
import { UNLOCK_BANNER } from '../data/landmarkAssets';
import { craftKnown } from '../sim/crafting';
import type { SimState } from '../sim/state';
import type { Banner } from './Banner';

/** Every crafting menu row, once each (a part two families use is in both tabs). */
const ROWS = [...new Set(CRAFT_TABS.flatMap((t) => t.recipes))];

/** The crafting menu's rows the player knows now, in menu order. */
export const knownRows = (sim: SimState): string[] => ROWS.filter((id) => craftKnown(sim, id));

// The unlock banner (058, Shaun: "if you unlock a new recipe in the crafting, put a little pop-up on the top"): when
// rows join the crafting menu (C), one banner in the area banners' place names them all, "Unlocked" over their names.
// What's known when the scene starts (a new game's arrows, a loaded save's) is taken as already seen. Never in the sandbox.
export class UnlockBanner {
  private readonly banner: Banner;
  private seen: Set<string> | null = null;

  constructor(banner: Banner) {
    this.banner = banner;
  }

  update(sim: SimState): void {
    if (sim.sandbox) return;
    const known = knownRows(sim);
    if (!this.seen) {
      this.seen = new Set(known);
      return;
    }
    const fresh = known.filter((id) => !this.seen?.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) this.seen.add(id);
    const names = fresh.map((id) => itemDef(craftRecipeDef(id).output.itemId).name);
    this.banner.push({ kind: 'unlock', id: fresh.join(), kicker: UNLOCK_BANNER.kicker, name: names.join(UNLOCK_BANNER.join) });
  }
}
