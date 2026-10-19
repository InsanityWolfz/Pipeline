import { describe, expect, it } from 'vitest';
import { HIT_INVULN_TICKS, INVULN_TICKS, MAX_HEALTH } from '../../src/data/player';
import { STATIC_ROOMS } from '../../src/data/rooms';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { damagePlayer } from '../../src/sim/health';
import { nextFloat } from '../../src/sim/rng';
import { createSim, resetWorld, tileCentre } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { DYING_TICKS } from '../../src/data/player';
import { arena, at, FIELD_WALL, runUntilKo, HUSK, placeHusk, PLAYER_AT, run, SEED, SWIPE_LANDS } from './fight';

const { damage, knockback, knockTicks } = HUSK.swipe;

/** A hit from the east, pushing the player west. */
const hitFromEast = (s: ReturnType<typeof arena>) => damagePlayer(s, damage, -1, 0, knockback, knockTicks);

describe('player health', () => {
  it('starts at max health', () => {
    expect(MAX_HEALTH).toBe(100);
    expect(summarize(createSim(SEED)).player).toMatchObject({ health: 100, maxHealth: 100, hitInvulnerable: false, ko: false });
  });

  it('takes a Husk swipe: 20 damage and hit invulnerability', () => {
    const s = arena();
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, SWIPE_LANDS - 1);
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(s.player.health).toBe(80);
    expect(summarize(s).player.hitInvulnerable).toBe(true);
    expect(s.player.hurtTicks).toBe(HIT_INVULN_TICKS);
  });

  it('ignores hits for HIT_INVULN_TICKS after a hit', () => {
    const s = arena();
    expect(hitFromEast(s)).toBe(true);
    run(s, HIT_INVULN_TICKS - 1);
    expect(hitFromEast(s)).toBe(false);
    expect(s.player.health).toBe(80);
    run(s, 1);
    expect(hitFromEast(s)).toBe(true);
    expect(s.player.health).toBe(60);
  });

  it('ignores hits during the roll i-frames and takes them after', () => {
    const s = arena();
    run(s, 1, { dodge: true, moveY: 1 });
    expect(hitFromEast(s)).toBe(false);
    run(s, INVULN_TICKS - 1);
    expect(hitFromEast(s)).toBe(false);
    run(s, 1);
    expect(hitFromEast(s)).toBe(true);
    expect(s.player.health).toBe(80);
  });

  it('knocks the player back 24 px over 6 ticks', () => {
    const s = arena();
    hitFromEast(s);
    run(s, knockTicks - 1);
    expect(s.player.x).toBeGreaterThan(PLAYER_AT.x - knockback);
    run(s, 1);
    expect(s.player.x).toBeCloseTo(PLAYER_AT.x - knockback, 6);
    run(s, 10);
    expect(s.player.x).toBeCloseTo(PLAYER_AT.x - knockback, 6);
    expect(s.player.y).toBe(PLAYER_AT.y);
  });

  it('lets input steer on top of the knockback', () => {
    const s = arena();
    hitFromEast(s);
    run(s, knockTicks, { moveY: 1 });
    expect(s.player.x).toBeCloseTo(PLAYER_AT.x - knockback, 6);
    expect(s.player.y).toBeGreaterThan(PLAYER_AT.y);
  });

  it('stops the knockback at a wall', () => {
    // Against the east face of the ruin field's west wall (017).
    const face = (FIELD_WALL.west + 1) * 32;
    const s = arena(SEED, { x: face + 16, y: 14.5 * 32 });
    hitFromEast(s);
    run(s, knockTicks);
    expect(s.player.x).toBe(face + 8);
  });

  it('keeps firing through a hit', () => {
    const s = arena();
    run(s, 1, { fire: true, aimX: 0, aimY: PLAYER_AT.y });
    hitFromEast(s);
    run(s, 15, { fire: true, aimX: 0, aimY: PLAYER_AT.y });
    expect(s.inventory.arrow).toBe(28);
  });
});

describe('death and the KO (011)', () => {
  function koSim() {
    const s = arena();
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    s.player.health = damage;
    s.inventory.arrow = 3;
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', roomId: OVERWORLD_ROOM, ...at(600) });
    return s;
  }

  it('at 0 health plays the death, then wakes the player in the foundry with the rooms reset', () => {
    const s = koSim();
    const idsBefore = s.enemies.map((e) => e.id);
    run(s, SWIPE_LANDS);
    expect(s.player.dying).toBe(DYING_TICKS);
    runUntilKo(s);
    expect(summarize(s).player).toMatchObject({ health: 100, ko: true, dying: 0 });
    const field = OVERWORLD.packs.filter((p) => p.group === 'field');
    expect(s.roomId).toBe('foundry');
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(STATIC_ROOMS.foundry?.spawn ?? { tx: 0, ty: 0 }));
    // Banked at the start: 30 arrows; it carried 3, so it keeps 3.
    expect(s.inventory).toEqual({ arrow: 3 });
    expect(s.arrows).toEqual([]);
    expect(s.groundItems).toEqual([]);
    const hall = s.enemies.filter((e) => e.group === 'field');
    expect(hall.map((e) => ({ x: e.x, y: e.y, health: e.health, mode: e.mode }))).toEqual(
      field.map((p) => ({ ...tileCentre(p), health: HUSK.maxHealth, mode: 'idle' })),
    );
    for (const e of s.enemies) expect(idsBefore).not.toContain(e.id);
  });

  it('also resets nodes, bombs, the harvest and the ammo selection, but keeps the crafted set', () => {
    const s = koSim();
    const fresh = createSim(SEED);
    s.nodes = fresh.nodes.map((n) => ({ ...n, uses: 0, regrow: 99 }));
    s.inventory.bomb = 2;
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, { fire: true, aimX: PLAYER_AT.x - 150, aimY: PLAYER_AT.y });
    expect(s.bombs).toHaveLength(1);
    s.harvest = { nodeId: 0, progress: 5 };
    s.crafted = ['shaft'];
    runUntilKo(s);
    expect(s.nodes).toEqual(fresh.nodes);
    expect(s.bombs).toEqual([]);
    expect(s.harvest).toBeNull();
    expect(s.tube.ammoId).toBe('arrow');
    expect(s.crafted).toEqual(['shaft']);
  });

  it('sets the KO flag for one tick only', () => {
    const s = koSim();
    runUntilKo(s);
    run(s, 1);
    expect(s.events.ko).toBe(false);
    expect(summarize(s).player.ko).toBe(false);
  });

  it('keeps the RNG running instead of reseeding it: a KO draws only what the world reset rolls', () => {
    const s = koSim();
    nextFloat(s.rng);
    run(s, SWIPE_LANDS);
    const before = [...s.rng];
    runUntilKo(s);
    // The reset rolls each landmark guard pack's champion chance (032), carrying on from where the RNG was.
    const twin = createSim(SEED);
    twin.claims = [...s.claims];
    twin.rng = [before[0] ?? 0, before[1] ?? 0, before[2] ?? 0, before[3] ?? 0];
    resetWorld(twin);
    expect(s.rng).toEqual(twin.rng);
    expect(s.rng).not.toEqual(createSim(SEED).rng);
  });

  it('gives the reset player no velocity, hurt timer or knockback', () => {
    const s = koSim();
    runUntilKo(s);
    expect(s.player.vx).toBe(0);
    expect(s.player.hurtTicks).toBe(0);
    expect(s.player.knockTicks).toBe(0);
  });
});
