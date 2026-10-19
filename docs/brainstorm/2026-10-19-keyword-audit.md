# Keyword audit: what exists after 038, and a proposed glossary

Oct 19, 2026 · Claude, for Shaun. This is research input for the keyword spec interview (drive rant, Part 2, themes 12–14). **Nothing here is decided.** Sections 1 and 2 describe the code as it stands on `claude/laughing-volta-uac3nf` (specs 021–038 built). Sections 3 and 4 are Claude's proposal. Section 5 lists the questions the interview has to settle.

Numbers are in ticks where the code uses ticks (60 ticks = 1 s) and px where it uses px (1 tile = 32 px).

---

## 1. Keyword inventory as it exists

Each row is a candidate keyword: a rule the sim already applies, whether or not it has a name. "Referenced by" lists the content that grants or changes it. "Wording today" is every player-facing string that touches it. "None" means no string anywhere in the game.

| Group | Candidate keyword | Current rule and numbers (file) | Referenced by | Wording today |
| --- | --- | --- | --- | --- |
| Delivery | **Straight shot** (`kind: 'straight'`) | Flies at the cursor. Spent on an enemy (unless it pierces), a solid, a shut ley barrier or at its range. Arrow: 480 px/s, 320 px, 10 dmg, one shot per 15 ticks. Ley bolt: 300 px/s, 320 px, 14 dmg, one per 20 ticks (`src/data/ammo.ts:95`, `:110`; `src/sim/arrows.ts`) | Arrow, ley bolt and all their tagged rounds | None. Item names only: "Arrow", "Ley bolt" |
| Delivery | **Lob** (`kind: 'lob'`) | Arcs over everything to the aim point, capped at 192 px from the feet. 200 px/s ground speed, 32 px arc. Lands, then bursts. A shut ley barrier stops it mid-air. Bomb: one per 40 ticks (`ammo.ts:77`, `src/sim/bombs.ts:40`) | Bomb, cluster bomb. Short Fuse (B3) shortens the flight of bombs only | "Bombs reach their target 25% sooner" (B3). The word "lob" never appears |
| Delivery | **Mine** (`kind: 'mine'`) | Lobbed exactly like a bomb, then lies armed: bursts 300 ticks (5 s) after landing for 60 dmg in 24 px. Only the timer sets it off. No cap on live mines. All mines clear on a room change or KO (`ammo.ts:127`, `src/sim/mines.ts`) | Landmine only. Only all-ammo talents reach it (T1, T3; spec 038.5) | Item "Landmine". Code comment in items.ts only: "shot onto the ground, it bursts after its fuse" |
| Delivery | **Volley / Spread** | Rounds fired together are grouped by base ammo. Straight rounds fan 15° apart (two rounds at ±7.5°). Lobbed rounds land 24 px apart across the aim (`src/sim/volley.ts:204`, `SPREAD_STEP` and `LOB_SPACING` in `src/data/foundry.ts`) | Intake entrances (024, 033) | Goals: "Feed two entrances to fire a spread", "Feed all three entrances" |
| Delivery | **Punch** | 4 physical dmg in a 100° arc, 28 px reach, once per 24 ticks. Pushes non-bosses 20 px over 8 ticks. Blocked by a shield's front (`src/data/combat.ts:9`, `src/sim/melee.ts`) | Nothing scales it | None |
| Sub-projectile | **Shard** | A small straight shot: never pierces or splits, can't hit the enemy that spawned it, stops at walls. Star shard: 4 dmg, 64 px, 360 px/s (`src/data/tags.ts:41`). Ice shard: 50% of the bolt's damage, same flight (`src/data/talents.ts:133`) | Star tag, Splinter (L3), Shatterpoint (K2) | "burst into 7 shards, not 5" (L3); "bursting 4 ice shards" (K2) |
| Sub-projectile | **Bomblet** | 12 ticks after a cluster bomb bursts, 4 bomblets land 40 px out (the first along the flight), each bursting for 8 dmg in 20 px (`tags.ts:47`, `mines.ts:73`) | Cluster tag. Black Powder (B1) and Wide Casing (B2) reach it, unstated | Stage tip: "Makes bombs burst into bomblets: 4 bombs, 1 ley-iron." |
| Behaviour | **Pierce** | Boolean on straight ammo. Arrow `true`: hits every enemy in its path once, without limit, until its range, a solid, or a shield's front. Ley bolt `false` (`ammo.ts:38`, `src/sim/combat.ts:61`) | Arrow base only. Spec 037 forbids talents touching it | None |
| Behaviour | **Burst (area damage)** | `blastArea`: every targetable enemy whose feet are within the radius takes the damage. No knockback, never the player, never blocked by a shield (`src/sim/blast.ts:11`). Bomb 15 dmg / 48 px. Landmine 60 / 24. Bomblet 8 / 20. Blastfletch burst = charged arrow dmg / 24 | Bomb, landmine, bomblet, K1. B1 reaches bomb and bomblet damage. B2 reaches bomb and bomblet radius, not landmine or K1 | "Blast radius +15%" (B2), "Bomb damage +10%" (B1). The word "burst" is also used for star splits and ice shards (see 2.1) |
| Behaviour | **Homing** | At launch, locks onto the live enemy nearest the cursor within 64 px of it, then turns up to 4°/tick (240°/s) toward it. Without a target, or if it dies or burrows, the shot flies straight (`tags.ts:35`, `src/sim/homing.ts`) | Homing tag (ley bolt), Ley guide stage, Seeker's Lens (L2: +30% turn) | Item "Homing ley bolt". Tip "Makes ley bolts home: 4 bolts, 1 ley crystal." L2 "Homing ley bolts turn 30% sharper". Goal "Try a ley stage at the bench: homing or star" |
| Behaviour | **Split (star)** | On an enemy hit only (not a wall or range end), the round sends N shards 360/N° apart, the first along its flight. N = 5, or 7 with L3. Each shard's damage scales with ley damage talents (`combat.ts:24`) | Star tag, Shatter lens stage, Splinter (L3) | Item "Star ley bolt". Tip "Makes ley bolts burst: 4 bolts, 2 ley crystals." L3 "Star ley bolts burst into 7 shards, not 5" |
| Behaviour | **Cluster** | A burst followed by bomblets, on a delay (see Bomblet) | Cluster tag, Shard die stage | Item "Cluster bomb". Tip above |
| Behaviour | **Arm / fuse delay** | Mine: 300 ticks. Bomblets: 12 ticks. Blastfletch's charged ground lasts 20 ticks | Landmine, cluster, K1 | None. The fuse ring is drawn but never named |
| Behaviour | **Knockback** | A straight-shot or shard hit pushes the enemy by the *enemy's own* `hitKnockback` over 4 ticks: Husk 6 px, Wisp 8, Warden 1, Charger 3, Burrower 6, Shardback 2, Sniper 6, Bulwark 0. Bursts never push. A frozen boss ignores it (`src/sim/enemies.ts:140`, enemy data) | Every straight shot. Nothing scales it | None (design.md mentions the punch's knockback only) |
| Behaviour | **Shield / overhead** | A shielded enemy blocks straight shots, shards and punches whose bearing is within 90° of its facing (180° arc). It turns 40°/s (Bulwark) or 120°/s (Shardback). A piercing arrow stops there; a blocked star round doesn't split. Lobbed bursts are never blocked (`src/sim/shield.ts`) | Every delivery, implicitly | None in game. design.md: "lobbed bombs and mines always land" |
| Behaviour | **Charge (Blastfletch)** | With K1, a player bomb's burst charges its area for 20 ticks. An arrow (not a ley bolt or shard) passing through takes the charge: its next enemy hit deals ×1.5 and bursts for that damage in 24 px, **physical** even from a frost arrow (`src/sim/keystones.ts`, `talents.ts:126`) | K1 only. Bomblets and mines don't charge (038.6) | "A bomb's blast charges its ground: an arrow through it hits +50% and bursts on the next enemy" |
| Behaviour | **Shatter (Shatterpoint)** | With K2, a ley bolt hitting a frozen enemy ends the freeze (the refreeze window starts), deals ×2, and sends 4 physical ice shards at 50% of the bolt's damage (`keystones.ts`, `talents.ts:133`) | K2 only | "A ley bolt shatters a frozen enemy for double damage, bursting 4 ice shards" |
| Behaviour | **Ramp (Overpressure)** | With K3, held fire while really firing adds up to +25% fire rate over 120 ticks. Releasing fire resets it (`talents.ts:136`) | K3 only | "Holding fire ramps the fire rate up to +25% over 2 s" |
| Damage type | **Physical** | The default. Has no rule of its own; it only picks the grey hit particle (`src/render/FeelView.ts:122`) | Everything except frost arrows, including K1 bursts and K2 "ice" shards | None. Damage numbers aren't coloured by type |
| Damage type | **Cold** | A hit adds a Chill stack (below). Set by an element tag (`tags.ts:50`, `enemies.ts:153`) | Frost tag (arrows only) | Item "Frost arrow". Tip "Frosts arrows: 4 arrows and a rime shard." |
| Damage type | **Fire** | Declared in `DamageType` (`ammo.ts:12`). Nothing deals it and nothing reads it | Nothing | None |
| Status | **Chill** | +1 stack per cold hit, up to the freeze count (4). Each stack slows the enemy's own movement by 15%. A hit refreshes the 120-tick timer; at expiry all stacks drop (`src/sim/cold.ts`) | Frost tag. A3 lowers the count | None. A3 says "freeze after 1 fewer hit" |
| Status | **Freeze** | The hit that reaches the freeze count freezes the enemy for 90 ticks (a boss 45): no movement or thinking, wind-ups pause, it still takes damage and (non-boss) knockback. Then 120 ticks with no stacks. A3: 3 hits, +30 ticks (bosses too) | Frost tag, A3, K2 | A3: "Frost arrows freeze after 1 fewer hit, and the freeze lasts +0.5 s". The refreeze window is never named |
| Status | **Stagger** | Cancels the enemy's action and holds it in recovery for 40 ticks. Never bosses or burrowed enemies. Once per roll per enemy (`src/sim/relics.ts`, `relics.ts:54`) | Rollbreaker Greaves relic only | "Rolling through an enemy staggers it" |
| Enemy state | **Untargetable** | A burrowed Burrower can't be hit by anything; homing loses it (`enemies.ts` `targetable`) | Implicit everywhere | None |
| Family | **Arrow / Bomb / Ley / Landmine** | Base ammo. Talents scope by `AmmoScope` = `arrow`, `bomb`, `ley-bolt` or `all`; landmine has no scope of its own (`src/data/talents.ts:13`, `src/sim/stats.ts`) | Talent lanes A, B, L. Stages are bound to one base (`appliesTo`) | Lane names on the talent panel; build bar groups |
| Tag slot | **Element / Shape** | A round has at most one element tag and one shape tag. Each tag applies to exactly one base ammo (`tags.ts` `legal`) | Every tag and stage | None |
| Stat | **Damage %** | Multiplier per base = 1 + lane bonus + all-ammo bonus, added together. Keystone ×1.5 and ×2 multiply on top. Applied at launch (`stats.ts:90`, `tube.ts:154`) | A1, B1, L1, T3, K1, K2 | "Arrow damage +10%", "Damage +6%, all ammo" |
| Stat | **Fire rate %** | Ticks between shots = round(fireTicks / (1 + bonus)), at least 1. Rounding makes the real bonus differ from the text (see 2.6) (`tube.ts:70`) | A2, T1, K3 | "Arrow fire rate +10%", "Fire rate +8%, all ammo" |
| Stat | **Defensive stats** | Armor: hit = max(ceil(dmg × 0.25), dmg − armor) (`stats.ts:144`). Max HP 100 + bonuses. Field regen. Walk speed (gear bonus capped at +15%). Roll cooldown (at least 15 ticks). Roll distance 96 px | Affixes, S1–S4, Featherplate, heavy armor | Affixes: "+12 max HP", "+2 armor", "+0.5 regen/s", "+4% speed", "−4 roll cooldown", "+12 roll distance". Talents: "Max health +15", "Armor +3", "Health regen +0.5 HP/s in the field", "Move speed +5%" |
| Defensive rule | **Ward / Last stand / Featherweight** | Wardstone: after 360 ticks unhit, blocks the next hit whole. Last Ember: once per trip, a lethal hit leaves 1 HP with 60 ticks of invulnerability, recharged by banking. Featherplate: heavy armor with no walk slow, roll distance ×0.75 (`relics.ts:66`, `:91`, `:78`) | One relic each | "After 6 s unhit, blocks the next hit"; "Once a trip, a killing hit leaves you on 1 HP"; "Heavy plate without the slow; a shorter roll" |

