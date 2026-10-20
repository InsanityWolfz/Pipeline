import type { RuleLine } from './lines';
import type { RecipeDef } from './recipes';
import { tagDef, withTag } from './tags';

// Stage machines (029): each takes finished rounds of its tag's base ammo plus a
// little material, and hands them out of its front with its tag added. A stage is
// a 1×1 machine in its base ammo's build bar group, unlocked by crafting one of its
// tagged rounds by hand (047: in the crafting menu). Starting values from spec 029; tune in playtest.

export interface StageDef {
  id: string;
  name: string;
  /** The tag it adds. */
  tag: string;
  /** Rounds per craft. */
  batch: number;
  /** The material it takes per batch, and how many. */
  material: string;
  materialCount: number;
  craftTicks: number;
}

const stage = (id: string, name: string, tag: string, material: string, materialCount: number): StageDef => ({
  id,
  name,
  tag,
  batch: 4,
  material,
  materialCount,
  craftTicks: 60,
});

export const STAGES: Readonly<Record<string, StageDef>> = {
  'frost-rune': stage('frost-rune', 'Frost rune', 'frost', 'rimestone', 1),
  'ley-guide': stage('ley-guide', 'Ley guide', 'homing', 'ley-crystal', 1),
  // Twice the guide's crystal: a Split bolt adds five projectiles (pillar 3).
  'prism-lens': stage('prism-lens', 'Prism lens', 'split', 'ley-crystal', 2),
  // 038: 1 ley-iron per 4 bombs (round 2).
  'cluster-die': stage('cluster-die', 'Cluster die', 'cluster', 'ley-iron', 1),
};

export function stageDef(id: string): StageDef {
  const def = STAGES[id];
  if (!def) throw new Error(`Unknown stage '${id}'`);
  return def;
}

/** A stage's home family: the first base its tag takes (its build bar group and its machine's default round). */
export function stageBase(s: StageDef): string {
  const base = tagDef(s.tag).appliesTo[0];
  if (!base) throw new Error(`Stage '${s.id}' takes no ammo`);
  return base;
}

/** A stage's content line (039): its tag's keyword, added to the rounds its tag takes (rulesText words them). */
export const stageLines = (s: StageDef): RuleLine[] => [{ scope: tagDef(s.tag).keyword, rule: 'adds', params: {} }];

/** The recipe a stage runs on a round: a batch of it and its material, into the batch with the tag added. Null if the round can't take the tag. */
export function stageRecipeFor(s: StageDef, round: string): RecipeDef | null {
  const out = withTag(round, s.tag);
  if (out === null) return null;
  return { id: s.id, inputs: { [round]: s.batch, [s.material]: s.materialCount }, output: { itemId: out, count: s.batch } };
}

function plainRecipe(s: StageDef): RecipeDef {
  const r = stageRecipeFor(s, stageBase(s));
  if (!r) throw new Error(`Stage '${s.id}' can't tag its own base`);
  return r;
}

/** Each stage's recipe on its plain base, by stage id: what a stage machine runs by default. */
export const STAGE_RECIPES: Readonly<Record<string, RecipeDef>> = Object.fromEntries(Object.values(STAGES).map((s) => [s.id, plainRecipe(s)]));

/** A tagged round's crafting row (039.12; 047: in the crafting menu's family tab): one stage on one family its tag takes, its recipe on that family's plain round. */
export interface StageRow {
  /** `<stage>-<base>`: the crafting menu row's id, and its recipe's. */
  id: string;
  stage: string;
  base: string;
  recipe: RecipeDef;
}

/** The tagged rounds' crafting rows (047), in stage order and each stage's families in its tag's order: Frost rune × Arrow, Bomb, Ley bolt, Landmine, then one row each for the shapes. */
export const STAGE_ROWS: readonly StageRow[] = Object.values(STAGES).flatMap((s) =>
  tagDef(s.tag).appliesTo.map((base) => {
    const r = stageRecipeFor(s, base);
    if (!r) throw new Error(`Stage '${s.id}' can't tag '${base}'`);
    const id = `${s.id}-${base}`;
    return { id, stage: s.id, base, recipe: { ...r, id } };
  }),
);

/** A tagged round's crafting row by its id, or a stage's id for its home row (the build bar's family). */
export function stageRow(id: string): StageRow | undefined {
  const s = STAGES[id];
  return STAGE_ROWS.find((r) => r.id === id || (s !== undefined && r.stage === id && r.base === stageBase(s)));
}
