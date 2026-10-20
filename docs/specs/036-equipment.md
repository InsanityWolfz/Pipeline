# 036: Equipment slots, affixes and relics
status: done

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

Drafted from Shaun's spec interview (2026-10-19). Every number is a starting value in data, tuned in playtest.

## Goal
The single armor slot becomes four: helm, body, boots and trinket. The body piece is still light or heavy, and armor values are now big enough to feel. Each identified piece carries 1 to 3 defensive or utility affixes (max HP, armor, field regen, move speed, roll), set by its rarity: Common, Fine or Rare. Now and then a piece identifies as a Relic: its own tier above Rare, with a unique rule plus 2 affixes. Drops stay unidentified until the bench rolls them.

## Design references
- docs/design.md:
  - "Pillars" 5 (combat earns armor) and 6 (offense from the factory, defense from the field: the factory never makes defense)
  - "Combat": "Defense comes from found armor" (heavy blocks more but slows you, light blocks less but keeps you fast; heavy means you can afford to get clipped, never that dodging is impossible) and "Simple stats" (max health, health regen, armor, move speed)
  - "The Foundry": "What monsters drop" (unidentified armor) and "Identification" (stats roll at the foundry; it can't be equipped until then)
  - "Death and tension": identified armor is always kept, unidentified armor carried since the last bank is lost
  - "Pillars" 4: depth from rules, "not hundreds of hand-tuned relics". Relics here are a short list, each one rule.
- docs/specs/010-armor.md: today's drops, bench, flat block, heavy 0.85 walk. This spec replaces its single slot and its value ranges.
- docs/specs/011-death.md: banking and the KO rule, unchanged.
- Spec 030 (healing): the field has no free regen; field regen comes only from gear and talents.
- Spec 032 (champions and landmarks): champions always drop armor.
- docs/brainstorm/2026-10-19-content.md, section 5: "Affixes are defense and utility only", "Keep heavy against light. The speed trade is the interesting part. Armor values need to be big enough to feel." The playtest found "Armor's 2–8 points were never noticeable." Cut: "keep X% of your haul on death" (undoes the death rule) and "pickup radius" (021 already solved it).
- Interview answers (Shaun, 2026-10-19):
  - Round 1: "Field regen comes only from gear and talents."
  - Round 9: "**Gear slots:** 4: helm, body, boots and trinket. The body piece carries heavy or light."
  - Round 9: "**Affixes:** max HP and armor, field regen, move speed and roll. Ley range and refill were not chosen."
  - Round 9: "**Rarity:** Common has 1 affix, Fine 2, Rare 3. Rare Relics each bend one rule. Identification at the bench rolls them."

## Acceptance criteria

**Gear pieces (sim, data)**
- [ ] `ArmorPiece` becomes `GearPiece`: `id`, `slot` (`helm`, `body`, `boots` or `trinket`), `rarity` (`common`, `fine`, `rare` or `relic`), `weight` (`light` or `heavy`, body pieces only), `baseArmor`, `affixes` (a list of `{ kind, value }`), `relic` (a relic id or none) and `name`.
- [ ] Drops are unchanged from 010 and 032: the first Husk, 10% per Husk, 15% per Wisp, the Warden always, champions always. A drop is still one carried `unidentified-armor` item, banked and lost under 011's rule. Its display name becomes "Unidentified gear".

**Identification (sim)**
- [ ] "Identify all" at the bench rolls each carried piece from the seeded RNG, in this order:
  1. **Relic?** With `RELIC_CHANCE`, the piece is a relic, picked evenly from `RELICS`. The relic fixes its slot (and weight, for a body relic), its name and its rule, then rolls `RELIC_AFFIXES` affixes as below.
  2. **Slot:** otherwise one of the four, by `SLOT_WEIGHTS` (even to start).
  3. **Weight:** a body piece rolls light or heavy, 50/50 (`HEAVY_CHANCE`, as today).
  4. **Base armor:** from `SLOT_BASE` for its slot and weight (see the table).
  5. **Rarity:** by `RARITY_WEIGHTS`. It sets the affix count: Common 1, Fine 2, Rare 3.
  6. **Affixes:** that many different kinds, each picked evenly from `AFFIXES` (any affix can roll on any slot), its value rolled in the kind's range. A piece never has the same kind twice.
  7. **Name:** an adjective and a slot noun from word lists in data (body lists split by weight, as today).
- [ ] Identify events carry the whole piece, so render and tests can read it.

**Starting values (data, all flagged for playtest)**

| Slot | Base armor |
| --- | --- |
| body, light | 5–7, full walk speed |
| body, heavy | 10–13, walk ×0.85, roll unchanged |
| helm | 1–2 |
| boots | 1–2 |
| trinket | 0 |

For scale: a Husk swipe does 20, a Wisp orb 12, the Warden's slam 30. A light body takes a Husk swipe to about 14, a heavy one to about 8.

| Affix | Range per piece | Notes |
| --- | --- | --- |
| Max health | +8 to +20 | |
| Armor | +1 to +3 | |
| Field regen | +0.3 to +0.8 HP/s | |
| Move speed | +3% to +6% | |
| Roll cooldown | −3 to −6 ticks | the base is 30 ticks |
| Roll distance | +8 to +16 px | the base is 96 px; same roll length, so it travels faster |

| Rarity | Affixes | Chance |
| --- | --- | --- |
| Common | 1 | 60% |
| Fine | 2 | 30% |
| Rare | 3 | 10% |
| Relic | its rule + 2 | 3% of identifies, checked first |

The odds are the same everywhere for now: champions, bosses and outer rings don't roll better rarities.

**Relics (sim, data)**
Relics are their own tier above Rare, not a Rare piece with a rule added: a relic carries its unique rule plus `RELIC_AFFIXES` (2) rolled affixes. Each relic is one data entry with a rule flag the sim reads. The same relic can drop twice; a duplicate is just a spare. All four ship for the playtest, and Shaun may edit them after:
- [ ] **Rollbreaker Greaves** (boots): rolling through an enemy staggers it. Its wind-up is cancelled and it holds in recovery for `staggerTicks` (40). Bosses ignore it. Each enemy is staggered at most once per roll.
- [ ] **Wardstone Circlet** (helm): after `wardTicks` (360, 6 s) without taking a hit, the next hit is blocked completely. A faint shimmer on the player shows when it's ready.
- [ ] **Featherplate** (body, heavy): heavy base armor without the walk slow. Its roll is 25% shorter instead.
- [ ] **Last Ember** (trinket): once per trip, a hit that would kill leaves the player on 1 HP with 60 ticks of invulnerability. It recharges when the player banks (entering the foundry or depositing at a pylon). The haul rule is untouched: a later death still loses it.
- [ ] No relic deals damage or touches the factory, the haul or pickups.

**Equipping (sim)**
- [ ] The player wears at most one piece per slot. `equipped` becomes `{ helm, body, boots, trinket }`, each a piece id or null.
- [ ] Equipping happens only in the bench menu (010), so gear changes happen at home. Equipping a piece replaces whatever is worn in its slot. Equipping the worn piece takes it off. An unknown id does nothing.

**Effects (sim)**
All gear effects go through one `playerStats(state)` function, which 037 (talents) adds to.
- [ ] **Armor:** total armor is the sum of every worn piece's base armor and armor affixes. Each hit deals `max(ceil(damage × MIN_DAMAGE_SHARE), damage − armor)`, with `MIN_DAMAGE_SHARE` 0.25: a hit always deals at least 25% of its damage, so heavy armor feels big but never makes the player immune. This replaces today's flat minimum of 1.
- [ ] **Max health:** `MAX_HEALTH` (100) plus every max-health affix. Equipping doesn't heal. If the max drops below current health, health drops to the new max. A KO wakes the player at the full current max, and 030's healing fills to it.
- [ ] **Field regen:** the summed regen is 030's `fieldRegen` stat, read through `playerStats`. It heals anywhere, except while dying. Under 030's rule the highest healing rate applies, so it doesn't add to safe-zone, spring or foundry healing. It doesn't pause after a hit. Health stays whole, using 030's fractional build-up.
- [ ] **Move speed:** the summed bonus multiplies walk speed, along with heavy armor (×0.85) and firing (×0.7). The total gear bonus is capped at `MOVE_BONUS_CAP` (+15%). Rolls are unaffected.
- [ ] **Roll:** the cooldown is `ROLL_COOLDOWN_TICKS` minus the summed reduction, never below `ROLL_COOLDOWN_MIN` (15). The distance is `ROLL_DISTANCE` plus the summed bonus, over the same `ROLL_TICKS`. I-frames are unchanged.
- [ ] Nothing in this spec adds damage, pickup radius, haul protection, ley range or refill.

**Migration from 010**
- [ ] `src/data/armor.ts` becomes `src/data/gear.ts`, and `src/sim/armor.ts` becomes `src/sim/gear.ts`, with relic rules in their own `src/sim/relics.ts` and stats in `src/sim/stats.ts` (one system per file).
- [ ] `afterArmor` and `walkScale` read from `playerStats`. `HEAVY_CHANCE`, `ARMOR_DROP_CHANCE` and `FIRST_ARMOR_ENEMY` keep their meaning.
- [ ] The game has no saves, so there's nothing stored to convert. Tests and fixtures that build an `ArmorPiece` build a Common body piece instead, with its old `armor` as `baseArmor` and one affix.
- [ ] `?playtest` carries 3 unidentified pieces, as today, plus one identified Rare piece in each slot and one relic, so the panel and effects can be tried at once.

**Render, art**
- [ ] The bench menu shows four slot cells (helm, body, boots, trinket) with the worn piece in each. Below them, one tab per slot lists that slot's pieces. Each row shows the name in its rarity colour, the weight for body pieces, base armor and each affix ("+12 max HP · +0.5 regen/s"). A relic row also shows its rule in one line.
- [ ] A totals line: armor, max HP, regen per second, move speed, roll cooldown and distance.
- [ ] Rarity colours come from palette ids: Common stone, Fine cyan, Rare gold, Relic a ley violet or the nearest palette colour. Each is approved by Shaun.
- [ ] Icons: one per slot, with light and heavy body icons as today. A relic flares at the bench when it's identified, with its own sound.
- [ ] The player rig keeps 010's light and heavy body tint. Helm, boots and trinket don't show on the rig in this spec.
- [ ] Featherplate, Wardstone and Last Ember have small effects on the player: no slow tint, the ready shimmer, and an ember flash when it saves the player.
- [ ] The HP bar's armor value (031) shows the total armor.

**Hook**
- [ ] `getState()` renames `armorPieces` to `gear` and `equippedArmor` to `equipped` (per slot), and adds `stats` (the `playerStats` result) and the relic states (the Wardstone timer, whether Last Ember is spent). The `equip` command takes a piece id, or `{ slot, id: null }` to take a slot off.

**Docs (on approval)**
- [ ] docs/design.md: "Defense comes from found armor" gains the four slots, rarity by affix count, defensive affixes only and relics. "What monsters drop" and the economy table read "unidentified gear". "Whether identification is free" is closed: free (010). Shaun approves the wording.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Sprites and colours are pending Shaun's review.

## Data changes
- `src/data/gear.ts` (replaces `armor.ts`): `GEAR_SLOTS`, `SLOT_WEIGHTS`, `SLOT_BASE` (armor range per slot and body weight, and the heavy `walkScale`), `HEAVY_CHANCE`, `RARITIES` (affix count, chance, palette id), `AFFIXES` (kind, range, label), `RELIC_CHANCE`, `RELIC_AFFIXES`, `MOVE_BONUS_CAP`, `ROLL_COOLDOWN_MIN`, name word lists per slot, the drop chances and `MIN_DAMAGE_SHARE` (replacing `MIN_DAMAGE`).
- `src/data/relics.ts` (new): `RELICS`, each with id, name, slot, weight (body only), its rule's tuning (`staggerTicks`, `wardTicks`, roll scale, `saveInvulnTicks`) and its sprite and sound keys.
- `src/data/items.ts`: `unidentified-armor` shown as "Unidentified gear".
- `src/data/playtest.ts`: the identified pieces above.
- Sprites: slot icons, rarity frames, relic icons and the three relic effects. Sounds: relic identify, ward break and the ember save.

## Out of scope
- Damage affixes, keep-haul-on-death, pickup radius, ley range and refill affixes.
- Helm, boots and trinket drawn on the player's rig.
- Selling, scrapping or upgrading gear (the merchant is deferred; revisit scrapping with it), and set bonuses.
- Better rarity odds from champions, bosses or outer rings.
- Talent stats, which 037 adds to `playerStats`.

## Test plan
- **Vitest:**
  - Identify rolls are deterministic per seed. Slot, weight, base armor, rarity, affix count and affix values all fall in their ranges, with no duplicate kinds.
  - A relic roll fixes its slot, weight and name, and has `RELIC_AFFIXES` affixes.
  - Equip per slot, swap within a slot, take off, and an unknown id.
  - `playerStats` sums armor, max health, regen, move speed and roll from several worn pieces, with the move cap and the roll-cooldown floor.
  - The damage formula with total armor, including the 25% floor (a heavy body plus four armor affixes still takes 5 from a Husk's 20).
  - Max health: equipping doesn't heal, a lower max clamps health, and a KO wakes at the full max.
  - Regen heals over a set number of ticks, stops while dying, and doesn't add to a spring's rate (030).
  - Heavy and gear speed stack with firing. Roll distance and cooldown change; i-frames don't.
  - Each relic: Rollbreaker staggers a Husk once per roll but not the Warden; Wardstone blocks one hit after 360 quiet ticks and resets; Featherplate has no slow and a shorter roll; Last Ember saves once, recharges on a bank, and a second lethal hit kills.
  - KO keeps identified and worn gear; unbanked unidentified gear is lost (011).
- **Playwright:** with `?playtest`, identify at the bench, equip a piece in each slot, check `stats` in `getState()`, and take a Husk hit for the reduced damage.
- **Screenshots:** the bench menu with all four slots filled and a relic row, and the HP bar's armor value.

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).

## Raised after the build (for Shaun at playtest)
- **Colours and art:** rarity colours are Common rock-light, Fine cyan, Rare gold-trim and Relic wisp-light. The gear sprites wait on Shaun's approval by eye (docs/review/036). With the Stages panel open beside it, the gear panel covers the bench and the player.
- **Small choices the spec didn't make:**
  - a Wardstone block cancels the whole hit
  - Last Ember keeps the hit's knockback, and its damage number shows the full hit
  - a Rollbreaker stagger wakes an idle enemy into a chase
  - new placeholder names for helms, boots and trinkets
