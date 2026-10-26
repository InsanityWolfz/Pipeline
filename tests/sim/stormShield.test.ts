import { describe, expect, it } from 'vitest';
import { blastArea } from '../../src/sim/blast';
import { plated } from '../../src/sim/bossParts';
import { hitRod, standingRods, stormShielded } from '../../src/sim/conductorRods';
import { createShard } from '../../src/sim/arrows';
import type { EnemyState } from '../../src/sim/enemies';
import { igniteEnemy } from '../../src/sim/fire';
import { chainLightning } from '../../src/sim/lightning';
import { punch } from '../../src/sim/melee';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { lines } from './builds';
import { movePlayer, placeHusk, run, volleyAt } from './fight';
import { CONDUCTOR, spire, topUp } from './spire';

// The Conductor's storm shield (068): while 3 or more of his six rods stand, every hit on his body is blocked, as the
// Forgewright's plating is (060): straight shots, Shards, Bursts, Bomblets, mines, punches, burn beats and Lightning
// arcs. A blocked hit sparks and clangs (a block), and his boss bar shows the blue shield. With 2 or fewer standing he
// takes damage normally; a regrown rod brings the shield back.

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

/** Keeps the player up and his attacks and blinks held off, so only the hit under test runs. */
const still = (s: SimState, c: EnemyState) => (): Record<string, never> => {
  topUp(s);
  c.conductor.attackCooldowns = [1e6, 1e6, 1e6];
  c.conductor.blinkCooldown = 1e6;
  return {};
};

/** The spire with the Conductor awake and `standing` of his rods left standing (his own rod among them). */
function withRods(standing: number): { s: SimState; c: EnemyState } {
  const { s, c } = spire();
  run(s, 1, still(s, c));
  const others = [...c.conductor.rods.keys()].filter((i) => i !== c.conductor.rod);
  for (const i of others.slice(0, 6 - standing)) hitRod(s, c, i, CONDUCTOR.rods.health, PHYSICAL);
  expect(standingRods(c)).toBe(standing);
  return { s, c };
}

/** The unit way from his feet toward the spire's middle (away from his rod), so a hit from there meets his body first. */
function inward(s: SimState, c: EnemyState): { x: number; y: number } {
  const { x, y } = summarize(s).player;
  const d = Math.hypot(x - c.x, y - c.y) || 1;
  return { x: (x - c.x) / d, y: (y - c.y) / d };
}

/** Runs `n` ticks (each command from `cmd`), counting the blocks recorded. */
function blocksOver(s: SimState, c: EnemyState, n: number, cmd: () => Partial<ReturnType<typeof volleyAt>> = () => ({})): number {
  let blocks = 0;
  run(s, n, () => {
    still(s, c)();
    const out = cmd();
    blocks += s.events.blocked.length;
    return out;
  });
  return blocks + s.events.blocked.length;
}

/** Each damage path, aimed at his body alone (no rod in reach); each returns the blocks it saw. */
const PATHS: Record<string, (s: SimState, c: EnemyState) => number> = {
  'a straight shot': (s, c) => {
    lines(s, 'ley-bolt');
    const u = inward(s, c);
    movePlayer(s, c.x + u.x * 160, c.y + u.y * 160);
    return blocksOver(s, c, 40, () => volleyAt(c.x, c.y + CONDUCTOR.hurtbox.offsetY));
  },
  'a Lightning round’s direct hit': (s, c) => {
    lines(s, 'ley-bolt+lightning');
    const u = inward(s, c);
    movePlayer(s, c.x + u.x * 160, c.y + u.y * 160);
    return blocksOver(s, c, 40, () => volleyAt(c.x, c.y + CONDUCTOR.hurtbox.offsetY));
  },
  'a Shard': (s, c) => {
    const u = inward(s, c);
    const at = { x: c.x + u.x * 30, y: c.y + CONDUCTOR.hurtbox.offsetY + u.y * 30 };
    s.arrows.push(createShard(s.nextArrowId++, { ammoId: 'ley-bolt+split', roomId: c.roomId, knockback: 0 }, at.x, at.y, -u.x, -u.y, -1, { speed: 300, range: 200, damage: 40, damageType: 'physical', fromSplit: true }));
    return blocksOver(s, c, 10);
  },
  'a Burst': (s, c) => {
    blastArea(s, c.roomId, c.x, c.y, 30, 50, 'physical');
    return s.events.blocked.length;
  },
  'a Bomblet': (s, c) => {
    s.mines.bomblets.push({ id: s.mines.nextId++, ammoId: 'bomb+cluster', roomId: c.roomId, fromX: c.x, fromY: c.y, x: c.x, y: c.y, ticks: 1, delay: 1, damage: 50, radius: 30 });
    return blocksOver(s, c, 1);
  },
  'a mine': (s, c) => {
    s.mines.armed.push({ id: s.mines.nextId++, ammoId: 'landmine', roomId: c.roomId, x: c.x, y: c.y, elapsed: 0, armTicks: 1, damage: 50, radius: 30 });
    return blocksOver(s, c, 1);
  },
  'a punch': (s, c) => {
    const u = inward(s, c);
    movePlayer(s, c.x + u.x * 20, c.y + u.y * 20 + CONDUCTOR.hurtbox.offsetY / 2);
    s.tube.meleeCooldown = 0;
    s.tube.fireCooldown = 0;
    punch(s, -u.x, -u.y);
    expect(s.events.melees).toHaveLength(1);
    return s.events.blocked.length;
  },
  'a burn’s beat': (s, c) => {
    igniteEnemy(s, c, 30);
    return blocksOver(s, c, 61);
  },
};

