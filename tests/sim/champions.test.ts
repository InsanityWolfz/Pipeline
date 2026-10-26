import { describe, expect, it } from 'vitest';
import { UNIDENTIFIED_ARMOR } from '../../src/data/gear';
import { CHAMPIONS } from '../../src/data/champions';
import { ENEMIES, attackOf, enemyDef, type EnemyDef } from '../../src/data/enemies';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { defOf, rollChampions } from '../../src/sim/champions';
import { scaledDef } from '../../src/sim/ringScale';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { createRng } from '../../src/sim/rng';
import { createSim } from '../../src/sim/state';
import { spawnDrops } from '../../src/sim/drops';
import { summarize } from '../../src/sim/summary';
import { arena, PLAYER_AT, run, runUntil, SWIPE_LANDS } from './fight';

/** A def as its ring 1 champion: 032's numbers, unchanged by 041's ring scaling. */
const champion1 = (def: EnemyDef): EnemyDef => scaledDef(def, 1, true);

// Champions (032): a rule over enemy data. Any non-boss enemy can spawn as one, bigger,
// tougher, a little faster and harder-hitting, named, with richer drops.

const NON_BOSS = Object.values(ENEMIES).filter((d) => !d.boss);
function damageOf(d: EnemyDef): number {
  switch (d.kind) {
    case 'melee':
      return d.swipe.damage;
    case 'caster':
      return d.cast.orbDamage;
    case 'slammer':
      return d.slam.damage;
    case 'bulwark':
      return d.pound.damage;
    case 'forgewright':
      return d.slam.damage;
    case 'charger':
      return d.charge.damage;
    case 'burrower':
      return d.burrow.damage;
    case 'shardback':
      return d.bash.damage;
    case 'sniper':
      return d.snipe.damage;
    case 'mote':
      return d.swell.damage;
    case 'hound':
      return d.dash.damage;
    case 'golem':
      return d.slam.damage;
    // 061: the tender has no attack (its heal scales as damage would).
    case 'tender':
      return d.beam.heal;
  }
}
const pack = (ids: readonly string[]): EnemyState[] => ids.map((id, i) => createEnemy(i, id, { x: i * 40, y: 0 }, 'overworld', 'pop-1-0'));

describe('the champion tuning', () => {
  it("is Shaun's round 6: 1.5× size and HP, 1.3× damage, 1.15× speed, 2–3 drop rolls, one armor piece, 1 in 8 and 1 in 5 (and 035's ring 3, 1 in 4)", () => {
    expect(CHAMPIONS).toMatchObject({ scale: 1.5, health: 1.5, damage: 1.3, speed: 1.15, dropRolls: [2, 3], armor: 1, chanceByRing: { 1: 1 / 8, 2: 1 / 5, 3: 1 / 4 } });
    expect(CHAMPIONS.glow.color).toBe('gold-trim');
  });

  it('has a list of short names for every non-boss enemy', () => {
    for (const d of NON_BOSS) {
      const names = CHAMPIONS.names[d.id] ?? [];
      expect(names.length, d.id).toBeGreaterThanOrEqual(3);
      for (const n of names) expect(n).toMatch(/^[A-Z][a-z]+$/);
    }
    expect(CHAMPIONS.names.husk).toEqual(expect.arrayContaining(['Mossjaw', 'Rootgrip', 'Thornback']));
  });
});

