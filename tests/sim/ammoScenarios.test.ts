import { describe, expect, it } from 'vitest';
import { clearTicks, FAMILIES, MEADOW, ringed, type Family, type Scenario } from './ammoScenarios';

// 041.9: each ammo family wins its own scenario, from one entrance with no talents, on
// seeds 1–5: the shortest time from its first round to the last death, by at least 10% over
// the next. A family that can't finish in 60 s scores 60 s. These scenarios use no RNG, so
// each seed plays out alike. Two of the four aren't met at Shaun's per-hit numbers: their
// tests are it.fails, for open question 041.14 (the spec: stop and report, don't retune).

const SEEDS = [1, 2, 3, 4, 5] as const;
const CAP = 60 * 60;
/** The winner's margin over the next: at least 10%. */
const MARGIN = 1.1;

/** The meadow's harness-built wall (041.9): a 3-tile segment, one column, 48 px east of the player. */
const WALL = [26, 27, 28].map((ty) => ({ tx: 82, ty }));

/** Keeps placed enemies coming at the player, on screen or not (they'd otherwise leash home off it). */
const keepComing = (_s: unknown, placed: readonly { offScreenTicks: number }[]): void => {
  for (const e of placed) e.offScreenTicks = 0;
};

const SCENARIOS: Record<'line' | 'cluster' | 'walls' | 'still', Scenario> = {
  // 5 ring 1 Husks single file, 24 px apart, the first 280 px off, walking straight at the player.
  line: { at: MEADOW, place: (s) => [0, 1, 2, 3, 4].map((i) => ringed(s, 'husk', MEADOW.x + 280 + i * 24, MEADOW.y, 1)), hold: keepComing },
  // 8 ring 2 Husks evenly round a 40 px ring, 240 px off, walking at the player.
  cluster: {
    at: MEADOW,
    place: (s) => Array.from({ length: 8 }, (_, i) => ringed(s, 'husk', MEADOW.x + 240 + Math.cos((i * Math.PI) / 4) * 40, MEADOW.y + Math.sin((i * Math.PI) / 4) * 40, 2)),
    hold: keepComing,
  },
  // 4 ring 2 Wisps 200 px off behind the wall, keeping their distance as Wisps do.
  walls: { at: MEADOW, walls: WALL, place: (s) => [-36, -12, 12, 36].map((dy) => ringed(s, 'wisp', MEADOW.x + 200, MEADOW.y + dy, 2)), hold: keepComing },
  // One ring 3 Shardback 150 px off, its shield facing the player, held in place (041.10).
  still: {
    at: MEADOW,
    place: (s) => {
      const e = ringed(s, 'shardback', MEADOW.x + 150, MEADOW.y, 3);
      e.angle = Math.PI;
      return [e];
    },
    hold: (_s, placed) => {
      for (const e of placed) {
        e.x = MEADOW.x + 150;
        e.y = MEADOW.y;
      }
    },
  },
};

/**
 * Whether `family` wins `scenario` on a seed: its time, and the first other family to finish within its time × 1.1
 * (none, if it wins). The others only run that long: past it, they've lost by the margin.
 */
function wins(seed: number, scenario: Scenario, family: Family): { ticks: number; beaten: string | null } {
  const ticks = clearTicks(seed, scenario, family, CAP);
  const cut = Math.ceil(ticks * MARGIN);
  for (const other of Object.keys(FAMILIES) as Family[]) {
    if (other === family) continue;
    const t = clearTicks(seed, scenario, other, cut);
    if (t < cut) return { ticks, beaten: `${other} ${t}` };
  }
  return { ticks, beaten: null };
}

/** Asserts `family` wins on every seed, logging each seed's time. */
function winsEverySeed(name: keyof typeof SCENARIOS, family: Family): void {
  const runs = SEEDS.map((seed) => wins(seed, SCENARIOS[name], family));
  console.log(`041 ${name}: ${family}`, runs.map((r) => `${r.ticks}${r.beaten ? ` (beaten: ${r.beaten})` : ''}`).join(' | '));
  for (const [i, r] of runs.entries()) expect(r.beaten, `seed ${SEEDS[i]}`).toBeNull();
}

describe('each ammo family wins its own scenario (041.9)', () => {
  it('arrows win against a line of Husks', () => {
    // Measured, every seed: arrows 69 ticks, bombs 257, Homing ley bolts 483, landmines 60 s.
    winsEverySeed('line', 'arrow');
  });

  it('landmines win against a stationary shielded target', () => {
    // Measured, every seed: landmines 422 ticks, bombs 602; arrows and ley bolts never get past its shield (60 s).
    winsEverySeed('still', 'mine');
  });

  // Not met (041.14): the cluster walks in and lines up, so a piercing arrow hits several at once. Measured, every seed:
  // arrows 221 ticks, bombs 332, ley bolts and landmines 60 s.
  it.fails('bombs win against a cluster (041.9: not met, open question 041.14)', () => {
    winsEverySeed('cluster', 'bomb');
  });

  // Not met (041.14): the Wisps settle behind the wall to cast and hold still, so bombs land on them, and a Homing
  // bolt can't lock a target behind a wall this close (its 64 px lock radius) and flies into it. Measured, every seed:
  // bombs 124 ticks, landmines 576, arrows and ley bolts 60 s. The Homing bolt's 60 s run is the cost here.
  it.fails('Homing ley bolts win against Wisps behind a wall (041.9: not met, open question 041.14)', () => {
    winsEverySeed('walls', 'ley');
  }, 30_000);
});
