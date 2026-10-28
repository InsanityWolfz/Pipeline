import { altarState } from '../sim/altar';
import { ARENAS } from '../data/arenas';
import { doorUnlocked } from '../sim/arenaLock';
import { ARENA_DOOR_LOOK } from '../data/arenaAssets';
import { shownItem } from './itemShown';
import { TILE_SIZE } from '../data/config';
import { DESCRIPTIONS, portHover, portPlate, sitePylonLine } from '../data/descriptions';
import { landmarkDef, landmarkOfSite } from '../data/landmarks';
import type { PylonDef } from '../data/rooms';
import { isOpened } from '../sim/cache';
import { dormant, occupied } from '../sim/claims';
import { portPerMinute, pylonsOf, supplyOf } from '../sim/claims';
import { INTAKE } from '../data/foundry';
import { enemyDef } from '../data/enemies';
import { EMBER_ENEMY_LOOK } from '../data/emberworksEnemyAssets';
import { repairing } from '../sim/tenderAi';
import { CHAMPIONS } from '../data/champions';
import { HOVER_NAME, WORLD_NAMES } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { nodeDef } from '../data/nodes';
import { OVERWORLD } from '../data/overworld';
import { pieceDef } from '../data/pieces';
import { FOUNDRY_ROOM } from '../data/rooms';
import { fixtureAt, fixtureDef } from '../sim/fixtures';
import { pieceAt } from '../sim/pieces';
import { machineCard } from '../sim/recipeCard';
import { machineSpeed } from '../sim/research';
import { machineCardText } from './recipeText';
import { intakeAnchor } from './foundryLayout';
import { roomById, type SimState } from '../sim/state';
import { SET_PIECES, setPieceAnchor } from '../data/setPieces';

// What's under the cursor in the world, by name (015). Pure, so tests can check
// it; render draws the name above the thing it returns.

/** A named thing: its name, the ground point it stands on, and how far above that to draw the name. */
export interface HoverName {
  name: string;
  x: number;
  y: number;
  rise: number;
  /** A foundry piece's id, so render can sit the name above its sprite and readout. */
  pieceId?: number;
  /** A line under the name saying where materials come from (018); 069: a machine's recipe card. */
  description?: string;
  /** The foundry intake (019): render shows the reservoir's readout under the name. */
  intake?: boolean;
  /** An enemy's id (040: its trait and status chips show under its name). */
  enemy?: number;
}

/** A pylon's hover line: the shrine's (018), or a landmark pylon's naming its landmark and what it sends (032). */
function pylonLine(sim: SimState, pylon: PylonDef): string {
  const claimed = sim.claims.includes(pylon.site);
  // fix-playtest-ui: an awake pylon whose guards live says only that they must go.
  if (!claimed && !dormant(sim, pylon) && occupied(sim, pylon.site)) return DESCRIPTIONS.pylonGuarded;
  const landmark = landmarkOfSite(pylon.site);
  if (!landmark?.pylon) return claimed ? DESCRIPTIONS.pylon : DESCRIPTIONS.pylonDormant;
  return sitePylonLine(landmark.name, landmark.pylon.supplies.map((id) => itemDef(id).name).join(' and '), claimed ? 'claimed' : dormant(sim, pylon) ? 'dormant' : 'awake');
}

/** The Ruined Cache's hover line (032): sealed while a guard lives, ready, or empty until it re-arms. */
function cacheLine(sim: SimState, id: string): string {
  if (isOpened(sim, id)) return DESCRIPTIONS.cacheEmpty;
  return occupied(sim, id) ? DESCRIPTIONS.cacheSealed : DESCRIPTIONS.cacheReady;
}

/** Distance from a point to a polyline of tile points, px. */
function toLine(px: number, py: number, line: readonly { tx: number; ty: number }[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    const ax = (a.tx + 0.5) * TILE_SIZE;
    const ay = (a.ty + 0.5) * TILE_SIZE;
    const dx = (b.tx - a.tx) * TILE_SIZE;
    const dy = (b.ty - a.ty) * TILE_SIZE;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(px - (ax + k * dx), py - (ay + k * dy)));
  }
  return best;
}

const inBox = (px: number, py: number, x: number, y: number, box: { w: number; h: number }): boolean =>
  Math.abs(px - x) <= box.w / 2 && py <= y + box.h * HOVER_NAME.below && py >= y - box.h;

/**
 * The name of the thing at world point (px, py) in `roomId`, in order: foundry
 * pieces and fixtures, enemies, ground items, nodes, then the pylon, the tube's
 * stone, the ley crystal, and a ley line (018). Null when nothing is there.
 */
