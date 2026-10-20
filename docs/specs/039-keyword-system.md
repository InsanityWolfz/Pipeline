# 039: Keyword system
status: approved

Approved on draft by Shaun in chat, 2026-10-19 ("Approve on draft"); built from docs/brainstorm/2026-10-19-keyword-interview.md.

## Goal
Every rule a round, status or piece of content can have gets one fixed name from a closed keyword list in data, and every player-facing rules line is generated from that data. A talent, relic, stage or affix names exactly one scope ("Bomb: +10% damage", "Burst: +15% radius"), so a player sees at a glance which things build together. Each reserved word means one thing, content is renamed to fit, and the rule changes Shaun chose in the interview go in: Stun, Pool, Knockback on rounds, elements on every family, and exact fire rates.

The numbers stay as they are. This spec records the target damage order (landmine > arrow > ley bolt ≈ bomb, per hit) for the balance spec (041), which retunes. The legibility UI that shows all this (hover summaries, the breakdown, the Build tab and the glossary) is 040.

## Design references
- docs/design.md:
  - "Pillars" 3 (the layout is the ability), 4 (emergence from rules, not content) and 6 (offense from the factory, defense from the field: loosened for relics by this spec, see Docs)
  - "Combat": "Damage types behave differently" (Cold slows then freezes; "Physical deals big direct hits", changed by this spec), "Skill tree" (lanes map to ammo families), "Defense comes from found armor" ("Gear never adds damage", changed for relics)
  - "The Foundry": stage machines add at most one element and one shape tag