### 1b. What each piece of content actually reaches

How the text compares with what the code does, for every talent, stage, relic and affix.

| Content | Text today | Actually reaches | Says its keyword? |
| --- | --- | --- | --- |
| A1 Fletcher's Eye | Arrow damage +10% | Arrows, frost arrows, the charged burst (×1.5 of it) | Family only |
| A2 Quick Nock | Arrow fire rate +10% | Arrows: 15 → 14 ticks, really **+7.1%** | Family only |
| A3 Rimecraft | Frost arrows freeze after 1 fewer hit, +0.5 s | Every cold hit: 4 → 3 stacks; freeze 90 → 120 ticks, boss 45 → 75 | No ("Chill", "Cold" absent) |
| B1 Black Powder | Bomb damage +10% | Bomb and cluster bomb bursts and bomblets; not landmines | Family only |
| B2 Wide Casing | Blast radius +15% | Bomb 48 → 55 px, bomblet 20 → 23 px; **not** landmine or charged-burst radius | Generic word, bomb-only reach |
| B3 Short Fuse | Bombs reach their target 25% sooner | Bomb flight time ×0.75; not landmines | Name says "Fuse", but the effect is flight time |
| L1 Attuned Crystal | Ley bolt damage +10% | Ley bolts, star shards, ice shards (via bolt damage) | Family only |
| L2 Seeker's Lens | Homing ley bolts turn 30% sharper | Turn 4 → 5.2°/tick | Yes |
| L3 Splinter | Star ley bolts burst into 7 shards, not 5 | Shard count 5 → 7 | "Star", plus "burst" |
| T1 Oiled Breech | Fire rate +8%, all ammo | Real: arrow +7.1%, ley +5.3%, bomb and landmine +8.1% | Family only |
| T2 Steady Grip | Walk slow while firing ×0.7 → ×0.8 | As stated | n/a |
| T3 Hard Bore | Damage +6%, all ammo | Everything, including landmines, shards, bomblets and K1 bursts | n/a |
| S1–S4 | Max health +15 / regen +0.5 HP/s / Armor +3 / Move speed +5% | As stated; S4 can pass the gear move cap | Different words from the same affixes |
| K1 Blastfletch | (see table above) | Bomb (not bomblet or mine) charge → arrow ×1.5 and a physical 24 px burst | Uses "blast", "charges", "bursts" |
| K2 Shatterpoint | (see table above) | Frozen + ley bolt → ×2, ends freeze, 4 physical shards at 50% | "shatters", "ice shards" (physical) |
| K3 Overpressure | (see table above) | All ammo fire rate, up to +25% (rounded to ticks) | n/a |
| Frost rune | "Frosts arrows: 4 arrows and a rime shard." | Adds the `frost` tag: cold damage → Chill/Freeze | States the cost, not the rule |
| Ley guide | "Makes ley bolts home: 4 bolts, 1 ley crystal." | Adds `homing` | Mostly |
| Shatter lens | "Makes ley bolts burst: 4 bolts, 2 ley crystals." | Adds `star` (a split, not a burst) | No: the wrong word |
| Shard die | "Makes bombs burst into bomblets: 4 bombs, 1 ley-iron." | Adds `cluster` | No ("Cluster" absent) |
| Relics (4) | One line each | Defensive and movement rules only; no relic touches any ammo keyword (036 forbids it) | n/a |
| Affixes (6) | "+N label" | Defensive and movement stats only; no ammo keyword can roll (design pillar 6) | n/a |
| Factory pieces | Build-bar tips | No logistics or production piece touches a combat keyword. Only stages do | n/a |

