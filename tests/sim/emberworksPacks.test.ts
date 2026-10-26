import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { CHAMPIONS } from '../../src/data/champions';
import { CLAIM_TICKS } from '../../src/data/claims';
import { inEmberworks } from '../../src/data/emberworks';
import { EMBERWORKS_ENEMIES } from '../../src/data/emberworksEnemies';
import { ANVIL_HALL } from '../../src/data/emberworksSites';
import { enemyDef } from '../../src/data/enemies';
import { HOLLOWS_ENEMIES } from '../../src/data/hollowsEnemies';
import { landmarkDef } from '../../src/data/landmarks';
import { HOLLOWS_START } from '../../src/data/playtest';
import { POPULATION } from '../../src/data/population';
import { claim } from '../../src/sim/claims';
import { spawnDrops } from '../../src/sim/drops';
import { pickSchematic } from '../../src/sim/schematics';
import { damageEnemy } from '../../src/sim/enemies';
import { inSafeZone, stepPopulation } from '../../src/sim/population';
import { createRng } from '../../src/sim/rng';
import { createSim, type SimState } from '../../src/sim/state';
import { arena, HALL, PLAYER_AT, run } from './fight';

// Region 3's packs (061): ring 4 holds only the Emberworks' four (whelps rise from golems, never spawn), at most one
// kiln-tender and two golems to a pack, only once the Emberworks' barrier is down, never in the Anvil Hall or a safe
// zone; rings 1–3 never hold them. The Ash Kilns' fixed guards must be cleared, whelps too, before its pylon can be
// claimed, and never come back once it is. Champions: 1 pack in 4, never a whelp. Drops as the spec lists.

const FOUR = ['cinder-mote', 'bellows-hound', 'slag-golem', 'kiln-tender'];
const ALL = Object.keys(EMBERWORKS_ENEMIES);
const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/** A populated `?start=hollows` world (both barriers down) with the player off in the foundry, after one population step. */
function populated(seed: number, opts: { claims?: readonly string[]; shut?: boolean } = {}): SimState {
  const s = createSim(seed, { start: HOLLOWS_START });
  for (const site of opts.claims ?? []) claim(s, site);
  s.enemies = s.enemies.filter((e) => e.group !== 'cistern-terrace' && e.group !== 'ash-kilns');
  // `?start=hollows` stands before the Bulwark falls: its first kill opens the Emberworks (060).
  s.gates.emberworks = !opts.shut;
  s.populated = true;
  s.roomId = 'foundry';
  stepPopulation(s);
  return s;
}

const packsOf = (s: SimState, ring: number) => {
  const groups = new Map<string, string[]>();
  for (const e of s.enemies) if (e.group.startsWith(`pop-${ring}-`)) groups.set(e.group, [...(groups.get(e.group) ?? []), e.enemyId]);
  return [...groups.values()];
};

describe("ring 4's packs", () => {
  it('fill all twelve with 4–5 of the four, at most one tender and two golems each, over many seeds', () => {
    expect(POPULATION.rings[4]).toEqual({ packs: 12, size: [4, 5], enemies: ['cinder-mote', 'cinder-mote', 'bellows-hound', 'bellows-hound', 'slag-golem', 'kiln-tender'], limits: { 'kiln-tender': 1, 'slag-golem': 2 } });
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const packs = packsOf(populated(seed), 4);
      expect(packs).toHaveLength(12);
      for (const pack of packs) {
        expect(pack.length).toBeGreaterThanOrEqual(4);
        expect(pack.length).toBeLessThanOrEqual(5);
        for (const id of pack) expect(FOUR).toContain(id);
        expect(pack.filter((id) => id === 'kiln-tender').length).toBeLessThanOrEqual(1);
        expect(pack.filter((id) => id === 'slag-golem').length).toBeLessThanOrEqual(2);
        pack.forEach((id) => seen.add(id));
      }
    }
    expect([...seen].sort()).toEqual([...FOUR].sort());
  });

  it('spawn only once the Emberworks barrier is down', () => {
    expect(packsOf(populated(3, { shut: true }), 4)).toEqual([]);
    expect(packsOf(populated(3), 4).length).toBeGreaterThan(0);
  });

  it("keep every other region's enemies out of ring 4, and the Emberworks' out of rings 1–3", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = populated(seed);
      for (const pack of [...packsOf(s, 1), ...packsOf(s, 2), ...packsOf(s, 3)]) for (const id of pack) expect(ALL).not.toContain(id);
      for (const e of s.enemies.filter((x) => ALL.includes(x.enemyId))) expect(inEmberworks(tileOf(e.x), tileOf(e.y)), e.group).toBe(true);
      for (const e of s.enemies.filter((x) => x.group.startsWith('pop-4-'))) {
        expect(Object.keys(HOLLOWS_ENEMIES)).not.toContain(e.enemyId);
        expect(['husk', 'wisp']).not.toContain(e.enemyId);
      }
    }
  });

  it('never spawn in the Anvil Hall or a safe zone (the Ash Kilns claimed)', () => {
    const a = ANVIL_HALL.bounds;
    for (let seed = 1; seed <= 10; seed++) {
      const s = populated(seed, { claims: ['ash-kilns'] });
      for (const e of s.enemies.filter((x) => x.group.startsWith('pop-4-'))) {
        const tx = tileOf(e.x);
        const ty = tileOf(e.y);
        expect(tx >= a.x0 && tx <= a.x1 && ty >= a.y0 && ty <= a.y1, `${tx},${ty}`).toBe(false);
        expect(inSafeZone(s, e.roomId, e.x, e.y)).toBe(false);
        expect(e.ring).toBe(4);
      }
    }
  });

  it('hold a champion in about 1 pack in 4 (ring 3’s rate), never a whelp', () => {
    expect(CHAMPIONS.chanceByRing[4]).toBe(1 / 4);
    let champions = 0;
    let packs = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = populated(seed);
      packs += packsOf(s, 4).length;
      champions += s.enemies.filter((e) => e.group.startsWith('pop-4-') && e.champion).length;
      for (const e of s.enemies.filter((x) => x.champion)) expect(e.enemyId).not.toBe('slag-whelp');
    }
    expect(champions / packs).toBeGreaterThan(0.15);
    expect(champions / packs).toBeLessThan(0.35);
  });
});

