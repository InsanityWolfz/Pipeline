import { REGION_1_X } from '../../src/data/hollows';
import { DYING_TICKS } from '../../src/data/player';
import { OVERWORLD } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { describe, expect, it } from 'vitest';
import { advanceClock, createClock } from '../../src/sim/clock';
import { NO_COMMAND, type Command } from '../../src/sim/input';
import { craft } from '../../src/sim/crafting';
import { createSim, tileCentre } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { MAX_TICKS_PER_FRAME, TICK_RATE } from '../../src/data/config';

/** Enemies placed across every room at the start. */
const STARTING_ENEMIES = Object.values(WORLD).reduce((n, r) => n + (r.enemies?.length ?? 0), 0);

function stepped(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let i = 0; i < ticks; i++) stepSim(sim);
  return sim;
}

/** A scripted mix of walking, rolling and firing at a sweeping aim. */
function scripted(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let t = 0; t < ticks; t++) {
    const command: Command = {
      ...NO_COMMAND,
      moveX: t % 90 < 45 ? 1 : -1,
      moveY: t % 70 < 20 ? 1 : 0,
      dodge: t % 150 === 75,
      fire: t % 120 > 100,
      use: t % 120 > 100,
      aimX: sim.player.x + Math.cos(t / 10) * 100,
      aimY: sim.player.y + Math.sin(t / 10) * 100,
    };
    stepSim(sim, command);
  }
  return sim;
}

/** One step toward a point: -1, 0 or 1 per axis. */
const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 4 ? 0 : to > from ? 1 : -1);

/**
 * Walks into the Husk pack and stands there until KO'd, wakes in the foundry and
 * walks back out, then fights the reset pack from range while it has arrows, and
 * collects the drops.
 */
function scriptedFight(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let t = 0; t < ticks; t++) {
    const p = sim.player;
    const target = sim.enemies.find((e) => e.roomId === sim.roomId);
    const loot = sim.groundItems[0];
    // The first KO respawns every unclaimed room's enemies, so ids pass the starting count.
    const fighting = sim.nextEnemyId > STARTING_ENEMIES;
    const empty = (sim.inventory.arrow ?? 0) === 0;
    // Waking in the foundry after the KO, walk back out through its door to the overworld.
    const door = sim.roomId === 'foundry' ? { x: 24 * 32, y: 8.5 * 32 } : undefined;
    // After it, back toward the stairs (034 moved Region 1 +40).
    const goal = door ?? (!fighting ? target : target ? tileCentre({ tx: 40 + REGION_1_X, ty: 22 }) : loot);
    const command: Command = {
      ...NO_COMMAND,
      moveX: goal ? toward(p.x, goal.x) : 0,
      moveY: goal ? toward(p.y, goal.y) : 0,
      use: fighting && !empty && target !== undefined,
      aimX: target?.x ?? p.x,
      aimY: target?.y ?? p.y,
    };
    stepSim(sim, command);
  }
  return sim;
}

/**
 * Harvests the nearest node until it runs dry, crafts between ticks, then
 * switches through every ammo, firing each at the Husk pack.
 */
function scriptedSession(seed: number, ticks: number) {
  const sim = createSim(seed);
  sim.inventory = { 'husk-resin': 2, stone: 2, 'ley-crystal': 2, wood: 1, fiber: 1 };
  for (let t = 0; t < ticks; t++) {
    if (t === 100) for (const r of ['shaft', 'arrowhead', 'rope', 'arrow', 'casing', 'fuse', 'ley-dust', 'bomb', 'ley-bolt']) craft(sim, r);
    const p = sim.player;
    const node = sim.nodes[8];
    const pack = sim.enemies.find((e) => e.roomId === sim.roomId);
    const gathering = t < 400;
    const goal = gathering ? node : pack;
    const command: Command = {
      ...NO_COMMAND,
      moveX: goal && !sim.harvest ? toward(p.x, goal.x) : 0,
      moveY: goal && !sim.harvest ? toward(p.y, goal.y + 20) : 0,
      interact: gathering && t % 40 === 0,
      selectSlot: !gathering && t % 300 === 0 ? (t / 300) % 3 : null,
      use: !gathering && t % 50 > 30,
      aimX: pack?.x ?? p.x,
      aimY: pack?.y ?? p.y,
    };
    stepSim(sim, command);
  }
  return sim;
}

/**
 * Walks into the foundry, builds a ley bolt line, fills its hopper, waits,
 * takes the crate's bolts (047: its screen), walks back out and gets KO'd.
 */
