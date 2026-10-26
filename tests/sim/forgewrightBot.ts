import { ANVIL_ARENA } from '../../src/data/arenas';
import { TICK_RATE, TILE_SIZE } from '../../src/data/config';
import type { EnemyState } from '../../src/sim/enemies';
import { floodRect } from '../../src/sim/forgewrightAi';
import type { SimState } from '../../src/sim/state';
import { playerStats } from '../../src/sim/stats';
import { ROLLER, steer, takenThisTick } from './bots';
import { decentBuild, feed, lines } from './builds';
import { run } from './fight';
import { hall } from './hall';

// 060's Forgewright fights (test code), shared by tests/sim/forgewrightFight.test.ts and the measurement in
// tests/measure/forgewright.measure.ts: 041.7's decent build (level 7, its six talents and four Common pieces) with
// three entrances fed by arrow lines, and a decent bot that plays the fight as the spec draws it.

/** 068's target: a decent three-entrance build kills it in about 90–120 s (060's was 60–90 s). */
export const TARGET = { min: 90 * TICK_RATE, max: 120 * TICK_RATE } as const;

/** What a fight came to. */
export interface Fight {
  won: boolean;
  ko: boolean;
  ticks: number;
  /** Damage taken, HP, as a share of max health; and the vents it got. */
  taken: number;
  share: number;
  vents: number;
  /** 068: the Forge Floods it brought down. */
  floods: number;
  /** 068: the Forgewright's health left as it ended. */
  left: number;
}

/** A bot: the command it sends each tick. */
export type Bot = (s: SimState, f: EnemyState) => Parameters<typeof run>[2];

/** Runs a fight for up to `limit` ticks from just inside the hall's door, the bot choosing each tick's command (`keepUp`: the player's health kept full). */
export function fight(seed: number, limit: number, bot: Bot, keepUp = false): Fight {
  const { s, f } = hall(130, seed);
  decentBuild(s);
  lines(s, 'arrow', 'arrow', 'arrow');
  const max = playerStats(s).maxHealth;
  let taken = 0;
  let vents = 0;
  let floods = 0;
  for (let t = 1; t <= limit; t++) {
    feed(s);
    run(s, 1, bot(s, f));
    // 068: the kill-time record keeps the player's health up, so a fight runs to its end.
    if (keepUp) s.player.health = max;
    taken += takenThisTick(s);
    vents += s.events.vents.length;
    floods += s.events.floodStarts.length;
    const end = (won: boolean, ko: boolean): Fight => ({ won, ko, ticks: t, taken, share: Math.round((taken / max) * 100) / 100, vents, floods, left: Math.round(f.health) });
    if (s.bossDefeats.includes('forgewright')) return end(true, false);
    if (s.player.dying > 0) return end(false, true);
  }
  return { won: false, ko: false, ticks: limit, taken, share: Math.round((taken / max) * 100) / 100, vents, floods, left: Math.round(f.health) };
}

/** The decent bot's numbers: it keeps 7.5 tiles off, face-on, and stays this far inside the walls. */
const DECENT = { range: 240, margin: 24, circleDeg: 35 } as const;

/** A point clamped inside the hall's floor, `margin` px in from its walls, and (with `side`) to that half. */
function inHall(x: number, y: number, side: number): { x: number; y: number } {
  const r = ANVIL_ARENA.inside;
  const T = TILE_SIZE;
  const mid = floodRect(ANVIL_ARENA, -1).x1;
  const [lo, hi] = side < 0 ? [r.x0 * T, mid] : side > 0 ? [mid, (r.x1 + 1) * T] : [r.x0 * T, (r.x1 + 1) * T];
  const m = DECENT.margin;
  return { x: Math.min(hi - m, Math.max(lo + m, x)), y: Math.min((r.y1 + 1) * T - m, Math.max(r.y0 * T + m, y)) };
}

/**
 * The decent bot: it stands about 7.5 tiles from the Forgewright on the line between them (it turns to face the
 * player, so the three-lane fan's outer lanes find both bellows), circling along the walls when pinned, with fire held
 * at its body's middle. It reads the flood's red half once a quarter second has shown and walks to the other half,
 * keeps out of pools, and rolls through embers and the slam as they land (bots.ts's ROLLER). 068: caught on the flooded
 * half, it holds fire (walking at full pace) and rolls for the other half.
 */
export function decentBot(): Bot {
  return (s, f) => {
    const p = s.player;
    const pool = s.floodPools.find((x) => x.roomId === s.roomId);
    const flooding = f.mode === 'flood-windup' && f.modeTicks >= ROLLER.react;
    const mid = floodRect(ANVIL_ARENA, -1).x1;
    const side = flooding ? -f.floodSide : pool ? (pool.x0 < mid ? 1 : -1) : 0;
    let bearing = Math.atan2(p.y - f.y, p.x - f.x);
    let goal = inHall(f.x + Math.cos(bearing) * DECENT.range, f.y + Math.sin(bearing) * DECENT.range, side);
    // Pinned against a wall too close: circle round it.
    if (Math.hypot(goal.x - f.x, goal.y - f.y) < DECENT.range * 0.6) {
      bearing += (DECENT.circleDeg * Math.PI) / 180;
      goal = inHall(f.x + Math.cos(bearing) * DECENT.range, f.y + Math.sin(bearing) * DECENT.range, side);
    }
    // 068: caught on the half it floods (heat now fills through vents, so floods come), it holds fire and rolls for the
    // other half, as a player gets out of a fire they're standing in.
    const caught = flooding ? Math.sign(p.x - mid) === f.floodSide : pool !== undefined && p.x >= pool.x0 && p.x <= pool.x1;
    const cmd = steer(s, goal, ROLLER).cmd;
    if (caught) return { ...cmd, fire: false, dodge: p.rollTick === 0 && p.cooldown === 0, aimX: f.x, aimY: f.y - 24 };
    return { ...cmd, fire: true, aimX: f.x, aimY: f.y - 24 };
  };
}
