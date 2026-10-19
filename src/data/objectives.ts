import type { GateId } from './rooms';

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
  /**
   * A line feeds the foundry intake (019): a piece's front is one of its mouth tiles. With an `item` (027), that
   * item must also be arriving: going into an entrance this tick.
   */
  | { kind: 'intakeFed'; item?: string }
  /** A piece of this id stands in the foundry (027). */
  | { kind: 'placed'; piece: string }
  /** Some hopper holds this item (027). */
  | { kind: 'hopperHolds'; item: string }
  /** Machines have made at least one of this item (027); hand-crafting never counts. */
  | { kind: 'machineMade'; item: string }
  /** An intake entrance has filled from a line at least once. */
  | { kind: 'lineFull' }
  | { kind: 'identified' }
  | { kind: 'claimed'; site: string }
  /** A research node is restored (033). */
  | { kind: 'restored'; node: string }
  /** The volley the next press would fire has at least this many rounds (024). */
  | { kind: 'volley'; min: number }
  /** This long outside the foundry with a line built into the intake, once every goal before it is done. */
  | { kind: 'awayRunning'; ticks: number }
  /** A piece has taken an item from a supply port (028). */
  | { kind: 'portDelivered' }
  /** The volley holds at least two different ammo (028). */
  | { kind: 'mixedVolley' }
  /** At least this many pylons claimed (032). */
  | { kind: 'claimedCount'; min: number }
  /** The player stands in this region (034: Region 2, Stonefall Hollows, reached once its barrier is down). */
  | { kind: 'inRegion'; region: number }
  /** A region boss has been killed at least once (034). */
  | { kind: 'bossDefeated'; boss: string };

/** Which key a goal's prompt shows, and what it floats over (see PromptView). */
export type PromptTarget = 'tubeStone' | 'node' | 'bench' | 'pylon' | 'hopper' | 'newestHopper' | 'player';

/**
 * What an arrow marker floats over: the intake, where a line ends (027), the supply ports (028), or the nearest
 * discovered resource-site pylon not yet claimed (032).
 */
export type MarkerTarget = 'intake' | 'ports' | 'sitePylon';

/** Which milestone a goal belongs to (028): the prototype's, or Milestone 1's. */
export type Milestone = 'prototype' | 'm1';

export interface ObjectiveDef {
  text: string;
  milestone: Milestone;
  check: ObjectiveCheck;
  prompt?: { key: 'E' | 'C' | 'B'; over: PromptTarget };
  /** An arrow marker over the thing to build toward (027), shown anywhere in its room, beside any key prompt. */
  marker?: MarkerTarget;
  /** The piece whose build-bar cell pulses while the bar is open (027). */
  highlight?: string;
}

