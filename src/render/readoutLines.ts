import { INTAKE_CAP_ICON, INTAKE_EMPTY_ICON } from '../data/foundryAssets';
import { ammoDef } from '../data/ammo';
import { CAPPED_LABEL } from '../data/objectives';
import { itemDef } from '../data/items';
import { statusRecipe } from '../sim/flow';
import { count } from '../sim/inventory';
import type { EntranceState } from '../sim/link';
import type { MachineState, PieceState } from '../sim/pieces';

// What the hover readout (HoverReadout) shows over a machine or the intake, pure: its icon and text lines.

/** One readout line: an atlas frame for its icon, and the text beside it. */
export type Line = [frame: string, text: string];

/**
 * A machine's lines: each input of the recipe its status reads (062: so the hover and the status's missing inputs
 * agree; a stage's follows the round it's working on, 029) with how many are buffered, then the output waiting to go
 * out (the recipe's own, while none waits).
 */
export function machineLines(m: MachineState): Line[] {
  const recipe = statusRecipe(m);
  const out = m.output > 0 ? m.made : recipe.output.itemId;
  return [
    ...Object.keys(recipe.inputs).map((id): Line => [itemDef(id).icon, String(count(m.buffer, id))]),
    [itemDef(out).icon, String(m.output)],
  ];
}

/**
 * The intake's lines (019, 024), one per entrance west to east: its ammo (the tube emblem when empty) and its
 * count out of the cap, or the cap emblem and "capped" while it's shut.
 */
export function intakeLines(entrances: readonly EntranceState[], cap: number): Line[] {
  return entrances.map((e): Line => {
    if (!e.open) return [INTAKE_CAP_ICON, CAPPED_LABEL];
    const icon = e.ammoId ? itemDef(ammoDef(e.ammoId).itemId).icon : INTAKE_EMPTY_ICON;
    return [icon, `${e.count}/${cap}`];
  });
}

/** The readout for any piece: machines have one; other pieces show nothing. */
export function pieceLines(p: PieceState): Line[] {
  return p.kind === 'machine' ? machineLines(p) : [];
}