describe('the champion def (a ring 1 champion), applied to every non-boss enemy', () => {
  it.each(NON_BOSS.map((d) => [d.id, d] as const))('%s: scaled size, health, damage and speed; timings and reach unchanged', (_id, def) => {
    const c = champion1(def);
    expect(c.feetBox).toEqual({ w: def.feetBox.w * 1.5, h: def.feetBox.h * 1.5 });
    expect(c.hurtbox).toEqual({ w: def.hurtbox.w * 1.5, h: def.hurtbox.h * 1.5, offsetY: def.hurtbox.offsetY * 1.5 });
    expect(c.maxHealth).toBe(Math.round(def.maxHealth * 1.5));
    expect(c.walkSpeed).toBeCloseTo(def.walkSpeed * 1.15);
    expect(damageOf(c)).toBe(Math.round(damageOf(def) * 1.3));
    const a = attackOf(def);
    const b = attackOf(c);
    for (const k of ['windupTicks', 'swipeTicks', 'recoverTicks', 'cooldownTicks'] as const) expect(b[k], k).toBe(a[k]);
    if (def.kind === 'melee' && c.kind === 'melee') expect([c.swipe.reach, c.swipe.triggerRange, c.swipe.arcDegrees]).toEqual([def.swipe.reach, def.swipe.triggerRange, def.swipe.arcDegrees]);
    if (def.kind === 'caster' && c.kind === 'caster') expect([c.cast.aggroRange, c.cast.orbRange, c.cast.orbSize, c.cast.keepAway]).toEqual([def.cast.aggroRange, def.cast.orbRange, def.cast.orbSize, def.cast.keepAway]);
    expect(def).toEqual(enemyDef(def.id));
  });
});

describe('the champion roll', () => {
  it.each([1, 2, 3] as const)('hits about its chance over many seeds in ring %i', (ring) => {
    const trials = 4000;
    let hits = 0;
    for (let seed = 0; seed < trials; seed++) if (rollChampions(createRng(seed), pack(['husk', 'husk', 'wisp']), ring)) hits++;
    expect(Math.abs(hits / trials - (CHAMPIONS.chanceByRing[ring] ?? 0))).toBeLessThan(0.02);
  });

  it('makes exactly one member a champion on a hit, named from its list, at full champion health', () => {
    for (let seed = 0; seed < 200; seed++) {
      const members = pack(['husk', 'husk', 'wisp', 'husk']);
      const hit = rollChampions(createRng(seed), members, 2);
      const champs = members.filter((e) => e.champion);
      expect(champs).toHaveLength(hit ? 1 : 0);
      for (const e of champs) {
        expect(CHAMPIONS.names[e.enemyId]).toContain(e.champion?.name);
        // Its champion's full health in its ring (041: these stand in ring 3).
        expect(e.health).toBe(defOf(e).maxHealth);
      }
    }
  });

  it('never picks a boss, and a pack of only bosses never has one; ring 0 has no chance', () => {
    for (let seed = 0; seed < 300; seed++) {
      const members = pack(['pylon-warden', 'husk']);
      rollChampions(createRng(seed), members, 2);
      expect(members[0]?.champion).toBeNull();
      const bosses = pack(['pylon-warden']);
      expect(rollChampions(createRng(seed), bosses, 2)).toBeNull();
      expect(rollChampions(createRng(seed), pack(['husk']), 0)).toBeNull();
    }
  });

  it("never touches the tutorial's packs; landmark guard packs roll at the start", () => {
    let landmarkChamps = 0;
    for (let seed = 0; seed < 120; seed++) {
      const s = createSim(seed);
      for (const e of s.enemies) if (e.group === 'field' || e.group === 'shrine') expect(e.champion, `${seed} ${e.group}`).toBeNull();
      landmarkChamps += s.enemies.filter((e) => e.champion && LANDMARK_LIST.some((l) => l.id === e.group)).length;
      for (const l of LANDMARK_LIST) expect(s.enemies.filter((e) => e.group === l.id && e.champion).length).toBeLessThanOrEqual(1);
    }
    expect(landmarkChamps).toBeGreaterThan(0);
  });

  it('population packs roll too', () => {
    let champs = 0;
    for (let seed = 0; seed < 30; seed++) {
      const s = arena(seed);
      s.populated = true;
      run(s, 1);
      champs += s.enemies.filter((e) => e.group.startsWith('pop-') && e.champion).length;
    }
    expect(champs).toBeGreaterThan(0);
  });
});

