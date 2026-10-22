import { TILE_SIZE } from '../data/config';
import { ENTRANCE_CAPS, INTAKE } from '../data/foundry';
import { machineDef } from '../data/pieces';
import { FEET_BOX } from '../data/player';
import { MACHINE_SPEED_MULT, RESEARCH_NODES, RESEARCH_PIECES, RESEARCH_REACH, researchNode, type ResearchNode } from '../data/research';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { Rect } from './collision';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';
import { NEW_ENTRANCE_NODE } from '../data/objectives';
import { TUTORIAL_CAP } from '../data/guidedBuilds';
import { isGuidedGame } from './guided';

// Research as restoration (033). Each node is hidden, revealed (its diagram shows
// at its anchor) or restored (back for good, through a KO). The player restores a
// revealed node at its diagram, in the foundry once the tube is attuned, by paying
// its cost from what they carry. Each capped entrance shows the first entrance node
// not yet restored, so whichever cap is restored first costs the Warden core; the
// pipe shows the first reservoir node not yet restored. A diagram whose `requires`
// aren't restored is dimmed and can't be restored.

export type NodeState = 'hidden' | 'revealed' | 'restored';

/** Each node's state by id. */
export type ResearchState = Record<string, NodeState>;

/** At the start: nodes revealed from the start show; the rest wait on their schematic. */
export function createResearch(): ResearchState {
  return Object.fromEntries(RESEARCH_NODES.map((n) => [n.id, n.reveal === 'start' ? 'revealed' : 'hidden']));
}

type Research = Pick<SimState, 'research'>;

export const nodeState = (state: Research, id: string): NodeState => state.research[id] ?? 'hidden';
export const isRestored = (state: Research, id: string): boolean => nodeState(state, id) === 'restored';
export const requiresMet = (state: Research, node: ResearchNode): boolean => node.requires.every((r) => isRestored(state, r));
export const affordable = (inventory: Inventory, node: ResearchNode): boolean => Object.entries(node.cost).every(([itemId, n]) => count(inventory, itemId) >= n);

/** The highest restored reservoir tier, or 0 before any. */
export function reservoirTier(state: Research): number {
  return Math.max(0, ...RESEARCH_NODES.map((n) => (n.effect.kind === 'reservoir' && isRestored(state, n.id) ? n.effect.tier : 0)));
}

/** Every entrance's cap now: the highest restored reservoir tier's, else the first (30). */
export function entranceCap(state: Research): number {
  return ENTRANCE_CAPS[reservoirTier(state)] ?? ENTRANCE_CAPS[0] ?? 0;
}

/** A node is ready to restore at its diagram: revealed, its requires restored and its cost carried (never the sealed wing). */
export function nodeReady(state: Pick<SimState, 'research' | 'inventory'>, id: string): boolean {
  const node = researchNode(id);
  return nodeState(state, id) === 'revealed' && node.effect.kind !== 'wing' && requiresMet(state, node) && affordable(state.inventory, node);
}

/** The multiplier on every machine's craft time: MACHINE_SPEED_MULT once a machine-speed node is restored, else 1. */
export function machineSpeed(state: Research): number {
  return RESEARCH_NODES.some((n) => n.effect.kind === 'machineSpeed' && isRestored(state, n.id)) ? MACHINE_SPEED_MULT : 1;
}

/** A machine's craft time in ticks at a speed multiplier, rounded up to whole ticks. */
export const craftTicksAt = (pieceId: string, speed: number): number => Math.ceil(machineDef(pieceId).craftTicks * speed);

/** Pieces restoring unlocks that aren't restored yet: hidden from the build bar (026: locked pieces never show). */
export function lockedByResearch(state: Research): string[] {
  return RESEARCH_PIECES.filter((piece) => !RESEARCH_NODES.some((n) => n.effect.kind === 'unlockPiece' && n.effect.piece === piece && isRestored(state, n.id)));
}

/** A diagram drawn on the foundry: its node, where (a capped entrance's index, or null), its box, and whether it's dimmed. */
export interface Diagram {
  node: string;
  entrance: number | null;
  rect: Rect;
  dimmed: boolean;
}

const tileBox = (tx: number, ty: number, w = 1): Rect => ({ x: (tx + w / 2) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE, w: w * TILE_SIZE, h: TILE_SIZE });

/** The first node in data order of an anchor kind that is revealed and not yet restored. */
const nextOf = (state: Research, kind: 'entrance' | 'pipe'): ResearchNode | undefined =>
  RESEARCH_NODES.find((n) => n.anchor.kind === kind && nodeState(state, n.id) === 'revealed');

/** The middle mouth tile, where the pipe rises. */
const PIPE = INTAKE.entrances[Math.floor(INTAKE.entrances.length / 2)] ?? { tx: 0, ty: 0 };

