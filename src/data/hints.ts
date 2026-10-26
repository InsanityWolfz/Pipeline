import type { GateId } from './rooms';

// One-time hints (047.9, Shaun 2026-10-20), shown once per save, never again; and (067) a sealed door's line. 051 (B.7, Shaun: "the carried items
// banner when you walk in to the foundry is confusing"): the banner line gave way to a small mouse beside the carried
// bar, its right button lit, and the carried items' hint is now the slot swap below, played as the attune ends.

/** A one-time hint: its id, as the sim's event names it. */
export interface HintDef {
  id: string;
}

/**
 * Before the tube attunes, left click fires the carried bar's selected round (047.9); once attuned it's the volley,
 * and right click (047's "Use carried item", rebindable) uses the carried bar. This plays as the attune (019) ends.
 */
export const CARRIED_HINT: HintDef = { id: 'carried-items' };

/**
 * 051 (B.7): the mouse beside the carried bar (`hud-mouse`, its right button lit), `gap` px right of the bar's last
 * cell, centred on the bar; with `use` bound to a key, that key's label instead, in a tablet padded `pad` px.
 */
export const MOUSE_HINT = { gap: 5, pad: 3 } as const;

/**
 * 051 (B.7): as the attune ends, the old left-click slot (the carried round the intake's bar showed) shrinks down into
 * the carried bar's selected cell over `shrinkMs`, to `endScale` of its size, fading out over the last `fadeMs`; the
 * intake's slot appears in its place, fading in over `growMs` after `growDelayMs`.
 */
export const SLOT_SWAP = { shrinkMs: 700, endScale: 0.55, fadeMs: 200, growDelayMs: 350, growMs: 450 } as const;

/**
 * 067: the line a door sealed by a gate says when E is pressed at it or it's walked into (the foundry's stairs stay
 * sealed until the shrine's pylon is claimed). Only gates on doors have one.
 */
export const SEALED_DOOR_TEXT = { foundry: 'Claim the shrine first' } as const satisfies Partial<Record<GateId, string>>;

/** 067: how close the player's feet box must be to a sealed door's tile for E or a push into it to count, px. */
export const SEALED_DOOR_REACH = 16;

/**
 * 067: the sealed door's line, over the door: its baseline `rise` px above the door tile's top, shown for `holdMs`
 * after the last E or push, then fading over `fadeMs`.
 */
export const SEALED_DOOR_LINE = { rise: 10, holdMs: 1400, fadeMs: 300 } as const;
