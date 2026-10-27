# 068: Tougher late bosses: the Forgewright and the Conductor
status: done

Approved by Shaun in chat, 2026-10-26 ("approve 67 and 68"), with the draft's listed decisions; its plan is pre-approved.

Plan pre-approved by Shaun, 2026-10-26.

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
- [x] Max health 6,000 (was 4,000).
- [x] **Heat:** heat keeps filling while the Forgewright is vented. A vent no longer resets heat; only a Forge Flood does. So the Flood happens on its rhythm, about every 30 s (Chill still slows the gauge, and enrage still speeds it). 060.24's rule that heat stays at 0 through a vent is replaced.
- [x] **Bellows:** each has 300 health (was 150) and patches in 180 ticks, 3 s (was 240).
- [x] **Attacks:** the hammer slam's and the ember spray's cooldowns are 20% shorter. Their wind-ups are unchanged and never under `MIN_TELEGRAPH_TICKS`.
- [x] **Measure:** `npm run measure`'s Forgewright target becomes 90–120 s for a decent three-entrance build. Recorded, not tuned.

**The Conductor (data, sim, render)**
- [x] Max health 8,000 (was 6,000).
- [x] **Storm shield:** while 3 or more of his six rods stand, every hit on his body is blocked. That covers straight shots, Shards, Bursts, Bomblets, mines, punches, burn beats and Lightning arcs. It works like the Forgewright's plating, with a spark and clang and the boss bar in the blue shield state.
  - With 2 or fewer standing, he takes damage normally.
  - Rods regrow after 20 s as now, so the shield comes back unless the player keeps breaking them.
- [x] **Blink-in:** for `blinkInTicks` (start 30, 0.5 s) after he appears at a rod, he can't be hit. Shots pass through, as for a burrowed enemy. A homing round that re-locks (064.22) is still flying when the window ends, so homing lands where straight shots aimed at his old spot miss.
- [x] **Storm call:** 5 circles (was 3), with the spread unchanged.
- [x] **Grounding:** with fewer than 2 standing rods he still can't blink (064). Grounding and the shield now reward the same play.
- [x] **Measure:** the Conductor's target becomes 120–180 s for a decent four-entrance homing build; also record a no-homing, no-rod-breaking build. Recorded, not tuned.

**The order of the bosses**
- [x] With the Bulwark eased (fix-bulwark-ease: 900 HP), the measure output lists all three bosses' decent-build times. The Bulwark should be the shortest and the Conductor the longest. This is recorded, not a check.

**Saves, review shots**
- [x] `SAVE_VERSION` goes up if the save's shape changes.
- [x] Review shots (docs/review/068): the Forgewright's flood during a vent; the Conductor shielded with 4 rods standing; the Conductor exposed with 2 standing.

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

