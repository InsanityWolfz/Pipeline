import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { ATTUNE_TICKS } from '../../src/data/tube';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { arrivalTile } from '../../src/sim/doorways';
import { enemyDef } from '../../src/data/enemies';
import { championDef } from '../../src/sim/champions';
import { tileCentre } from '../../src/sim/state';
import { arena, at, atEntrance, die, fireAt, HUSK, movePlayer, placeHusk, placeNode, run, runUntil, SWIPE_LANDS } from './fight';

// 017: the foundry's stairs sit in the overworld; the name HALL stays for the outside.
const HALL = OVERWORLD_ROOM;
const HALL_DOOR = WORLD[HALL]?.doorways?.[0];
const FOUNDRY_DOOR = WORLD[FOUNDRY_ROOM]?.doorways?.[0];
if (!HALL_DOOR || !FOUNDRY_DOOR) throw new Error('rooms need doorways');

/** The overworld with the player on the tile in front of the foundry's stairs. */
function atHallDoor() {
  const s = arena();
  atEntrance(s);
  return s;
}

/** Walks up and down the stairs into the foundry. */
function intoFoundry() {
  const s = atHallDoor();
  runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
  return s;
}

describe('doorways', () => {
  it('links each door to a floor tile inside the other room', () => {
    // The stairs open south (017): coming out lands on the tile in front of them.
    expect(arrivalTile(HALL, 0)).toEqual(OVERWORLD.entrance.arrive);
    expect(arrivalTile(FOUNDRY_ROOM, 0)).toEqual({ tx: 22, ty: 8 });
  });

  it('walking into the door moves the player to the linked room, one tile inside, standing still', () => {
    const s = intoFoundry();
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(arrivalTile(FOUNDRY_ROOM, 0)));
    expect([s.player.vx, s.player.vy]).toEqual([0, 0]);
    expect(s.events.roomChanges).toEqual([{ from: HALL, to: FOUNDRY_ROOM }]);
  });

  it('walks back the other way', () => {
    const s = intoFoundry();
    // The first walk in attunes the tube, which holds the player still till it ends.
    run(s, ATTUNE_TICKS);
    runUntil(s, (x) => x.roomId === HALL, 120, { moveX: 1 });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(arrivalTile(HALL, 0)));
  });

  it('a roll into the door changes room too', () => {
    const s = atHallDoor();
    run(s, 1, { moveY: -1, dodge: true });
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 30);
  });

  it('door tiles stop arrows', () => {
    const s = atHallDoor();
    run(s, 1, fireAt(s.player.x, 0));
    runUntil(s, (x) => x.arrows.length === 0, 30);
    expect(s.roomId).toBe(HALL);
  });

  it('door tiles stop Husks', () => {
    const s = atHallDoor();
    const e = placeHusk(s, s.player.x + 4, s.player.y);
    e.mode = 'return';
    e.homeY = -200;
    run(s, 120);
    // The door's bottom edge, with the mound's blocks either side.
    expect(e.y).toBeGreaterThanOrEqual((OVERWORLD.entrance.door.ty + 1) * TILE_SIZE + HUSK.feetBox.h / 2);
  });
});