export const OBJECTIVES: readonly ObjectiveDef[] = [
  { text: 'Pick up the tube (E)', milestone: 'prototype', check: { kind: 'hasTube' }, prompt: { key: 'E', over: 'tubeStone' } },
  {
    text: 'Gather wood, stone and fiber (E)',
    milestone: 'prototype',
    check: { kind: 'gathered', items: ['wood', 'stone', 'fiber'] },
    prompt: { key: 'E', over: 'node' },
  },
  { text: 'Craft arrows (C)', milestone: 'prototype', check: { kind: 'crafted', items: ['arrow'] }, prompt: { key: 'C', over: 'player' } },
  { text: 'Clear the ruin field of Husks', milestone: 'prototype', check: { kind: 'gate', gate: 'foundry' } },
  { text: 'Enter the foundry', milestone: 'prototype', check: { kind: 'inRoom', room: 'foundry' } },
  { text: 'Craft a bomb and a ley bolt (C)', milestone: 'prototype', check: { kind: 'crafted', items: ['bomb', 'ley-bolt'] }, prompt: { key: 'C', over: 'player' } },
  // 027: the first line, an arrow line, a step at a time (Shaun chose arrows). Each names the piece to pulse on the build bar.
  { text: 'Press B and place a hopper', milestone: 'prototype', check: { kind: 'placed', piece: 'hopper' }, prompt: { key: 'B', over: 'player' }, highlight: 'hopper' },
  {
    text: 'Put wood in the hopper (E)',
    milestone: 'prototype',
    check: { kind: 'hopperHolds', item: 'wood' },
    prompt: { key: 'E', over: 'newestHopper' },
    highlight: 'hopper',
  },
  {
    text: 'Place a cutter in front of the hopper',
    milestone: 'prototype',
    check: { kind: 'machineMade', item: 'shaft' },
    prompt: { key: 'B', over: 'player' },
    highlight: 'cutter',
  },
  {
    text: 'Make arrowheads: hopper of stone → knapper',
    milestone: 'prototype',
    check: { kind: 'machineMade', item: 'arrowhead' },
    prompt: { key: 'B', over: 'player' },
    highlight: 'knapper',
  },
  {
    text: 'Make rope: hopper of fiber → spinner',
    milestone: 'prototype',
    check: { kind: 'machineMade', item: 'rope' },
    prompt: { key: 'B', over: 'player' },
    highlight: 'spinner',
  },
  {
    text: 'Feed all three into an assembler',
    milestone: 'prototype',
    check: { kind: 'machineMade', item: 'arrow' },
    prompt: { key: 'B', over: 'player' },
    highlight: 'assembler',
  },
  {
    text: 'Run a conduit from the assembler into the intake',
    milestone: 'prototype',
    check: { kind: 'intakeFed', item: 'arrow' },
    prompt: { key: 'B', over: 'player' },
    marker: 'intake',
    highlight: 'conduit',
  },
  { text: 'Fill the tube from your line', milestone: 'prototype', check: { kind: 'lineFull' }, prompt: { key: 'E', over: 'hopper' } },
  { text: 'Identify your armor at the bench (E)', milestone: 'prototype', check: { kind: 'identified' }, prompt: { key: 'E', over: 'bench' } },
  { text: "Claim the shrine's pylon", milestone: 'prototype', check: { kind: 'claimed', site: 'shrine' }, prompt: { key: 'E', over: 'pylon' } },
  // The prototype's one Warden drops one core, and restoring a second entrance costs one (033: one entrance per core).
  { text: 'Restore a second intake entrance (E at a cap with the warden core)', milestone: 'prototype', check: { kind: 'restored', node: 'entrance-2' } },
  { text: 'Feed two entrances to fire a spread', milestone: 'prototype', check: { kind: 'volley', min: 2 } },
  { text: 'Head back out — the foundry keeps running', milestone: 'prototype', check: { kind: 'awayRunning', ticks: 600 } },
  // 028: Milestone 1's goals, after the shrine. Later specs append theirs.
  { text: 'Run a supply port into your line', milestone: 'm1', check: { kind: 'portDelivered' }, marker: 'ports', highlight: 'conduit' },
  { text: 'Put a second kind of ammo in another entrance', milestone: 'm1', check: { kind: 'mixedVolley' } },
  // 029: the first stage, frost on arrows, from the Grotto's rime to a frost rune in the line; then a ley stage by hand.
  { text: 'Gather rimestone at the Frozen Grotto', milestone: 'm1', check: { kind: 'gathered', items: ['rimestone'] } },
  { text: 'Apply a frost rune to arrows at the bench', milestone: 'm1', check: { kind: 'crafted', items: ['arrow+frost'] } },
  { text: 'Build a frost rune into your arrow line', milestone: 'm1', check: { kind: 'machineMade', item: 'arrow+frost' }, highlight: 'frost-rune' },
  { text: 'Try a ley stage at the bench: homing or split', milestone: 'm1', check: { kind: 'craftedAny', items: ['ley-bolt+homing', 'ley-bolt+split'] } },
  // 032: a resource site's pylon, marked once one is discovered.
  { text: 'Claim a second pylon', milestone: 'm1', check: { kind: 'claimedCount', min: 2 }, marker: 'sitePylon' },
  // 034: Region 2, behind the barrier the shrine's claim drops: in, its pylon, its boss, and the entrance its core restores.
  { text: 'Breach Stonefall Hollows', milestone: 'm1', check: { kind: 'inRegion', region: 2 } },
  { text: "Claim the Cistern Terrace's pylon", milestone: 'm1', check: { kind: 'claimed', site: 'cistern-terrace' } },
  { text: 'Defeat the Bulwark', milestone: 'm1', check: { kind: 'bossDefeated', boss: 'bulwark' } },
  { text: "Restore the intake's third entrance (E with the Bulwark core)", milestone: 'm1', check: { kind: 'restored', node: 'entrance-3' } },
  // 033: the third entrance needs the Bulwark's core, so feeding all three comes after restoring it, just before the frontier line.
  { text: 'Feed all three entrances', milestone: 'm1', check: { kind: 'volley', min: 3 } },
];

/** The standing line once every goal is done (028): no check, and it never names the next milestone. */
export const FRONTIER_GOAL = { text: 'Explore beyond the shrine' } as const;

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