---

## 2. Problems found

Ordered by how much each one blocks the rant's goal: "homing projectiles do X" understood at a glance, and builds visibly linking up.

### 2.1 One word, many rules (the worst offender)
- **"Burst"** means five different things:
  - a bomb's area damage
  - a star bolt splitting into shards ("Makes ley bolts burst")
  - Shatterpoint's shards ("bursting 4 ice shards")
  - Blastfletch's area damage ("bursts on the next enemy")
  - bomblets ("burst into bomblets")
  
  Code events reuse it too (`bursts`, `starBursts`, `chargedBursts`, `bombletBursts`).
- **"Shard"** names seven things:
  - ley shard (a part)
  - rime shard (a raw)
  - star shard and ice shard (projectiles)
  - the Shard die (which makes *bomblets*, not shards)
  - the Shardback (an enemy)
  - the "thaw shards" particle
- **"Fuse"** names three things: the fuse (a part), a landmine's 5 s timer, and Short Fuse (which changes bomb *flight* time, not any fuse).
- **"Shatter"** names two unrelated things. The Shatter lens makes star (split) rounds. Shatterpoint is a frozen-enemy payoff that has nothing to do with the lens.
- **"Split"** is the rant's word for ley crystals and also the factory's Splitter, which divides items.
- **"Blast"** covers bomb bursts, "Blast radius" (bombs only) and Blastfletch.