function scriptedFoundry(seed: number, ticks: number) {
  const sim = createSim(seed);
  sim.crafted = ['ley-bolt', 'ley-dust'];
  sim.link.attuned = true;
  sim.inventory = { 'ley-crystal': 3 };
  const door = tileCentre(OVERWORLD.entrance.arrive);
  sim.player.x = door.x;
  sim.player.y = door.y;
  const build: [string, number][] = [
    ['hopper', 18],
    ['grinder', 19],
    ['focuser', 20],
    ['crate', 21],
  ];
  for (let t = 0; t < ticks; t++) {
    const p = sim.player;
    const goal =
      t < 60 ? { x: p.x, y: -100 } : t < 300 ? tileCentre({ tx: 18, ty: 6 }) : t < 900 ? tileCentre({ tx: 21, ty: 6 }) : { x: 2000, y: 272 };
    const placing = t >= 60 && t < 64 ? build[t - 60] : undefined;
    const command: Command = {
      ...NO_COMMAND,
      moveX: toward(p.x, goal.x),
      moveY: toward(p.y, goal.y),
      toggleBuild: t === 59,
      place: placing ? { pieceId: placing[0], tx: placing[1], ty: 5, facing: 'right' } : null,
      deposit: t === 250 ? { id: 0, itemId: 'ley-crystal', amount: 'all' } : null,
      // 047: the crate's screen, Ctrl+click on its bolts (E opens the screen in render; the sim takes the click).
      withdraw: t === 850 ? { id: 3, amount: 'all', itemId: 'ley-bolt' } : null,
      aimX: p.x,
      aimY: p.y,
    };
    if (t === 1050) sim.player.health = 0;
    stepSim(sim, command);
  }
  return sim;
}

function ticksFor(deltas: number[]): number {
  const clock = createClock();
  return deltas.reduce((total, delta) => total + advanceClock(clock, delta), 0);
}

