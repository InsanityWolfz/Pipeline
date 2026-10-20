# Plan 039: Keyword system

Spec: docs/specs/039-keyword-system.md (approved on draft, 2026-10-19; its open questions 039.1–039.16 each carry a proposal that this build follows). Built on `claude/laughing-volta-uac3nf` after 021–038. The spec asks for the docs/design.md edits under "Docs (on approval)", each tagged "(Changed 2026-10-19, Shaun, spec 039)"; docs/prototype.md is untouched.

## Shape of the change
Small vertical commits, tests first in each. Everything the spec doesn't list as a behaviour change keeps today's numbers, pinned before the refactor.

1. **Pin today's numbers** (`tests/sim/pinned039.test.ts`): the values the refactor must keep, measured through the game as it stands — every round's launch damage and burst with each damage talent, bomblet damage and radius, Rimecraft's freeze numbers (boss too), Seeker's Lens' turn, Splinter's count, every whole fire interval with no bonus (tick by tick for 600 ticks of held fire: arrows, ley bolts, bombs, an entrance), Short Fuse's landing tick, the knockback each non-boss takes from an arrow and a ley bolt, the Rollbreaker stagger and the Charger's wall daze ticks, the landmine's arm and burst. The spec's listed changes (Wide Casing's 55 px, the Warden's 1 px, rounded intervals, Overpressure's add, roll affixes in ticks/px, physical Pool-bursts and Shards) are pinned separately and flipped in the commit that changes them.
2. **Renames** (data, sim, render, art keys, sounds, tests, fixtures; no behaviour change): tag `star` → `split` (`SPLIT`, `ley-bolt+split` "Split ley bolt", projectile `shard`, event `splits`); `shatter-lens` → `prism-lens` "Prism lens"; `shard-die` → `cluster-die` "Cluster die"; B3 "Short Fuse" → "Swift Arc"; `ley-shard` → `ley-dust` "Ley dust"; `rime-shard` → `rimestone` "Rimestone"; node `rime-cluster` → `rime-outcrop` "Rime outcrop"; Shatterpoint's `ice-shard` → `shard`; Stagger → Stun (`stun`, `stunTicks`, `stunned`, `stuns`, `rollStunned`); Blastfletch's charge → Pool (`Pool`, `pools`, `poolTicks`, `poolBursts`, arrow `pooled`/`pooledBy`, `nextPoolId`); the landmine's `fuseTicks`/`fuse` → `armTicks`/`elapsed`, the fuse ring → arm ring; `blastRadius`/`bombletRadius` go with 3; the grinder/packer/focuser/mine-packer tips and the two goals follow the item names. The Bulwark's own bomb fuse is not the landmine's and is left alone.
3. **Keywords in data** (new `src/data/keywords.ts`, `src/data/statDefs.ts`, `src/data/rulesText.ts`, `src/data/contentLines.ts`):
   - `KEYWORDS`: the spec's closed list (id, name, group, state, template, params with unit and fixed value or per-source lookup, the stats it exposes, what it creates: Cold → Chill, Chill → Freeze, Mine → Burst). Child nouns Shard and Bomblet in `NOUNS`. Templates hold `{param}` slots and `{{id}}` references (a keyword's or noun's name, with a suffix after the braces for plurals: `{{burst}}s`; `{{freeze.adj}}` reads Freeze's own "Frozen" form), and no digits.
   - `KEYWORD_DEBT` (the spec's 14) and the derived tags (AOE, Projectile, Elemental) as data.
   - `roundKeywords(ammoId)` derived from ammo data (family, delivery from `kind`, Pierce, Knockback, Burst for lob/mine, tag keywords, Physical without an element), plus the emission keyword sets for children (Shard, Bomblet, Pool-burst) and statuses.
   - `STATS`: one label and unit per stat (talents, affixes, the gear totals, 040).
   - `rulesText.ts`: the one formatter (seconds to 1 decimal, %, ×, whole counts and HP, /s to 1 decimal, °/s), template rendering, a content line's text (`Scope: change label` / `Scope: rule text`), a stage's line plus its cost.
   - `lines` on every talent, relic, stage and affix (structured stat and rule lines; scope a keyword id, `all-ammo` or `you`); `TalentDef.text`/`effect`, `RelicDef.text`, `StageDef.description` and the affix `label`/`sign`/`shownScale` removed. Rules (`RULES`): pool-on-burst, pool-strike, shatter, ramp, roll-stun, ward, no-heavy-slow, last-stand, adds (a stage). Keystone and relic identity is read from their rule lines.
4. **One stat path** (`src/sim/statResolve.ts`): `resolveStat(state, stat, emission, base)` → `{ base, adds, muls, flats, final }`, `final = (base + Σflats) × (1 + Σadds) × Πmuls` (Steady Grip's points stat adds its points to the base). Sources: taken talents' stat lines, worn affixes (the gear move cap and the roll-cooldown floor as their own capped entries), relic stat lines, heavy armor's walk ×, and the ramp rule's live × on fire rate. A line reaches an emission when its scope is one of the emission's keywords, `all-ammo` on any ammo emission, `you` on the player. `playerStats` (player numbers) is built from it; the ammo systems (tube, bombs, mines, cluster, homing, split, cold, keystones) read it per emission. `talentEffects.ts` goes. No derived stat is rounded in the sim.
   - Changes that come with it, each listed in the spec: Wide Casing's bomb radius 55.2 (not 55); Burst content reaches the landmine's Burst (27.6) and the Pool-burst (27.6); Overpressure multiplies (×1.25 at full ramp, after the add pool); bomb flight time isn't rounded (it still lands on the same tick).
5. **Exact fire rates** (`src/sim/tube.ts`): each entrance's and the carried round's cooldown count down 1 a tick when above 0; a round fires at 0 or less and adds `TICK_RATE / fire rate`; a cooldown that didn't fire is clamped to 0, so nothing banks while fire isn't held. Whole intervals are tick-identical to today; Quick Nock arrows fire 4.4/s.
6. **Rule changes:**
   - **Stun** (`src/sim/stun.ts`): one status, `stunned` ticks on the enemy, applied by Rollbreaker (40) and the Charger's wall (60, mode `stun` kept for its pose); never a Boss or Burrowed enemy; the enemy step counts it down and returns the enemy to chase. `stuns` events from both.
   - **Pool:** every Bomb-family Burst leaves one with Blastfletch (a cluster bomb's Bomblets too; landmines don't); an Arrow round through it takes it.
   - **Knockback on rounds:** `StraightAmmo.knockback` (arrow 6, ley bolt 6), Shards inherit it, Bursts have none; enemy `hitKnockback` → `weight` (Husk 1, Wisp 4/3, Charger 1/2, Burrower 1, Shardback 1/3, Sniper 1, Warden 0, Bulwark 0); push = knockback × weight over `hitKnockTicks`; the frozen-boss case goes. The Warden is no longer pushed 1 px. The punch is unchanged.
   - **Elements on every family:** `TagDef.appliesTo` a list (`frost` on arrow, bomb, ley-bolt, landmine); the six new rounds derive; children carry their parent's damage type (a Frost arrow's Pool-burst and a Frost ley bolt's Shards are Cold); a Cold Burst chills every enemy it hits.
   - **Roll affixes in %:** roll cooldown −10% to −20% (summed, floored at −50%), roll distance +8% to +16%; the playtest kit's values move to whole percents.
   - `COLD.chillPerHit`, `LAST_EMBER.saveHealth` in data.
7. **Stages on every family (render too):** the bench's Stages panel has a row per stage and family (Frost rune × Arrow, Bomb, Ley bolt, Landmine; Ley guide; Prism lens; Cluster die), a landmine row once ley-iron is found; `applyStage` takes a row id (`frost-rune-bomb`); a stage unlocks once any of its rows is hand-applied. The hovered row's generated line shows under the rows. New rounds: base icon with the frost badge and head, frost tint on bombs, mines and bolts in flight, a Cold Burst's flash in frost colours.
8. **Generated text in the UI:** talent hover, relic row, stage build tip, bench rows, gear rows and the gear totals line read `rulesText`/`STATS`.
9. **Hook:** `getState()` shots carry `keywords`; enemies `stunned`, `weight`, `chill`, `frozen`; `pools`; events `splits`, `stuns`, `pools`, `poolBursts`; armed mines `armTicks`. `__GAME__.keywords()` returns the rendered keyword list and every content line.
10. **Docs:** the design.md edits the spec lists, each tagged.

## Tests (written first)
- **Vitest data** (`tests/data/keywords.test.ts`, `tests/data/contentLines.test.ts`, `tests/data/reservedWords.test.ts`):
  - every keyword has a group, state, a digit-free template whose params and references resolve, params read from data; reserved keywords never on a round;
  - the new-keyword rule over every live non-trait keyword with sources and payoffs computed from data, `KEYWORD_DEBT` exactly the spec's 14 (fails if one now meets the rule);
  - every content line has one scope; affixes are scope `you`; `mul` only on relics and keystones; every `trigger` is created by a round, a keyword or another line;
  - the expected-text table, line for line; no digit or keyword name typed into a template, rule or stat label;
  - the reserved-word scan over content names and generated lines, with a per-word allow list (the spec's world names, plus each word's own content);
  - round keywords: `arrow`, `bomb+frost+cluster`, `landmine+frost`; exactly the ten tagged rounds.
- **Vitest sim** (`tests/sim/statResolve.test.ts`, `tests/sim/keywordRules.test.ts`, plus updates):
  - `resolveStat`: Fletcher's Eye + Hard Bore arrow 10 × 1.16 = 11.6; Overpressure ×1.25 after the add pool (5.9/s); Rimecraft's flat −1 and +30 ticks (boss 75);
  - scope reach: Wide Casing on bomb, Bomblet, landmine and Pool-burst; Black Powder on bomb and Bomblets, not landmines; Swift Arc on bombs, not landmines;
  - fractional cooldowns: 1100 ticks of held fire with Quick Nock fire 80 arrows (±1); with no bonus the shot ticks equal the pinned ones;
  - knockback per enemy (today's px; Warden and Bulwark 0);
  - Stun from Rollbreaker and the Charger's wall (the stagger and wall-daze tests, renamed);
  - Pools: a bomb's Burst and each Bomblet leave one, a landmine doesn't; an arrow through one hits ×1.5 and Bursts;
  - Cold on every family: a Frost bomb's Burst chills every enemy hit, a Frost ley bolt's Shards chill, a Frost arrow's Pool-burst chills;
  - roll affixes: −15% gives 25.5 ticks, the −50% floor, +12% gives 107.52 px;
  - determinism with the new rounds.
- **Playwright** (`tests/e2e/keywords.spec.ts`): `?playtest`, hand-apply the frost rune to bombs at the bench, fire Frost bombs at a pack and see `chill` on several enemies; read `__GAME__.keywords()` and check Wide Casing's line.
- **Screenshots** (`tests/e2e/keywordsShots.spec.ts`, REVIEW_SHOTS=1, into docs/review/039/): a Frost bomb and a Frost ley bolt in flight, a Cold Burst, the bench's Stages rows, the talent hover with a generated line, a gear row with the new labels.
- Existing tests are kept, renamed where a rename touches them, and changed only where a listed behaviour change moves their numbers.

## Not dictated by the spec
- Template syntax (`{param}`, `{{id}}`, `{{id.form}}`) and the rule ids above.
- Spec-table parentheses ("(boss Freeze too, as today)", "(039.10)", "(039.9)") are notes, not text.
- Sources and payoffs: stage lines are sources (they grant), not payoffs; a keyword's `creates` (Cold → Chill → Freeze, Mine → Burst) counts as a source. Blastfletch's first line triggers on Burst and creates Pool; its second triggers on Pool; Shatterpoint triggers on Freeze. This gives exactly the spec's debt list.
- A Shard from Split carries Split (so "Split:" content reaches its damage); Shatterpoint's Shards don't. A Shard carries Shot, its parent's family, damage type and Knockback.
- Shatterpoint still triggers only from a Ley round, not its Shards, and Blastfletch's Pool only goes to an Arrow round: both as today (the spec lists no change there).
- The Charger's wall daze is the Stun status, with the daze's own timing exactly as before (review fix): a daze alone (`dazed`) is counted down by the Charger's think, so a freeze pauses it and its 60th tick is its first thinking one; a roll's Stun is counted by the enemy step, frozen or not, and a roll's Stun on a dazed Charger takes over for the longer of the two (pinned in tests/sim/pinned039Stun.test.ts against fd75ac9).
- Bench row ids `<stage>-<family>`; the hovered row's line under the rows.
- Roll cooldown shown in seconds and roll distance in % on the gear totals line (Q14: no px in summaries).
- The playtest kit's roll affixes: −13% and −17% cooldown, +12% and +10% distance.

## Risks
- Wide refactor: every renamed id appears in data, sim, render, art keys and e2e. Typecheck catches code; a grep sweep catches strings in tests.
- `state.ts`, `summary.ts`, `testHook.ts` and `hudLayout.ts` are near 300 lines: new code goes in its own files.
- e2e bots that fire bombs or use stage rows by id; each is updated by id, not by position.

## Build notes
- Commits in order: pins; renames; keywords data; resolveStat; exact fire rates; generated text and roll affixes in %; Stun; Pool; Knockback; elements on every family (with the bench rows and render); hook, e2e and review shots; design.md.
- The inventory panel (031) went to three columns of 196 px: the six new rounds made Ammo 14 rows, too tall to share a column, and two columns no longer fit 640 × 360. Its tablet is baked as two halves of one drawing (a 620 px frame is wider than a 2048-texel page at 4×). Row count and mark moved right so "Frost Homing ley bolt" fits.
- A tagged round's name keeps 029's rule (prefixes in tag order, the base name in lower case): "Frost Homing ley bolt", "Frost Cluster bomb".
- Two tag badges on one icon: the element's sits in the lower-left corner beside the shape's.
- A Cold Burst's flash is the same art screened toward frost (Phaser 4 `TintModes.SCREEN`); a multiply tint turned the fire flash brown. A Frost bomb, ley bolt or landmine takes 029's frost tint.
- Burst events (`bursts`, `mineBursts`, `bombletBursts`, `poolBursts`) carry their damage type, for render's tint.
- `applyStage` takes a bench row id (`frost-rune-bomb`); a stage id still names its home row, so older callers keep working. A stage machine unlocks once any of its rows has been hand-applied.
- The talent panel's centre start has no content lines; its hover line ("The centre: always yours.") moved to the panel's data as UI text.
- Gear rows show a You line without its scope ("+12 max health"); the relic rule line is fitted to the row. The totals line shows roll cooldown in seconds and roll distance as a share of the bare roll (no px in a summary, Q14).
- "fire" stays the verb in "fire rate" and "held fire" while Fire is a reserved keyword; the reserved-word scan allows only that. Flag for Shaun when Fire ships.
- Spec gaps followed as today (the spec lists no change): Shatterpoint triggers from a Ley round, not from Ley Shards, though the Ley family scope would reach them; Blastfletch's Pool goes only to an Arrow round.
- The Charger's wall daze is the Stun status, with the daze's own timing exactly as before (review fix): a daze alone (`dazed`) is counted down by the Charger's think, so a freeze pauses it and its 60th tick is its first thinking one; a roll's Stun is counted by the enemy step, frozen or not, and a roll's Stun on a dazed Charger takes over for the longer of the two (pinned in tests/sim/pinned039Stun.test.ts against fd75ac9).
- Review fixes: Last Ember's 1 HP and Featherplate's numbers are read from data only; Overpressure's getState rate is resolveStat's mul entry; Shatterpoint's Shards take speed and range through resolveStat. The Bulwark keeps BOSS_WEIGHT: it is `boss: true` (Stonefall Hollows' boss).
- Unrounded flight moves a bomb's path mid-flight (the landing tick is unchanged), so a bomb the Hollows barrier seals can drop a tick sooner and a few px off: pinned under the spec's changes.