### 2.2 Ammo has no rules text anywhere
- `ItemDef` has no description field (`src/data/items.ts:22`), and the inventory panel, hotbar and tube slot show only a name, icon and count.
- So **pierce, area damage, homing lock, overhead (shield bypass), knockback, chill and freeze are never stated to the player.** The only places with rule text are the talent hover, the relic line and the stage build tip, and the build tip is mostly the stage's cost.
- design.md's ammo roles ("Arrows pierce… ley bolts hit hard… bombs burst wider") live only in docs.

### 2.3 Content scopes by base ammo, not by keyword
- **Talent scopes.** `AmmoScope` is `arrow | bomb | ley-bolt | all`, and landmines have no scope at all. Wide Casing reads "Blast radius +15%" but reaches only bombs and bomblets, not the landmine burst or Blastfletch's. Short Fuse says "Bombs" and skips landmines, which fly the same lob.
- **Tags are bound to one base.** `TagDef.appliesTo` is a single base ammo (`tags.ts`), so a Cold bomb or a Homing arrow needs a second tag id. Shaun's "elemental bombs" and a fire talent reaching fire arrows *and* fire bombs can't be expressed as data today.
- **Effect kinds are hand-coded per behaviour**: `freeze`, `homing-turn`, `star-shards`, `blast-radius`, `lob-time` (`talents.ts:18`). Each new keyword's talent hook needs new sim code, against "new content = new data".

### 2.4 Gear and relics can't join a build
- design.md pillar 6 and "Gear never adds damage" (036), plus "No relic deals damage or touches the factory", mean **no affix or relic can mention any ammo keyword.**
- The rant's example ("bomb set + cluster relic + AOE talent") is impossible under the current design rules, not just unbuilt. This needs Shaun's decision and a design.md edit (Q1).

### 2.5 Text is hand-written, with mixed units and synonyms
- **Numbers are typed by hand.** Every talent and relic line is a typed string with the numbers in it ("7 shards, not 5", "6 s", "+50%"). Research is the one place that interpolates data (`research.ts:76`). They match today, but nothing guards against drift.
- **Units are mixed.** Roll cooldown shows raw **ticks** ("−4 roll cooldown") and roll distance shows bare px. Elsewhere: seconds ("6 s", "+0.5 s"), %, "×0.7".
- **One stat has several names:**

  | Stat | Affix label | Talent text | Totals line |
  | --- | --- | --- | --- |
  | Max health | "max HP" | "Max health" | "Max HP" |
  | Move speed | "speed" | "Move speed" | "Speed" |
  | Regen | "regen/s" | "Health regen … HP/s in the field" | "Regen /s" |
- **Scope sits in different places:** "Arrow fire rate +10%" puts the scope first, "Fire rate +8%, all ammo" puts it last.

