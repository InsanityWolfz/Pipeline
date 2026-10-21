# 054: Combat readability
status: done

Approved on draft by Shaun in chat, 2026-10-21 ("approve 053-055"): the build follows the proposals in the open questions (053.1's design.md line included).

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, theme E) and his interview answers (docs/brainstorm/2026-10-21-world-combat-interview.md).

## Goal
Fights tell the player what's happening: when an enemy can't be hurt, where a hit will land, and when a talent or stage is doing something.

## Design references
- Specs: 029 (homing and split ley bolts, stages), 035 (the Burrower), 037 (talents: the Pool-arrow talent), 039 (keywords, Pool), 041 (the Bulwark's back wave, adds).

## Acceptance criteria
**Immune health bar (E.1)**
- [ ] While nothing can damage an enemy (a burrowed Burrower, an add still rising), its health bar turns blue with a small shield icon; it goes back to normal as soon as it can be hit. Shielded fronts (Shardbacks, the Bulwark) don't count (Shaun).
- [ ] The rule is in the sim (an enemy's "immune" flag), so any future immune state gets the bar for free.

**The Bulwark's back wave (E.2)**
- [ ] While the back wave builds, its area is shaded red on the ground, like other telegraphs.

**The Pool-arrow talent (E.3)**
- [ ] An arrow that passes through a bomb pool with the talent catches fire: a burning tip and a short ember trail for the rest of its flight, and a small flash when it hits (Shaun).

**Homing bolts (E.4)**
- [ ] Homing ley bolts fly at about 60% of a plain bolt's speed with the same turn rate (Shaun). The speed is data.

**Star shot (E.5)**
- [ ] On a hit, the star shot sends 5 small, visible ley shards out evenly spaced. They skip the enemy that was hit; each deals half the bolt's damage to the first other enemy it touches, out to about 3 tiles (Shaun).

## Data changes
- `src/data/ammo.ts`, `src/data/stages.ts`: homing speed, star shards.
- `src/data/hudPanels.ts` or the enemy bar data: the immune colour and icon.
- `src/data/art`: the shards, the burning arrow.

## Out of scope
- New enemies, other talents' visuals, balance beyond the two numbers above.

## Test plan
- Vitest: the immune flag (burrowed, rising, and not for shields); homing speed; star shards' count, directions, skip and damage; the pool-arrow flag on an arrow.
- Playwright: in the sandbox, a burrowed Burrower's bar reads blue in `ui()`; a star shot's shards appear.
- `npm run measure` re-run and recorded.
- Screenshots: the blue bar, the shaded back wave, a burning arrow, star shards in flight.

## Open questions
- **054.1 The star shot's keyword text.** Proposal: the rules text (039) says "On hit: 5 shards fly out, each dealing half damage to another enemy."
- **054.2 Does a burning arrow do anything extra?** Proposal: no; it shows the talent's existing effect, nothing new.

## Raised after the build
Built on `claude/054-combat-readability` (plan: docs/plans/054-combat-readability.md). 054.1 and 054.2 are built as proposed. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **054.3 The immune flag.** `immune(e)` in src/sim/enemies.ts: under the ground (a burrowed Burrower) or still rising (an add); every hit path (shots, Shards, punches, Bursts, homing locks, Stun) already keys off its opposite, so a future immune state joins both. It's derived, not stored: SimState's shape and SAVE_VERSION are unchanged. `getState()` enemies carry `immune`. Proposal: keep.
- **054.4 The blue bar at full health.** A bar normally shows only once an enemy is hurt; while immune it shows even at full health (blue, the shield at its left end), else a fresh Burrower going under or a rising add would never show it. It goes back to normal (or to none at full health) the tick it can be hit. Proposal: keep.
- **054.5 The back wave's shading.** Its rear arc is shaded faintly red with a fill growing out to its edge through the wind-up (the pound's and stomp's style), its ripples drawn over it, which keep it apart from the stomp. Proposal: keep.
- **054.6 The burning arrow.** It burns from the tick it takes a Pool until it's gone (it pierces on burning past its Burst): a flickering flame on its head, a short cinder trail with embers, and a small ember flash on each hit it lands while burning (none with Flashes off, as 042.10). It does nothing else (054.2). Only arrows burn (Blastfletch's Pool reaches arrows). Proposal: keep.
- **054.7 Homing speed.** 0.6 of the base's speed (180 px/s against 300) as a tag's `speedScale` in src/data/tags.ts; the same 4°/tick turn and 320 px range, so it flies about 1.8 s. The breakdown's Shot rule reads 180 px/s for a homing bolt. Proposal: keep.
- **054.8 The star shot's numbers.** A Shard's damage is half its bolt's base (4.5 for a ley bolt, was a flat 4), through the Shards' damage stats, so Ley and All-ammo bonuses reach it as they reach the bolt and it stays half (Splinter's 7 Shards unchanged). Reach 96 px (3 tiles, was 64) at the same 360 px/s. The Shard is drawn bigger and brighter with a short ley trail (frost for a Cold one) so it reads in flight. Proposal: keep.
- **054.9 The Split's rule text.** "On hit: 5 Shards fly out, each dealing half damage to another enemy." (054.1), followed by the Shard's definition kept from 039: "A Shard is a small Shot that never Pierces or Splits." Proposal: keep.
- **054.10 Results.** `npm run check` passes (1763 unit tests, merged with main's 052). The full `npx playwright test`, once at the end: 155 passed, 0 failed, 144 skipped (review shots). Review shots in docs/review/054: 01 a burrowed Burrower's blue bar with its shield beside a hurt Husk's normal bar, 02 the back wave shaded, 03 an arrow burning past its Pool and 03b its hit flash, 04 a star shot's Shards in flight, and the new art on the contact sheet. Older shots 054 changes retaken: 029/03 (slower homing), 029/04 (the star burst), 029/10 (the Shard's art), 035/04, 035/05, 035/12 (a burrowed Burrower's bar), 037/04 and 04b (the pooled arrow now burns), 041/01, 041/06, 041/07 (rising adds' bars, the shaded wave). 037's Shatterpoint shot fails its own setup on main as well (not 054's area; left as is). `npm run measure`, recorded, not tuned, identical to 051: ammo line and still 5/5 met; ring 1 2.2–3.2 s, ring 2 2.4–4.0 s met; ring 3 4/5 in band (14.1–21.6 s, MISSED); the Bulwark's decent build 14/20 with 2 KOs (MISSED); the naive bot KO'd 5/5.

## Shaun's merge (2026-10-21)
- Shaun said "merge 46 and 47" after playing the preview. He changed none of the raised items, so they stand as built.
