import type { GateId } from './rooms';

// The tutorial's objectives (012), in the prototype's beat order. Each completes
// once, in any order; the line shows the first unfinished one. Wording is a first
// draft for Shaun to edit. `check` is evaluated by src/sim/objectives.ts.

export type ObjectiveCheck =
  | { kind: 'hasTube' }
  /** Each of these raws harvested at least once. */
  | { kind: 'gathered'; items: readonly string[] }
  /** Each of these items hand-crafted at least once. */
  | { kind: 'crafted'; items: readonly string[] }
  | { kind: 'gate'; gate: GateId }
  | { kind: 'inRoom'; room: string }
  /** A line feeds the foundry intake (019): a piece's front is one of its mouth tiles. */
  | { kind: 'intakeFed' }
  /** An intake entrance has filled from a line at least once. */
  | { kind: 'lineFull' }
  | { kind: 'identified' }
  | { kind: 'claimed'; site: string }
  /** The intake's side entrances are open (024). */
  | { kind: 'sidesOpen' }
  /** The volley the next press would fire has at least this many rounds (024). */
  | { kind: 'volley'; min: number }
  /** This long outside the foundry with a line built into the intake. */
  | { kind: 'awayRunning'; ticks: number };

/** Which key a goal's prompt shows, and what it floats over (see PromptView). */
export type PromptTarget = 'tubeStone' | 'node' | 'bench' | 'pylon' | 'hopper' | 'player';

export interface ObjectiveDef {
  text: string;
  check: ObjectiveCheck;
  prompt?: { key: 'E' | 'C' | 'B'; over: PromptTarget };
}

export const OBJECTIVES: readonly ObjectiveDef[] = [
  { text: 'Pick up the tube (E)', check: { kind: 'hasTube' }, prompt: { key: 'E', over: 'tubeStone' } },
  {
    text: 'Gather wood, stone and fiber (E)',
    check: { kind: 'gathered', items: ['wood', 'stone', 'fiber'] },
    prompt: { key: 'E', over: 'node' },
  },
  { text: 'Craft arrows (C)', check: { kind: 'crafted', items: ['arrow'] }, prompt: { key: 'C', over: 'player' } },
  { text: 'Clear the ruin field of Husks', check: { kind: 'gate', gate: 'foundry' } },
  { text: 'Enter the foundry', check: { kind: 'inRoom', room: 'foundry' } },
  { text: 'Craft a bomb and a ley bolt (C)', check: { kind: 'crafted', items: ['bomb', 'ley-bolt'] }, prompt: { key: 'C', over: 'player' } },
  { text: 'Build an ammo line into the intake (B)', check: { kind: 'intakeFed' }, prompt: { key: 'B', over: 'player' } },
  { text: 'Fill the tube from your line', check: { kind: 'lineFull' }, prompt: { key: 'E', over: 'hopper' } },
  { text: 'Identify your armor at the bench (E)', check: { kind: 'identified' }, prompt: { key: 'E', over: 'bench' } },
  { text: "Claim the shrine's pylon", check: { kind: 'claimed', site: 'shrine' }, prompt: { key: 'E', over: 'pylon' } },
  // The prototype's one Warden drops one core, and opening the side entrances costs one.
  { text: "Open the intake's side entrances (E with a warden core)", check: { kind: 'sidesOpen' } },
  { text: 'Feed two entrances to fire a spread', check: { kind: 'volley', min: 2 } },
  { text: 'Head back out — the foundry keeps running', check: { kind: 'awayRunning', ticks: 600 } },
];

/**
 * The intake's own prompt (024), shown in the foundry while a warden core is carried and the side entrances are
 * capped: the key on its cap and the text beside it, dimmed until the player is in reach.
 */
export const INTAKE_PROMPT = { key: 'E', text: 'open the side entrances' } as const;

/** A prompt shows (dimmed) while what it floats over is this close to the player, px; at full strength once it can be used. */
export const PROMPT_RANGE = 64;

/** How close the player's feet box must be to the tube stone to take the tube, px. */
export const STONE_REACH = 20;
