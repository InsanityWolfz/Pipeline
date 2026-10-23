import { describe, expect, it } from 'vitest';
import { AMMO, lobAmmo, straightAmmo } from '../../src/data/ammo';
import { stepBombs, throwBomb } from '../../src/sim/bombs';
import { arena, FIELD_WALL, fireAt, hold, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil, westWallFoot } from './fight';

// The beginner ammo's jobs (029): arrows pierce without limit, ley bolts hit hard
// without piercing, bombs burst wider with no burn.

const ARROW = straightAmmo('arrow');
const BOLT = straightAmmo('ley-bolt');
const BOMB = lobAmmo('bomb');

/** Steps until no shot is left in flight, noting how far the last one flew. */
function flyOut(s: ReturnType<typeof arena>): number {
  let travelled = 0;
  runUntil(
    s,
    () => {
      travelled = s.arrows[0]?.travelled ?? travelled;
      return s.arrows.length === 0;
    },
    120,
  );
  return travelled;
}

describe('arrows pierce (029)', () => {
  it('pass through a line of 5 Husks, hitting each once, and stop only at their range', () => {
    expect(ARROW.pierce).toBe(true);
    const s = arena();
    const husks = [60, 100, 140, 180, 220].map((dx) => placeHusk(s, PLAYER_AT.x + dx, PLAYER_AT.y));
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    const arrow = s.arrows[0];
    const travelled = flyOut(s);
    for (const e of husks) expect(e.health).toBe(HUSK.maxHealth - ARROW.damage);
    expect(arrow?.hitIds).toEqual(husks.map((e) => e.id));
    // It ran its whole range: it was last seen a step short of 320 px, and the next step ended it.
    expect(travelled).toBeGreaterThanOrEqual(ARROW.range - ARROW.speed / 60);
  });

  it('stop at a solid', () => {
    const s = arena();
    // The ruin field's west wall (017); fire at its stone's footprint (059) from 3 tiles away.
    const foot = westWallFoot(14);
    movePlayer(s, (FIELD_WALL.west + 3.5) * 32, foot.y);
    run(s, 1, fireAt(0, foot.y));
    let lastX = s.player.x;
    runUntil(
      s,
      () => {
        lastX = s.arrows[0]?.x ?? lastX;
        return s.arrows.length === 0;
      },
      100,
    );
    expect(lastX).toBeGreaterThanOrEqual(foot.x + foot.w / 2 - 8);
  });
});

describe('ley bolts do not pierce (029)', () => {
  it('stop in the first Husk they hit', () => {
    expect(BOLT.pierce).toBe(false);
    const s = arena();
    s.inventory['ley-bolt'] = 4;
    hold(s, 'ley-bolt');
    const first = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const second = placeHusk(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    flyOut(s);
    expect(first.health).toBe(HUSK.maxHealth - BOLT.damage);
    expect(second.health).toBe(HUSK.maxHealth);
  });

  it('keep the name "Ley bolt" and id ley-bolt', () => {
    expect(AMMO['ley-bolt']?.itemId).toBe('ley-bolt');
  });
});

describe('bombs (029)', () => {
  it('burst 48 px wide, physical, with no burn', () => {
    expect(BOMB.burstRadius).toBe(48);
    expect(BOMB.damageType).toBe('physical');
    expect('burn' in BOMB).toBe(false);
  });

  it('hit a Husk 40 px from where they land and miss one 56 px away', () => {
    const s = arena();
    const land = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    const near = placeHusk(s, land.x + 40, land.y);
    const far = placeHusk(s, land.x - 56, land.y);
    throwBomb(s, 'bomb', PLAYER_AT, PLAYER_AT, land, [1, 0]);
    const hits: { id: number; damageType: string }[] = [];
    for (let t = 0; t < 120 && s.bombs.length > 0; t++) {
      stepBombs(s);
      for (const h of s.events.hits) if (h.target === 'enemy') hits.push({ id: h.id, damageType: h.damageType });
    }
    expect(s.bombs).toEqual([]);
    expect(near.health).toBe(HUSK.maxHealth - BOMB.burstDamage);
    expect(far.health).toBe(HUSK.maxHealth);
    expect(hits).toEqual([{ id: near.id, damageType: 'physical' }]);
  });

  it('a plain bomb never burns: its burst deals its damage once and no more (060: only a fire round burns)', () => {
    const s = arena();
    // A Husk far off to the side, out of the player's view, so nothing else ever hits it.
    const e = placeHusk(s, PLAYER_AT.x + 400, PLAYER_AT.y);
    throwBomb(s, 'bomb', { x: e.x - 60, y: e.y }, { x: e.x - 60, y: e.y }, e, [1, 0]);
    const damage: number[] = [];
    for (let t = 0; t < 600; t++) {
      run(s, 1);
      damage.push(...s.events.hits.filter((h) => h.target === 'enemy' && h.id === e.id).map((h) => h.damage));
    }
    expect(damage).toEqual([BOMB.burstDamage]);
    expect([e.burnTicks, e.burnDps]).toEqual([0, 0]);
  });
});
