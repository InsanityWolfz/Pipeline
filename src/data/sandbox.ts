import { TICK_RATE } from './config';
import { ENEMIES } from './enemies';
import { AFFIXES, GEAR_NAMES, GEAR_SLOTS, RARITIES, SLOT_BASE, type Affix, type AffixKind, type GearPiece, type GearSlot, type GearWeight, type Rarity } from './gear';
import { HOLLOWS } from './hollows';
import { HOLLOWS_ENEMIES } from './hollowsEnemies';
import { ITEMS } from './items';
import type { StartDef } from './player';
import { ALL_CRAFTED } from './playtest';
import { RELICS } from './relics';
import type { Ring } from './ringScale';
import { SANDBOX_ROOM } from './rooms';
import type { TilePos, TileRect } from './tiles';

// The sandbox (044): `?sandbox` drops the player into a test room of its own with
// everything. Its layout, its pens and arenas, the panel's defaults and the kit, all
// derived from the content lists so new content joins it without editing this file.
// The room is built from this layout in src/sim/sandboxRoom.ts; the rules are in
// src/sim/sandbox.ts. Numbers are tuning values.

/** How many of every item the kit carries. */
export const KIT_COUNT = 99;

/** The pens along the north wall: walled boxes `w` × `h` tiles (walls included), `stride` apart from `x0`, open on the south side for `gap.w` tiles from `gap.from`. */
const PEN = { x0: 3, y0: 2, w: 12, h: 9, stride: 15, gap: { from: 4, w: 4 } } as const;

/** One pen (044): its enemy, the ring it fights at (044.3), its walls and its enemy's home. */
export interface PenDef {
  enemyId: string;
  ring: Ring;
  bounds: TileRect;
  /** The gap in its south wall, columns x0..x1. */
  gap: { x0: number; x1: number };
  home: TilePos;
}

/** 044.3: Region 1's enemies at ring 1, Stonefall Hollows' at its ring (3): the rings they meet in the real game. */
const penRing = (enemyId: string): Ring => (enemyId in HOLLOWS_ENEMIES ? HOLLOWS.ring : 1);

/** One pen per non-boss enemy (044), in ENEMIES order, so a new enemy gets one. */
export const SANDBOX_PENS: readonly PenDef[] = Object.values(ENEMIES)
  .filter((e) => !e.boss)
  .map((e, i) => {
    const x0 = PEN.x0 + i * PEN.stride;
    const y0 = PEN.y0;
    return {
      enemyId: e.id,
      ring: penRing(e.id),
      bounds: { x0, y0, x1: x0 + PEN.w - 1, y1: y0 + PEN.h - 1 },
      gap: { x0: x0 + PEN.gap.from, x1: x0 + PEN.gap.from + PEN.gap.w - 1 },
      home: { tx: x0 + Math.floor(PEN.w / 2), ty: y0 + Math.floor(PEN.h / 2) },
    };
  });

/** A boss's arena in the sandbox: its boss, where it waits (its start), its walls and the way in. */
export interface SandboxArena {
  boss: string;
  start: TilePos;
}

/**
 * The Warden's arena: a walled square beside the forum, open on its north side, the Warden waiting at its centre.
 * The Bulwark's is the Sunken Forum itself (044: "the Sunken Forum's layout, seal included"), at the same tiles as in
 * the Hollows, so its AI and the arena lock (043) read the same numbers.
 */
export const WARDEN_ARENA = {
  boss: 'pylon-warden',
  bounds: { x0: 27, y0: 30, x1: 45, y1: 42 } satisfies TileRect,
  way: { x0: 34, x1: 38 },
  start: { tx: 36, ty: 36 } satisfies TilePos,
} as const;

/** Both arenas, Warden first. */
export const SANDBOX_ARENAS: readonly SandboxArena[] = [
  { boss: WARDEN_ARENA.boss, start: WARDEN_ARENA.start },
  { boss: HOLLOWS.arena.boss, start: HOLLOWS.arena.start },
];

/** The room's size: wide enough for every pen, tall enough for the forum below the open middle. */
const WIDTH = PEN.x0 + SANDBOX_PENS.length * PEN.stride + PEN.x0;
const HEIGHT = HOLLOWS.arena.bounds.y1 + 3;

export const SANDBOX = {
  room: SANDBOX_ROOM,
  width: WIDTH,
  height: HEIGHT,
  /** Where the player starts and wakes (044.6), in the open middle with clear floor round it. */
  spawn: { tx: Math.floor(WIDTH / 2), ty: 20 } satisfies TilePos,
  /** The identification bench (036): the gear and stages panel, so the stash's gear can be worn. A solid block. */
  bench: { tx: Math.floor(WIDTH / 2) - 4, ty: 17 } satisfies TilePos,
  /** 044.2: a cleared pen's enemy comes back this many ticks after the pen empties (5 s). */
  penRefillTicks: 5 * TICK_RATE,
  /** The spawn panel: spawned enemies stand `distance` tiles in front of the player, `spacing` tiles apart across the aim. */
  place: { distance: 5, spacing: 2 },
  /** The spawn panel's choices and where it starts: ring 1–3, champion or not, 1–10 at a time. */
  rings: [1, 2, 3] as readonly Ring[],
  maxCount: 10,
  spawnDefaults: { enemyId: 'husk', ring: 1 as Ring, champion: false, count: 1 },
  /** Each entrance's round at the start: plain arrows, the first volley (024). Null is empty. */
  loadout: ['arrow', 'arrow', 'arrow'] as readonly (string | null)[],
  /** 044.1: the panel's key, the backquote (unbound in the game), rebindable (042). */
  panelKey: 'BACKTICK',
} as const;

