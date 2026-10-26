import { INTAKE_CAP_ICON, INTAKE_EMPTY_ICON } from '../data/foundryAssets';
import { ammoDef } from '../data/ammo';
import { CAPPED_LABEL } from '../data/objectives';
import { READOUT_TEXT } from '../data/descriptions';
import { trimNumber } from '../data/rulesText';
import type { EntranceRate } from '../sim/intakeRates';
import { INTAKE } from '../data/foundry';
import { RECIPES } from '../data/recipes';
import { itemDef } from '../data/items';
import { statusRecipe } from '../sim/flow';
import { count } from '../sim/inventory';
import type { EntranceState } from '../sim/link';
import type { MachineState, PieceState } from '../sim/pieces';

// What the hover readout (HoverReadout) shows over a machine or the intake, pure: its icon and text lines.

/** One readout line: an atlas frame for its icon, and the text beside it. */
export type Line = [frame: string, text: string];

/**
 * The most lines a readout needs: the largest recipe's inputs plus its output, or the intake's rows, one per entrance
 * (fix-playtest-ui: the fifth entrance's row was cut off when this counted recipes only).
 */
export const READOUT_MAX_LINES = Math.max(INTAKE.entrances.length, ...Object.values(RECIPES).map((r) => Object.keys(r.inputs).length + 1));

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

/** A rate as the readout shows it: one decimal, no trailing .0. */
const rate = (n: number): string => trimNumber(n, READOUT_TEXT.places);

/**
 * The intake's lines (019, 024), one per entrance west to east: its ammo (the tube emblem when empty) and its
 * count out of the cap, or the cap emblem and "capped" while it's shut. 069: with the sim's `rates`, an open entrance's
 * line goes on with its measured rate in and, holding a round, that round's fire rate.
 */
export function intakeLines(entrances: readonly EntranceState[], cap: number, rates: readonly EntranceRate[] = []): Line[] {
  return entrances.map((e, i): Line => {
    if (!e.open) return [INTAKE_CAP_ICON, CAPPED_LABEL];
    const icon = e.ammoId ? itemDef(ammoDef(e.ammoId).itemId).icon : INTAKE_EMPTY_ICON;
    const r = rates[i];
    const words = [`${e.count}/${cap}`, ...(r ? [READOUT_TEXT.inRate(rate(r.inPerSecond))] : []), ...(r?.firesPerSecond != null ? [READOUT_TEXT.fires(rate(r.firesPerSecond))] : [])];
    return [icon, words.join(READOUT_TEXT.sep)];
  });
}

/** The readout for any piece: machines have one; other pieces show nothing. */
export function pieceLines(p: PieceState): Line[] {
  return p.kind === 'machine' ? machineLines(p) : [];
}
