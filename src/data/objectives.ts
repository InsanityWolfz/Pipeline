import type { GateId } from './rooms';
import type { TargetDef } from './targets';
import { GROTTO_GROUP } from './grotto';
import type { GuidedId } from './guidedBuilds';
import { ROUNDS, roundTags } from './tags';

// The objectives: one ordered chain (028). The prototype's goals (012) run first,
// in its beat order, then each milestone's, tagged by milestone; later specs append
// their own. Each completes once, in any order; the line shows the first unfinished
// one, and the frontier goal once all are done. Wording is Shaun's to edit.
// `check` is evaluated by src/sim/objectives.ts.

export type ObjectiveCheck =
  | { kind: 'hasTube' }
  /** Each of these raws harvested at least once. */
  | { kind: 'gathered'; items: readonly string[] }
  /** Each of these items hand-crafted at least once. */
  | { kind: 'crafted'; items: readonly string[] }
  /** Any one of these items hand-crafted at least once (029). */
  | { kind: 'craftedAny'; items: readonly string[] }
  | { kind: 'gate'; gate: GateId }
  | { kind: 'inRoom'; room: string }
  /** 058: the player is anywhere but the foundry. */
  | { kind: 'outside' }
  /** 046: since the lines ran dry, each of these items has been put in a hopper by hand. */
  | { kind: 'refilled'; items: readonly string[] }
  /** 050: the entrance this research node opened holds ammo (058: of this kind, when given). */
  | { kind: 'entranceFed'; node: string; ammo?: string }
  /** Machines have made at least one of this item (027); hand-crafting never counts. */
  | { kind: 'machineMade'; item: string }
  /** An intake entrance has filled from a line at least once. */
  | { kind: 'lineFull' }
  | { kind: 'identified' }
  /** 058: a piece of gear is worn. */
  | { kind: 'equipped' }
  /** 058: the player has fast-travelled home from a pylon. */
  | { kind: 'travelled' }
  /** 058: a talent has been taken. */
  | { kind: 'talentSpent' }
  | { kind: 'claimed'; site: string }
  /** A research node is restored (033). */
  | { kind: 'restored'; node: string }
  /** The volley the next press would fire has at least this many rounds (024). */
  | { kind: 'volley'; min: number }
  /** The player stands in this region (034: Region 2, Stonefall Hollows, reached once its barrier is down). */
  | { kind: 'inRegion'; region: number }
  /** A region boss has been killed at least once (034). */
  | { kind: 'bossDefeated'; boss: string };

/** Which key a goal's prompt shows, and what it floats over (see PromptView). */
export type PromptTarget = 'tubeStone' | 'node' | 'bench' | 'pylon' | 'hopper' | 'player';

/** Which milestone a goal belongs to (028): the prototype's, Milestone 1's, or (060) Milestone 2's: Region 3. */
export type Milestone = 'prototype' | 'm1' | 'm2';

export interface ObjectiveDef {
  text: string;
  milestone: Milestone;
  check: ObjectiveCheck;
  prompt?: { key: 'E' | 'C' | 'B'; over: PromptTarget };
  /**
   * 051 (B.1): what the waypoint arrow points at (src/data/targets.ts). It replaces 027's marker: an arrow at the
   * screen's edge while it's off screen, over it while it's on screen, always on. None for a goal done anywhere.
   */
  target?: TargetDef;
  /** 051 (B.3): indented sub-lines under the goal, one per raw its crafts still lack, each ticking off once gathered. */
  subSteps?: 'collect';
  /** 058: a goal built piece by piece on ghosts (src/data/guidedBuilds.ts), with a sub-line for the next piece. */
  guided?: GuidedId;
  /** 058: completes only once every goal before it is done (leaving the foundry would hold from the start; a fast travel could come early). */
  inOrder?: true;
  /** 058: done unseen (skipped) if the lines haven't run dry by the tick the goal of this check completes. */
  skipUnlessDryAfter?: ObjectiveCheck['kind'];
  /**
   * 058: not in the chain's order: the current goal whenever its trigger holds (the first talent point) and it isn't
   * done, unless a guided build is current (058.4). The chain picks up where it was once it's done.
   */
  cutIn?: true;
}

/** 060: every Fire round (each family's), any of which the fire-round goal takes. */
export const FIRE_ROUNDS: readonly string[] = ROUNDS.filter((r) => roundTags(r).includes('fire'));

/** 050: the research node whose entrance the second-line goal asks to feed, and its marker points at: the Warden core's. */
export const NEW_ENTRANCE_NODE = 'entrance-2';

