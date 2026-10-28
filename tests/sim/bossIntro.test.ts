import { describe, expect, it } from 'vitest';
import { BOSS_INTRO } from '../../src/data/bossIntro';
import { enemyDef, type ForgewrightDef } from '../../src/data/enemies';
import { blastArea } from '../../src/sim/blast';
import { createEnemy, immune, targetable, type EnemyState } from '../../src/sim/enemies';
import { bellowsPoint } from '../../src/sim/forgewrightParts';
import { rodPoint } from '../../src/sim/conductorRods';
import { igniteEnemy } from '../../src/sim/fire';
import { chainLightning } from '../../src/sim/lightning';
import { punch } from '../../src/sim/melee';
import { hold, run } from './fight';
import { BOSSES, entered } from './introKit';

// 080 (docs/specs/080-boss-intros.md "The sim timing rule"): on the first tick the player stands inside an arena with
// its boss idle at its post, the boss enters `intro` for 165 ticks (2.75 s), inactive and untargetable, then fights.

/** Everything about an enemy but the ticks its mode has run. */
const still = (e: EnemyState): string => JSON.stringify({ ...e, modeTicks: 0 });

/** Where shots at it go: its middle, or the part that would take them (the Forgewright's bellows, a Conductor's rod). */
function aimOf(b: EnemyState): { x: number; y: number } {
  if (b.enemyId === 'forgewright') return bellowsPoint(b, enemyDef('forgewright') as ForgewrightDef, 0);
  if (b.enemyId === 'conductor') return rodPoint(b.conductor.rod);
  return { x: b.x, y: b.y - 20 };
}

describe('080: the intro window', () => {
  for (const id of BOSSES) {
    it(`${id}: starts on the entry tick, holds exactly ${BOSS_INTRO.fullTicks} ticks, then wakes on the next`, () => {
      const { s, b } = entered(id);
      expect(b.mode).toBe('idle');
      run(s, 1);
      expect({ mode: b.mode, modeTicks: b.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
      expect(s.events.bossIntros).toEqual([{ id: b.id, enemyId: id, short: false }]);
      for (let t = 2; t <= BOSS_INTRO.fullTicks; t++) {
        run(s, 1);
        expect(b.mode, `tick ${t}`).toBe('intro');
        expect(b.modeTicks).toBe(t);
        expect(s.events.bossIntros).toEqual([]);
      }
      run(s, 1);
      // Woken: chasing, or already into what its first think started (the Conductor's first attack).
      expect(['chase', 'windup']).toContain(b.mode);
      expect(s.events.bossIntros).toEqual([]);
    });

    it(`${id}: during the intro nothing it owns ticks, and nothing touches it`, () => {
      const { s, b } = entered(id);
      s.inventory.arrow = 999;
      hold(s, 'arrow');
      run(s, 1);
      expect(immune(b)).toBe(true);
      expect(targetable(b)).toBe(false);
      const before = still(b);
      const at = aimOf(b);
      // Arrows at it (or at its bellows and rods), a punch, a Burst on it, a burn, and an arc from a Husk beside it.
      run(s, 60, { use: true, aimX: at.x, aimY: at.y });
      s.tube.meleeCooldown = 0;
      s.tube.fireCooldown = 0;
      s.player.x = b.x;
      s.player.y = b.y + 20;
      punch(s, 0, -1);
      blastArea(s, b.roomId, b.x, b.y, 120, 80, 'physical');
      // A burn set going on it (only a staged one: no hit reaches it) neither ticks down nor deals anything.
      igniteEnemy(s, b, 40);
      const burn = { burnTicks: b.burnTicks, burnDps: b.burnDps, burnNext: b.burnNext };
      const husk = createEnemy(s.nextEnemyId++, 'husk', { x: b.x + 30, y: b.y + 10 }, b.roomId);
      s.enemies.push(husk);
      chainLightning(s, husk, 60);
      run(s, 60);
      expect(b.mode).toBe('intro');
      expect(still(b)).toBe(still({ ...(JSON.parse(before) as EnemyState), ...burn }));
      expect(burn.burnTicks).toBeGreaterThan(0);
      expect(b.health).toBe(enemyDef(id).maxHealth);
    });
  }

  it("the Warden's posted pack enters and leaves its intro on the Warden's ticks", () => {
    const { s, b } = entered('pylon-warden');
    const pack = s.enemies.filter((e) => e !== b);
    expect(pack.length).toBeGreaterThan(0);
    run(s, 1);
    for (const e of pack) expect({ mode: e.mode, modeTicks: e.modeTicks }).toEqual({ mode: 'intro', modeTicks: 1 });
    run(s, BOSS_INTRO.fullTicks - 1);
    for (const e of [b, ...pack]) expect({ mode: e.mode, modeTicks: e.modeTicks, x: e.x, y: e.y }).toEqual({ mode: 'intro', modeTicks: BOSS_INTRO.fullTicks, x: e.homeX, y: e.homeY });
    run(s, 1);
    for (const e of [b, ...pack]) expect(e.mode).not.toBe('intro');
  });
});