### 2.6 The shown number isn't the real number
- **Fire rate rounds to whole ticks.** Quick Nock's +10% is +7.1% on arrows. Oiled Breech's +8% is +7.1% on arrows and +5.3% on ley bolts. Both together on arrows (+18%) give +15.4%. Raised after 037; still unshown.
- **Bonus math is hidden.** Damage bonuses add, keystones multiply, and shards inherit their parent's bonuses (star shards scale with ley damage; ice shards with the bolt's full damage, Hard Bore included).
- **Shatterpoint's "ice shards" are physical**, so the name contradicts the rule (037's raised item).

### 2.7 The same thing is named differently at each layer

| Concept | Tag id | Behaviour | Damage type | Stage | Item | Talent |
| --- | --- | --- | --- | --- | --- | --- |
| Cold | frost | cold | cold | Frost rune | Frost arrow | Rimecraft ("freeze") |
| Split | star | star | — | Shatter lens | Star ley bolt | Splinter ("burst… shards") |
| Cluster | cluster | cluster | — | Shard die | Cluster bomb | — |
| Homing | homing | homing | — | Ley guide | Homing ley bolt | Seeker's Lens |

No stage name contains its keyword, so in the build bar nothing links "Shatter lens" to "Star ley bolt" to "Splinter".

### 2.8 Rules with no name
These have no player-facing word at all:
- Knockback. It's also an *enemy* stat, not a projectile one, so nothing can "add knockback".
- The shield bypass of lobs.
- Chill as distinct from Freeze, and the 120-tick refreeze immunity.
- The homing lock rule (64 px around the cursor, at launch only).
- "Each enemy is hit once per shot."
- "Shards can't hit the enemy they came from."
- Untargetable (burrowed).
- Mines and bomblets clearing on a room change.
- The landmine's arm delay.

### 2.9 Damage types: one unused, one with no behaviour
- **Fire** is declared and dead.
- **Physical** has no rule: design.md says "Physical deals big direct hits", but nothing implements that. A damage type changes exactly one thing in the sim (cold chills) plus a particle colour.
- Damage numbers aren't coloured by type, so the player can't see types at all.

### 2.10 Near-duplicate rules with separate code and numbers
- **Spawn-on-hit, three times.** Star split, Shatterpoint shards and Cluster bomblets all use the same pattern: N children, 360/N° apart, the first along the flight. Each has its own constants block (`STAR`, `SHATTERPOINT`, `CLUSTER`) and its own scaling rules.
- **Area damage, three times.** Bomb burst, bomblet burst and Blastfletch's burst are the same area damage with three sets of numbers, and only some respond to Wide Casing.
- **A mine is Lob + delay + burst**, but it's modelled as a separate kind.

### 2.11 Conflicts between the rant and today's rules
- **Damage order.** The rant wants arrows to out-damage ley bolts and bombs per hit. Today the ley bolt hits 14 and the arrow 10.
- **Homing and split.** The rant says ley crystals "home and split". Shaun's 2026-10-19 decision (one shape per round) forbids Homing + Star on one bolt.
- **Cold reach.** The rant wants elemental bombs, but cold exists only on arrows.
- **Freezing Husks.** Frost still can't freeze a Husk: 4 stacks × 10 dmg kills its 40 HP first (029, raised).

### 2.12 design.md and the sim disagree
- "Ley-guided ammo locks onto a selected target": the sim locks at launch onto the enemy nearest the cursor, within 64 px.
- "Physical deals big direct hits": nothing does this.

### 2.13 The UI has no room for keyword text today
- The build tip wraps at 34 characters, 2 lines (`BUILD_TIP`, `src/data/hudLayout.ts:217`).
- The talent hover is a name plus 2 lines.
- A gear row is 3 lines of 22 px.
- `descriptions.ts` still says the HUD font is limited to a few punctuation marks. That predates 020's bundled fonts, but it needs checking before keyword chips use symbols such as `+ % × ·`.

---

## 3. Proposed keyword glossary v0 (Claude's proposal, not decided)

**Principles**
1. **A closed list in data** (`src/data/keywords.ts`). Each keyword has: name, group, one-line rule template with `{params}`, its parameters and their sources, and the stats it exposes for scaling.
2. **One word, one rule.** A keyword word is never reused in a content name for something else (fixes 2.1).
3. **Every player-facing rules string is generated from keyword templates and data numbers.** No hand-typed numbers. A data test fails if any content text names a number or keyword that isn't in data.
4. **Every keyword has a build path:** at least one source (ammo, stage or tag), plus at least two payoffs (talent, relic, affix, stage or keystone). This is the rant's "build path along that keyword".
5. **Content scopes by keyword, never by code path.** A talent reaches "Burst", and therefore every burst: bomb, bomblet, mine, charged.

### 3.1 Delivery: how a round leaves the tube (exactly one per round)

| Keyword | Rule template | Scales | Today's values |
| --- | --- | --- | --- |
| **Shot** | Flies straight at the cursor up to {range}. Stops at walls. Blocked by Shield. | Damage, Fire rate, Range, Speed | Arrow 10 dmg, 4/s, 320 px. Ley bolt 14 dmg, 3/s, 320 px |
| **Lob** | Arcs over everything to the cursor (max {range}). Ignores Shield. | Flight time, Range | 192 px, 200 px/s |
| **Mine** | Lob, then Arms for {arm} s; then Bursts. Cleared when you leave the area. | Arm time, Burst stats | 5 s, 60 dmg, 24 px |

