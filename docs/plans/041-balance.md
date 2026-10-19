# Plan 041: Balance pass

Spec: docs/specs/041-balance.md (approved on draft, 2026-10-19; its open questions 041.1–041.11 each carry a proposal that this build follows). Built on `claude/laughing-volta-uac3nf` after 021–040. The spec lists one docs/design.md edit ("Difficulty by distance"), tagged "(Added 2026-10-19, Shaun, spec 041)".

## Shape of the change
Small vertical commits, tests first in each. Only the spec's listed numbers move; every test whose expected number changes is listed in the build notes with the change that moved it, old values kept in comments.

1. **Ammo per-hit damage** (`src/data/ammo.ts`): arrow 14, ley bolt 9, bomb `burstDamage` 12; the landmine stays 60. Tagged rounds follow their base (they're derived). Children unchanged (Shard 4, Bomblet 8). Pinned tests move deliberately: tests/sim/pinned039.test.ts (old values in comments), talentStats, statResolve, keystones (Pool-burst 21), tests/render/describe*.test.ts (040's "11.6" → "16.2").
2. **Ring scaling** (new `src/data/ringScale.ts`: `RING_SCALE` 0/1/2/3 → `{ health, damage }` = 1/1, 1/1, 1.6/1.6, 2.5/2.5):
   - `EnemyState.ring` set once in `createEnemy` from its home tile (`ringOf` in the overworld, 0 elsewhere); leveling's `homeRing` reads it.
   - `src/sim/ringScale.ts`: `scaledDef(def, ring, champion)` → max health `round(base × ring × champion)` and every attack's damage `round(base × ring × champion)`, rounded once; size and speed only from the champion; a boss is never scaled. `defOf` (champions.ts) reads it, memoised by id, ring and champion. `createEnemy` and `makeChampion` start at the scaled max.
   - Orbs and bolts carry the scaled damage whenever it differs from the base (today only a champion's did).
   - The spawn cap doesn't count the Bulwark's adds.
3. **The Bulwark** (`src/data/bulwark.ts`: `maxHealth` 2,500; `enrage`, `stomp`, `adds` blocks; `src/data/hollows.ts`: the two add tiles):
   - New per-fight fields on `EnemyState`: `enraged`, `behind`, `stompCooldown`, `addsRisen`; on any enemy `rising` (ticks left rising: can't act, be hit or block).
   - New modes: `roar`, `stomp-windup`, `stomp`, `stomp-recover`.
   - `src/sim/bulwarkPhases.ts` (new, keeps `bulwarkAi.ts` under 300): the behind counter, the stomp (wind-up with the rear half-disc locked, land, recover, cooldown from the wind-up's start), the enrage (entered at its next free decision once below 30%: a 60-tick roar, then 70°/s and a 160-tick lob cooldown), the adds (once per fight below 50%, at the arena's tiles, the other tile if one is within 96 px of the player, rising 60 ticks), and the reset (home and healed: fight state cleared, living adds removed).
   - `turnToward` takes the enraged rate.
4. **getState()**: enemies' `ring` and `rising`; bosses' `enraged`, `behind`, `stompCooldown`, `addsRisen`; events `enrages`, `stomps`, `addsRise`.
5. **Render** (art pending Shaun's eye): the enraged seam and runes in danger red with a steam plume; the stomp wind-up pose, the rear half-disc in the pound circle's style, a smaller `poundDust` and the pound's sound pitched up (`bulwark-stomp`); the roar (`bulwark-roar`); each add rising through a smaller cracked red circle (`adds-rise` sound). `ui().bossBar` reports `enraged`.
6. **Docs:** design.md's "Difficulty by distance" line.

## Tests (written first)
- **Vitest data** (`tests/data/balance.test.ts`):
  - per-hit damage arrow 14, ley bolt 9, bomb 12, landmine 60; every tagged round matches its base; fire ticks 15/20/40/40; children (Shard 4, Bomblet 8, Shatterpoint ×0.5) unchanged; Frost (`COLD`, `CHILL`, `FREEZE`) unchanged;
  - `RING_SCALE` values; the spec's ring table computed through the def function, champion column included; bosses unscaled;
  - every Bulwark attack (lob, pound, stomp) winds up at least `MIN_TELEGRAPH_TICKS` (also in hollowsEnemies.test.ts's telegraph rule); the add tiles are open floor inside the arena, either side of the start;
  - survival pinned: max health 100, armor 0 bare, roll and i-frames, healing rates, every affix range and survival talent line.
- **Vitest sim:**
  - `tests/sim/ringScale.test.ts`: ring set from the home tile and kept as it walks; a ring 2 Husk 64 HP swiping 32; a ring 3 champion Sniper 113 HP firing 91; ring 1 champion as today; Warden and Bulwark unscaled anywhere; `getState()` ring and scaled max.
  - `tests/sim/bulwarkEnrage.test.ts`, `bulwarkStomp.test.ts`, `bulwarkAdds.test.ts`: the spec's sim list (roar without attacking, 70°/s and 160-tick lobs, stays enraged, leash clears it; the stomp's 180 behind ticks, the 40-tick wind-up, half-disc hits inside, misses outside and in front, a roll dodges, the counter drains at 2, no turning in wind-up and recovery, the 360-tick cooldown; adds once below 50%, ≥ 96 px from the player, not acting or hittable while rising, ring 3, not champions, removed and re-armed by a reset, a summon's own); determinism with all three.
  - **Scripted targets**, deterministic, seeds 1–5, each printing its measured ticks; long ones with an explicit budget and a comment on their idle time (as sim.test.ts does):
    - `tests/sim/bulwarkFight.test.ts`: the decent build (two entrances fed by an arrow line and a bomb line, level 7 with a1, a2, b1, t1, t2, t3, four Common pieces with mid-roll affixes) wins in 3,600–5,400 ticks, takes ≥ 40% of max health, no KO; the naive bot is KO'd on every seed. Replaces 034's 900-HP circling yardstick.
    - `tests/sim/packClears.test.ts`: ring 1 (4 Husks, one arrow line), ring 2 (4 Husks and a Wisp, two arrow lines), ring 3 (Shardback, two Chargers, Burrower, Sniper; arrow and bomb lines): ring 3 in 8–15 s, rings 1 and 2 ≤ 15 s, never KO'd.
    - `tests/sim/ammoScenarios.test.ts`: the four scenarios, each won by its family by ≥ 10% on every seed (others' runs stop once they're past the winner's time × 1.1, which is all "wins" needs).
  - Bot helpers in `tests/sim/bots.ts` (test code).
- **Playwright** (`tests/e2e/balance.spec.ts`): `?start=hollows`, into the forum, the Bulwark set below 50% through the dev hook: two adds in `getState()` (group `bulwark-adds`); below 30%: `enraged: true`; standing behind it 3 s: a stomp wind-up.
- **Screenshots** (`tests/e2e/balanceShots.spec.ts`, REVIEW_SHOTS=1, into docs/review/041/): the enraged Bulwark, the stomp's half-disc, the adds rising, the boss bar enraged.
- Existing e2e bots that lose to the tougher numbers are adapted honestly (tactics or setup, never mid-test healing), each noted.

## Not dictated by the spec
- "A line" in the scripted tests is an intake entrance kept fed (topped to its cap each tick), as the spec's own arithmetic in 041.7 assumes a line keeps up with the fire rate.
- The roar: it stands its ground and keeps turning (at the enraged rate); it only starts no attack.
- The enrage is entered at the Bulwark's next decision point after its health drops below 30% (so a running wind-up, throw or recovery finishes first); `enraged` and the event are set as the roar starts.
- Stomp priority at a decision point: stomp, then pound, then lob.
- The stomp's half-disc faces its back (its shield angle + 180°), locked at the wind-up's start.
- Adds: the Shardback takes the west tile and the Charger the east one; one too close to the player swaps to the other tile. After rising they wake (chase). A leash reset removes living adds when the Bulwark is home and healed.
- The boss bar's fill is already danger red (034); enraged it stays danger red, so the bar's enrage shows only in `ui().bossBar.enraged` — added as open question 041.12 for Shaun.

## Risks
- The Bulwark target: if the bot wins under 60 s at 2,500 HP, tune the stomp's counter and cooldown first, then the enrage turn, then HP up to 3,000; beyond that stop and report.
- Test time: long scripted fights; budgets and early stops keep `npm run check` inside its usual time.
- `enemies.ts`, `summary.ts`, `testHook.ts`, `EnemyView.ts` near 300 lines: new code in its own files.

## Build notes
(filled in as the build goes)