## Results
Built in five slices on `claude/068-late-boss-buffs` (docs/plans/068-late-boss-buffs.md). Every criterion above is
met; the measure targets are recorded, not tuned, and are missed (below). `SAVE_VERSION` is 21 (20 is another
branch's): the Conductor's blink-in window is a new saved field.

- **Measure** (`npm run measure`, recorded, not tuned; every Forgewright seed plays the same, as in 060):
  - **The Forgewright**, 041.7's decent build with three arrow lines: the bot is KO'd on 20/20 seeds at 213.7 s, the
    Forgewright on 1,209 health, after 11 vents and 7 floods (210 HP taken). With the player's health kept up, it
    kills it at 253.4 s (14 vents, 8 floods). Target 90–120 s: MISSED.
  - **The Conductor**, 041.7's decent build with four entrances fed:
    - homing bolts, breaking rods while the shield holds: 20/20 won in 205.7–252.4 s (mean 230.6), 0 KOs, no damage
      taken; the shield first drops at 12.6–18.6 s. Target 120–180 s: MISSED.
    - plain arrows at his body (no homing, no rod breaking): 0/20 won in 360 s. His shield still drops now and then
      (at 18–97 s), because a piercing arrow glances off his body into the rod behind him (068.2).
    - plain arrows breaking rods (no homing), recorded beside them: 20/20 won in 91.7–134.5 s (mean 105.6).
  - **The order** (the Bulwark on main after fix-bulwark-ease, 900 HP): the Bulwark 18.4 s (20/20, no damage
    taken), the Conductor about 231 s with homing (106 s with arrows), the Forgewright about 253 s. The Bulwark is the
    shortest, but the Forgewright, not the Conductor, is the longest (068.11).
- **Review shots** in docs/review/068: the Forgewright vented while its flood's pools cover the player's half; the
  Conductor shielded with 4 rods standing, shots clanging off and the boss bar blue; the Conductor exposed with 2
  standing, the bar red.

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle.

The Forgewright:
- 068.1 A vent still can't attack, so heat that fills mid-vent waits: the flood winds up as soon as the vent ends. A vent
  during a flood's wind-up drops the wind-up but keeps the heat, so it floods again once the vent ends.

The storm shield and the blink-in window:
- 068.2 The shield is the plating check itself (`plated` now covers both bosses), so every plating rule carries over.
  A piercing arrow glances off his shielded body and flies on, so from the middle it often hits the rod behind him.
  Lightning arcs and spreading burns skip him (no clang), as they skip a plated Forgewright. Rod hits still chill him.
  A Burst or punch that breaks the rod dropping him to 2 spends itself there, as 060.38's vent does.
- 068.3 The blink-in window covers only his body: his rods still take hits. Bursts, punches, arcs and burn beats find
  nothing in it, and a burn's beat that falls in the window is lost, not delayed. The window counts down while he's
  frozen. Nothing new is drawn for it; the blink's arrival column already plays.
- 068.4 Homing follows him through the window: a round locked on him keeps its lock and steers at him. One that
  arrives early passes through, turns back, and lands once the window ends. A homing round fired in the window can
  lock onto him. Without this, the window would drop every lock at each blink, against 064.22.
- 068.5 The storm call's five circles are one on the player and four round them at quarter turns, 64 px out.

Measure:
- 068.6 The Forgewright's bot now meets floods (060's never did: vents kept its heat at 0). Caught on the flooded half,
  it holds fire, walking at full pace, and rolls for the other half. A second record keeps the player's health up to
  give its kill time.
- 068.7 The Conductor's rod-breaking bot walks up to the nearest standing rod clear of him (at least twice the homing
  lock radius away, so a bolt aimed there never locks onto him), and shoots it while his shield holds. Once the shield
  is down, it fires at him. Breaking on down to grounding was tried and was slower with homing (bolts at a rod are
  bolts not at him).
- 068.8 The measure's limit is twice the target's top, as before: 240 s for the Forgewright (360 s for its kept-up
  record) and 360 s for the Conductor.

For Shaun's call (recorded, not tuned):
- 068.9 The Forgewright is about twice its target. Bellows of 300 take about twice as long to break per vent, and 6,000
  health needs about 14 vents at the middle lane's damage. A decent bot is also worn down by embers and floods over
  three and a half minutes.
- 068.10 Homing is not the way to win the Conductor: plain arrows breaking rods win in about 106 s, homing bolts in
  about 231 s. Bolts deal 9 a hit without piercing, so they break rods slowly. Arrows pierce, so a line can break two
  rods, and arrows aimed at him strike the rod behind him.
- 068.11 The order is the Bulwark (18 s), then the Conductor, then the Forgewright, so the Conductor is not the longest.
  Shaun, 2026-10-26, on 068.9–068.11: "Keep it as is for now." Merged untuned.
- 068.12 064's "the Conductor grounded" review shot (stormcrownShots.spec.ts, REVIEW_SHOTS only, so CI skips it) now
  times out in `cameraSettled` at its 5 s default. The camera lift from fix-playtest-ui eases slowly there. That looks
  like main's change rather than 068's, which doesn't move him or the player, and it is left as it is (064's shots
  aren't retaken).
