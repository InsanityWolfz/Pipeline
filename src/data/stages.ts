import type { RecipeDef } from './recipes';
import { tagDef, withTag } from './tags';

// Stage machines (029): each takes finished rounds of its tag's base ammo plus a
// little material, and hands them out of its front with its tag added. A stage is
// a 1×1 machine in its base ammo's build bar group, unlocked by hand-applying it
// once at the bench. Starting values from spec 029; tune in playtest.

export interface StageDef {
  id: string;
  name: string;
  /** A line or two for the build bar's hover panel. */
  description: string;
  /** The tag it adds. */
  tag: string;
  /** Rounds per craft. */
  batch: number;
  /** The material it takes per batch, and how many. */
  material: string;
  materialCount: number;
  craftTicks: number;
}

const stage = (id: string, name: string, tag: string, material: string, materialCount: number, description: string): StageDef => ({
  id,
  name,
  description,
  tag,
  batch: 4,
  material,
  materialCount,
  craftTicks: 60,
});

export const STAGES: Readonly<Record<string, StageDef>> = {
  'frost-rune': stage('frost-rune', 'Frost rune', 'frost', 'rime-shard', 1, 'Frosts arrows: 4 arrows and a rime shard.'),
  'ley-guide': stage('ley-guide', 'Ley guide', 'homing', 'ley-crystal', 1, 'Makes ley bolts home: 4 bolts, 1 ley crystal.'),
  // Twice the guide's crystal: a star bolt adds five projectiles (pillar 3).
  'shatter-lens': stage('shatter-lens', 'Shatter lens', 'star', 'ley-crystal', 2, 'Makes ley bolts burst: 4 bolts, 2 ley crystals.'),
  // 038: 1 ley-iron per 4 bombs (round 2).
  'shard-die': stage('shard-die', 'Shard die', 'cluster', 'ley-iron', 1, 'Makes bombs burst into bomblets: 4 bombs, 1 ley-iron.'),
};

export function stageDef(id: string): StageDef {
  const def = STAGES[id];
  if (!def) throw new Error(`Unknown stage '${id}'`);
  return def;
}

/** The base ammo a stage's rounds are. */
export const stageBase = (s: StageDef): string => tagDef(s.tag).appliesTo;

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

/** Each stage's recipe on its plain base, by stage id: the bench's hand-apply rows, and what a stage machine runs by default. */
export const STAGE_RECIPES: Readonly<Record<string, RecipeDef>> = Object.fromEntries(Object.values(STAGES).map((s) => [s.id, plainRecipe(s)]));