describe("the Ash Kilns' guards", () => {
  const guardsOf = (s: SimState) => s.enemies.filter((e) => e.group === 'ash-kilns');

  it('are the fixed pack: 1 slag golem, 2 bellows hounds, 2 cinder motes and 1 kiln-tender', () => {
    expect(landmarkDef('ash-kilns').guards.map((g) => g.enemyId).sort()).toEqual(['bellows-hound', 'bellows-hound', 'cinder-mote', 'cinder-mote', 'kiln-tender', 'slag-golem']);
    const s = createSim(4, { start: HOLLOWS_START });
    expect(guardsOf(s).map((e) => e.enemyId).sort()).toEqual(['bellows-hound', 'bellows-hound', 'cinder-mote', 'cinder-mote', 'kiln-tender', 'slag-golem']);
    expect(guardsOf(s).every((e) => e.ring === 4)).toBe(true);
  });

  it("block the claim until they're cleared, the golem's whelps included, and never come back once it's claimed", () => {
    const s = createSim(4, { start: HOLLOWS_START });
    // The Bulwark beaten: the Emberworks open (060).
    s.bossDefeats.push('bulwark');
    const pylon = landmarkDef('ash-kilns').pylon ?? { tx: 0, ty: 0 };
    s.player.x = (pylon.tx + 0.5) * TILE_SIZE;
    s.player.y = (pylon.ty + 1.5) * TILE_SIZE;
    // Only the golem's whelps left standing (the rest first, so no mote's death burst reaches them): no claim yet.
    for (const e of guardsOf(s)) if (e.enemyId !== 'slag-golem') damageEnemy(s, e, 1e6, 0, 0);
    run(s, 1);
    for (const e of guardsOf(s)) damageEnemy(s, e, 1e6, 0, 0);
    run(s, 1);
    expect(guardsOf(s).map((e) => e.enemyId)).toEqual(['slag-whelp', 'slag-whelp']);
    // Held where they rose, so they don't knock the player off the pylon.
    for (const e of guardsOf(s)) e.frozen = 10_000;
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS + 2);
    expect(s.claims).not.toContain('ash-kilns');
    for (const e of guardsOf(s)) damageEnemy(s, e, 1e6, 0, 0);
    run(s, 1);
    expect(guardsOf(s)).toEqual([]);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS + 2);
    expect(s.claims).toContain('ash-kilns');
    // A KO resets unclaimed land: these guards stay gone.
    s.player.health = 0;
    run(s, 400);
    expect(guardsOf(s)).toEqual([]);
  });
});

describe("the Emberworks' drops", () => {
  it('a killed one always drops a cinderite, ley-iron about 20%, the forge rivet about 4%', () => {
    const s = arena();
    s.rng = createRng(11);
    const trials = 3000;
    const count = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
    let iron = 0;
    let rivets = 0;
    for (let i = 0; i < trials; i++) {
      s.groundItems = [];
      spawnDrops(s, enemyDef(FOUR[i % FOUR.length] ?? 'cinder-mote'), PLAYER_AT.x, PLAYER_AT.y, HALL);
      expect(count('cinderite')).toBe(1);
      iron += count('ley-iron');
      rivets += count('forge-rivet');
    }
    expect(Math.abs(iron / trials - 0.2)).toBeLessThan(0.03);
    expect(Math.abs(rivets / trials - 0.04)).toBeLessThan(0.012);
  });

  it('the shared schematic roll has a schematic to land in the Emberworks (Region 3)', () => {
    const s = createSim(2);
    const pylon = landmarkDef('ash-kilns').pylon ?? { tx: 0, ty: 0 };
    expect(pickSchematic(s, 'overworld', { x: (pylon.tx + 0.5) * TILE_SIZE, y: (pylon.ty + 0.5) * TILE_SIZE })).toBe('schematic-machine-speed');
  });
});
