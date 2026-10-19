import { FEET_BOX } from '../data/player';
import { arenaOf, ALTAR_REACH, HOLLOWS } from '../data/hollows';
import { OVERWORLD_ROOM } from '../data/overworld';
import { RESEARCH_NODES } from '../data/research';
import { tileRect } from './fixtures';
import { createEnemy } from './enemies';
import type { Command } from './input';
import { count } from './inventory';
import { roomOf, type SimState } from './state';
import { tileCentre } from './tiles';

// Region bosses and their altars (034, round 11). A region boss's first kill is recorded
// for good: it never respawns, its altar wakes, and (the Bulwark's) the foundry's sealed
// wing unseals (033). After that, E at the altar opens its offering (render), and the
// `summon` command pays it from what the player carries: the ground cracks at the boss's
// start point and it rises after the summon, for the same fight and the same drops. While
// it lives (or rises) the altar is spent. A summoned boss lives on through a KO.

export type AltarState = 'dim' | 'awake' | 'spent' | 'summoning';

export interface SummoningState {
  altar: string;
  /** Ticks since the offering; the boss rises at the arena's `summonTicks`. */
  ticks: number;
}

/** Every altar in the player's room, with its boss. */
const altarsHere = (state: SimState) => roomOf(state).altars ?? [];

/** The altar's state: dim before its boss's first kill, then awake, summoning while it rises, spent while it lives. */
export function altarState(state: Pick<SimState, 'bossDefeats' | 'summoning' | 'enemies'>, altarId: string): AltarState {
  const boss = HOLLOWS.arena.altar.id === altarId ? HOLLOWS.arena.boss : undefined;
  if (!boss || !state.bossDefeats.includes(boss)) return 'dim';
  if (state.summoning?.altar === altarId) return 'summoning';
  return state.enemies.some((e) => e.enemyId === boss) ? 'spent' : 'awake';
}

/** The altar in reach of the player's feet box, if any. */
export function altarInReach(state: SimState): { id: string; tx: number; ty: number; boss: string } | undefined {
  const p = state.player;
  return altarsHere(state).find((a) => {
    const r = tileRect(a);
    const gapX = Math.max(0, Math.abs(r.x - p.x) - (FEET_BOX.w + r.w) / 2);
    const gapY = Math.max(0, Math.abs(r.y - p.y) - (FEET_BOX.h + r.h) / 2);
    return Math.hypot(gapX, gapY) <= ALTAR_REACH;
  });
}

/** True if the player carries an altar's offering. */
export const canOffer = (state: Pick<SimState, 'inventory'>): boolean => Object.entries(HOLLOWS.arena.offering).every(([id, n]) => count(state.inventory, id) >= n);

/** Raises an arena's boss at its start point, at full health, in its arena's group. */
function raise(state: SimState, boss: string): void {
  const arena = arenaOf(boss);
  if (!arena) return;
  // Arenas are in the overworld (the Hollows), wherever the player has gone meanwhile.
  state.enemies.push(createEnemy(state.nextEnemyId++, boss, tileCentre(arena.start), OVERWORLD_ROOM, arena.id));
}

/**
 * Altars, before harvesting: E at one is the altar's (render opens its offering; the sim does nothing more, so a dim
 * one does nothing), `summon` pays an awake altar's offering, and a summon in progress rises on time.
 */
export function stepAltars(state: SimState, cmd: Command): Command {
  const altar = altarInReach(state);
  if (cmd.summon && altar?.id === cmd.summon && altarState(state, altar.id) === 'awake' && canOffer(state)) {
    for (const [id, n] of Object.entries(HOLLOWS.arena.offering)) state.inventory[id] = count(state.inventory, id) - n;
    state.summoning = { altar: altar.id, ticks: 0 };
    state.events.summons.push({ altar: altar.id, boss: altar.boss });
  }
  const summoning = state.summoning;
  if (summoning) {
    summoning.ticks += 1;
    if (summoning.ticks >= HOLLOWS.arena.summonTicks) {
      state.summoning = null;
      state.summoned.push(HOLLOWS.arena.boss);
      raise(state, HOLLOWS.arena.boss);
    }
  }
  return cmd.interact && altar ? { ...cmd, interact: false } : cmd;
}

/** On any enemy's death: a region boss's first kill is a boss defeat (recorded once) and unseals the wing; a summoned one is gone. */
export function onBossDeath(state: SimState, enemyId: string): void {
  if (!arenaOf(enemyId)) return;
  state.summoned = state.summoned.filter((b) => b !== enemyId);
  if (state.bossDefeats.includes(enemyId)) return;
  state.bossDefeats.push(enemyId);
  state.events.bossDefeats.push({ boss: enemyId });
  // Round 11: the first kill "unlocks the gate": the sealed wing's door (033) opens; its contents are a later spec.
  for (const n of RESEARCH_NODES) if (n.effect.kind === 'wing') state.research[n.id] = 'restored';
}

/** On a world reset (a KO): a rise in progress completes, so the offering is never lost. */
export function settleSummons(state: SimState): void {
  if (!state.summoning) return;
  state.summoning = null;
  state.summoned.push(HOLLOWS.arena.boss);
}

/** Whether a placed region boss comes back on a reset: always before its first kill, after it only while summoned. */
export const bossReturns = (state: Pick<SimState, 'bossDefeats' | 'summoned'>, enemyId: string): boolean =>
  !arenaOf(enemyId) || !state.bossDefeats.includes(enemyId) || state.summoned.includes(enemyId);