/** A whole number of steps half way through a range, as a value (rounded so tenths and hundredths stay exact). */
const mid = (min: number, max: number, step = 1): number => Math.round(Math.round((min + max) / 2) * step * 1000) / 1000;

/** The first `n` affix kinds in AFFIXES order, each at its mid roll. */
const midAffixes = (n: number): Affix[] =>
  (Object.keys(AFFIXES) as AffixKind[]).slice(0, n).map((kind) => {
    const d = AFFIXES[kind];
    return { kind, value: mid(d.min, d.max, d.step) };
  });

const baseRange = (slot: GearSlot, weight: GearWeight | null) => (slot === 'body' ? SLOT_BASE.body[weight ?? 'light'] : SLOT_BASE[slot]);

/** The rarities a dropped piece can roll (not the relic tier), in RARITIES order. */
const ROLLED: readonly Rarity[] = (Object.keys(RARITIES) as Rarity[]).filter((r) => r !== 'relic');

/** One piece of a slot (and weight) at a rarity, with mid rolls (044.4). */
function midPiece(slot: GearSlot, weight: GearWeight | null, rarity: Rarity, i: number): Omit<GearPiece, 'id'> {
  const base = baseRange(slot, weight);
  const names = slot === 'body' ? GEAR_NAMES.body[weight ?? 'light'] : GEAR_NAMES[slot];
  const adjective = names.adjectives[i % names.adjectives.length] ?? '';
  return { slot, rarity, weight, baseArmor: mid(base.min, base.max), affixes: midAffixes(RARITIES[rarity].affixes), relic: null, name: `${adjective} ${names.nouns[0] ?? ''}` };
}

/**
 * 044.4: the stash's gear, none worn: every slot (the body light and heavy) at each rarity with mid rolls, then every
 * relic, from GEAR_SLOTS, RARITIES and RELICS.
 */
export const SANDBOX_GEAR: readonly GearPiece[] = [
  ...GEAR_SLOTS.flatMap((slot) => (slot === 'body' ? (['light', 'heavy'] as const) : [null]).flatMap((weight) => ROLLED.map((rarity, i) => midPiece(slot, weight, rarity, i)))),
  ...RELICS.map((r): Omit<GearPiece, 'id'> => {
    const base = baseRange(r.slot, r.weight);
    return { slot: r.slot, rarity: 'relic', weight: r.weight, baseArmor: mid(base.min, base.max), affixes: midAffixes(RARITIES.relic.affixes), relic: r.id, name: r.name };
  }),
].map((p, id) => ({ ...p, id }));

/**
 * The sandbox start (044): its room and spawn, KIT_COUNT of every item (every round and tagged round among them),
 * every recipe and stage row known, the tube attuned with every gate open, the stash's gear. The level, the talent
 * points, research and the open entrances are set by src/sim/sandbox.ts.
 */
export const SANDBOX_START: StartDef = {
  room: SANDBOX_ROOM,
  spawn: SANDBOX.spawn,
  inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, KIT_COUNT])),
  crafted: ALL_CRAFTED,
  hasTube: true,
  attuned: true,
  gatesOpen: true,
  populated: false,
  gear: SANDBOX_GEAR,
  sandbox: true,
};

/**
 * The Sandbox panel (044), view px: two tablets of 020-style rows under their titles, the loadout's at the screen's
 * left edge and the spawn panel's at its right, `margin` in, so the player in the middle stays in view. Rows step with −
 * and + at their right end, so a round's name has the row's width.
 */
export const SANDBOX_PANEL = {
  y: 40,
  margin: 8,
  pad: 8,
  titleH: 20,
  titleY: 4,
  rows: {
    gap: 4,
    subH: 11,
    label: { x: 10, y: 6 },
    sub: { x: 10, y: 2 },
    value: { right: 176, y: 6 },
    stepper: { down: 152, up: 174, hit: 10 },
    greyAlpha: 0.45,
  },
} as const;

/** The panel's words. */
export const SANDBOX_TEXT = {
  loadout: 'Loadout',
  spawn: 'Spawn',
  empty: 'Empty',
  god: 'God mode',
  reset: (name: string): string => `Reset ${name}`,
  ring: (ring: number): string => `Ring ${ring}`,
  champion: 'Champion',
  count: (n: number): string => `Count ${n}`,
  spawnRow: 'Spawn',
  clear: 'Clear spawned',
  on: 'On',
  off: 'Off',
} as const;