- docs/brainstorm/2026-10-19-drive-rant.md, Part 2, themes 12 to 14: "every projectile behaviour, damage type and effect needs a defined keyword"; content "either reuses keywords or adds a new one with its own build path"; "exact numbers, scope and components"; builds must link visibly.
- docs/brainstorm/2026-10-19-keyword-audit.md: section 1 (inventory and what each piece of content really reaches), section 2 (problems), section 3 (glossary v0). Where the interview differs, the interview wins.
- docs/brainstorm/2026-10-19-keyword-interview.md (Shaun, 2026-10-19), all rounds:
  - Q1: relics (and later sets) may bend a keyword's rule or numbers ("Cluster: +2 Bomblets"); regular affixes stay defensive.
  - Q2: no boss sets now.
  - Q3: each content line names exactly one scope: a family or a behaviour keyword.
  - Q4: landmines are their own family; their explosion is a Burst.
  - Q5: Shot, Lob, Mine, Pierce, Homing, Split (replacing "Star"), Burst, Cluster, Knockback, Physical, Cold, Chill and Freeze. No Thaw. Stagger and Charged are not keywords.
  - Q6: rename now, one word one rule. Q7: names needn't contain their keyword. Q8: Splitter stays a piece name, never a chip.
  - Q9: ley keeps one shape per round.
  - Round 3: Stagger becomes **Stun** (Rollbreaker stuns); **Pool** is any circle left on the ground (Blastfletch's charged ground becomes a Pool).
  - Q10: Physical has no rule; design.md's "big direct hits" line is updated.
  - Q11: Knockback lives on each round, builds can raise it, scaled by an enemy weight, bosses weigh 0.
  - Q12: an element stage can tag any family; shapes stay per family.
  - Q13: all "+%" to a stat add; relics and keystones use "×"; cooldowns become fractional so the shown % is exact.
  - Q14: times in seconds (1 decimal), changes in %, px only in the full breakdown.
  - Q16: Chill and Freeze are two statuses; the immunity after a freeze is part of Freeze's text.
  - Q17: the new-keyword rule (template, numbers in data, at least one source, at least two payoffs), enforced by a data test.
  - Q18: enemy traits are named chips only (Shield, Boss, Burrowed).
  - Q19: combos always go through a keyword: A creates a status or Pool, C consumes it.
  - Q20: retune in a separate balance spec; this one records the target order.
- Specs 029 (tags, stages, cold, homing, star split), 034 (shields: lobbed bursts never blocked), 035 (the Charger's wall daze), 036 (affixes, relics, `playerStats`), 037 (talents, keystones) and 038 (landmines, cluster). Their numbers are kept.

## Acceptance criteria

**The keyword list (data)**
- [ ] `src/data/keywords.ts` (new) holds `KEYWORDS`, the closed list. Each entry has:
  - `id` (kebab-case) and `name` (Title Case, as shown on a chip)
  - `group`: `delivery`, `behaviour`, `damage-type`, `status`, `ground`, `family` or `trait`
  - `state`: `live` or `reserved` (reserved keywords exist in data but never show in game)
  - `template`: one rules line with `{param}` slots and keyword references by id (rendered as that keyword's name), and no digits
  - `params`: each read from a data constant (never typed in the template), with its unit (`ticks`, `px`, `deg-per-tick`, `fraction`, `count`, `hp`, `hp-per-s`). A param is either fixed (one constant) or per source (read from the round, relic or keystone that carries the keyword).
  - `stats`: the stats content may change under this scope
- [ ] The list, exactly:

| Group | Keyword | Template (bold = another keyword) | Params today | Exposes |
| --- | --- | --- | --- | --- |
| Delivery | Shot | Flies straight at the cursor up to {range} at {speed}. Stops at walls and **Shield** fronts. | per source: arrow 320 px, 480 px/s; ley bolt 320 px, 300 px/s; Shard 64 px, 360 px/s | damage, fire rate, range, speed |
| Delivery | Lob | Arcs over everything to the cursor, up to {range} away, and lands. Ignores **Shield**. | bomb 192 px, 200 px/s | flight time, range |
| Delivery | Mine | Arcs to the cursor, up to {range} away, lies armed and **Bursts** {arm} after landing. Only its timer sets it off. Cleared when you leave the area. | landmine 192 px, 300 ticks | arm time |
| Behaviour | Pierce | Passes through every enemy in its path, hitting each once. Stops at walls and **Shield** fronts. | arrow (no limit) | none |
| Behaviour | Homing | At launch, locks onto the enemy nearest the cursor within {lock} of it and turns up to {turn} toward it. Flies straight without a target. | 64 px, 4°/tick | turn rate, lock radius |
| Behaviour | Split | On an enemy hit, sends {count} **Shards** in a star for {damage} each. A Shard is a small **Shot** that never **Pierces** or **Splits** and can't hit that enemy. | 5, 4 | Shards, Shard damage |
| Behaviour | Burst | Deals {damage} to every enemy within {radius}. Ignores **Shield**. No **Knockback**. | per source: bomb 15 / 48 px; bomblet 8 / 20 px; landmine 60 / 24 px; Pool-burst = the arrow's hit / 24 px | damage, radius |
| Behaviour | Cluster | {delay} after its **Burst**, {count} Bomblets land {distance} out, each a **Burst** of {damage} in {radius}. | 12 ticks, 4, 40 px, 8, 20 px | Bomblets |
| Behaviour | Knockback | Each hit pushes the enemy {push} times its weight. A **Boss** weighs 0. | per round: 6 px on arrow and ley-bolt rounds and their Shards | knockback |
| Damage type | Physical | Plain damage, with no extra effect. | none | none |
| Damage type | Cold | Each hit adds {chill} **Chill**. | 1 | none |
| Damage type | Fire, Lightning, Poison | reserved: templates written from design.md when they ship | none | none |
| Status | Chill | Stacks up to {stacks}. Each stack slows the enemy's movement {slow}. Lasts {duration}, refreshed by each **Cold** hit. At {stacks} it **Freezes**. | 4, 15%, 120 ticks | stacks to Freeze, slow, duration |
| Status | Freeze | Can't move or act for {duration} ({bossDuration} for a **Boss**); a wind-up pauses. Still takes damage and **Knockback**. Then can't gain **Chill** for {immune}. | 90, 45, 120 ticks | duration, immunity |
| Status | Stun | Can't move or act for {duration}, and a wind-up is cancelled. A **Boss** or **Burrowed** enemy can't be Stunned. | per source: Rollbreaker 40 ticks; the Charger's wall 60 ticks (039.6) | duration |
| Ground | Pool | A circle {radius} round that lies on the ground for {duration}. Its source says what it does. | per source: Blastfletch, the Burst's radius, 20 ticks | duration |
| Family | Arrow, Bomb, Ley, Landmine | Any round of this family, and every **Shard**, Bomblet and **Burst** it makes. | none | damage, fire rate |
| Trait | Shield | Blocks **Shots**, **Shards** and punches from its front {arc}. Turns {turn}. | per enemy: Bulwark 180°, 40°/s; Shardback 180°, 120°/s | none |
| Trait | Boss | Weighs 0 against **Knockback**, can't be **Stunned** or pushed by a punch, and **Freezes** for less. | none | none |
| Trait | Burrowed | Can't be hit, and **Homing** loses it. | none | none |

- [ ] **Derived tags** are computed from a round's keywords, never assigned by hand: AOE (has Burst), Projectile (Shot or Shard) and Elemental (its damage type isn't Physical). They are data only for now (039.13).
- [ ] **Children** (Shards, Bomblets, Pool-bursts) carry their parent round's family and damage type (039.3), and Shards carry its Knockback.
- [ ] A round's keywords are derived from its data, never listed by hand: its family (its base), its delivery (from `kind`: straight → Shot, lob → Lob, mine → Mine), Pierce if `pierce`, Knockback if `knockback` > 0, Burst if it lobs or mines, its tags' keywords (Homing, Split, Cluster, Cold), and Physical if it has no element. Today's `arrow` is Arrow · Shot · Pierce · Knockback · Physical; `bomb+frost+cluster` is Bomb · Lob · Burst · Cluster · Cold.

**Renames: one word, one rule (data, sim, render)**
- [ ] The reserved words are the keyword names plus Shard and Bomblet (the two child nouns). Rules text and content names (items, rounds, stages, talents, relics, projectiles) never use one for anything else. World names that never show as a chip and carry no rules text may keep them (Q8's Splitter rule): Splitter, Shardback and its champion names, Frozen Grotto, Ley Springs.
- [ ] Renamed, with ids renamed alongside (039.14):

| Today | Becomes | Why |
| --- | --- | --- |
| tag `star`, "Star ley bolt" (`ley-bolt+star`), `STAR`, projectile `star-shard`, event `starBursts` | tag `split`, "Split ley bolt" (`ley-bolt+split`), `SPLIT`, projectile `shard`, event `splits` | Split replaces Star (Q5) |
| Shatter lens (`shatter-lens`) | **Prism lens** (`prism-lens`) | "Shatter" stays only in Shatterpoint, a name; the lens makes Splits |
| Shard die (`shard-die`) | **Cluster die** (`cluster-die`) | it makes Bomblets, not Shards |
| Short Fuse (B3) | **Swift Arc** | it shortens Lob flight time, not a fuse |
| Ley shard (`ley-shard`, a part) | **Ley dust** (`ley-dust`) | Shard means Split's child only |
| Rime shard (`rime-shard`, a raw) | **Rimestone** (`rimestone`) | as above |
| Rime cluster (`rime-cluster`, a node) | **Rime outcrop** (`rime-outcrop`) | Cluster is a keyword |
| Shatterpoint's "ice shards" (`ice-shard`) | **Shards** (projectile `shard`) | one noun; their damage type follows the bolt |
| Stagger (relic rule `stagger`, `staggerTicks`, enemy `staggered`, event `staggers`) | **Stun** (`stun`, `stunTicks`, `stunned`, `stuns`) | round 3 |
| Charged ground (`BlastCharge`, `blastCharges`, `chargeTicks`, `chargedBursts`, arrow `charged`) | **Pool** (`Pool`, `pools`, `poolTicks`, `poolBursts`, arrow `pooled`) | round 3 |
| The landmine's fuse (`fuseTicks`, "fuse ring") | **arm time** (`armTicks`, arm ring) | Fuse means only the part |
| "Blast radius" (effect `blast-radius`, stats `blastRadius`, `bombletRadius`) | Burst radius (a `Burst: radius` line) | Burst is the one area word |
| Grinder: "Grinds ley crystal into shards." Packer: "Packs casings, fuses and shards into bombs." | "Grinds ley crystal into dust." "Packs casings, fuses and ley dust into bombs." | follows the item rename |
| Goals: "Gather rime shards at the Frozen Grotto", "Try a ley stage at the bench: homing or star" | "Gather rimestone at the Frozen Grotto", "Try a ley stage at the bench: homing or split" | follows the renames |
| Stat labels: "max HP", "Max health", "regen/s", "Health regen", "speed", "Move speed", "Speed" | one label each: **max health**, **field regen**, **move speed** (affixes, talents and totals alike) | audit 2.5 |

- [ ] Kept as they are: the Fuse part and the Fuse maker, Splinter, Wide Casing, Blastfletch, Shatterpoint, Splitter, Shardback, the Frozen Grotto.
- [ ] A data test scans every content name and generated rules line and fails if a reserved word appears outside its own meaning (a word list per reserved word, with the world-name exceptions above).

**Content scope and grammar (data)**
- [ ] Each talent, relic, stage and affix carries `lines`: structured data, never free text. A line is either:
  - a **stat line**: `{ scope, stat, op, value }`, with `op` one of `add` (a +% into the stat's one additive pool), `mul` (a ×, relics and keystones only) or `flat` (in the stat's own unit: s, HP, HP/s, armor, a count), or
  - a **rule line**: `{ scope, rule, trigger?, creates?, params }`, where `trigger` and `creates` are keyword ids (a status, Pool or behaviour).
- [ ] `scope` is exactly one of: a keyword id (family, delivery, behaviour, damage type, status or ground), `all-ammo` or `you` (039.1). Content with two effects has two lines.
- [ ] Lines render in the grammar `[Scope]: [stat] [change]`, written change first as in the interview's examples ("Bomb: +10% damage"). Rule lines render as `[Scope]: [rule text]`.
- [ ] A scope reaches every emission that carries it. "Burst" reaches every Burst: a bomb's, a Bomblet's, a landmine's and a Pool-burst. "Bomb" reaches a bomb, a cluster bomb and its Bomblets, not a landmine. "Lob" reaches bombs, not landmines (a landmine's delivery is Mine).
- [ ] Today's content, regenerated (these exact strings are the test's expected text):

| Content | Lines |
| --- | --- |
| A1 Fletcher's Eye | Arrow: +10% damage |
| A2 Quick Nock | Arrow: +10% fire rate |
| A3 Rimecraft | Chill: −1 stack to Freeze · Freeze: +0.5 s duration (boss Freeze too, as today) |
| B1 Black Powder | Bomb: +10% damage |
| B2 Wide Casing | Burst: +15% radius |
| B3 Swift Arc | Lob: −25% flight time |
| L1 Attuned Crystal | Ley: +10% damage |
| L2 Seeker's Lens | Homing: +30% turn rate |
| L3 Splinter | Split: +2 Shards |
| T1 Oiled Breech | All ammo: +8% fire rate |
| T2 Steady Grip | You: +10% walk speed while firing (039.10) |
| T3 Hard Bore | All ammo: +6% damage |
| S1 Tough Hide | You: +15 max health |
| S2 Mending | You: +0.5 HP/s field regen |
| S3 Braced | You: +3 armor |
| S4 Fleet | You: +5% move speed |
| K1 Blastfletch | Bomb: each Burst leaves a Pool for 0.3 s · Arrow: through a Pool, its next hit deals ×1.5 damage and Bursts |
| K2 Shatterpoint | Ley: a hit on a Frozen enemy ends the Freeze, deals ×2 damage and sends 4 Shards for ×0.5 its damage |
| K3 Overpressure | All ammo: held fire ramps up to ×1.25 fire rate over 2.0 s |
| Rollbreaker Greaves | You: rolling through an enemy Stuns it for 0.7 s, once per roll |
| Wardstone Circlet | You: after 6.0 s unhit, the next hit is blocked |
| Featherplate | You: no move speed slow from heavy armor · You: ×0.75 roll distance |
| Last Ember | You: once a trip, a killing hit leaves you on 1 HP, invulnerable for 1.0 s |
| Frost rune | Cold: added to any round · 1 rimestone per 4 |
| Ley guide | Homing: added to Ley rounds · 1 ley crystal per 4 |
| Prism lens | Split: added to Ley rounds · 2 ley crystal per 4 |
| Cluster die | Cluster: added to Bomb rounds · 1 ley-iron per 4 |
| Affixes | You: +N max health · +N armor · +N HP/s field regen · +N% move speed · −N% roll cooldown · +N% roll distance (039.9) |

- [ ] Affix lines are always scope `you` (affixes stay defensive). Relic and keystone lines may use any scope, and a relic may bend a keyword's rule or numbers ("Cluster: +2 Bomblets"); no new relic ships in this spec.
- [ ] Every combo goes through a keyword: a rule line that consumes something names it as `trigger`, and it must be a status, a Pool or a behaviour some other line `creates` or a round carries. Blastfletch: Bomb Bursts create Pool, Arrows consume it. Shatterpoint: Cold creates Chill and Freeze, Ley consumes Freeze. A data test fails on a trigger nothing creates.

**Numbers in player text (data)**
- [ ] One formatter in `src/data/rulesText.ts` turns params into text: times in seconds to 1 decimal ("0.3 s"), changes in % ("+15%"), multipliers as "×1.5", counts and HP whole, rates "/s" to 1 decimal, turn rates "°/s". Px appear only where 040's breakdown or glossary asks for them; summary lines never show px.
- [ ] Every stat has one label and unit in data (`STATS`), used by talents, affixes, the gear totals line and 040.

**The new-keyword rule (data test)**
- [ ] For each live keyword except traits, a data test checks:
  - its template is digit-free and every `{param}` and keyword reference resolves
  - every param reads a number from data
  - it has at least one **source**: a round, tag, relic or keystone line that grants or creates it
  - it has at least two **payoffs**: content lines whose scope is it, or whose `trigger` is it
- [ ] Sources and payoffs are computed from data, never listed by hand.
- [ ] Keywords already in the game that don't meet the rule today are listed in `KEYWORD_DEBT` with a one-line note each (039.2). The test fails if a keyword outside that list breaks the rule, or if a listed keyword now meets it (so the list only shrinks). Today's debt, exactly: Shot, Lob, Mine, Pierce, Homing, Split, Cluster, Knockback, Physical, Cold, Chill, Stun, Pool and Landmine. Arrow, Bomb, Ley, Burst and Freeze meet the rule.

**Generated text only (data test)**
- [ ] `TalentDef.text`, `RelicDef.text`, `StageDef.description` and the affix `label`/`sign`/`shownScale` fields are removed. The talent hover, relic row, stage build tip, bench stage rows and gear rows show generated lines.
- [ ] A data test renders every content line and keyword template and checks that no template or content field (other than a name) holds a digit or a keyword name typed by hand, and that the expected-text table above matches.

**Stat resolution (sim)**
- [ ] One pure function, `resolveStat` in `src/sim/statResolve.ts`, gives any stat of any emission (a round, a Shard, a Bomblet, a Pool-burst, a status, the player) as `{ base, adds: [{ source, value }], muls: [{ source, value }], flats: [{ source, value }], final }`, where `final = (base + Σflats) × (1 + Σadds) × Πmuls`. Every system reads stats through it: the tube, bursts, mines, cluster, homing, split, cold, keystones, relics and `playerStats`.
- [ ] Talent effects become lines: the hand-coded effect kinds (`damage`, `fire-rate`, `freeze`, `blast-radius`, `lob-time`, `homing-turn`, `star-shards`) go. A new talent or relic that changes an existing stat needs data only.
- [ ] Derived stats are never rounded in the sim (radius, flight time, fire interval, roll cooldown). Only text rounds.

**Rule and behaviour changes (sim)**
Each is listed in the PR. Everything not listed here behaves exactly as today, with every existing test kept or renamed only.
- [ ] **Stun.** Rollbreaker applies the Stun status: same 40 ticks, wind-up cancelled, once per roll per enemy, never a Boss or Burrowed enemy. Effect unchanged; the field, rule, event and relic rule are renamed. The Charger's wall daze applies the same status for its own 60 ticks, effect unchanged (039.6).
- [ ] **Pool.** Blastfletch's charged ground is a Pool: same 20 ticks, the Burst's radius, an Arrow through it takes it, its next hit ×1.5 and a Pool-burst. New: every Bomb-family Burst leaves one, so a cluster bomb's Bomblets do too (039.4; 038.6 said no). Landmines don't (Landmine family).
- [ ] **Knockback on rounds.** `StraightAmmo` gains `knockback` (arrow 6, ley-bolt 6 px), Shards inherit it, Bursts have none. Enemy `hitKnockback` becomes `weight`: Husk 1, Wisp 4/3, Charger 1/2, Burrower 1, Shardback 1/3, Sniper construct 1, Pylon Warden 0, Bulwark 0. A hit pushes `knockback × weight` px over the enemy's `hitKnockTicks`. Every non-boss is pushed exactly as far as today. **Changed:** the Pylon Warden is no longer pushed 1 px (bosses weigh 0). The "frozen boss ignores knockback" special case goes, since weight 0 covers it. The punch keeps its own push (039.5).
- [ ] **Elements on every family.** `TagDef.appliesTo` becomes a list. `frost` applies to arrow, bomb, ley-bolt and landmine; shapes stay per family (`homing` and `split` on ley-bolt, `cluster` on bomb). One element and one shape per round; a ley bolt is Homing or Split, never both. New derived rounds: `bomb+frost` (Frost bomb), `bomb+frost+cluster` (Frost cluster bomb), `ley-bolt+frost` (Frost ley bolt), `ley-bolt+frost+homing`, `ley-bolt+frost+split`, `landmine+frost` (Frost landmine). A Cold Burst adds 1 Chill to every enemy it hits.
- [ ] **Children inherit the damage type** (039.3). **Changed:** a Frost arrow's Pool-burst is Cold (it was always Physical). Split Shards and Shatterpoint's Shards from a Frost ley bolt are Cold; from a plain ley bolt they stay Physical, as today.
- [ ] **Burst content reaches every Burst.** **Changed:** Wide Casing now also widens the landmine's Burst (24 → 27.6 px) and the Pool-burst (24 → 27.6 px). Bomb and Bomblet radii as today.
- [ ] **Exact fire rates.** Each entrance's cooldown and the carried-round cooldown are fractional: they count down 1 a tick, a round fires when it reaches 0 or less, and the interval `fireTicks / fire-rate multiplier` is added to it (a cooldown never banks below 0 while fire isn't held). **Changed:** a bonus now gives exactly its rate (Quick Nock arrows fire 4.4/s, not 4.29/s; Oiled Breech ley bolts 3.24/s, not 3.16/s). With no bonus every interval is whole and timing is tick-identical to today.
- [ ] **No rounding of derived stats.** **Changed:** Wide Casing's bomb radius is 55.2 px, not 55.
- [ ] **Overpressure multiplies.** Keystones use ×. **Changed:** at full ramp it multiplies fire rate by 1.25 after the +% pool (was +25% added into it): Quick Nock + Oiled Breech arrows reach 4 × 1.18 × 1.25 = 5.9/s (today 4 × 1.43, rounded to 10-tick shots: 6.0/s).
- [ ] **Roll affixes in %** (039.9). **Changed:** roll cooldown rolls −10% to −20% of the base (was −3 to −6 ticks of 30), summed and floored at −50% (the same 15-tick floor); roll distance rolls +8% to +16% (was +8 to +16 px of 96).
- [ ] **Cold data.** `COLD` gains `chillPerHit: 1` and `LAST_EMBER` gains `saveHealth: 1`, so their text reads data. No effect change.