/** 058.5: in a guided game, the Warden core's entrance node fits only the right cap. */
const capFits = (state: Pick<SimState, 'start' | 'sandbox'>, node: ResearchNode, i: number): boolean =>
  !isGuidedGame(state) || node.id !== NEW_ENTRANCE_NODE || i === TUTORIAL_CAP;

/** Every diagram on the foundry now, in a fixed order: the caps west to east, the pipe, then walls and the wing in data order. */
export function diagrams(state: Pick<SimState, 'research' | 'link' | 'start' | 'sandbox'>): Diagram[] {
  const out: Diagram[] = [];
  const entrance = nextOf(state, 'entrance');
  if (entrance) {
    for (const [i, e] of state.link.entrances.entries()) {
      const t = INTAKE.entrances[i];
      if (!e.open && t && capFits(state, entrance, i)) out.push({ node: entrance.id, entrance: i, rect: tileBox(t.tx, t.ty), dimmed: !requiresMet(state, entrance) });
    }
  }
  const pipe = nextOf(state, 'pipe');
  if (pipe) out.push({ node: pipe.id, entrance: null, rect: tileBox(PIPE.tx, PIPE.ty), dimmed: !requiresMet(state, pipe) });
  for (const n of RESEARCH_NODES) {
    if (nodeState(state, n.id) !== 'revealed') continue;
    if (n.anchor.kind === 'wall') out.push({ node: n.id, entrance: null, rect: tileBox(n.anchor.tx, n.anchor.ty), dimmed: !requiresMet(state, n) });
    if (n.anchor.kind === 'wing') out.push({ node: n.id, entrance: null, rect: tileBox(n.anchor.tx, n.anchor.ty, n.anchor.w), dimmed: !requiresMet(state, n) });
  }
  return out;
}

/** Gap between the player's feet box and a box, px; 0 when they touch. */
function gapTo(state: Pick<SimState, 'player'>, r: Rect): number {
  const p = state.player;
  const gapX = Math.max(0, Math.abs(r.x - p.x) - (FEET_BOX.w + r.w) / 2);
  const gapY = Math.max(0, Math.abs(r.y - p.y) - (FEET_BOX.h + r.h) / 2);
  return Math.hypot(gapX, gapY);
}

/** The diagram E would use: in the foundry once attuned, the nearest within RESEARCH_REACH by centre distance (the first on a tie). */
export function diagramInReach(state: Pick<SimState, 'research' | 'link' | 'roomId' | 'player' | 'start' | 'sandbox'>): Diagram | undefined {
  if (state.roomId !== FOUNDRY_ROOM || !state.link.attuned) return undefined;
  let best: Diagram | undefined;
  let bestDist = Infinity;
  for (const d of diagrams(state)) {
    if (gapTo(state, d.rect) > RESEARCH_REACH) continue;
    const dist = Math.hypot(d.rect.x - state.player.x, d.rect.y - state.player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

/** Why a node can't be restored right now (or null): restoring is in the foundry, once attuned, at its diagram in reach. */
export type RestoreFail = 'not-foundry' | 'not-attuned' | 'hidden' | 'restored' | 'sealed' | 'requires' | 'cost' | 'reach';

export function restoreFail(state: SimState, nodeId: string): RestoreFail | null {
  const node = researchNode(nodeId);
  if (state.roomId !== FOUNDRY_ROOM) return 'not-foundry';
  if (!state.link.attuned) return 'not-attuned';
  const now = nodeState(state, nodeId);
  if (now === 'hidden') return 'hidden';
  if (now === 'restored') return 'restored';
  if (node.effect.kind === 'wing') return 'sealed';
  if (!requiresMet(state, node)) return 'requires';
  if (!affordable(state.inventory, node)) return 'cost';
  if (diagramInReach(state)?.node !== nodeId) return 'reach';
  return null;
}

/**
 * Restores a node at its diagram in reach: spends its cost from the carried inventory, marks it restored for good,
 * and records it. An entrance node opens the capped entrance it was restored at, with 024's cap-lift. Returns whether it did.
 */
export function restore(state: SimState, nodeId: string): boolean {
  if (restoreFail(state, nodeId) !== null) return false;
  const at = diagramInReach(state);
  const node = researchNode(nodeId);
  for (const [itemId, n] of Object.entries(node.cost)) state.inventory[itemId] = count(state.inventory, itemId) - n;
  state.research[nodeId] = 'restored';
  state.events.restores.push({ node: nodeId });
  if (node.effect.kind === 'entrance' && at?.entrance !== null && at?.entrance !== undefined) {
    const e = state.link.entrances[at.entrance];
    if (e) {
      e.open = true;
      e.node = nodeId;
    }
    state.events.intakeOpens.push({ entrance: at.entrance });
  }
  return true;
}

/** The node restoring next restores at the intake's caps, if one is revealed and not yet restored (the intake prompt's). */
export const nextEntranceNode = (state: Research): ResearchNode | undefined => nextOf(state, 'entrance');
