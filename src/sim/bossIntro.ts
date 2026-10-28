import { ARENAS, type ArenaDef } from '../data/arenas';
import { BOSS_INTRO } from '../data/bossIntro';
import { arenaBoss, playerInside } from './arenaLock';
import { arenaOfPost } from './arenaWait';
import { wakeBoss } from './bossWake';
import type { EnemyState } from './enemies';
import type { SimState } from './state';

// Boss intros (080, docs/specs/080-boss-intros.md "The sim timing rule"). On the first tick the player stands inside an
// arena (in its room, not dying) while its boss is idle at its post, the boss and every enemy posted on that floor
// that isn't fighting enter `intro`: they don't think, move, turn or count anything (enemyAi.ts skips them), nothing
// can hit them (enemies.ts's `immune`), and the player inside takes no damage (health.ts). The world runs on. On the
// tick after the intro's last, each wakes as at today's wake (bossWake.ts) and its think runs that same tick, so the
// fight from there is today's fight from its wake. A boss already beaten (only the altar raises one again) gets the
// short intro. The player leaving, changing room or going down cuts it: its enemies stand idle again, unmoved.

type Pick2<K extends keyof SimState> = Pick<SimState, K>;

/** True if an intro for this arena would be a re-fight's: its boss already beaten (034's `bossDefeats`). */
const shortFor = (state: Pick2<'bossDefeats'>, arena: ArenaDef): boolean => state.bossDefeats.includes(arena.boss);

/** Whether an enemy's intro (running or due) is the short one. */
export const introShort = (state: Pick2<'bossDefeats'>, e: Pick<EnemyState, 'roomId' | 'homeX' | 'homeY'>): boolean => {
  const arena = arenaOfPost(e);
  return arena !== undefined && shortFor(state, arena);
};

/** An intro's length for this enemy, ticks: `shortTicks` for a re-fight, else `fullTicks`. */
export const introLength = (state: Pick2<'bossDefeats'>, e: Pick<EnemyState, 'roomId' | 'homeX' | 'homeY'>): number => (introShort(state, e) ? BOSS_INTRO.shortTicks : BOSS_INTRO.fullTicks);

/** True if the player is in the arena's room, inside its floor and not going down. */
const playerHere = (state: Pick2<'player' | 'roomId'>, arena: ArenaDef): boolean => state.player.dying === 0 && playerInside(state, arena);

/** The arena's boss, if it waits idle at its post with the player inside: an intro starts this tick. */
function dueBoss(state: SimState, arena: ArenaDef): EnemyState | undefined {
  if (!playerHere(state, arena)) return undefined;
  const boss = arenaBoss(state, arena, state.roomId);
  return boss && boss.mode === 'idle' && arenaOfPost(boss) === arena ? boss : undefined;
}

/** True if an intro starts on the next tick (tests step it out: tests/sim/introKit.ts). */
export const introDue = (state: SimState): boolean => ARENAS.some((a) => dueBoss(state, a) !== undefined);

/**
 * 080: the player takes no damage while standing inside an arena whose enemies are in their intro (health.ts's guard).
 * Nothing there can attack then anyway; this covers a burn, a leftover pool or a strike already falling.
 */
export function introShield(state: Pick2<'enemies' | 'player' | 'roomId'>): boolean {
  for (const e of state.enemies) {
    if (e.mode !== 'intro' || e.roomId !== state.roomId) continue;
    const arena = arenaOfPost(e);
    if (arena && playerInside(state, arena)) return true;
  }
  return false;
}

/** Ends, cuts or counts each intro running, then starts any that are due. Runs before the enemies act. */
export function stepIntros(state: SimState): void {
  for (const e of state.enemies) {
    if (e.mode !== 'intro') continue;
    const arena = arenaOfPost(e);
    if (!arena || e.health <= 0 || e.roomId !== state.roomId || !playerHere(state, arena)) {
      // Cut (the player left, changed room or went down): it never moved, so it simply stands idle at its post again.
      e.mode = 'idle';
      e.modeTicks = 0;
    } else if (e.modeTicks >= introLength(state, e)) wakeBoss(e);
    else e.modeTicks += 1;
  }
  for (const arena of ARENAS) {
    const boss = dueBoss(state, arena);
    if (!boss) continue;
    for (const e of state.enemies) {
      if (e.roomId !== boss.roomId || e.health <= 0 || e.rising > 0 || (e.mode !== 'idle' && e.mode !== 'return') || arenaOfPost(e) !== arena) continue;
      e.mode = 'intro';
      e.modeTicks = 1;
    }
    state.events.bossIntros.push({ id: boss.id, enemyId: boss.enemyId, short: shortFor(state, arena) });
  }
}
