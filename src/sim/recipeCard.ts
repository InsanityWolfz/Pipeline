import { TICK_RATE } from '../data/config';
import { pieceDef, machineDef } from '../data/pieces';
import { recipeDef, type RecipeDef } from '../data/recipes';
import { STAGE_RECIPES } from '../data/stages';
import { statusRecipe } from './flow';
import type { MachineState } from './pieces';
import { craftTicksAt } from './research';

// 069: a machine's recipe card, its numbers from the sim so render only words them ("1 wood → 2 shafts · 1.0 s"): what
// a craft takes and makes, its craft time with machine-speed applied (033), and how many it makes a minute at that pace.
// A placed machine's card is the recipe its status reads (062: for a tiered machine the variant it's running now, for a
// stage the round it's working on), and says whether it's running; a piece on the build bar shows its own recipe (a
// stage's on its plain round).

export interface RecipeCard {
  inputs: { itemId: string; count: number }[];
  output: { itemId: string; count: number };
  /** A craft's time, seconds. */
  seconds: number;
  /** Items made a minute while it runs flat out. */
  perMinute: number;
}

/** A placed machine's card, and whether it's running (its status is working). */
export interface MachineCard extends RecipeCard {
  running: boolean;
}

/** The card of a recipe run by a machine piece at a speed multiplier (033's machine-speed). */
export function recipeCard(recipe: RecipeDef, pieceId: string, speed: number): RecipeCard {
  const ticks = craftTicksAt(pieceId, speed);
  return {
    inputs: Object.entries(recipe.inputs).map(([itemId, count]) => ({ itemId, count })),
    output: { ...recipe.output },
    seconds: ticks / TICK_RATE,
    perMinute: (recipe.output.count * 60 * TICK_RATE) / ticks,
  };
}

/** A build-bar piece's card: a machine's own recipe (a stage's on its plain round); null for any other piece. */
export function pieceCard(pieceId: string, speed: number): RecipeCard | null {
  const def = pieceDef(pieceId);
  if (def.kind !== 'machine') return null;
  const recipe = def.stage !== undefined ? STAGE_RECIPES[def.stage] : recipeDef(machineDef(pieceId).recipeId);
  return recipe ? recipeCard(recipe, pieceId, speed) : null;
}

/** A placed machine's card: the recipe its status and hover read, and whether it's running. */
export function machineCard(m: MachineState, speed: number): MachineCard {
  return { ...recipeCard(statusRecipe(m), m.pieceId, speed), running: m.status === 'working' };
}
