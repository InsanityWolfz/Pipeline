import { OBJECTIVES, type ObjectiveCheck } from '../data/objectives';
import { RECIPES, type RecipeDef } from '../data/recipes';
import { STAGE_ROWS } from '../data/stages';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';

// The objective's sub-steps (051, B.3): under a craft goal, an indented line for each raw its crafts still lack
// ("Collect stone"), shown only once the player has lacked it while the goal is current, and ticked off once gathered.
// What's lacking is the recipe tree less what's carried: parts already made count, and a part two crafts share (ley
// dust, for a bomb and a ley bolt) is counted once.

/** The sub-steps remembered for a goal: its index, and the raws it has lacked, in the order first lacked. */
export interface SubStepState {
  goal: number;
  items: string[];
}

export const createSubSteps = (): SubStepState => ({ goal: -1, items: [] });

/** Every recipe by what it makes: the hand recipes, then the tagged rounds' rows (047). */
const BY_OUTPUT: ReadonlyMap<string, RecipeDef> = new Map(
  [...Object.values(RECIPES), ...STAGE_ROWS.map((r) => r.recipe)].reverse().map((r) => [r.output.itemId, r] as const),
);

/** How deep an item sits in the recipe tree: a raw is 0, a craft one more than its deepest input. */
function depth(itemId: string, seen: readonly string[] = []): number {
  const r = BY_OUTPUT.get(itemId);
  if (!r || seen.includes(itemId)) return 0;
  return 1 + Math.max(0, ...Object.keys(r.inputs).map((i) => depth(i, [...seen, itemId])));
}

/** The raws crafting each of `items` once needs that `inventory` doesn't hold, in recipe input order. */
export function lackingRaws(inventory: Inventory, items: readonly string[]): string[] {
  const need = new Map<string, number>();
  const add = (itemId: string, n: number): void => void need.set(itemId, (need.get(itemId) ?? 0) + n);
  for (const item of items) for (const [i, n] of Object.entries(BY_OUTPUT.get(item)?.inputs ?? {})) add(i, n);
  // Deepest first, so a shared part's whole demand is known before it's broken down.
  const order: string[] = [];
  for (let pending = [...need.keys()]; pending.length > 0; ) {
    pending.sort((a, b) => depth(b) - depth(a));
    const item = pending.shift();
    if (item === undefined) break;
    order.push(item);
    const r = BY_OUTPUT.get(item);
    const short = (need.get(item) ?? 0) - count(inventory, item);
    if (!r || short <= 0) continue;
    const crafts = Math.ceil(short / r.output.count);
    for (const [i, n] of Object.entries(r.inputs)) {
      if (!need.has(i)) pending.push(i);
      add(i, n * crafts);
    }
  }
  return order.filter((item) => !BY_OUTPUT.has(item) && count(inventory, item) < (need.get(item) ?? 0));
}

/** The raws a craft goal's check still lacks: its uncrafted items' (the option lacking fewest, for `craftedAny`). */
export function goalLacks(state: Pick<SimState, 'inventory' | 'crafted'>, check: ObjectiveCheck): string[] {
  if (check.kind === 'crafted') return lackingRaws(state.inventory, check.items.filter((i) => !state.crafted.includes(i)));
  if (check.kind !== 'craftedAny' || check.items.some((i) => state.crafted.includes(i))) return [];
  return check.items.map((i) => lackingRaws(state.inventory, [i])).sort((a, b) => a.length - b.length)[0] ?? [];
}

/** Once a tick, after the goals: notes the raws the current goal lacks (a new goal starts afresh). */
export function noteSubSteps(state: SimState, goal: number | null): void {
  const def = goal === null ? undefined : OBJECTIVES[goal];
  if (goal === null || !def?.subSteps) {
    if (state.subSteps.goal !== -1) state.subSteps = createSubSteps();
    return;
  }
  if (state.subSteps.goal !== goal) state.subSteps = { goal, items: [] };
  for (const item of goalLacks(state, def.check)) if (!state.subSteps.items.includes(item)) state.subSteps.items.push(item);
}

/** The current goal's sub-lines: each raw it has lacked, done once it no longer lacks it. */
export function subStepLines(state: SimState, goal: number | null): { itemId: string; done: boolean }[] {
  const def = goal === null ? undefined : OBJECTIVES[goal];
  if (!def?.subSteps || state.subSteps.goal !== goal) return [];
  const lacks = goalLacks(state, def.check);
  return state.subSteps.items.map((itemId) => ({ itemId, done: !lacks.includes(itemId) }));
}
