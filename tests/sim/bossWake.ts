import { SHRINE_ARENA } from '../../src/data/arenas';
import type { EnemyState } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { decentBot as bulwarkBot, fight as bulwarkFight } from './bulwarkBot';
import { carefulBot, fight as conductorFight } from './conductorBot';
import { hold, movePlayer, run } from './fight';
import { decentBot as forgeBot, fight as forgeFight } from './forgewrightBot';
import { fingerprint } from './enemyWindups';

// 080: each boss's fight from the tick it wakes, recorded before the intro was built (bossWake.json, written with
// RECORD_080=1 on this branch at 073 + 076, before any 080 sim change) and checked after it: the fight from an intro's
// end must be today's fight from its wake, tick for tick (tests/sim/bossWake.test.ts).

/** How long each fight is traced, ticks. */
export const TRACE_TICKS = 900;
/** A fingerprint every this many ticks. */
const EVERY = 60;

/** A fight's trace: the boss's mode changes (offset from the wake, mode) and a fingerprint of the fight every EVERY ticks. */
export interface WakeTrace {
  modes: [number, string][];
  prints: string[];
}

/** What the trace fingerprints: every enemy in the fight (by its own fields) and the player's place and health. */
const fightPrint = (s: SimState): string =>
  fingerprint(JSON.stringify({ enemies: s.enemies.map((e) => ({ ...e })), player: [s.player.x, s.player.y, s.player.health] }));

/** Records a trace from one call per tick, with the boss as it stands after the tick. */
class Tracer {
  readonly trace: WakeTrace = { modes: [], prints: [] };
  private mode = '';
  private t = 0;

  see(s: SimState, boss: EnemyState): void {
    this.t += 1;
    const mode = boss.enemyId === 'conductor' ? `${boss.mode}:${boss.conductor.attack}` : boss.mode;
    if (mode !== this.mode) this.trace.modes.push([this.t, mode]);
    this.mode = mode;
    if (this.t % EVERY === 0) this.trace.prints.push(fightPrint(s));
  }
}

/** The shrine (009, 055) with only its own group (the Warden and its pack) and the player just inside its door. */
export function shrine(seed = 7): { s: SimState; w: EnemyState } {
  const s = createSim(seed);
  s.enemies = s.enemies.filter((e) => e.group === SHRINE_ARENA.id);
  s.nodes = [];
  const w = s.enemies.find((e) => e.enemyId === SHRINE_ARENA.boss);
  if (!w) throw new Error('no Warden');
  const at = tileCentre(SHRINE_ARENA.door.enterTo);
  movePlayer(s, at.x, at.y);
  return { s, w };
}

/**
 * Each boss's fight traced from its wake. `before` runs once the player stands inside, before the traced ticks: 080
 * steps the intro out there (the arena helpers forum, hall and spire already do).
 */
export function wakeTrace(boss: 'pylon-warden' | 'bulwark' | 'forgewright' | 'conductor', before: (s: SimState) => void = () => undefined): WakeTrace {
  const tracer = new Tracer();
  if (boss === 'pylon-warden') {
    const { s, w } = shrine();
    before(s);
    s.inventory.arrow = 999;
    hold(s, 'arrow');
    for (let t = 0; t < TRACE_TICKS && w.health > 0; t++) {
      // Firing at its middle from where they stand, kept at full health.
      run(s, 1, { use: true, aimX: w.x, aimY: w.y - 20 });
      s.player.health = 100;
      s.player.hurtTicks = 0;
      tracer.see(s, w);
    }
  } else {
    // The bots' fights (041, 060, 064): each call sees the fight as the last tick left it, so the first (before the
    // wake) is skipped.
    let first = true;
    const see = (s: SimState, e: EnemyState): void => {
      if (!first) tracer.see(s, e);
      first = false;
    };
    if (boss === 'bulwark') {
      const bot = bulwarkBot();
      bulwarkFight(1, TRACE_TICKS + 1, (s, b) => (see(s, b), bot(s, b)));
    } else if (boss === 'forgewright') {
      const bot = forgeBot();
      forgeFight(1, TRACE_TICKS + 1, (s, f) => (see(s, f), bot(s, f)), true);
    } else {
      const bot = carefulBot();
      conductorFight(1, TRACE_TICKS + 1, (s, c) => (see(s, c), bot(s, c)), 'ley-bolt+homing');
    }
  }
  return tracer.trace;
}