**Stages on every family (sim, render)**
- [ ] The frost rune takes any round without an element (plain or shaped, of any family) plus its rimestone, and puts it out with `frost` added. Its unlock is unchanged: hand-apply it once to any round.
- [ ] The bench's Stages section has one row per stage and family it applies to: Frost rune × Arrow, Bomb, Ley bolt, Landmine; Ley guide; Prism lens; Cluster die (039.12). The Frost landmine row shows once ley-iron is found (038.3's rule).
- [ ] New rounds draw with their base's icon and projectile plus the element's badge and tint (029's badge style); a Cold Burst flashes in frost colours (039.15). Pending Shaun's approval by eye.

**Docs (on approval)**
- [ ] docs/design.md, pillar 6: "Offense from the factory, defense from the field. The factory never makes armor or defense, so nobody can turtle with it. Regular gear affixes stay defensive; a relic (and later a set) may bend a keyword's rule or numbers, such as 'Cluster: +2 Bomblets'. (Changed 2026-10-19, Shaun, spec 039.)"
- [ ] docs/design.md, "Defense comes from found armor": "Gear never adds damage." becomes "Affixes never add damage; a relic's rule may bend a keyword (pillar 6)."
- [ ] docs/design.md, "Damage types": "Physical deals big direct hits." becomes "Physical is plain damage, with no extra effect." "Cold comes first, through the frost rune on arrows" becomes "through the frost rune, which tags any ammo family".
- [ ] docs/design.md, "The Foundry": "a shatter lens a five-shard star split" becomes "a prism lens a five-Shard Split"; element stages tag any family, shape stages one family.
- [ ] docs/design.md, "Combat", a new **Keywords** paragraph: every rule has one name from a closed list in data; content names one scope per line; a new keyword needs a template, data numbers, a source and two payoffs; combos go through a status or Pool.

**Hook**
- [ ] `getState()` reports each shot's `keywords`, each enemy's `stunned`, `weight`, `chill` and `frozen`, live `pools`, and the renamed events (`splits`, `stuns`, `pools`, `poolBursts`). Armed mines report `armTicks`.
- [ ] `__GAME__.keywords()` (dev only) returns the rendered keyword list and every content line, so e2e and 040 read the same text.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Tests touched only by a rename are listed in the PR; tests whose numbers change are listed with the behaviour change above.

## Data changes
- `src/data/keywords.ts` (new): `KEYWORDS`, `KEYWORD_DEBT`, derived-tag rules.
- `src/data/statDefs.ts` (new): `STATS` (id, label, unit, which scopes expose it).
- `src/data/rulesText.ts` (new, pure): template rendering and number formats.
- `src/data/ammo.ts`: `knockback` on straight ammo; `fuseTicks` → `armTicks`; keyword derivation helpers.
- `src/data/tags.ts`: `appliesTo` a list; `star` → `split` (`SPLIT`, projectile `shard`); `COLD.chillPerHit`; `TagDef.keyword`.
- `src/data/stages.ts`: `prism-lens`, `cluster-die`; `description` removed; per-family recipes.
- `src/data/talents.ts`: `effect` and `text` → `lines`; B3 renamed Swift Arc; `BLASTFLETCH.chargeTicks` → `poolTicks`; `SHATTERPOINT.projectile` → `shard`, its `damageType` removed (inherited).
- `src/data/relics.ts`: `text` → `lines`; rule `stagger` → `stun`, `staggerTicks` → `stunTicks`; `LAST_EMBER.saveHealth`.
- `src/data/gear.ts`: `AFFIXES` read labels from `STATS`; roll affixes as fractions.
- `src/data/enemies.ts`, `hollowsEnemies.ts`, `bulwark.ts`: `hitKnockback` → `weight`; the Charger's `stunTicks` feeds the Stun status.
- `src/data/items.ts`, `nodes.ts`, `recipes.ts`, `pieces.ts`, `grotto.ts`, `objectives.ts`, `playtest.ts`, asset and sound keys: the renames above.
- New sim file `src/sim/statResolve.ts`; `src/sim/keystones.ts` Pool rename; `src/sim/relics.ts` Stun; `src/sim/knockback.ts` round × weight; `src/sim/tube.ts` fractional cooldowns.

## Out of scope
- **Balance numbers.** The target per-hit damage order is landmine > arrow > ley bolt ≈ bomb (today: landmine 60, ley bolt 14, bomb 15, arrow 10). Recorded here; 041 retunes it, the Bulwark and frost (Husks can't be frozen at today's numbers, 029).
- Boss gear sets and set bonuses (Q2).
- Content that scales against enemy traits (Q18).
- New ammo, new keywords, the reserved damage types, new relics, and payoffs for the debt list (later content specs).
- Homing and Split on one ley bolt (Q9).
- The legibility UI: hover summaries, the breakdown, the Build tab and the glossary (040).
- Saves (042).

## Test plan
- **Vitest (data):**
  - Every keyword has a group, state, digit-free template and resolvable params; reserved keywords never appear on a round.
  - The new-keyword rule over every live keyword, with `KEYWORD_DEBT` exactly as listed.
  - Every content line has exactly one scope; affixes are scope `you`; every `trigger` is created somewhere.
  - The expected-text table, line for line; no hand-typed digit or keyword in any content field.
  - The reserved-word scan over names and generated lines.
  - Round keywords derive as listed (`arrow`, `bomb+frost+cluster`, `landmine+frost`); the ten tagged rounds exist and nothing else.
- **Vitest (sim):**
  - `resolveStat`: an arrow with Fletcher's Eye and Hard Bore is 10 × 1.16 = 11.6; Overpressure at full ramp multiplies after the add pool; Rimecraft's flat −1 and +30 ticks (boss Freeze 75).
  - Scope reach: Wide Casing reaches bomb, Bomblet, landmine and Pool-burst; Black Powder reaches bomb and Bomblets, not landmines; Swift Arc reaches bombs, not landmines.
  - Fractional cooldowns: 1100 ticks of held fire with Quick Nock fire 80 arrows (4.4/s × 18.33 s, ±1); with no bonus, the shot ticks equal the old rule's.
  - Knockback: a Husk, Wisp, Charger, Shardback and Sniper are pushed exactly today's px; the Warden and Bulwark 0.
  - Stun from Rollbreaker and the Charger's wall: same ticks and outcomes as today's stagger and wall-daze tests.
  - Pools: a bomb's Burst and each Bomblet leave one; a landmine doesn't; an arrow through one hits ×1.5 and Bursts.
  - Cold on every family: a Frost bomb's Burst chills every enemy hit; a Frost ley bolt's Split Shards chill; a Frost arrow's Pool-burst chills.
  - Roll affixes: −15% cooldown gives 25.5 ticks; the −50% floor; +12% distance gives 107.52 px.
  - Determinism with the new rounds.
- **Playwright:** with `?playtest`, hand-apply the frost rune to a bomb at the bench, fire Frost bombs at a pack and see `chill` on several enemies in `getState()`; read `__GAME__.keywords()` and check Wide Casing's line.
- **Screenshots:** a Frost bomb and a Frost ley bolt in flight, a Cold Burst, the bench's Stages rows, the talent hover with a generated line, a gear row with the new labels.

## Open questions
Each has a proposed answer that the build follows (approve-on-draft); Shaun may change any of them at playtest.

- **039.1 What scope do all-ammo and player lines use, since Q3 names only families and keywords?** Proposal: two fixed non-keyword scopes, **All ammo** (Oiled Breech, Hard Bore, Overpressure) and **You** (player stats, defensive relic rules, affixes). They render as plain grey chips with their own glossary entries and count as no keyword's payoff.
- **039.2 Keywords already shipped that fail the new-keyword rule?** Proposal: the `KEYWORD_DEBT` list above, which may only shrink. The debt is the missing build paths, for the content specs after 041.
- **039.3 Do children (Shards, Bomblets, Pool-bursts) take their parent's damage type?** Proposal: yes, one rule with no exceptions (Q19's "no hidden rules"). It makes a Frost arrow's Pool-burst Cold, and lets Shatterpoint's Shards from a Frost ley bolt chill their neighbours, a chain 037 avoided only because frost ley bolts didn't exist. 041 watches it.
- **039.4 Do a cluster bomb's Bomblets leave Pools (038.6 said no)?** Proposal: yes. Blastfletch's line is scoped Bomb, and Bomblets are Bomb family. This also helps the "hard to trigger" note raised in 037.
- **039.5 Is the punch's push Knockback?** Proposal: no. The punch isn't a round and shows no chips; it keeps its fixed 20 px push on every non-boss. 041 may fold it into Knockback.
- **039.6 Is the Charger's wall daze a Stun?** Proposal: yes, the same status for its own 60 ticks, so the word means one thing. Its behaviour doesn't change.
- **039.7 Reserved words in world names?** Proposal: places, enemies and factory pieces may keep them if they never show as a chip or carry rules text: Splitter, Shardback and its champion names, the Frozen Grotto. Content names (items, nodes beside a renamed item, rounds, stages, talents, relics) are renamed as listed.
- **039.8 Durations that aren't a whole tenth of a second** (Rollbreaker 40 ticks, the Pool 20 ticks, a boss Freeze 45 ticks)? Proposal: summary lines round to 1 decimal ("0.7 s"); 040's breakdown and glossary show 2 decimals where 1 isn't exact ("0.67 s"). 041 moves them onto tenths.
- **039.9 Roll affixes in ticks and px break Q14's units.** Proposal: roll cooldown rolls −10% to −20% and roll distance +8% to +16%, whole percents, so the text is exact. Today's values sit inside those ranges.
- **039.10 Steady Grip's stat?** Proposal: **walk speed while firing**, in % of walk speed (70% base). Its +10% adds points (70% → 80%), the one stat whose +% is percentage points; the breakdown shows "70% → 80%". Behaviour unchanged.
- **039.11 Overpressure's +25% is a keystone bonus; does it add or multiply?** Proposal: multiply (×1.25 at full ramp), per Q13.
- **039.12 How do bench rows hand-apply an element stage that now takes four families?** Proposal: one row per stage and family, hidden until that family's ammo can be made (landmine after ley-iron).
- **039.13 Are derived tags (AOE, Projectile, Elemental) scopes or chips?** Proposal: neither yet. AOE would be a second word for Burst. They live in data for the glossary and later content.
- **039.14 Rename ids too, or only names?** Proposal: ids too (`ley-dust`, `rimestone`, `rime-outcrop`, `prism-lens`, `cluster-die`, `split`, `shard`), so code reads the same as the game. There are no saves to migrate yet (042 adds them).
- **039.15 Art for the six new rounds?** Proposal: no new sprites. Each uses its base's icon and projectile with the element's badge and tint (cold: 029's pale ice), and a Cold Burst recolours the burst flash. Pending Shaun's approval by eye.
- **039.16 Which meaning keeps "Fuse"?** Proposal: the part (Fuse, Fuse maker). The landmine's delay is its **arm time**, and Short Fuse becomes Swift Arc.
- **039.17 Ley material names (Ley crystal, Ley-iron, Ley vein, Ley guide, Ley dust…) beside the Ley family keyword?** (Raised in review.) Proposal: keep them. They name materials, nodes and places of the world's magic, never the Ley family's rule, so they are allowed as content names the way 039.7 allows world names. The reserved-word test lists them under Ley and says so.

## Raised after the build (for Shaun at playtest)
- **Side effect of unrounded bomb flight** (listed change 3). Landing ticks are unchanged, but a bomb the Hollows barrier stops mid-flight can now drop a tick sooner and a few px away. Pinned in tests/sim/pinned039.test.ts, with the old values in a comment.
- **Choices the spec didn't make:**
  - Shatterpoint reaches Ley rounds only, not their Shards
  - the inventory panel went to three columns to fit the six new frost rounds
  - Cold Burst flashes use a screen tint
  - the scripted tutorial player now clears nearby packs before claiming the shrine, because the Warden can no longer be pushed (a test change, not a game change)
- **Naming for later:** if Fire becomes an element, the "fire rate" wording will clash (039 open questions).
- **Art:** frost badges, tints and the Cold Burst flash wait on Shaun's approval by eye (docs/review/039).
