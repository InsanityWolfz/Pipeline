import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { damageEnemy } from '../../src/sim/enemies';
import { arena, fireAt, HUSK, loadFull, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';

const DAMAGE = straightAmmo('arrow').damage;

describe('arrows hitting Husks', () => {
  it('removes the arrow and deals its damage', () => {
    const s = arena();
    loadFull(s);
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 30);
    expect(DAMAGE).toBe(10);
    expect(e.health).toBe(HUSK.maxHealth - DAMAGE);
  });

  it('records the hit and flashes the Husk', () => {
    const s = arena();
    loadFull(s);
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.events.hits.length > 0, 30);
    expect(s.events.hits).toEqual([{ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: DAMAGE }]);
    expect(e.flash).toBe(HUSK.hitFlashTicks);
    run(s, HUSK.hitFlashTicks);
    expect(e.flash).toBe(0);
  });

  it('does not pierce: only the first Husk in line is hit', () => {
    const s = arena();
    loadFull(s);
    const first = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const second = placeHusk(s, PLAYER_AT.x + 130, PLAYER_AT.y);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 30);
    expect(first.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(second.health).toBe(HUSK.maxHealth);
  });

  it('hits the Husk the arrow reaches first when hurtboxes overlap', () => {
    const s = arena();
    loadFull(s);
    // First in the array but 1 px further along the flight, with hurtboxes overlapping.
    const far = placeHusk(s, PLAYER_AT.x + 101, PLAYER_AT.y);
    const near = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y + HUSK.feetBox.h);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 30);
    expect(near.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(far.health).toBe(HUSK.maxHealth);
  });

  it('hits a Husk standing against a wall', () => {
    const s = arena(undefined, { x: 1000, y: PLAYER_AT.y });
    loadFull(s);
    const e = placeHusk(s, 1240, PLAYER_AT.y);
    e.mode = 'recover';
    e.modeTicks = 1;
    run(s, 1, fireAt(1300, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 40);
    expect(e.health).toBe(HUSK.maxHealth - DAMAGE);
  });
});

describe('Husk knockback', () => {
  it('pushes the Husk 6 px along the arrow over 4 ticks', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 28, PLAYER_AT.y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    damageEnemy(s, e, DAMAGE, 0, -1);
    run(s, HUSK.hitKnockTicks - 1);
    expect(e.y).toBeGreaterThan(PLAYER_AT.y - HUSK.hitKnockback);
    run(s, 1);
    expect(e.y).toBeCloseTo(PLAYER_AT.y - HUSK.hitKnockback, 6);
    run(s, 4);
    expect(e.y).toBeCloseTo(PLAYER_AT.y - HUSK.hitKnockback, 6);
  });

  it('stops at a wall', () => {
    const s = arena(undefined, { x: 60, y: PLAYER_AT.y });
    const e = placeHusk(s, 40, PLAYER_AT.y);
    run(s, 1);
    damageEnemy(s, e, DAMAGE, -1, 0);
    run(s, HUSK.hitKnockTicks);
    expect(e.x).toBe(40);
  });
});

describe('Husk death', () => {
  it('dies to 4 arrows, recording a death and dropping items', () => {
    const s = arena();
    loadFull(s);
    const e = placeHusk(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const deaths: unknown[] = [];
    runUntil(
      s,
      (st) => {
        deaths.push(...st.events.deaths);
        return st.enemies.length === 0;
      },
      120,
      fireAt(1000, PLAYER_AT.y),
    );
    expect(s.tube.loaded).toBe(2);
    expect(deaths).toEqual([{ id: e.id, enemyId: 'husk', x: e.x, y: e.y, facing: e.facing }]);
    expect(s.groundItems.length).toBeGreaterThanOrEqual(1);
    expect(s.groundItems.length).toBeLessThanOrEqual(3);
  });
});

describe('ley bolts', () => {
  const BOLT = straightAmmo('ley-bolt');

  function bolted() {
    const s = arena();
    s.inventory['ley-bolt'] = 6;
    run(s, 1, { selectAmmo: 'ley-bolt' });
    loadFull(s);
    return s;
  }

  it('fly at 300 px/s for 320 px', () => {
    expect(BOLT).toMatchObject({ speed: 300, range: 320, damage: 14, pierce: true, damageType: 'physical' });
    const s = bolted();
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    const bolt = s.arrows[0];
    expect(bolt?.ammoId).toBe('ley-bolt');
    run(s, 1);
    expect(bolt?.travelled).toBeCloseTo(5);
    const ticks = runUntil(s, () => s.arrows.length === 0, 100);
    expect(ticks).toBe(Math.ceil(320 / 5) - 1);
  });

  it('pierce: every Husk in line is hit once', () => {
    const s = bolted();
    const first = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const second = placeHusk(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    const bolt = s.arrows[0];
    // On the tick each Husk is hit: the arrow's knockback and flash, and aggro.
    const onHit: Record<number, { knockTicks: number; flash: number; mode: string }> = {};
    runUntil(
      s,
      () => {
        for (const h of s.events.hits) {
          const e = s.enemies.find((en) => h.target === 'enemy' && en.id === h.id);
          if (e) onHit[e.id] = { knockTicks: e.knockTicks, flash: e.flash, mode: e.mode };
        }
        return s.arrows.length === 0;
      },
      100,
    );
    expect(first.health).toBe(HUSK.maxHealth - 14);
    expect(second.health).toBe(HUSK.maxHealth - 14);
    expect(bolt?.hitIds).toEqual([first.id, second.id]);
    const struck = { knockTicks: HUSK.hitKnockTicks, flash: HUSK.hitFlashTicks, mode: 'chase' };
    expect(onHit).toEqual({ [first.id]: struck, [second.id]: struck });
  });

  it('never hits the same Husk twice, even knocked back along its flight', () => {
    const s = bolted();
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    const hits: number[] = [];
    runUntil(
      s,
      () => {
        hits.push(...s.events.hits.filter((h) => h.target === 'enemy').map((h) => h.damage));
        return s.arrows.length === 0;
      },
      100,
    );
    expect(hits).toEqual([14]);
    expect(e.health).toBe(HUSK.maxHealth - 14);
  });

  it('stop at a wall', () => {
    const s = bolted();
    // The ruin hall's left wall is tile column 0; fire at it from 3 tiles away.
    movePlayer(s, 3.5 * 32, 14.5 * 32);
    run(s, 1, fireAt(0, 14.5 * 32));
    let lastX = s.player.x;
    runUntil(
      s,
      () => {
        lastX = s.arrows[0]?.x ?? lastX;
        return s.arrows.length === 0;
      },
      100,
    );
    expect(lastX).toBeGreaterThanOrEqual(32 - 5);
  });

  it('stop at a ruin block', () => {
    const s = bolted();
    // The ruin hall has a block at tile (20, 10), straight above (20, 14).
    movePlayer(s, 20.5 * 32, 14.5 * 32);
    run(s, 1, fireAt(20.5 * 32, 0));
    let lastY = s.player.y;
    runUntil(
      s,
      () => {
        lastY = s.arrows[0]?.y ?? lastY;
        return s.arrows.length === 0;
      },
      100,
    );
    // Removed at the block's bottom edge, well short of its 320 px range.
    expect(lastY).toBeGreaterThanOrEqual(11 * 32 - 5);
  });
});
