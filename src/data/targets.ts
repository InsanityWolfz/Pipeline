// What each objective points the waypoint arrow at (051, B.1): a place, a piece or a thing. src/sim/objectiveTarget.ts
// turns a target into world points; the arrow goes to the nearest one (051.2), or to the door of the player's room that
// leads to it when it's in another room. The lifts below are render's: how far over a target's ground point the
// hovering arrow's tip sits, px.

export type TargetDef =
  /** The tube on its stone (012). */
  | { kind: 'tubeStone' }
  /** Harvestable nodes of the gathering goal's raws not gathered yet. */
  | { kind: 'nodes' }
  /** 051 (B.3): nodes of the raws a craft goal still lacks; with nothing lacking there's nowhere to go (crafting is anywhere). */
  | { kind: 'collect' }
  /** The living enemies of a pack (017: the ruin field's). */
  | { kind: 'pack'; group: string }
  /** A room as a whole: from another room, the door that leads there; inside it, nothing more to point at. */
  | { kind: 'room'; room: string }
  /** The foundry's hoppers; `unfilled`: only those whose raw hasn't been put back since the lines ran dry (046). */
  | { kind: 'hoppers'; unfilled?: true }
  | { kind: 'bench' }
  /** A site's pylon, by its claim id (found or not: the goal names it). */
  | { kind: 'pylon'; site: string }
  /** The nearest resource-site pylon not yet claimed and awake (032), a discovered one first. */
  | { kind: 'sitePylon' }
  /** The intake's capped entrances (033). */
  | { kind: 'caps' }
  /** The entrance the Warden's core opened (050). */
  | { kind: 'newEntrance' }
  /** The intake's open entrances that hold nothing, or all the open ones once every one holds ammo. */
  | { kind: 'intake' }
  /** The supply ports (028). */
  | { kind: 'ports' }
  /** Stonefall Hollows' barrier gap (034). */
  | { kind: 'barrier' }
  /** A region boss: where it stands, or its arena's start. */
  | { kind: 'boss'; boss: string };

export type TargetKind = TargetDef['kind'];

/**
 * 051 (B.3): where a raw is collected when no node is meant: Husk resin from the Husks out in the overworld (every
 * Husk drops some), their Hive's seeps only once none is left. Any other raw comes from its nodes.
 */
export const COLLECT_FROM: Readonly<Record<string, { enemy: string }>> = { 'husk-resin': { enemy: 'husk' } };

/**
 * The hovering arrow's tip over a target's ground point (its tile's bottom, a node's or an enemy's feet), px: high
 * enough to clear the thing and the E prompt floating over it (012). A node's by its type.
 */
export const TARGET_LIFT: Readonly<Record<TargetKind, number>> & { door: number; nodeTypes: Readonly<Record<string, number>> } = {
  tubeStone: 40,
  nodes: 34,
  collect: 34,
  pack: 46,
  room: 52,
  // Just over the bowl's rim, under the E prompt's cap (012), which floats over the machine behind.
  hoppers: 28,
  bench: 52,
  // 032's: over the pylon's crystal.
  pylon: 82,
  sitePylon: 82,
  // 027's: just over the mouth tile's bottom, on the wall.
  caps: 4,
  newEntrance: 4,
  intake: 4,
  // 028's: clear of the port's head.
  ports: 38,
  barrier: 52,
  boss: 86,
  /** The door to another room (the foundry's, or its stairs outside). */
  door: 40,
  nodeTypes: { tree: 70, rubble: 30, reeds: 36, 'ley-vein': 34, 'rime-outcrop': 36, 'ley-iron-seam': 32, 'resin-seep': 30 },
};

/**
 * The waypoint arrow (051): at the screen's edge `edgeInset` px in from it while the target's off screen, and hovering
 * over it (bobbing as 027's marker) while it's on screen, its tip `onScreenMargin` px inside the edge at least; at the
 * edge it's drawn `edgeScale` times bigger. The refill goal's raw icon sits in a plate `plate.gap` px in front of
 * (below) the hopper's base, where the player stands to fill it.
 */
export const WAYPOINT = {
  edgeInset: 14,
  onScreenMargin: 8,
  /** The edge arrow pulses between these alphas once per `pulseMs`. */
  pulse: { min: 0.65, max: 1, ms: 1100 },
  edgeScale: 1.3,
  plate: { gap: 2, pad: 2, alpha: 0.9 },
  /** The arrow sprite is this tall, tip to tail (TUTORIAL_SPRITES.marker). */
  arrowLength: 20,
} as const;