export const OBJECTIVES: readonly ObjectiveDef[] = [
  { text: 'Pick up the tube (E)', milestone: 'prototype', check: { kind: 'hasTube' }, prompt: { key: 'E', over: 'tubeStone' }, target: { kind: 'tubeStone' } },
  {
    text: 'Gather wood, stone and fiber (E)',
    milestone: 'prototype',
    check: { kind: 'gathered', items: ['wood', 'stone', 'fiber'] },
    prompt: { key: 'E', over: 'node' },
    target: { kind: 'nodes' },
  },
  { text: 'Craft arrows (C)', milestone: 'prototype', check: { kind: 'crafted', items: ['arrow'] }, prompt: { key: 'C', over: 'player' }, target: { kind: 'collect' } },
  { text: 'Clear the ruin field of Husks', milestone: 'prototype', check: { kind: 'gate', gate: 'foundry' }, target: { kind: 'pack', group: 'field' } },
  // 051 (B.3, Shaun): bombs and ley bolts are crafted before the foundry, with a sub-line for each raw still lacking.
  {
    text: 'Craft bombs and ley bolts (C)',
    milestone: 'prototype',
    check: { kind: 'crafted', items: ['bomb', 'ley-bolt'] },
    prompt: { key: 'C', over: 'player' },
    target: { kind: 'collect' },
    subSteps: 'collect',
  },
  { text: 'Enter the foundry', milestone: 'prototype', check: { kind: 'inRoom', room: 'foundry' }, target: { kind: 'room', room: 'foundry' } },
  // 046: the example line stands from the first entry and fills the tube on its own (058, Shaun: just wait for it).
  { text: 'Wait for the tube to fill with arrows', milestone: 'prototype', check: { kind: 'lineFull' }, target: { kind: 'intake' } },
  { text: 'Identify your armor at the bench (E)', milestone: 'prototype', check: { kind: 'identified' }, prompt: { key: 'E', over: 'bench' }, target: { kind: 'bench' } },
  // 058: wear a piece, with arrows in the bench's screen on what to click.
  { text: 'Equip a piece of armor at the bench (E)', milestone: 'prototype', check: { kind: 'equipped' }, prompt: { key: 'E', over: 'bench' }, target: { kind: 'bench' } },
  { text: "Claim the shrine's pylon", milestone: 'prototype', check: { kind: 'claimed', site: 'shrine' }, prompt: { key: 'E', over: 'pylon' }, target: { kind: 'pylon', site: 'shrine' } },
  // 058: the waypoints, taught from the first pylon.
  {
    text: 'Fast-travel to the foundry from the pylon (E)',
    milestone: 'prototype',
    check: { kind: 'travelled' },
    // In order, so the refill's skip below is decided when this is the current goal, not by an earlier fast travel.
    inOrder: true,
    prompt: { key: 'E', over: 'pylon' },
    target: { kind: 'pylon', site: 'shrine', claimed: true },
  },
  // 046: once the example line has run dry, refill its hoppers; 058: only if it's dry when the fast travel lands.
  {
    text: 'Refill the hoppers in the foundry with wood, stone and fiber (E)',
    milestone: 'prototype',
    check: { kind: 'refilled', items: ['wood', 'stone', 'fiber'] },
    skipUnlessDryAfter: 'travelled',
    prompt: { key: 'E', over: 'hopper' },
    target: { kind: 'hoppers', unfilled: true },
  },
  // The prototype's one Warden drops one core (033: one entrance per core); 058.5: during the tutorial it fits the right cap only.
  { text: 'Restore the right intake entrance (E with the warden core)', milestone: 'prototype', check: { kind: 'restored', node: NEW_ENTRANCE_NODE }, target: { kind: 'caps' } },
  // 058: built piece by piece on ghosts (src/data/guidedBuilds.ts).
  {
    text: 'Put ley bolts into the second entrance (B)',
    milestone: 'prototype',
    check: { kind: 'entranceFed', node: NEW_ENTRANCE_NODE, ammo: 'ley-bolt' },
    prompt: { key: 'B', over: 'player' },
    target: { kind: 'ghost' },
    guided: 'ley-line',
  },
  { text: 'Leave the foundry', milestone: 'prototype', check: { kind: 'outside' }, inOrder: true, target: { kind: 'room', room: 'overworld' } },
  // 029: the first stage, frost on arrows, from the Grotto's rime to a frost rune in the line. 055: the Grotto's pylon.
  { text: 'Gather rimestone at the Frozen Grotto', milestone: 'm1', check: { kind: 'gathered', items: ['rimestone'] }, target: { kind: 'nodes' } },
  { text: "Claim the Frozen Grotto's pylon", milestone: 'm1', check: { kind: 'claimed', site: GROTTO_GROUP }, prompt: { key: 'E', over: 'pylon' }, target: { kind: 'pylon', site: GROTTO_GROUP } },
  // 047: tagged rounds are crafted in the crafting menu (C), anywhere, and never called stages where the player sees.
  { text: 'Craft frost arrows (C)', milestone: 'm1', check: { kind: 'crafted', items: ['arrow+frost'] }, target: { kind: 'collect' } },
  // 058: guided like the ley line; building opens fully once it's done (LOCK_UNTIL).
  { text: 'Build a frost rune into your arrow line', milestone: 'm1', check: { kind: 'machineMade', item: 'arrow+frost' }, target: { kind: 'ghost' }, guided: 'frost-line' },
  // 049.2: no lock on ring 2; after the Warden the goal line points to the Husk Hive, whose pylon supplies resin.
  { text: 'Find the Husk Hive and claim its pylon', milestone: 'm1', check: { kind: 'claimed', site: 'husk-hive' }, target: { kind: 'pylon', site: 'husk-hive' } },
  // 034: Region 2, behind the barrier the shrine's claim drops: in, its pylon, its boss, and the entrance its core restores.
  { text: 'Reach Stonefall Hollows', milestone: 'm1', check: { kind: 'inRegion', region: 2 }, target: { kind: 'barrier' } },
  { text: "Claim the Cistern Terrace's pylon", milestone: 'm1', check: { kind: 'claimed', site: 'cistern-terrace' }, target: { kind: 'pylon', site: 'cistern-terrace' } },
  { text: 'Defeat the Bulwark', milestone: 'm1', check: { kind: 'bossDefeated', boss: 'bulwark' }, target: { kind: 'boss', boss: 'bulwark' } },
  { text: "Restore the intake's third entrance (E with the Bulwark core)", milestone: 'm1', check: { kind: 'restored', node: 'entrance-3' }, target: { kind: 'caps' } },
  // 033: the third entrance needs the Bulwark's core, so feeding all three comes after restoring it. 058: the tutorial ends here.
  { text: 'Feed all three entrances', milestone: 'm1', check: { kind: 'volley', min: 3 }, target: { kind: 'intake' } },
  // 060: Region 3, up the ramps the Bulwark's kill opens: in, cinderite, the Ash Kilns, fire, its boss, the fourth entrance.
  { text: 'Reach the Emberworks', milestone: 'm2', check: { kind: 'inRegion', region: 3 }, target: { kind: 'ramps' } },
  { text: 'Gather cinderite at the Cinder Vents', milestone: 'm2', check: { kind: 'gathered', items: ['cinderite'] }, target: { kind: 'nodes' } },
  { text: "Claim the Ash Kilns' pylon", milestone: 'm2', check: { kind: 'claimed', site: 'ash-kilns' }, prompt: { key: 'E', over: 'pylon' }, target: { kind: 'pylon', site: 'ash-kilns' } },
  { text: 'Craft a fire round (C)', milestone: 'm2', check: { kind: 'craftedAny', items: FIRE_ROUNDS }, target: { kind: 'collect' } },
  { text: 'Defeat the Forgewright', milestone: 'm2', check: { kind: 'bossDefeated', boss: 'forgewright' }, target: { kind: 'boss', boss: 'forgewright' } },
  { text: "Restore the intake's fourth entrance (E with the Forgewright core)", milestone: 'm2', check: { kind: 'restored', node: 'entrance-4' }, target: { kind: 'caps' } },
  { text: 'Feed all four entrances', milestone: 'm2', check: { kind: 'volley', min: 4 }, target: { kind: 'intake' } },
  // 058: cuts in as the current goal once the first talent point comes (058.4: never during a guided build).
  { text: 'Press T to spend a talent point', milestone: 'm1', check: { kind: 'talentSpent' }, cutIn: true },
];

/** 051 (B.3): a sub-line's words, from the raw's name ("Collect stone"). */
export const SUB_STEP_TEXT = (name: string): string => `Collect ${name.toLowerCase()}`;

/**
 * The intake's own prompt (024, 033), shown in the foundry while the next entrance node's cost is carried (a warden
 * core, for the second): the key on its cap and the text beside it, dimmed until the player is in reach.
 */
export const RESTORE_ENTRANCE_PROMPT = { key: 'E', text: 'restore an entrance' } as const;

/** The intake's hover readout line for a capped entrance (024), beside the cap emblem. */
export const CAPPED_LABEL = 'capped';

/** A prompt shows (dimmed) while what it floats over is this close to the player, px; at full strength once it can be used. */
export const PROMPT_RANGE = 64;

/** How close the player's feet box must be to the tube stone to take the tube, px. */
export const STONE_REACH = 20;