### 3.2 Behaviour: what the round does (data tags, any number per round)

| Keyword | Rule template | Scales | Today's values |
| --- | --- | --- | --- |
| **Pierce** | Passes through enemies, hitting each once. Stops at walls and Shields. | Pierce count (∞ today) | Arrows: unlimited |
| **Homing** | Locks onto the enemy nearest the cursor (within {lock} px) and turns {turn}°/s toward it. | Turn rate, Lock radius | 64 px, 240°/s |
| **Split** | On hitting an enemy, sends {n} Shards in a star, {dmg} each. | Split count, Shard damage | 5 × 4 dmg |
| **Burst** | Deals {dmg} to every enemy within {radius} px. Ignores Shield. No Knockback. | Damage, Radius | Bomb 15/48. Mine 60/24 |
| **Cluster** | After its Burst, {n} Bomblets land {dist} px out and Burst {delay} s later for {dmg} in {radius} px. | Bomblet count, Bomblet damage and radius | 4 × 8 dmg / 20 px, 0.2 s |
| **Knockback** | Hits push the enemy back {px}. Bosses resist. | Knockback | Per enemy today (2.8); proposed to move onto the round |
| **Spread** | (Layout, not a tag.) Rounds of one family fired together fan {step}° apart, or land {spacing} px apart if Lobbed. | — | 15°, 24 px |

**Child projectiles** are not keywords themselves. They are nouns that inherit their parent's family and damage type:
- **Shard**: a tiny Shot that never Pierces, Splits or hits its parent's target.
- **Bomblet**: a tiny Burst.

### 3.3 Damage type: one per round; the Element slot sets it

| Keyword | Rule template | Status it applies |
| --- | --- | --- |
| **Physical** | No extra effect. (Proposal: drop "big direct hits" from design.md, or give it Knockback; see Q10) | — |
| **Cold** | Each hit applies 1 Chill. | Chill → Freeze |
| **Fire** *(reserved, Milestone 2)* | Each hit applies Burn (design.md: burns over time and spreads). | Burn |
| **Lightning**, **Poison** *(reserved)* | design.md's rules, written as templates when they ship | — |

### 3.4 Status: what's on an enemy

| Keyword | Rule template | Scales | Today's values |
| --- | --- | --- | --- |
| **Chill** | Stacks to {max}. −{slow}% move speed per stack. Lasts {dur} s, refreshed by each Cold hit. | Chill to Freeze, Slow per stack | 4 stacks, 15%, 2 s |
| **Freeze** | At {max} Chill: can't move or act for {dur} s (bosses {boss} s). Then immune to Chill for {imm} s (**Thaw**). | Freeze duration | 1.5 s / 0.75 s / 2 s |
| **Stagger** | Interrupts the enemy's attack. It can't act for {dur} s. Not bosses. | Stagger duration | 0.67 s (Rollbreaker) |
| **Charged** *(ground)* | A Burst leaves its area Charged for {dur} s. The next Arrow through it: ×{mult} damage, and Bursts on its next hit. | Charge duration | 0.33 s, ×1.5 (K1) |
| **Burn** *(reserved)* | — | — | — |

Enemy traits as keywords, for legibility and for content that targets them (Q18):
- **Shield**: blocks Shots, Shards and punches from its front {arc}°.
- **Boss**: never Staggered, never pushed by punches, frozen 0.75 s instead of 1.5 s, and ignores Knockback while Frozen.
- **Burrowed**: can't be hit.

### 3.5 Family tags: what content scopes to
**Arrow, Bomb, Ley, Landmine.** Every round carries exactly one family. Derived tags are computed from behaviours, never assigned by hand:
- **AOE** = has Burst
- **Projectile** = Shot or Shard
- **Elemental** = damage type isn't Physical

### 3.6 How content phrases itself against the glossary
**Grammar:** `[Scope]: [stat] [change]`.
- **Scope** is one or more keywords or family tags in Title Case, joined with "and".
- **Change** is `+X%` for additive bonuses (all `+%` to a stat add into one pool), `×X` for multipliers (keystones and relics only), or `+N unit` / `−N unit` for flat changes.
- **Units:** s, px, °/s, /s. Never ticks.

| Today | v0 phrasing |
| --- | --- |
| Arrow damage +10% | **Arrow**: +10% damage |
| Arrow fire rate +10% | **Arrow**: +10% fire rate |
| Frost arrows freeze after 1 fewer hit, and the freeze lasts +0.5 s | **Chill**: −1 to Freeze. **Freeze**: +0.5 s |
| Bomb damage +10% | **Bomb**: +10% damage |
| Blast radius +15% | **Burst**: +15% radius *(and it would then reach mines and Charged bursts; Q4)* |
| Bombs reach their target 25% sooner | **Lob**: −25% flight time *(rename the node; "Fuse" is taken)* |
| Homing ley bolts turn 30% sharper | **Homing**: +30% turn rate |
| Star ley bolts burst into 7 shards, not 5 | **Split**: +2 Shards |
| Fire rate +8%, all ammo | **All rounds**: +8% fire rate |
| Damage +6%, all ammo | **All rounds**: +6% damage |
| Max health +15 / "+12 max HP" | **Max health** +15 (one label for both talents and affixes) |
| "−4 roll cooldown" | **Roll cooldown** −0.07 s |
| Blastfletch | **Burst** leaves ground **Charged** 0.33 s. **Arrow** through it: ×1.5 damage, then **Burst** 24 px |
| Shatterpoint | **Ley** hit on a **Frozen** enemy: ends **Freeze**, ×2 damage, **Split** 4 Shards at 50% |
| Frost rune tip | Adds **Cold** to an **Arrow**. Cost: 1 rime shard per 4 |
| Shatter lens tip | Adds **Split** to a **Ley** bolt. Cost: 2 ley crystal per 4 |
| Shard die tip | Adds **Cluster** to a **Bomb**. Cost: 1 ley-iron per 4 |
| (a future relic, if Q1 allows) | **Cluster**: +2 Bomblets. **Bomb**: −10% radius |

