import { CARRIED_EMPTY } from '../data/hudLayout';
import { itemDef } from '../data/items';

// 070: how one carried-bar slot looks, pure: its round's icon and count; a slot whose round ran out (047.3: it keeps
// its kind) keeps the icon, greyed, with "0", until another round takes the slot; a slot with no round shows nothing.

export interface CarriedSlotLook {
  /** The icon frame, or null for none. */
  icon: string | null;
  /** The count's text, or null for none. */
  count: string | null;
  /** The icon's and count's alpha. */
  alpha: number;
  greyed: boolean;
}

export function carriedSlotLook(itemId: string | null, carried: number): CarriedSlotLook {
  if (itemId === null) return { icon: null, count: null, alpha: 1, greyed: false };
  const greyed = carried === 0;
  return { icon: itemDef(itemId).icon, count: String(carried), alpha: greyed ? CARRIED_EMPTY.alpha : 1, greyed };
}
