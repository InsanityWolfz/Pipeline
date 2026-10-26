# 068: Tougher late bosses: the Forgewright and the Conductor
status: draft

Drafted from Shaun's playtest calls ("we got to buff the late bosses. They should be tough") and his OK of the proposal (docs/brainstorm/2026-10-26-playtest-calls.md, "Balance"), 2026-10-26.

## Goal
The late bosses become real fights whose puzzles matter. The Forgewright floods its hall on a rhythm, and venting it takes a focused fan. The Conductor can't be hurt while his rods stand, so breaking rods and homing shots become the way to win. The Bulwark, being eased separately, stays the easiest of the three, and the Conductor is the hardest.

## Design references
- docs/design.md: "Bosses are engineering puzzles", where a tailored layout is a big advantage and raw throughput a slower but valid answer.
- docs/specs/060-emberworks.md (the Forgewright) and docs/specs/064-stormcrown.md (the Conductor).
- docs/brainstorm/2026-10-26-agent-playtest.md, the late-game tester's findings:
  - the Forgewright: about 36 s, venting every 8 s, heat never above 3%, so the Flood never happened;
  - the Conductor: about 27 s, and breaking rods was slower than ignoring them.

## Acceptance criteria

**The Forgewright (data, sim)**
- [ ] Max health 6,000 (was 4,000).
- [ ] **Heat:** heat keeps filling while the Forgewright is vented. A vent no longer resets heat; only a Forge Flood does. So the Flood happens on its rhythm, about every 30 s (Chill still slows the gauge, and enrage still speeds it). 060.24's rule that heat stays at 0 through a vent is replaced.
- [ ] **Bellows:** each has 300 health (was 150) and patches in 180 ticks, 3 s (was 240).
- [ ] **Attacks:** the hammer slam's and the ember spray's cooldowns are 20% shorter. Their wind-ups are unchanged and never under `MIN_TELEGRAPH_TICKS`.
- [ ] **Measure:** `npm run measure`'s Forgewright target becomes 90–120 s for a decent three-entrance build. Recorded, not tuned.

**The Conductor (data, sim, render)**
- [ ] Max health 8,000 (was 6,000).
- [ ] **Storm shield:** while 3 or more of his six rods stand, every hit on his body is blocked. That covers straight shots, Shards, Bursts, Bomblets, mines, punches, burn beats and Lightning arcs. It works like the Forgewright's plating, with a spark and clang and the boss bar in the blue shield state.
  - With 2 or fewer standing, he takes damage normally.
  - Rods regrow after 20 s as now, so the shield comes back unless the player keeps breaking them.
- [ ] **Blink-in:** for `blinkInTicks` (start 30, 0.5 s) after he appears at a rod, he can't be hit. Shots pass through, as for a burrowed enemy. A homing round that re-locks (064.22) is still flying when the window ends, so homing lands where straight shots aimed at his old spot miss.
- [ ] **Storm call:** 5 circles (was 3), with the spread unchanged.
- [ ] **Grounding:** with fewer than 2 standing rods he still can't blink (064). Grounding and the shield now reward the same play.
- [ ] **Measure:** the Conductor's target becomes 120–180 s for a decent four-entrance homing build; also record a no-homing, no-rod-breaking build. Recorded, not tuned.

**The order of the bosses**
- [ ] With the Bulwark eased (fix-bulwark-ease: 900 HP), the measure output lists all three bosses' decent-build times. The Bulwark should be the shortest and the Conductor the longest. This is recorded, not a check.

**Saves, review shots**
- [ ] `SAVE_VERSION` goes up if the save's shape changes.
- [ ] Review shots (docs/review/068): the Forgewright's flood during a vent; the Conductor shielded with 4 rods standing; the Conductor exposed with 2 standing.

## Data changes
- `forgewright.ts`: `maxHealth`, the bellows' health and `patchTicks`, the slam and spray cooldowns, and the heat-on-vent rule (a flag or a removal).
- `conductor.ts`: `maxHealth`, `shieldRods` (3), `blinkInTicks`, the call's `count`.
- The measure targets.

## Out of scope
- The Bulwark: its own fix PR.
- The Stormcrown's enemy balance (later, per Shaun).
- New attacks or art.

## Test plan
- **Sim:**
  - the Forgewright's heat filling through a vent and the Flood on rhythm;
  - the bellows' 300 health and 3 s patch;
  - the shorter cooldowns, with wind-ups at least `MIN_TELEGRAPH_TICKS`;
  - the Conductor's shield on every damage path with 3 or more rods and off at 2;
  - the blink-in untargetable window (shots pass, homing lands after);
  - the 5 storm-call circles;
  - grounding unchanged.
- **Playwright:** a sandbox scene breaking rods to drop the shield; review shots.
- **`npm run measure`:** both bosses, plus the Bulwark for order, recorded.

## Open questions
None: Shaun OK'd the proposal.

## Decisions in this draft (OK them with the approval)
- The storm shield blocks Lightning arcs and burn beats too, so no element skips the rod puzzle.
- During the blink-in window shots pass through him rather than being blocked, so nothing clangs and the window reads as "not there yet".
- The heat-on-vent change replaces 060.24.