The rant's example then reads as one chain, because the same chips repeat:
- Bomb set: "**Bomb**: …"
- Cluster relic: "**Cluster**: +2 Bomblets"
- Talent: "**Burst**: +15% radius"

---

## 4. Legibility proposal (two layers)

Both layers are generated by one pure describe module in `src/render`, reading keyword data and `playerStats(state)`, so the numbers are always the live ones and the sim stays free of UI.

### Layer 1: hover summary (new players)
Shown wherever the thing appears:
- inventory row, hotbar, tube slot
- intake readout, bench Stages row, build bar
- talent node, gear row

**Format:** at most 3 lines:
1. name, plus a row of keyword chips (each keyword in its fixed colour)
2. the key numbers, *after* the player's bonuses
3. what's changed it, as a count ("3 bonuses"), only when something has

**Frost arrow** (with Fletcher's Eye and Hard Bore taken):
> **Frost arrow** · `Shot` `Pierce` `Cold`
> 11.6 dmg · 4.0/s · 320 px · 4 hits to Freeze
> 2 bonuses: hold Shift for the breakdown

**Seeker's Lens** (talent):
> **Seeker's Lens** · `Homing`
> **Homing**: +30% turn rate (240 → 312°/s)
> Affects: Homing ley bolt (you have 48)

**Fine Supple Boots** (gear):
> **Supple Boots** · Fine
> +12 max health · +4% move speed
> Armor 2 · equipping: max health 115 → 127

### Layer 2: full breakdown (experienced players)
**Where it lives (proposal):**
- **Shift + hover** expands any Layer 1 tablet in place.
- A **Build** tab on the T panel lists every round you carry or feed. Each row has its full calculation, plus a **"Linked"** column: every talent, relic, affix and stage that touches any of its keywords.
- Clicking a keyword chip opens its glossary entry (the Layer 2 rule text, with numbers).

**Ammo round: Frost arrow** (with Fletcher's Eye, Quick Nock, Rimecraft and Hard Bore taken)
```
Shot · Pierce · Cold                           family: Arrow
Damage   10 base × (1 + 0.10 Fletcher's Eye + 0.06 Hard Bore) = 11.6
Fire rate 15 ticks ÷ (1 + 0.10 Quick Nock) = 13.6 → 14 ticks = 4.29/s (+7.1%, rounded)
Range    320 px · 480 px/s
Pierce   hits every enemy in line once; stops at walls and Shields
Cold     +1 Chill per hit · 15% slow per stack · 2 s
Freeze   at 3 Chill (Rimecraft −1) · 2.0 s (bosses 1.25 s) · then 2 s Thaw
Linked   Rimecraft (Chill, Freeze) · Shatterpoint (Freeze) · Blastfletch (Arrow)
Per target  ~49.7 dmg/s while in line
```
**Talent: Wide Casing**
```
Burst: +15% radius                        lane: Bombs · 1 point
Bomb      48 → 55 px    Bomblet 20 → 23 px
Landmine  24 px (not affected today; Q4)  Charged burst 24 px (not affected)
Reached by: Bomb, Cluster bomb (you feed: entrance 2)
```
**Gear piece: Rollbreaker Greaves (relic)**
```
Relic · boots · armor 2
Rule     Roll through an enemy: Stagger it 0.67 s (once per roll). Not bosses.
Affixes  +8 max health · −0.07 s roll cooldown
Totals   armor 14 → 16 · Husk swipe (20) taken 6 → 5 (25% floor)
Linked   Stagger: (no other source yet)
```
"Linked: (no other source yet)" is deliberate. It shows a keyword with no build path, which is the rant's failure mode.

### Implementation notes for the spec (not a plan)
- A `describe(content, stats)` per content kind returns `{ chips, summary[], breakdown[] }`. Unit tests compare it with data, so wording can't drift.
- Generated text also replaces today's hand strings: `TalentDef.text`, `RelicDef.text`, `StageDef.description`, `affixLabel`.
- The tablets need room. Today's 34-character, 2-line build tip and 2-line talent hover are too small (2.13).
- Fire rate: either show the rounded truth, as above, or make cooldowns fractional (a tick accumulator) so +8% *is* +8% (Q13).

---

## 5. Open questions for Shaun (the keyword spec interview)

Each question has options and Claude's recommendation (★).

1. **May gear and relics touch offense?** Today design.md pillar 6, "Gear never adds damage" and 036 forbid it, so a "cluster relic" or "bomb set" can't exist.
   - a) Keep gear defense-only.
   - b) Relics (and later sets) may bend a keyword's rule or numbers ("**Cluster**: +2 Bomblets"), but affixes stay defensive. ★
   - c) Offensive affixes too.