export function nameAt(sim: SimState, roomId: string, px: number, py: number): HoverName | null {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  const centre = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE });
  if (roomId === FOUNDRY_ROOM) {
    const piece = pieceAt(sim.foundry, tx, ty);
    // 069: a machine's recipe card under its name (its numbers the sim's, at the machine speed now).
    const card = piece?.kind === 'machine' ? { description: machineCardText(machineCard(piece, machineSpeed(sim))) } : {};
    if (piece) return { name: pieceDef(piece.pieceId).name, ...centre(piece), rise: HOVER_NAME.tile.rise, pieceId: piece.id, ...card };
    // The intake's mouth (019), or the pipe rising above it up the wall shown over the top row.
    if (INTAKE.entrances.some((m) => m.tx === tx && ty <= m.ty)) {
      const at = intakeAnchor();
      return { name: WORLD_NAMES.intake, x: at.x, y: at.y, rise: HOVER_NAME.tile.rise, intake: true };
    }
    const fixture = fixtureAt(sim.fixtures, tx, ty);
    if (fixture) {
      const def = fixtureDef(fixture.id);
      if (def.kind !== 'port') return { name: def.name, ...centre(def), rise: HOVER_NAME.tile.rise };
      // A supply port (028): its plate's text, and whether a refused raw is waiting in it.
      const pylons = pylonsOf(sim, fixture);
      const plate = portPlate(pylons, portPerMinute(supplyOf(sim, fixture)));
      return { name: def.name, ...centre(def), rise: HOVER_NAME.tile.rise, description: portHover(plate, fixture.item !== null) };
    }
  }
  for (const e of sim.enemies) {
    // A champion (032) is bigger, and goes by its own name.
    const k = e.champion ? CHAMPIONS.scale : 1;
    const box = { w: HOVER_NAME.enemy.w * k, h: HOVER_NAME.enemy.h * k };
    if (e.roomId === roomId && e.health > 0 && inBox(px, py, e.x, e.y, box)) {
      // 061: a kiln-tender's beam on it shows under its name.
      const repaired = repairing(sim, e.id) ? { description: EMBER_ENEMY_LOOK.beam.hoverLine } : {};
      return { name: e.champion?.name ?? enemyDef(e.enemyId).name, x: e.x, y: e.y, rise: HOVER_NAME.enemy.rise * k, enemy: e.id, ...repaired };
    }
  }
  for (const g of sim.groundItems) {
    if (g.roomId === roomId && inBox(px, py, g.x, g.y, HOVER_NAME.item)) return { name: shownItem(sim, g.itemId).name, x: g.x, y: g.y, rise: HOVER_NAME.item.rise };
  }
  for (const n of sim.nodes) {
    if (n.roomId === roomId && inBox(px, py, n.x, n.y, HOVER_NAME.node)) return { name: nodeDef(n.nodeId).name, x: n.x, y: n.y, rise: HOVER_NAME.node.rise };
  }
  const room = roomById(roomId);
  const on = (t: { tx: number; ty: number } | undefined) => t !== undefined && t.tx === tx && t.ty === ty;
  const pylon = (room.pylons ?? []).find((p) => on(p));
  if (pylon) return { name: WORLD_NAMES.pylon, ...centre(pylon), rise: HOVER_NAME.tile.rise, description: pylonLine(sim, pylon) };
  // The forum's altar (034): what an offering does now.
  const altar = (room.altars ?? []).find((a) => on(a));
  if (altar) {
    const state = altarState(sim, altar.id);
    return { name: WORLD_NAMES.altar, ...centre(altar), rise: HOVER_NAME.tile.rise, description: state === 'dim' ? DESCRIPTIONS.altarDim : state === 'awake' ? DESCRIPTIONS.altarAwake : DESCRIPTIONS.altarSpent };
  }
  // 055: an arena's door (its tiles, or the sprite standing over them). 059: sealed it says only "Sealed"; open, no
  // description (its E prompt says the rest).
  const onDoor = (t: { tx: number; ty: number }) => t.tx === tx && py <= (t.ty + 1) * TILE_SIZE && py >= (t.ty + 1) * TILE_SIZE - ARENA_DOOR_LOOK.height;
  const arena = ARENAS.find((a) => a.rooms.includes(roomId) && a.door.tiles.some(onDoor));
  if (arena) {
    const t = arena.door.tiles[Math.floor(arena.door.tiles.length / 2)] ?? arena.door.enterTo;
    const open = doorUnlocked(sim, arena, roomId);
    return { name: arena.door.name, ...centre(t), rise: HOVER_NAME.tile.rise, ...(open ? {} : { description: arena.door.sealed }) };
  }
  const cache = (room.caches ?? []).find((c) => on(c));
  if (cache) return { name: landmarkDef(cache.id).name, ...centre(cache), rise: HOVER_NAME.tile.rise, description: cacheLine(sim, cache.id) };
  if (on(room.tubeStone) && room.tubeStone) {
    return { name: sim.hasTube ? WORLD_NAMES.tubeStone : WORLD_NAMES.dormantTube, ...centre(room.tubeStone), rise: HOVER_NAME.tile.rise };
  }
  if (on(room.crystal) && room.crystal) return { name: WORLD_NAMES.crystal, ...centre(room.crystal), rise: HOVER_NAME.tile.rise };
  // 077: a set piece, by its name alone (no description), over its drawn box.
  const piece = roomId === OVERWORLD.id ? SET_PIECES.find((p) => {
    const a = setPieceAnchor(p, TILE_SIZE);
    return Math.abs(px - a.x) <= (p.look.w * HOVER_NAME.setPieceWidth) / 2 && py <= a.y && py >= a.y - p.look.h;
  }) : undefined;
  if (piece) {
    const a = setPieceAnchor(piece, TILE_SIZE);
    return { name: piece.name, x: a.x, y: a.y, rise: piece.look.h };
  }
  if (roomId === OVERWORLD.id && Object.values(OVERWORLD.leyLines).some((l) => toLine(px, py, l) <= HOVER_NAME.leyLine)) {
    return { name: WORLD_NAMES.leyLine, x: px, y: py, rise: HOVER_NAME.leyLineRise, description: DESCRIPTIONS.leyLine };
  }
  return null;
}
