import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { damageEnemy } from '../../src/sim/enemies';
import { arena, at, FIELD_WALL, fireAt, hold, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil, FIELD_ROW } from './fight';

const DAMAGE = straightAmmo('arrow').damage;

describe('arrows hitting Husks', () => {
  it('removes the arrow and deals its damage', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(at(1000).x, PLAYER_AT.y));
    // 029: an arrow pierces, so it flies on to the end of its range.
    runUntil(s, () => s.arrows.length === 0, 60);
    expect(DAMAGE).toBe(14); // 041: was 10
    expect(e.health).toBe(HUSK.maxHealth - DAMAGE);
  });

  it('records the hit and flashes the Husk', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(at(1000).x, PLAYER_AT.y));
    runUntil(s, () => s.events.hits.length > 0, 30);
    expect(s.events.hits).toEqual([{ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: DAMAGE, damageType: 'physical' }]);
    expect(e.flash).toBe(HUSK.hitFlashTicks);
    run(s, HUSK.hitFlashTicks);
    expect(e.flash).toBe(0);
  });

  it('pierces (029): every Husk in line is hit once', () => {
    const s = arena();
    const first = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const second = placeHusk(s, PLAYER_AT.x + 130, PLAYER_AT.y);
    run(s, 1, fireAt(at(1000).x, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 60);
    expect(first.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(second.health).toBe(HUSK.maxHealth - DAMAGE);
  });

  it('a ley bolt hits the Husk it reaches first when hurtboxes overlap (029: ley bolts stop in the first)', () => {
    const s = arena();
    s.inventory['ley-bolt'] = 2;
    hold(s, 'ley-bolt');
    // First in the array but 1 px further along the flight, with hurtboxes overlapping.
    const far = placeHusk(s, PLAYER_AT.x + 101, PLAYER_AT.y);
    const near = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y + HUSK.feetBox.h);
    run(s, 1, fireAt(at(1000).x, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 90);
    expect(near.health).toBe(HUSK.maxHealth - 9); // 041: a ley bolt's 9 (was 14)
    expect(far.health).toBe(HUSK.maxHealth);
  });

  it('hits a Husk standing against a wall', () => {
    // The ruin field's east wall (017); the Husk stands 40 px left of it.
    const y = FIELD_ROW(14);
    const wall = FIELD_WALL.east * 32;
    const s = arena(undefined, { x: wall - 280, y });
    const e = placeHusk(s, wall - 40, y);
    e.mode = 'recover';
    e.modeTicks = 1;
    run(s, 1, fireAt(wall + 60, y));
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
    expect(e.y).toBeGreaterThan(PLAYER_AT.y - straightAmmo('arrow').knockback * HUSK.weight);
    run(s, 1);
    expect(e.y).toBeCloseTo(PLAYER_AT.y - straightAmmo('arrow').knockback * HUSK.weight, 6);
    run(s, 4);
    expect(e.y).toBeCloseTo(PLAYER_AT.y - straightAmmo('arrow').knockback * HUSK.weight, 6);
  });

  it('stops at a wall', () => {
    // The ruin field's west wall (017): its east face.
    const face = (FIELD_WALL.west + 1) * 32;
    const y = FIELD_ROW(14);
    const s = arena(undefined, { x: face + 28, y });
    const e = placeHusk(s, face + 8, y);
    run(s, 1);
    damageEnemy(s, e, DAMAGE, -1, 0);
    run(s, HUSK.hitKnockTicks);
    expect(e.x).toBe(face + 8);
  });
});

describe('Husk death', () => {
  it('dies to 4 arrows, recording a death and dropping items', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const deaths: unknown[] = [];
    runUntil(
      s,
      (st) => {
        deaths.push(...st.events.deaths);
        return st.enemies.length === 0;
      },
      120,
      fireAt(at(1000).x, PLAYER_AT.y),
    );
    expect(s.inventory.arrow).toBe(26);
    expect(deaths).toEqual([{ id: e.id, enemyId: 'husk', x: e.x, y: e.y, facing: e.facing }]);
    expect(s.groundItems.length).toBeGreaterThanOrEqual(1);
    // 1–2 resin, maybe one raw, and the first Husk's guaranteed armor.
    expect(s.groundItems.length).toBeLessThanOrEqual(4);
  });
});

describe('ley bolts', () => {
  const BOLT = straightAmmo('ley-bolt');

  function bolted() {
    const s = arena();
    s.inventory['ley-bolt'] = 6;
    hold(s, 'ley-bolt');
    return s;
  }

  it('fly at 300 px/s for 320 px', () => {
    expect(BOLT).toMatchObject({ speed: 300, range: 320, damage: 9, pierce: false, damageType: 'physical' });
    const s = bolted();
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    const bolt = s.arrows[0];
    expect(bolt?.ammoId).toBe('ley-bolt');
    run(s, 1);
    expect(bolt?.travelled).toBeCloseTo(5);
    const ticks = runUntil(s, () => s.arrows.length === 0, 100);
    expect(ticks).toBe(Math.ceil(320 / 5) - 1);
  });

  it('an arrow (029: arrows pierce) hits every Husk in line once, each knocked and flashed', () => {
    const s = arena();
    const first = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const second = placeHusk(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    const arrow = s.arrows[0];
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
    expect(first.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(second.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(arrow?.hitIds).toEqual([first.id, second.id]);
    const struck = { knockTicks: HUSK.hitKnockTicks, flash: HUSK.hitFlashTicks, mode: 'chase' };
    expect(onHit).toEqual({ [first.id]: struck, [second.id]: struck });
  });

  it('an arrow never hits the same Husk twice, even knocked back along its flight', () => {
    const s = arena();
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
    expect(hits).toEqual([DAMAGE]);
    expect(e.health).toBe(HUSK.maxHealth - DAMAGE);
  });

  it('stop at a wall', () => {
    const s = bolted();
    // The ruin field's west wall (017); fire at it from 3 tiles away.
    movePlayer(s, (FIELD_WALL.west + 3.5) * 32, FIELD_ROW(14));
    run(s, 1, fireAt(0, FIELD_ROW(14)));
    let lastX = s.player.x;
    runUntil(
      s,
      () => {
        lastX = s.arrows[0]?.x ?? lastX;
        return s.arrows.length === 0;
      },
      100,
    );
    expect(lastX).toBeGreaterThanOrEqual((FIELD_WALL.west + 1) * 32 - 5);
  });

  it('stop at a ruin block', () => {
    const s = bolted();
    // The ruin field's east wall has a block at its third row, two tiles straight above an open gap (017).
    movePlayer(s, (FIELD_WALL.east + 0.5) * 32, FIELD_ROW(17));
    run(s, 1, fireAt((FIELD_WALL.east + 0.5) * 32, 0));
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
    expect(lastY).toBeGreaterThanOrEqual(FIELD_ROW(16) - 16 - 5);
  });
});
