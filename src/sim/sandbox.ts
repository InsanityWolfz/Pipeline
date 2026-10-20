import { AMMO } from '../data/ammo';
import { TILE_SIZE } from '../data/config';
import { ENEMIES } from '../data/enemies';
import { LEVEL_CAP } from '../data/leveling';
import { RESEARCH_NODES } from '../data/research';
import { SANDBOX_ROOM } from '../data/rooms';
import type { Ring } from '../data/ringScale';
import { SANDBOX, SANDBOX_ARENAS, SANDBOX_PENS, SANDBOX_START } from '../data/sandbox';
import { resetBoss } from './arenaLock';
import { defOf } from './champions';
import { boxHitsSolid } from './collision';
import { facingVector, unit } from './direction';
import type { Command } from './input';
import { entranceCap } from './research';
import { spawnEnemy } from './spawn';
import { createSim, resetWorld, roomById, type SimState } from './state';
import { playerStats } from './stats';
import { tileCentre } from './tiles';

// The sandbox (044): `?sandbox`'s test room with everything. Its kit and layout are data
// (src/data/sandbox.ts); here are its rules: the start (level cap, every point, all research,
// three open entrances, only the sandbox's own enemies), the panel's commands (each
// entrance's round, god mode, spawning and clearing, resetting a boss), the bottomless
// entrances, the pens refilling, and the KO, which loses nothing.

/** What the sandbox keeps (044). Only a sandbox sim has it, so a real save's shape never changes. */
export interface SandboxState {
  /** God mode: hits land, but the player takes no damage. */
  god: boolean;
  /** Each entrance's round (an AMMO id), or null for empty, in INTAKE.entrances order. */
  loadout: (string | null)[];
  /** Each pen's ticks until it refills, in SANDBOX_PENS order; null while its enemy is there. */
  pens: (number | null)[];
}

/** The panel's requests (044), each an edge on the tick it's sent. */
export type SandboxCommand =
  | { kind: 'god'; on: boolean }
  | { kind: 'loadout'; entrance: number; round: string | null }
  | { kind: 'spawn'; enemyId: string; ring: Ring; champion: boolean; count: number }
  | { kind: 'clear' }
  | { kind: 'reset'; boss: string };

/** The group of a pen's enemy, by pen index. */
export const PEN_GROUP = (i: number): string => `sandbox-pen-${i}`;
/** The group of what the spawn panel puts down: Clear removes it. */
export const SPAWN_GROUP = 'sandbox-spawn';
/** The group of an arena's boss. */
export const ARENA_GROUP = (boss: string): string => `sandbox-arena-${boss}`;

/** A sim in the sandbox: its start, then the rest of the kit and its own enemies. */
export function createSandboxSim(seed: number): SimState {
  const state = createSim(seed, { start: SANDBOX_START });
  state.level = LEVEL_CAP;
  state.xp = 0;
  state.talentPoints = LEVEL_CAP - 1;
  for (const n of RESEARCH_NODES) state.research[n.id] = 'restored';
  // Its full entrances never count as the first full line, which would send the overworld's packs out (017).
  state.firstLineFull = true;
  state.sandbox = { god: false, loadout: [...SANDBOX.loadout], pens: SANDBOX_PENS.map(() => null) };
  fill(state);
  refill(state, state.sandbox);
  state.player.health = playerStats(state).maxHealth;
  return state;
}

/** Only the sandbox's own enemies: one in each pen and each boss in its arena. Every other room is empty. */
function fill(state: SimState): void {
  state.enemies = [];
  SANDBOX_PENS.forEach((_, i) => fillPen(state, i));
  for (const a of SANDBOX_ARENAS) spawnEnemy(state, a.boss, tileCentre(a.start), SANDBOX_ROOM, { group: ARENA_GROUP(a.boss) });
}

function fillPen(state: SimState, i: number): void {
  const pen = SANDBOX_PENS[i];
  if (pen) spawnEnemy(state, pen.enemyId, tileCentre(pen.home), SANDBOX_ROOM, { group: PEN_GROUP(i), ring: pen.ring });
}

/** Each tick, before the tube fires: the panel's command, the pens, and every entrance full of its round. */
export function stepSandbox(state: SimState, cmd: Command): void {
  const sb = state.sandbox;
  if (!sb) return;
  if (cmd.sandbox) apply(state, sb, cmd, cmd.sandbox);
  stepPens(state, sb);
  refill(state, sb);
}