2. **Boss gear sets ("a big maybe")?**
   - a) Not now. ★ Revisit after the glossary ships.
   - b) Yes: each set is tied to one family or keyword, with a 2- or 4-piece bonus written in glossary grammar.
3. **What does content scope to?**
   - a) Base ammo, as today.
   - b) Keywords only.
   - c) Family tags *and* behaviour keywords, each content line naming exactly one scope. ★
4. **Is a landmine a Bomb?** This decides whether Black Powder, Wide Casing and Short Fuse reach it.
   - a) Its own family (Landmine) that has Burst, so "**Burst**" talents reach it and "**Bomb**" ones don't. ★
   - b) Tagged Bomb too.
5. **Keyword names.** Approve, or replace, these: Shot, Lob, Mine, Pierce, Homing, **Split** (today "Star"), Burst, Cluster, Knockback, Physical, Cold, Chill, Freeze, Thaw, Stagger, Charged.
   - a) As listed. ★
   - b) Keep "Star" as the keyword.
   - c) Shaun's own list.
6. **Reserved words.** Should "Burst", "Shard", "Fuse", "Shatter" and "Split" mean exactly one thing each, with content renamed to fit (Short Fuse, Shard die, Shatter lens, Splinter's text, Shatterpoint's "ice shards", the "ley shard" part)?
   - a) Yes, rename now. ★
   - b) Rename only the talents and stages, and leave items alone.
   - c) Accept the overlaps.
7. **Do item and stage names have to contain their keyword?**
   - a) Yes ("Split lens", "Cluster die").
   - b) No: flavour names are fine as long as the keyword chip shows beside them. ★
8. **The factory Splitter against the Split keyword?**
   - a) Rename the piece.
   - b) Name the projectile keyword something else ("Fork").
   - c) Keep both: Splitter is a piece name and never shows as a chip. ★
9. **Ley bolts "home and split" (the rant) against one shape per round (decided 2026-10-19)?**
   - a) Keep one shape. ★ For v0; revisit in the ammo content spec.
   - b) Allow Homing + Split at a higher stage cost.
   - c) Make Split a ley base trait.
10. **Should Physical have a rule?** design.md says "big direct hits"; nothing does that.
    - a) No rule; edit design.md to "no extra effect". ★
    - b) Physical hits Knockback harder.
    - c) Another rule.
11. **Where does Knockback live?** Today it's per enemy, so nothing can add it.
    - a) Leave it as an enemy stat with no keyword.
    - b) Put a Knockback value on each round, scaled by an enemy "weight" (bosses 0). ★ Ask before building.
12. **May an element tag apply to every base?** Frost bombs, fire arrows and fire bombs would come from data alone, with `appliesTo` becoming a list.
    - a) Yes, elements apply to every base; shapes stay per base. ★
    - b) Keep one base per tag.
13. **Stacking math and rounding.**
    - a) All `+%` to one stat add; keystones and relics use `×`. Fire rate shown as true shots/s. ★
    - b) Also make cooldowns fractional so the shown % is exact.
    - c) Leave rounding hidden.
14. **Units in player text.**
    - a) Seconds (1 decimal), %, px in the breakdown only. ★
    - b) Tiles instead of px.
    - c) Ticks (today's roll cooldown).
15. **Where does the full breakdown live, and how is it opened?**
    - a) Shift + hover only.
    - b) A Build tab on the T panel only.
    - c) Both, plus clickable keyword chips opening the glossary. ★
16. **Statuses.** Are Chill and Freeze two named statuses, with the 2 s immunity named **Thaw**?
    - a) Yes. ★
    - b) One "Cold" status with stages.
17. **New-keyword rule.** Before a keyword ships it needs a template, numbers in data, at least one source and at least two payoffs, and a data test enforces it.
    - a) Adopt it. ★
    - b) Lighter: a template only.
18. **Enemy traits as keywords** (Shield, Boss, Burrowed, later Construct or Golem), and "augments that affect certain enemies"? design.md says "no weaknesses or resistances".
    - a) Traits are named for legibility only. ★ Nothing scales against them yet.
    - b) Content may target traits ("**Shielded**: +X%"), which changes design.md.
19. **Cross-build combos** (the rant's "bombs explode ley crystals"): should they always go through a named status or ground keyword (as Charged does for Blastfletch), never an ad hoc rule?
    - a) Yes, every combo is "keyword A creates status B; keyword C consumes B". ★
    - b) Allow one-off keystone rules.
20. **Retune numbers in this spec, or later?** The rant's damage order is landmine > arrow > ley ≈ bomb per hit; today the ley bolt (14) beats the arrow (10), and frost can't freeze Husks.
    - a) Fix the order in the keyword spec, since the glossary prints the numbers.
    - b) Do it in a separate balance spec, recording only the target order in the glossary. ★
