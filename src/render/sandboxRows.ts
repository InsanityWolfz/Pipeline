import { AMMO } from '../data/ammo';
import { ENEMIES, enemyDef } from '../data/enemies';
import { itemDef } from '../data/items';
import type { Ring } from '../data/ringScale';
import { SANDBOX, SANDBOX_ARENAS, SANDBOX_TEXT } from '../data/sandbox';
import type { SandboxCommand, SandboxState } from '../sim/sandbox';
import type { MenuHit, MenuRowSpec } from './flow/MenuColumn';

// The Sandbox panel's rows (044), pure so they're unit tested: each entrance's round (every
// AMMO id, so every base and tagged round, and Empty), god mode and the two boss resets; the
// spawn choices (any enemy, ring 1–3, champion or not, 1–10), Spawn and Clear. A click turns
// into the panel's next choices and, for anything the sim does, a command.

/** What the spawn rows are set to: render's choice until Spawn sends it. */
export interface SpawnPick {
  enemyId: string;
  ring: Ring;
  champion: boolean;
  count: number;
}

export const DEFAULT_PICK: SpawnPick = { ...SANDBOX.spawnDefaults };

/** Every round an entrance can hold, Empty first, then AMMO's order (the bases, then each base's tagged rounds). */
export const ROUND_CHOICES: readonly (string | null)[] = [null, ...Object.keys(AMMO)];

/** Every enemy, bosses included, in ENEMIES order. */
export const ENEMY_CHOICES: readonly string[] = Object.keys(ENEMIES);

const roundLabel = (round: string | null): string => (round === null ? SANDBOX_TEXT.empty : itemDef(round).name);
const onOff = (on: boolean): string => (on ? SANDBOX_TEXT.on : SANDBOX_TEXT.off);

/** The two columns: the loadout's (each entrance, god mode, the resets) and the spawn panel's. */
export function sandboxColumns(sb: Pick<SandboxState, 'loadout' | 'god'>, pick: SpawnPick): [MenuRowSpec[], MenuRowSpec[]] {
  const loadout: MenuRowSpec[] = [
    ...sb.loadout.map((round, i) => ({ id: `entrance-${i}`, label: roundLabel(round), value: '', stepper: true })),
    { id: 'god', label: SANDBOX_TEXT.god, value: onOff(sb.god) },
    ...SANDBOX_ARENAS.map((a) => ({ id: `reset-${a.boss}`, label: SANDBOX_TEXT.reset(enemyDef(a.boss).name) })),
  ];
  const spawn: MenuRowSpec[] = [
    { id: 'enemy', label: enemyDef(pick.enemyId).name, value: '', stepper: true },
    { id: 'ring', label: SANDBOX_TEXT.ring(pick.ring), value: '', stepper: true },
    { id: 'champion', label: SANDBOX_TEXT.champion, value: onOff(pick.champion) },
    { id: 'count', label: SANDBOX_TEXT.count(pick.count), value: '', stepper: true },
    { id: 'spawn', label: SANDBOX_TEXT.spawn },
    { id: 'clear', label: SANDBOX_TEXT.clear },
  ];
  return [loadout, spawn];
}

/** The next item of a list from `current`, `dir` steps on, wrapping round. */
function cycle<T>(list: readonly T[], current: T, dir: number): T {
  const i = Math.max(0, list.indexOf(current));
  return list[(i + dir + list.length) % list.length] ?? current;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** What a click on a row does: the spawn rows' next choices, and the command to send, if any. */
export function sandboxClick(hit: MenuHit, sb: Pick<SandboxState, 'loadout' | 'god'>, pick: SpawnPick): { pick: SpawnPick; command: SandboxCommand | null } {
  const dir = hit.part === 'down' ? -1 : 1;
  const entrance = /^entrance-(\d+)$/.exec(hit.id);
  if (entrance) {
    const i = Number(entrance[1]);
    return { pick, command: { kind: 'loadout', entrance: i, round: cycle(ROUND_CHOICES, sb.loadout[i] ?? null, dir) } };
  }
  const reset = SANDBOX_ARENAS.find((a) => hit.id === `reset-${a.boss}`);
  if (reset) return { pick, command: { kind: 'reset', boss: reset.boss } };
  switch (hit.id) {
    case 'god':
      return { pick, command: { kind: 'god', on: !sb.god } };
    case 'enemy':
      return { pick: { ...pick, enemyId: cycle(ENEMY_CHOICES, pick.enemyId, dir) }, command: null };
    case 'ring':
      return { pick: { ...pick, ring: cycle(SANDBOX.rings, pick.ring, dir) }, command: null };
    case 'champion':
      return { pick: { ...pick, champion: !pick.champion }, command: null };
    case 'count':
      return { pick: { ...pick, count: clamp(pick.count + dir, 1, SANDBOX.maxCount) }, command: null };
    case 'spawn':
      return { pick, command: { kind: 'spawn', ...pick } };
    case 'clear':
      return { pick, command: { kind: 'clear' } };
    default:
      return { pick, command: null };
  }
}