describe('sim state', () => {
  it('starts at tick 0 with the given seed', () => {
    const sim = createSim(5);
    expect(sim.tick).toBe(0);
    expect(sim.seed).toBe(5);
  });

  it('advances one tick per step', () => {
    expect(stepped(5, 37).tick).toBe(37);
  });

  it('is identical for the same seed and steps', () => {
    expect(stepped(11, 200)).toEqual(stepped(11, 200));
  });

  it('is identical for the same seed and a load and fire sequence', () => {
    const a = scripted(11, 600);
    expect(a.nextArrowId).toBeGreaterThan(0);
    expect(a).toEqual(scripted(11, 600));
  });

  it('replays a fight with hits, deaths, drops and a KO identically', () => {
    // The KO lands at tick 611; 1,200 ticks keep a good stretch of the fight after it, at under half 3,000's cost.
    const a = scriptedFight(11, 1200);
    // At least one KO (the rooms respawned), and the fight went on afterwards.
    expect(a.nextEnemyId).toBeGreaterThanOrEqual(STARTING_ENEMIES * 2);
    expect(a.nextArrowId).toBeGreaterThan(0);
    expect(a).toEqual(scriptedFight(11, 1200));
  });

  it('replays harvests, crafts, ammo switches, bombs and bolts identically', () => {
    const a = scriptedSession(11, 2400);
    expect(a.crafted.length).toBeGreaterThan(0);
    expect(a).toEqual(scriptedSession(11, 2400));
  }, 20_000); // Two 2,400-tick replays: about 2 s on a quiet machine (before and after 039); 5 s is too tight when e2e runs alongside.

  it('replays building, running and emptying a foundry line identically', () => {
    // Health drops to 0 at tick 1050; the KO lands once the death animation ends.
    const ko = 1051 + DYING_TICKS;
    const a = scriptedFoundry(11, ko);
    expect(a.foundry.pieces.map((p) => p.pieceId)).toEqual(['hopper', 'grinder', 'focuser', 'crate']);
    expect(a.roomId).toBe('foundry');
    expect(a.events.ko).toBe(true);
    expect(a).toEqual(scriptedFoundry(11, ko));
  });

  it('carries the foundry line through to bolts in hand', () => {
    const a = scriptedFoundry(11, 900);
    expect(a.roomId).toBe('foundry');
    expect(a.inventory['ley-bolt']).toBeGreaterThanOrEqual(4);
  });

  it('round-trips through JSON unchanged mid-fight', () => {
    const sim = scriptedFight(4, 700);
    expect(JSON.parse(JSON.stringify(sim))).toEqual(sim);
  });

  it('round-trips through JSON unchanged', () => {
    const sim = stepped(3, 10);
    expect(JSON.parse(JSON.stringify(sim))).toEqual(sim);
  });

  it('summarizes tick and seed', () => {
    expect(summarize(stepped(8, 4))).toMatchObject({ tick: 4, seed: 8 });
  });

  it('summarizes enemies, ground items and events', () => {
    const summary = summarize(createSim(8));
    expect(summary.enemies.filter((e) => e.group === 'field')).toHaveLength(3);
    expect(summary.enemies[0]).toMatchObject({ enemyId: 'husk', mode: 'idle', health: 40, maxHealth: 40 });
    expect(summary.groundItems).toEqual([]);
    // Every event list, empty, and no KO: a key missing from createEvents fails here.
    const lists = ['hits', 'deaths', 'pickups', 'harvests', 'crafts', 'craftFails', 'bursts', 'selects', 'roomChanges'] as const;
    const later = ['places', 'placeFails', 'pickUps', 'deposits', 'withdraws', 'attunes', 'refills', 'made', 'shots', 'entranceFires', 'melees', 'banks', 'freezes', 'thaws', 'splits', 'heals'] as const;
    const site = ['sealed', 'claims', 'discoveries', 'cacheOpens', 'stashDeposits', 'stashTakes', 'supplies', 'portDeliveries', 'travels', 'identifies', 'equips', 'intakeOpens', 'restores', 'schematicDrops', 'schematicReveals', 'gates', 'objectives'] as const;
    // 034: the shield, the Bulwark and its altar; 035: the Charger's charge, the Burrower's eruption, the Sniper's bolt.
    const hollows = ['blocked', 'bossDefeats', 'summons', 'lobs', 'enemyBursts', 'pounds', 'charges', 'eruptions', 'snipes'] as const;
    // 036: the relics' rolls through, ward blocks and ember saves.
    const relics = ['stuns', 'wardBlocks', 'emberSaves'] as const;
    // 037: XP, levels, talents, respecs, and the keystones' Pools, Pool-bursts and shatters (039's names).
    const talents = ['xp', 'levelUps', 'talents', 'respecs', 'pools', 'poolBursts', 'shatters'] as const;
    // 038: landmines arming and bursting, and a cluster bomb's bomblets.
    const mines = ['mineArms', 'mineBursts', 'bombletBursts'] as const;
    // 041: the Bulwark's enrage, rear stomp and adds.
    const balance = ['enrages', 'stomps', 'addsRise', 'waveStarts', 'backWaves'] as const;
    // 043: leaving a sealed arena.
    const lock = ['arenaLeaves'] as const;
    // 042: entering the foundry (render saves on it).
    const save = ['foundryArrivals'] as const;
    // 046: the first time machines make each item (the "+ shaft" popups).
    const onboarding = ['firstMade'] as const;
    expect(Object.keys(summary.events).sort()).toEqual([...lists, ...later, ...site, ...hollows, ...relics, ...talents, ...mines, ...balance, ...lock, ...save, ...onboarding, 'lost', 'ko', 'woke', 'tubeTaken'].sort());
    for (const name of [...lists, ...later, ...site, ...hollows, ...relics, ...talents, ...mines, ...balance, ...lock, ...save, ...onboarding]) expect(summary.events[name], name).toEqual([]);
    expect(summary.events.ko).toBe(false);
    expect(summary.events.lost).toEqual({});
    expect(summary.events.tubeTaken).toBe(false);
  });

  it('summarizes rooms, build mode, unlocks and the foundry', () => {
    const s = createSim(8);
    expect(summarize(s)).toMatchObject({ room: 'overworld', rooms: ['foundry', 'overworld', 'sandbox'], building: false });
    expect(summarize(s).unlocked).toEqual(['conduit', 'sorter', 'splitter', 'hopper', 'crate']);
    expect(summarize(s).enemies.every((e) => e.room === 'overworld')).toBe(true);
    s.roomId = 'foundry';
    s.player.x = 300;
    s.player.y = 300;
    stepSim(s, { ...NO_COMMAND, place: { pieceId: 'hopper', tx: 3, ty: 3, facing: 'down' } });
    expect(summarize(s).foundry.pieces).toEqual([
      { id: 0, pieceId: 'hopper', tx: 3, ty: 3, facing: 'down', kind: 'hopper', item: null, count: 0 },
    ]);
  });

  it('summarizes nodes, the harvest, ammo, bombs, enemies\' chill and the crafted set', () => {
    const summary = summarize(createSim(8));
    expect(summary.nodes.filter((n) => n.room === 'overworld')).toHaveLength(OVERWORLD.nodes.length);
    expect(summary.nodes[0]).toMatchObject({ nodeId: 'tree', uses: 3, regrow: 0 });
    expect(summary.harvest).toBeNull();
    expect(summary.hotbar).toEqual({ slots: createSim(8).hotbar.slots, selected: 0 });
    expect(summary.hotbar.slots).toHaveLength(5);
    expect(summary.bombs).toEqual([]);
    expect(summary.enemies[0]).toMatchObject({ chill: 0, frozen: 0 });
    expect(summary.enemies[0]).not.toHaveProperty('burnTicks');
    expect(summary.crafted).toEqual([]);
  });
});

describe('fixed-timestep clock', () => {
  it('runs the same number of ticks however one second is split into frames', () => {
    const second = 1000;
    expect(ticksFor(Array(60).fill(second / 60))).toBe(TICK_RATE);
    expect(ticksFor(Array(20).fill(second / 20))).toBe(TICK_RATE);
    expect(ticksFor(Array(7).fill(second / 7))).toBe(TICK_RATE);
  });

  it('carries leftover time into the next frame', () => {
    const clock = createClock();
    const half = 1000 / TICK_RATE / 2;
    expect(advanceClock(clock, half)).toBe(0);
    expect(advanceClock(clock, half)).toBe(1);
  });

  it('caps the ticks run in one frame', () => {
    expect(advanceClock(createClock(), 60_000)).toBe(MAX_TICKS_PER_FRAME);
  });
});
