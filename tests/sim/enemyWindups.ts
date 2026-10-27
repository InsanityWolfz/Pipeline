import { TILE_SIZE } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { createEnemy, type EnemyMode, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { decentBot as bulwarkBot, fight as bulwarkFight } from './bulwarkBot';
import { carefulBot, fight as conductorFight } from './conductorBot';
import { arena, HALL, hold, PLAYER_AT, run } from './fight';
import { decentBot as forgeBot, fight as forgeFight } from './forgewrightBot';

// 076: what the sim does with every enemy's attacks, recorded on main before the art pass and checked after it
// (tests/sim/windupTicks.test.ts, regionHash.test.ts): the art may never change a tick.

/** Modes an attack winds up in. */
const WINDUP_MODES: readonly EnemyMode[] = ['windup', 'lob', 'stomp-windup', 'spray-windup', 'flood-windup'];

/** A wind-up run: the mode (the Conductor's with its attack's index), and how many ticks it held. */
export type WindupRun = readonly [mode: string, ticks: number];

/** Records each wind-up run as it ends, from one enemy's mode tick by tick. */
export class WindupLog {
  readonly runs: WindupRun[] = [];
  private mode = '';
  private ticks = 0;

  see(e: EnemyState): void {
    const mode = WINDUP_MODES.includes(e.mode) ? (e.enemyId === 'conductor' ? `${e.mode}:${e.conductor.attack}` : e.mode) : '';
    if (mode === this.mode) {
      this.ticks += 1;
      return;
    }
    if (this.mode !== '') this.runs.push([this.mode, this.ticks]);
    this.mode = mode;
    this.ticks = 1;
  }

  /** The runs, with one still open at the end (a cinder mote's wind-up ends in its own burst). */
  done(): WindupRun[] {
    return this.mode === '' ? this.runs : [...this.runs, [this.mode, this.ticks]];
  }
}

/** Where each kind stands from the player, px east (in reach of its attack, so it winds up soon). */
const SPAWN_DX: Readonly<Record<string, number>> = { caster: 110, sniper: 150, charger: 150, burrower: 120, hound: 120, tender: 180, hawk: 140, sentinel: 140 };
const DEFAULT_DX = 40;

/** The meadow with one enemy `dx` px east of the player (a kiln-tender with a hurt Husk to beam). */
function meadow(enemyId: string, seed: number): { s: SimState; e: EnemyState } {
  const s = arena(seed);
  const def = ENEMIES[enemyId];
  if (!def) throw new Error(enemyId);
  const dx = SPAWN_DX[def.kind] ?? DEFAULT_DX;
  const e = createEnemy(s.nextEnemyId++, enemyId, { x: PLAYER_AT.x + dx, y: PLAYER_AT.y }, HALL);
  s.enemies.push(e);
  if (def.kind === 'tender') {
    const hurt = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + dx - 2 * TILE_SIZE, y: PLAYER_AT.y + TILE_SIZE }, HALL);
    hurt.health = 10;
    e.group = 'pack';
    hurt.group = 'pack';
    s.enemies.push(hurt);
  }
  return { s, e };
}

/** One non-boss enemy left to attack a player who stands still at full health for `ticks`: its wind-up runs. */
export function enemyWindups(enemyId: string, ticks: number, seed = 7): WindupRun[] {
  const { s, e } = meadow(enemyId, seed);
  const log = new WindupLog();
  for (let i = 0; i < ticks; i++) {
    run(s, 1);
    s.player.health = 100;
    s.player.hurtTicks = 0;
    // A cinder mote's burst ends it: its run ends there.
    if (!s.enemies.includes(e)) break;
    log.see(e);
  }
  return log.done();
}

/** Each boss fought by its bot for `ticks` (a bot's own fight, its health kept up where it allows): its wind-up runs. */
export function bossWindups(boss: 'bulwark' | 'forgewright' | 'conductor', ticks: number): WindupRun[] {
  const log = new WindupLog();
  if (boss === 'bulwark') {
    const bot = bulwarkBot();
    bulwarkFight(1, ticks, (s, b) => {
      log.see(b);
      return bot(s, b);
    });
  } else if (boss === 'forgewright') {
    const bot = forgeBot();
    forgeFight(
      1,
      ticks,
      (s, f) => {
        log.see(f);
        return bot(s, f);
      },
      true,
    );
  } else {
    const bot = carefulBot();
    conductorFight(
      1,
      ticks,
      (s, c) => {
        log.see(c);
        return bot(s, c);
      },
      'ley-bolt+homing',
    );
  }
  return log.done();
}

/** FNV-1a over a string, as hex: a short fingerprint of a summary. */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** A pack of a region's enemies round the player, who fires arrows at the nearest each tick: the summary's fingerprint every 120 ticks. */
export function packFight(enemyIds: readonly string[], ticks: number, seed = 7): string[] {
  const s = arena(seed);
  s.inventory.arrow = 999;
  hold(s, 'arrow');
  enemyIds.forEach((id, i) => {
    const a = (i / enemyIds.length) * Math.PI * 2;
    s.enemies.push(createEnemy(s.nextEnemyId++, id, { x: PLAYER_AT.x + Math.cos(a) * 120, y: PLAYER_AT.y + Math.sin(a) * 90 }, HALL));
  });
  const prints: string[] = [];
  for (let t = 1; t <= ticks; t++) {
    const near = s.enemies.filter((e) => e.roomId === HALL).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    run(s, 1, near ? { use: true, aimX: near.x, aimY: near.y - 10 } : {});
    s.player.health = 100;
    if (t % 120 === 0) prints.push(fingerprint(JSON.stringify(summarize(s))));
  }
  return prints;
}