describe('rooms tick apart', () => {
  it('Husks in the hall never see a player in the foundry, and walk home', () => {
    const s = intoFoundry();
    // Far enough from the player's coordinates that it never winds up.
    const e = placeHusk(s, s.player.x - 200, s.player.y);
    run(s, 1);
    expect(e.mode).toBe('idle');
    e.mode = 'chase';
    runUntil(s, () => e.mode === 'return', HUSK.leashGraceTicks + 2);
  });

  it('a wind-up in progress when the player leaves never lands', () => {
    const s = atHallDoor();
    const e = placeHusk(s, s.player.x + 20, s.player.y);
    e.mode = 'windup';
    e.modeTicks = 1;
    e.swipeDirX = -1;
    e.swipeDirY = 0;
    s.roomId = FOUNDRY_ROOM;
    run(s, SWIPE_LANDS);
    expect(s.player.health).toBe(100);
  });

  it('nodes regrow and ground items stay while the player is away', () => {
    const s = atHallDoor();
    const n = placeNode(s, 'tree', at(400).x, at(400).y);
    n.uses = 0;
    n.regrow = 5;
    s.groundItems.push({
      id: s.nextGroundItemId++,
      itemId: 'wood',
      x: s.player.x,
      y: s.player.y + 40,
      roomId: HALL,
    });
    s.roomId = FOUNDRY_ROOM;
    run(s, 5);
    expect(n.uses).toBeGreaterThan(0);
    expect(s.groundItems).toHaveLength(1);
  });

  it('pickups and harvests only reach the player room', () => {
    const s = arena();
    s.groundItems.push({
      id: s.nextGroundItemId++,
      itemId: 'wood',
      x: s.player.x,
      y: s.player.y,
      roomId: HALL,
    });
    placeNode(s, 'tree', s.player.x + 20, s.player.y);
    s.roomId = FOUNDRY_ROOM;
    run(s, 1, { interact: true });
    expect(s.groundItems).toHaveLength(1);
    expect(s.harvest).toBeNull();
  });

  it('shots keep their room: a bolt in the hall never hits a foundry Husk at the same spot', () => {
    const s = arena();
    movePlayer(s, at(200).x, at(200).y);
    const e = placeHusk(s, at(260).x, at(260).y, FOUNDRY_ROOM);
    run(s, 1, fireAt(at(260).x, at(260).y));
    expect(s.arrows[0]?.roomId).toBe(HALL);
    run(s, 20);
    expect(e.health).toBe(HUSK.maxHealth);
  });

  it('a bomb burst in the hall never hits a foundry Husk', () => {
    const s = arena();
    movePlayer(s, at(200).x, at(200).y);
    const e = placeHusk(s, at(260).x, at(260).y, FOUNDRY_ROOM);
    s.tube.ammoId = 'bomb';
    s.inventory.bomb = 1;
    run(s, 1, fireAt(at(260).x, at(260).y));
    expect(s.bombs[0]?.roomId).toBe(HALL);
    runUntil(s, (x) => x.bombs.length === 0, 60);
    expect(e.health).toBe(HUSK.maxHealth);
  });

  it('a KO in the foundry resets the outside: packs home, nodes full, nothing on the ground', () => {
    const s = intoFoundry();
    s.enemies = [];
    placeHusk(s, at(300).x, at(300).y).health = 1;
    placeNode(s, 'tree', at(400).x, at(400).y).uses = 0;
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', ...at(500), roomId: HALL });
    die(s);
    const hall = WORLD[HALL];
    if (!hall?.enemies || !hall.nodes) throw new Error('no overworld data');
    // Each at home at full health (a champion's own, 032).
    expect(s.enemies.filter((e) => e.roomId === HALL).map((e) => ({ x: e.x, y: e.y, health: e.health }))).toEqual(
      hall.enemies.map((p) => {
        const e = s.enemies.find((x) => x.homeX === tileCentre(p).x && x.homeY === tileCentre(p).y);
        return { ...tileCentre(p), health: e?.champion ? championDef(enemyDef(p.enemyId)).maxHealth : enemyDef(p.enemyId).maxHealth };
      }),
    );
    const hallNodes = s.nodes.filter((n) => n.roomId === HALL);
    expect(hallNodes).toHaveLength(hall.nodes.length);
    expect(s.nodes.every((n) => n.uses > 0)).toBe(true);
    expect(s.groundItems).toEqual([]);
  });

  it('a KO anywhere wakes the player at the foundry spawn (011)', () => {
    const s = atHallDoor();
    die(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    const spawn = WORLD[FOUNDRY_ROOM]?.spawn;
    if (!spawn) throw new Error('no spawn');
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(spawn));
  });
});
