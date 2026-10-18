import { describe, expect, it } from 'vitest';
import { HIT_INVULN_TICKS, INVULN_TICKS, MAX_HEALTH, STARTING_INVENTORY } from '../../src/data/player';
import { ROOMS } from '../../src/data/rooms';
import { damagePlayer } from '../../src/sim/health';
import { nextFloat } from '../../src/sim/rng';
import { createSim, tileCentre } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HUSK, loadFull, placeHusk, PLAYER_AT, run, SEED, SWIPE_LANDS } from './fight';

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
    const s = arena(SEED, { x: 48, y: PLAYER_AT.y });
    hitFromEast(s);
    run(s, knockTicks);
    expect(s.player.x).toBe(40);
  });

  it('stops loading on a hit, keeping loaded rounds', () => {
    const s = arena();
    run(s, 1, { load: true });
    run(s, 19);
    expect(s.tube).toMatchObject({ loaded: 1, loading: true });
    hitFromEast(s);
    expect(s.tube).toMatchObject({ loaded: 1, loading: false, loadProgress: 0 });
    expect(s.inventory.arrow).toBe(29);
  });

  it('keeps firing through a hit', () => {
    const s = arena();
    loadFull(s);
    run(s, 1, { fire: true, aimX: 0, aimY: PLAYER_AT.y });
    hitFromEast(s);
    run(s, 15, { fire: true, aimX: 0, aimY: PLAYER_AT.y });
    expect(s.tube.loaded).toBe(4);
  });
});

describe('placeholder KO', () => {
  function koSim() {
    const s = arena();
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    s.player.health = damage;
    s.inventory.arrow = 3;
    s.tube.loaded = 2;
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', roomId: 'ruin-hall', x: 600, y: 448 });
    return s;
  }

  it('resets the room when health reaches 0', () => {
    const s = koSim();
    const idsBefore = s.enemies.map((e) => e.id);
    run(s, SWIPE_LANDS);
    expect(s.events.ko).toBe(true);
    expect(summarize(s).player).toMatchObject({ health: 100, ko: true });
    const room = ROOMS['ruin-hall'];
    if (!room?.enemies) throw new Error('no room enemies');
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(room.spawn));
    expect(s.inventory).toEqual(STARTING_INVENTORY);
    expect(s.tube.loaded).toBe(0);
    expect(s.arrows).toEqual([]);
    expect(s.groundItems).toEqual([]);
    expect(s.enemies.map((e) => ({ x: e.x, y: e.y, health: e.health, mode: e.mode }))).toEqual(
      room.enemies.map((p) => ({ ...tileCentre(p), health: HUSK.maxHealth, mode: 'idle' })),
    );
    for (const e of s.enemies) expect(idsBefore).not.toContain(e.id);
  });

  it('also resets nodes, bombs, the harvest and the ammo selection, but keeps the crafted set', () => {
    const s = koSim();
    const fresh = createSim(SEED);
    s.nodes = fresh.nodes.map((n) => ({ ...n, uses: 0, regrow: 99 }));
    s.inventory.bomb = 2;
    run(s, 1, { selectAmmo: 'bomb' });
    s.tube.loaded = 1;
    run(s, 1, { fire: true, aimX: PLAYER_AT.x - 150, aimY: PLAYER_AT.y });
    expect(s.bombs).toHaveLength(1);
    s.harvest = { nodeId: 0, progress: 5 };
    s.crafted = ['shaft'];
    run(s, SWIPE_LANDS - 2);
    expect(s.events.ko).toBe(true);
    expect(s.nodes).toEqual(fresh.nodes);
    expect(s.bombs).toEqual([]);
    expect(s.harvest).toBeNull();
    expect(s.tube.ammoId).toBe('arrow');
    expect(s.crafted).toEqual(['shaft']);
  });

  it('sets the KO flag for one tick only', () => {
    const s = koSim();
    run(s, SWIPE_LANDS);
    expect(s.events.ko).toBe(true);
    run(s, 1);
    expect(s.events.ko).toBe(false);
    expect(summarize(s).player.ko).toBe(false);
  });

  it('keeps the RNG running instead of reseeding it', () => {
    const s = koSim();
    nextFloat(s.rng);
    const before = [...s.rng];
    run(s, SWIPE_LANDS);
    expect(s.rng).toEqual(before);
    expect(s.rng).not.toEqual(createSim(SEED).rng);
  });

  it('gives the reset player no velocity, hurt timer or knockback', () => {
    const s = koSim();
    run(s, SWIPE_LANDS);
    expect(s.player.vx).toBe(0);
    expect(s.player.hurtTicks).toBe(0);
    expect(s.player.knockTicks).toBe(0);
  });
});
