// One-time hints (047.9, Shaun 2026-10-20): short lines shown once per save in the banner (032's), never again.

/** A one-time hint: its id (the sim's event names it) and its line, given the bound key's label. */
export interface HintDef {
  id: string;
  text: (key: string) => string;
}

/**
 * Before the tube attunes, left click fires the carried bar's selected round (047.9); once attuned it's the volley,
 * and right click (047's "Use carried item", rebindable) uses the carried bar. This shows as the attune (019) ends.
 */
export const CARRIED_HINT: HintDef = { id: 'carried-items', text: (key) => `${key}: carried items` };
