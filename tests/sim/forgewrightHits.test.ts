import { describe, expect, it } from 'vitest';
import { MELEE } from '../../src/data/combat';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { TILE_SIZE } from '../../src/data/config';
import { blastArea } from '../../src/sim/blast';
import { isSolid } from '../../src/sim/collision';
import { plated } from '../../src/sim/bossParts';
import { bellowsBox } from '../../src/sim/forgewrightParts';
import { punch } from '../../src/sim/melee';
import { sectorHitsBox } from '../../src/sim/sector';
import { roomById, type SimState } from '../../src/sim/state';
import { movePlayer, run } from './fight';
import { FORGE, hall } from './hall';

// The Forgewright's bellows under a Burst or a punch (060, after the build's review): a Burst or punch that breaks the
// second bellows vents it, but its own hit never lands on the body it just opened (only later hits do); a punch that
// strikes a bellows never also clangs on the body; and a punch reaches a bellows when the ground to the bellows is
// clear, wherever its middle stands.

const ready = (s: SimState): void => {
  s.tube.meleeCooldown = 0;
  s.tube.fireCooldown = 0;
};

/** Facing east, the right bellows below it; the player just off its right side, in reach of that bellows and its body. */
function besideBoth(s: SimState, f: { x: number; y: number; angle: number }): void {
  f.angle = 0;
  movePlayer(s, f.x + 35, f.y + 14);
}

describe('the venting tick', () => {
  it('a Burst that breaks the second bellows vents it, but lands nothing on its body; the next Burst does', () => {
    const { s, f } = hall();
    run(s, 1);
    for (const b of f.bellows) b.health = 10;
    blastArea(s, f.roomId, f.x, f.y, FORGE.bellows.offset + 16, 50, 'physical');
    expect(f.mode).toBe('vent');
    expect(f.health).toBe(FORGE.maxHealth);
    expect(s.events.blocked).toHaveLength(0);
    blastArea(s, f.roomId, f.x, f.y, FORGE.bellows.offset + 16, 50, 'physical');
    expect(f.health).toBe(FORGE.maxHealth - 50);
  });

  it('a punch that breaks the second bellows vents it, but lands nothing on its body; the next punch does', () => {
    const { s, f } = hall();
    run(s, 1);
    besideBoth(s, f);
    const arc = { x: s.player.x, y: s.player.y, dirX: -1, dirY: 0, reach: MELEE.reach, arcDegrees: MELEE.arcDegrees };
    expect(sectorHitsBox(arc, bellowsBox(f, FORGE, 1))).toBe(true);
    expect(sectorHitsBox(arc, { x: f.x, y: f.y + FORGE.hurtbox.offsetY, w: FORGE.hurtbox.w, h: FORGE.hurtbox.h })).toBe(true);
    Object.assign(f.bellows[0] ?? {}, { health: 0, patch: 100 });
    Object.assign(f.bellows[1] ?? {}, { health: MELEE.damage });
    ready(s);
    punch(s, -1, 0);
    expect(f.mode).toBe('vent');
    expect(plated(f)).toBe(false);
    expect(f.health).toBe(FORGE.maxHealth);
    ready(s);
    punch(s, -1, 0);
    expect(f.health).toBe(FORGE.maxHealth - MELEE.damage);
  });
});

describe('punching a bellows', () => {
  it('strikes the bellows alone: no clang on the plated body in the same arc', () => {
    const { s, f } = hall();
    run(s, 1);
    besideBoth(s, f);
    ready(s);
    punch(s, -1, 0);
    expect(f.bellows[1]?.health).toBe(FORGE.bellows.health - MELEE.damage);
    expect(s.events.blocked).toHaveLength(0);
    expect(f.health).toBe(FORGE.maxHealth);
  });

  it('reaches a bellows over clear ground, even with a wall between the player and its middle', () => {
    const { s, f } = hall();
    run(s, 1);
    const room = roomById(OVERWORLD_ROOM);
    // Its middle in the hall's east wall, facing north, so its left bellows stands 2 tiles west, inside the hall.
    const ty = Math.floor(f.y / TILE_SIZE) + 2;
    let tx = Math.floor(f.x / TILE_SIZE);
    while (!isSolid(room, tx, ty)) tx += 1;
    Object.assign(f, { x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE, angle: -Math.PI / 2 });
    const box = bellowsBox(f, FORGE, 0);
    expect(isSolid(room, Math.floor(box.x / TILE_SIZE), ty)).toBe(false);
    movePlayer(s, box.x - box.w / 2 - 10, box.y);
    ready(s);
    punch(s, 1, 0);
    expect(f.bellows[0]?.health).toBe(FORGE.bellows.health - MELEE.damage);
  });
});