describe('a champion in play', () => {
  /** A Husk a little right of the player, made a champion. */
  function champHusk() {
    const s = arena();
    const e = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 20, y: PLAYER_AT.y }, 'overworld', 'pop-1-0');
    e.champion = { name: 'Mossjaw' };
    e.health = champion1(enemyDef('husk')).maxHealth;
    s.enemies.push(e);
    return { s, e };
  }

  it('swipes for 26 (20 × 1.3, rounded) and walks 1.15× as fast', () => {
    const { s } = champHusk();
    s.firstHuskDropped = true;
    const before = s.player.health;
    runUntil(s, (x) => x.events.hits.some((h) => h.target === 'player'), SWIPE_LANDS + 30);
    expect(before - s.player.health).toBe(26);
    const far = champHusk();
    const e = far.e;
    e.x = PLAYER_AT.x + 200;
    e.mode = 'chase';
    const x0 = e.x;
    run(far.s, 10);
    expect(x0 - e.x).toBeCloseTo((10 * 50 * 1.15) / 60, 1);
  });

  it('dies with its drop table rolled 2–3 times, exactly one armor piece, and champion: true on its death event', () => {
    let three = false;
    for (let seed = 0; seed < 40; seed++) {
      const s = arena(seed);
      s.firstHuskDropped = true;
      const e = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 200, y: PLAYER_AT.y }, 'overworld', 'pop-1-0');
      e.champion = { name: 'Thornback' };
      e.health = 0;
      s.enemies.push(e);
      run(s, 1);
      expect(s.events.deaths).toEqual([expect.objectContaining({ id: e.id, champion: true })]);
      const items = s.groundItems.map((g) => g.itemId);
      expect(items.filter((i) => i === UNIDENTIFIED_ARMOR)).toHaveLength(1);
      const resin = items.filter((i) => i === 'husk-resin').length;
      // 1–2 resin a roll: two rolls give 2–4, three give 3–6.
      expect(resin).toBeGreaterThanOrEqual(2);
      expect(resin).toBeLessThanOrEqual(6);
      three ||= resin >= 5;
    }
    expect(three).toBe(true);
  });

  it("rolls its table's rare entries once, not once per drop roll", () => {
    const def = enemyDef('husk');
    const rare = { ...def, drops: { ...def.drops, rare: [{ itemId: 'warden-core', chance: 1 }] } };
    for (let seed = 0; seed < 20; seed++) {
      const s = arena(seed);
      s.firstHuskDropped = true;
      spawnDrops(s, rare, PLAYER_AT.x + 200, PLAYER_AT.y, 'overworld', true);
      expect(s.groundItems.filter((g) => g.itemId === 'warden-core')).toHaveLength(1);
    }
  });

  it('an empty pack draws nothing from the RNG', () => {
    const rng = createRng(5);
    const before = [...rng];
    expect(rollChampions(rng, [], 2)).toBeNull();
    expect(rng).toEqual(before);
  });

  it("a normal enemy's death carries no champion flag", () => {
    const s = arena();
    const e = createEnemy(s.nextEnemyId++, 'wisp', { x: PLAYER_AT.x + 200, y: PLAYER_AT.y }, 'overworld');
    e.health = 0;
    s.enemies.push(e);
    run(s, 1);
    expect(s.events.deaths[0]).not.toHaveProperty('champion');
  });

  it('reports champion: { name } or null in the summary, with the scaled max health', () => {
    const { s, e } = champHusk();
    const other = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 300, y: PLAYER_AT.y }, 'overworld');
    s.enemies.push(other);
    const sum = summarize(s);
    expect(sum.enemies.find((x) => x.id === e.id)).toMatchObject({ champion: { name: 'Mossjaw' }, maxHealth: 60 });
    expect(sum.enemies.find((x) => x.id === other.id)).toMatchObject({ champion: null, maxHealth: 40 });
  });
});