function apply(state: SimState, sb: SandboxState, cmd: Command, c: SandboxCommand): void {
  switch (c.kind) {
    case 'god':
      sb.god = c.on;
      return;
    case 'loadout':
      if (c.entrance >= 0 && c.entrance < sb.loadout.length && (c.round === null || AMMO[c.round])) sb.loadout[c.entrance] = c.round;
      return;
    case 'spawn':
      spawnAhead(state, cmd, c);
      return;
    case 'clear':
      state.enemies = state.enemies.filter((e) => e.group !== SPAWN_GROUP);
      return;
    case 'reset':
      resetArena(state, c.boss);
  }
}

/** 1–10 of an enemy at a ring of 1–3, as champions (never a boss), in a row across the aim a short way in front of the player. */
function spawnAhead(state: SimState, cmd: Command, c: Extract<SandboxCommand, { kind: 'spawn' }>): void {
  const def = ENEMIES[c.enemyId];
  if (!def || !SANDBOX.rings.includes(c.ring)) return;
  const n = Math.max(1, Math.min(SANDBOX.maxCount, Math.round(c.count)));
  const champion = c.champion && !def.boss;
  const p = state.player;
  const aim = unit(cmd.aimX - p.x, cmd.aimY - p.y);
  const [dx, dy] = aim[0] === 0 && aim[1] === 0 ? facingVector(p.facing) : aim;
  const room = roomById(state.roomId);
  const box = defOf({ enemyId: c.enemyId, champion: champion ? { name: '' } : null, ring: c.ring }).feetBox;
  const { distance, spacing } = SANDBOX.place;
  for (let i = 0; i < n; i++) {
    const across = (i - (n - 1) / 2) * spacing * TILE_SIZE;
    const target = { x: p.x + dx * distance * TILE_SIZE - dy * across, y: p.y + dy * distance * TILE_SIZE + dx * across };
    spawnEnemy(state, c.enemyId, clear(room, p, target, box), state.roomId, { group: SPAWN_GROUP, ring: c.ring, champion });
  }
}

/** The point on the line from `from` to `to` nearest `to` where the box stands clear of the room's solid tiles (else `from`). */
function clear(room: ReturnType<typeof roomById>, from: { x: number; y: number }, to: { x: number; y: number }, box: { w: number; h: number }): { x: number; y: number } {
  const STEPS = 20;
  for (let k = STEPS; k > 0; k--) {
    const t = k / STEPS;
    const at = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    if (!boxHitsSolid(room, at.x, at.y, box)) return at;
  }
  return { x: from.x, y: from.y };
}

/** A boss back at its arena's start at full health, idle, its adds and bombs gone (043's reset); a dead one rises again. */
function resetArena(state: SimState, boss: string): void {
  const arena = SANDBOX_ARENAS.find((a) => a.boss === boss);
  if (!arena) return;
  const group = ARENA_GROUP(boss);
  const living = state.enemies.find((e) => e.group === group && e.health > 0);
  if (living) {
    resetBoss(state, living);
    return;
  }
  state.enemies = state.enemies.filter((e) => e.group !== group);
  spawnEnemy(state, boss, tileCentre(arena.start), SANDBOX_ROOM, { group });
}

/** A pen whose enemy is gone counts down SANDBOX.penRefillTicks, then holds a fresh one (044.2). */
function stepPens(state: SimState, sb: SandboxState): void {
  SANDBOX_PENS.forEach((_, i) => {
    const group = PEN_GROUP(i);
    if (state.enemies.some((e) => e.group === group && e.health > 0)) {
      sb.pens[i] = null;
      return;
    }
    const left = sb.pens[i] ?? null;
    if (left === null) sb.pens[i] = SANDBOX.penRefillTicks;
    else if (left > 1) sb.pens[i] = left - 1;
    else {
      fillPen(state, i);
      sb.pens[i] = null;
    }
  });
}

/** Every entrance open and full of its loadout round to the cap, so its reservoir never runs out; empty for null. */
function refill(state: SimState, sb: SandboxState): void {
  const cap = entranceCap(state);
  state.link.entrances.forEach((e, i) => {
    const round = sb.loadout[i] ?? null;
    e.open = true;
    e.ammoId = round;
    e.count = round === null ? 0 : cap;
  });
}

/**
 * The KO (044.6): with nothing at risk, the player wakes at the sandbox's spawn with everything they carried, the
 * pens and arenas filled again and what the panel spawned gone.
 */
export function wakeSandbox(state: SimState): void {
  resetWorld(state, SANDBOX_ROOM);
  fill(state);
  if (state.sandbox) state.sandbox.pens = SANDBOX_PENS.map(() => null);
  state.banked = { ...state.inventory };
  state.events.ko = true;
  state.events.woke = true;
  state.events.lost = {};
}
