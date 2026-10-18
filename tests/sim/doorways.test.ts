import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { FOUNDRY_ROOM, ROOMS } from '../../src/data/rooms';
import { arrivalTile } from '../../src/sim/doorways';
import { tileCentre } from '../../src/sim/state';
import { arena, die, fireAt, HUSK, movePlayer, placeHusk, placeNode, run, runUntil, SWIPE_LANDS } from './fight';

const HALL = 'ruin-hall';
const HALL_DOOR = ROOMS[HALL]?.doorways?.[0];
const FOUNDRY_DOOR = ROOMS[FOUNDRY_ROOM]?.doorways?.[0];
if (!HALL_DOOR || !FOUNDRY_DOOR) throw new Error('rooms need doorways');

/** The ruin hall with the player standing on the floor tile inside its door. */
function atHallDoor() {
  const s = arena();
  const inside = tileCentre(arrivalTile(HALL, 0));
  movePlayer(s, inside.x, inside.y);
  return s;
}

/** Walks left through the hall door into the foundry. */
function intoFoundry() {
  const s = atHallDoor();
  runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveX: -1 });
  return s;
}

describe('doorways', () => {
  it('links each door to a floor tile inside the other room', () => {
    expect(arrivalTile(HALL, 0)).toEqual({ tx: 1, ty: 12 });
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
    runUntil(s, (x) => x.roomId === HALL, 120, { moveX: 1 });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(arrivalTile(HALL, 0)));
  });

  it('a roll into the door changes room too', () => {
    const s = atHallDoor();
    run(s, 1, { moveX: -1, dodge: true });
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 30);
  });

  it('door tiles stop arrows', () => {
    const s = atHallDoor();
    run(s, 1, fireAt(0, s.player.y));
    runUntil(s, (x) => x.arrows.length === 0, 30);
    expect(s.roomId).toBe(HALL);
  });

  it('door tiles stop Husks', () => {
    const s = atHallDoor();
    const e = placeHusk(s, s.player.x + 4, s.player.y);
    e.mode = 'return';
    e.homeX = -200;
    run(s, 120);
    expect(e.x).toBeGreaterThanOrEqual(TILE_SIZE + HUSK.feetBox.w / 2);
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
    const n = placeNode(s, 'tree', 400, 448);
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
    movePlayer(s, 200, 200);
    const e = placeHusk(s, 260, 200, FOUNDRY_ROOM);
    run(s, 1, fireAt(260, 200));
    expect(s.arrows[0]?.roomId).toBe(HALL);
    run(s, 20);
    expect(e.health).toBe(HUSK.maxHealth);
  });

  it('a bomb burst in the hall never hits a foundry Husk', () => {
    const s = arena();
    movePlayer(s, 200, 200);
    const e = placeHusk(s, 260, 200, FOUNDRY_ROOM);
    s.tube.ammoId = 'bomb';
    s.inventory.bomb = 1;
    run(s, 1, fireAt(260, 200));
    expect(s.bombs[0]?.roomId).toBe(HALL);
    runUntil(s, (x) => x.bombs.length === 0, 60);
    expect(e.health).toBe(HUSK.maxHealth);
  });

  it('a KO in the foundry resets the hall: Husks home, nodes full, nothing on the ground', () => {
    const s = intoFoundry();
    s.enemies = [];
    placeHusk(s, 300, 300).health = 1;
    placeNode(s, 'tree', 400, 448).uses = 0;
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', x: 500, y: 448, roomId: HALL });
    die(s);
    const hall = ROOMS[HALL];
    if (!hall?.enemies || !hall.nodes) throw new Error('no hall data');
    expect(s.enemies.filter((e) => e.roomId === HALL).map((e) => ({ x: e.x, y: e.y, health: e.health }))).toEqual(
      hall.enemies.map((p) => ({ ...tileCentre(p), health: HUSK.maxHealth })),
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
    const spawn = ROOMS[FOUNDRY_ROOM]?.spawn;
    if (!spawn) throw new Error('no spawn');
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(spawn));
  });
});