describe('the storm shield (068)', () => {
  it('is up with 3 or more rods standing, down with 2 or fewer, and back when a rod regrows', () => {
    expect(CONDUCTOR.shieldRods).toBe(3);
    for (const n of [6, 5, 4, 3]) expect(stormShielded(withRods(n).c), `${n} standing`).toBe(true);
    const { s, c } = withRods(2);
    expect([stormShielded(c), plated(c)]).toEqual([false, false]);
    run(s, CONDUCTOR.rods.regrowTicks, still(s, c));
    expect(standingRods(c)).toBeGreaterThanOrEqual(3);
    expect([stormShielded(c), plated(c)]).toEqual([true, true]);
  });

  it('shows as the plating does: `plated` in the summary, for the boss bar’s shield', () => {
    const up = withRods(4);
    expect(summarize(up.s).bosses).toEqual([expect.objectContaining({ enemyId: 'conductor', plated: true })]);
    const down = withRods(2);
    expect(summarize(down.s).bosses).toEqual([expect.objectContaining({ enemyId: 'conductor', plated: false })]);
  });

  for (const [name, hit] of Object.entries(PATHS)) {
    it(`blocks ${name} with 3 standing (a spark and clang, no damage); with 2 it lands`, () => {
      const up = withRods(3);
      up.s.events.blocked = [];
      expect(hit(up.s, up.c)).toBeGreaterThan(0);
      expect(up.c.health).toBe(CONDUCTOR.maxHealth);
      // His body took it, not a rod: every standing rod is whole.
      expect(up.c.conductor.rods.filter((r) => r.regrow <= 0).every((r) => r.health === CONDUCTOR.rods.health)).toBe(true);
      const down = withRods(2);
      hit(down.s, down.c);
      expect(down.c.health).toBeLessThan(CONDUCTOR.maxHealth);
    });
  }

  it('a piercing arrow glances off his shielded body and flies on, into the rod behind him', () => {
    const { s, c } = withRods(3);
    lines(s, 'arrow');
    const u = inward(s, c);
    movePlayer(s, c.x + u.x * 160, c.y + u.y * 160);
    s.events.blocked = [];
    const blocks = blocksOver(s, c, 40, () => volleyAt(c.x, c.y + CONDUCTOR.hurtbox.offsetY));
    expect(blocks).toBeGreaterThan(0);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
    expect(c.conductor.rods[c.conductor.rod]?.health).toBeLessThan(CONDUCTOR.rods.health);
  });

  it('a Lightning arc skips him while shielded, and reaches him with 2 standing', () => {
    for (const [standing, lands] of [
      [3, false],
      [2, true],
    ] as const) {
      const { s, c } = withRods(standing);
      const husk = placeHusk(s, c.x + 40, c.y, c.roomId);
      husk.health = 1e6;
      chainLightning(s, husk, 100);
      expect(s.events.arcs.some((a) => a.to === c.id), `${standing} standing`).toBe(lands);
      expect(c.health < CONDUCTOR.maxHealth).toBe(lands);
    }
  });
});
