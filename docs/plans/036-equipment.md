# Plan 036: Equipment slots, affixes and relics

Spec: docs/specs/036-equipment.md (approved; open questions settled in docs/brainstorm/2026-10-19-open-questions.md, 036.1–036.10 and D: relics are their own tier above Rare, a unique rule plus 2 affixes; affixes are defense and utility only; the highest healing rate wins, so gear regen is one of 030's rates and never stacks). Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`). docs/design.md already carries the 036 wording ("Defense comes from found armor", "Unidentified gear", identification free), so it isn't touched; the spec asks for no docs/prototype.md change.

## Shape of the change
Small vertical commits, tests first in each:

1. **Data.**
   - `src/data/gear.ts` (replaces `armor.ts`): the types (`GearSlot`, `GearWeight`, `Rarity`, `AffixKind`, `Affix`, `GearPiece`, so `playtest.ts` can build pieces without importing the sim); `GEAR_SLOTS` (helm, body, boots, trinket), `SLOT_WEIGHTS` (even), `SLOT_BASE` (helm 1–2, boots 1–2, trinket 0, body light 5–7 walk ×1, heavy 10–13 walk ×0.85), `HEAVY_CHANCE` 0.5, `RARITIES` (common 1 affix 0.6 `rock-light`, fine 2 0.3 `cyan`, rare 3 0.1 `gold-trim`, relic `RELIC_AFFIXES` `wisp-light`), `AFFIXES` (max health +8–20, armor +1–3, regen +0.3–0.8 HP/s in tenths, move speed +3–6% in whole percents, roll cooldown −3 to −6 ticks, roll distance +8–16 px; each rolled as a whole number of its `step`), `RELIC_CHANCE` 0.03, `RELIC_AFFIXES` 2, `MOVE_BONUS_CAP` 0.15, `ROLL_COOLDOWN_MIN` 15, `MIN_DAMAGE_SHARE` 0.25 (replacing `MIN_DAMAGE`), name word lists per slot (body lists by weight, 010's), and 010's `UNIDENTIFIED_ARMOR`, `ARMOR_DROP_CHANCE`, `FIRST_ARMOR_ENEMY`.
   - `src/data/relics.ts` (new): `RELICS`: `rollbreaker-greaves` (boots, rule `stagger`, `staggerTicks` 40), `wardstone-circlet` (helm, `ward`, `wardTicks` 360), `featherplate` (body heavy, `feather`, `walkScale` 1, `rollScale` 0.75), `last-ember` (trinket, `ember`, `saveInvulnTicks` 60); each with its name, one-line rule text, icon key and sound key.
   - `src/data/items.ts`: `unidentified-armor` shown as "Unidentified gear".
   - `src/data/player.ts`: `StartDef.gear` (identified pieces a start carries). `src/data/playtest.ts`: one Rare piece per slot (fixed affixes) and the Wardstone Circlet, plus 010's 3 unidentified pieces.
2. **Sim.**
   - `src/sim/gear.ts` (replaces `armor.ts`): `rollArmorDrop` (unchanged), `rollPiece` (the spec's order: relic check, slot by weight, body weight, base armor, rarity, distinct affixes, name; relic: its slot, weight and name, then `RELIC_AFFIXES` affixes), `identifyAll` (events carry the whole piece), `equip(state, request)` (a piece id replaces its slot's piece or takes the worn one off; `{ slot, id: null }` takes a slot off; unknown ids do nothing; only at the bench; a lower max clamps health), `wornPieces`.
   - `src/sim/stats.ts`: `playerStats(state, healing = HEALING)` → `{ armor, maxHealth, regen, moveBonus, walkScale, rollCooldown, rollDistance }` from every worn piece (move bonus capped, roll cooldown floored, heavy body ×0.85 unless Featherplate, Featherplate's roll ×0.75 of the total distance); `afterArmor` (`max(ceil(d × 0.25), d − armor)`) and `walkScale` read from it. 037 adds talents here.
   - `src/sim/relics.ts`: `wears(state, rule)`, `stepRelics` (the Wardstone's quiet timer; Rollbreaker's stagger of each non-boss enemy whose feet box the rolling player's overlaps, once per enemy per roll), `guardHit` (the ready Wardstone blocks the whole hit: no damage, knockback or invulnerability, timer reset; Last Ember turns a lethal hit into 1 HP with `saveInvulnTicks` of hit invulnerability, once until the next bank), `rechargeEmber` (on a bank and on waking).
   - `state.ts`: `gear`, `nextGearId`, `equipped: Record<GearSlot, number | null>`; `armor`, `nextArmorId` go. A start's pieces join on creation. `resetWorld` wakes the player at `playerStats().maxHealth`.
   - `player.ts`: `wardTicks`, `emberSpent`, `rollStaggered` (enemy ids this roll). `enemies.ts`: `staggered` ticks; `enemyAi.ts` holds a staggered enemy in `recover` without thinking, then sends it back to `chase`.
   - `movement.ts`: `stepPlayer` takes `{ walkScale, rollDistance, rollCooldown }`; the roll's per-tick speed from the distance over `ROLL_TICKS`; i-frames unchanged.
   - `health.ts`: `damagePlayer` goes through `guardHit` and `afterArmor`; `healing.ts`: `fieldRegen(state, tuning)` reads `playerStats`, health caps at its max, the carry is kept in tenths of HP·ticks so 0.3 HP/s is exact.
   - `banking.ts`: a bank recharges Last Ember. `objectives.ts`: "identified" reads `gear`.
   - Events: `identifies: GearPiece[]`, `equips: { slot, id }`, `staggers`, `wardBlocks`, `emberSaves`.
3. **Hook.** `getState()`: `gear` (identified pieces), `equipped` (per slot), `stats`, `relics { wardTicks, wardReady, emberSpent }`, `player.maxHealth` from stats, each enemy's `staggered`. `equip` takes `{ id }` or `{ slot, id: null }`.
4. **Render.**
   - `src/render/gearText.ts` (pure): an affix's label ("+12 max HP", "+0.5 regen/s", "+4% speed", "+2 armor", "−4 roll cooldown", "+12 roll distance"), a row's lines (name; weight for body pieces and "armor N"; affixes joined by " · "; a relic's rule), and the totals lines.
   - `src/render/benchLayout.ts` (pure, replaces `stagePanelLayout.ts`): the gear panel's tablet, its Identify button, the four slot cells, the four tabs, the list's rows (paged by height) and pager, the totals; and the Stages panel beside it once the shrine is claimed (029).
   - `src/render/GearPanel.ts`: the bench's menu in place of its `ChoiceMenu`: title, "Identify all (N)" button, four slot cells (slot icon or the worn piece's icon in its rarity frame, the slot name, the worn piece's name in its rarity colour, or "empty"), tabs ("Body 3"), the selected tab's rows (name in rarity colour, weight, armor, affixes, a relic's rule line, "worn" on the worn one), a pager when a tab has more rows than fit, and the totals. Clicking a row equips it (or takes the worn one off), a cell or tab picks the tab. It stays open after a click, so pieces can be swapped and compared. Opening it picks the body tab.
   - `SiteMenus`: the bench opens the gear panel; the Stages panel sits beside it.
   - `HealthBar`: the shield's value is the total armor (dimmed at 0); its max is the stats' max. `InventoryPanel` / `inventoryRows`: Gear's worn line counts the worn pieces with the total armor ("3 worn · armor 21"); spares as 031.
   - `PlayerView`: the body tint by the worn body piece's weight (010), Featherplate drawn with the light piece's tint (no slow tint).
   - `RelicView` (owned by `FeelView`, so GameScene stays under its limit): the Wardstone's shimmer round the player while it's ready (a faint violet ring, breathing), a flash and the ward-break sound when it blocks; Last Ember's ember flash and sound when it saves. `SiteView`'s bench flare turns relic violet when a relic is identified, with the relic-identify sound (`FeelView`).
   - Art (`src/data/art/gear.ts`): helm, boots and trinket icons; four rarity frames; four relic icons; the ward shimmer ring and the ember flash. Sounds (`src/data/gearSounds.ts`): relic identify, ward break, ember save. Look and layout numbers in `src/data/gearAssets.ts`.
   - `ui().gear`: the panel (open, tab, identify button, cells, tabs, rows with ids, boxes and texts, page, totals), the ward shimmer's alpha, ember flashes and the bench's relic flare.

## Tests (written first)
- **Vitest** `tests/sim/gear.test.ts`: identify rolls deterministic per seed; over many seeds every slot, weight, base armor, rarity, affix count and value in range, no duplicate kinds, body-only weights, names from the lists; rarity and relic shares near their chances; a relic (forced through a seed search or the RNG stub) fixes slot, weight and name and has 2 affixes; identify events carry the piece; equip per slot, swap within a slot, take off (the worn id and `{ slot, id: null }`), an unknown id, only at the bench.
- **Vitest** `tests/sim/stats.test.ts`: sums from several worn pieces; the move cap; the roll cooldown floor; the damage formula (light body takes a Husk's 20 to 14; heavy body plus four armor affixes still takes 5); max health (equipping doesn't heal, a lower max clamps, a KO wakes at the full max); regen heals over a set number of ticks (0.5 HP/s: 1 HP in 120 ticks), stops while dying, doesn't add to a spring's rate; heavy and gear speed stack with firing; roll distance and cooldown change, i-frames don't.
- **Vitest** `tests/sim/relics.test.ts`: Rollbreaker staggers a winding-up Husk once per roll (its wind-up cancelled, 40 ticks in recover) but not the Warden; Wardstone blocks one hit after 360 quiet ticks (not at 359), then resets; Featherplate no slow and a 25% shorter roll; Last Ember saves once with 60 ticks of invulnerability, recharges on a bank, and a second lethal hit kills.
- **Vitest** `tests/render/gearText.test.ts`, `tests/render/benchLayout.test.ts` (inside the view, panels never overlap, rows paged by height, every tab and cell hit-tested), `tests/data/gear.test.ts` (ranges and counts as the spec's tables, relics' slots and weights, rarity colours are palette ids, relic and playtest data valid).
- **Rewritten:** `tests/sim/armor.test.ts` → drops and the bench in `gear.test.ts` (no test lost); `firingWalk`, `death`, `banking`, `health`, `healing` (`fieldRegen(state, tuning)`), `inventoryRows`, `data.test` (armor block), `stagePanel.test` (now the bench layout) build Common body pieces through a shared fixture (`tests/fixtures/gear.ts`); `tests/e2e/armor.spec.ts`, `tutorial.spec.ts` and `hudInventoryShots.spec.ts` read `gear` and `equipped`.
- **Playwright** `tests/e2e/equipment.spec.ts`: with `?playtest`, open the bench with E, identify with a click on the panel's button, equip a piece in each slot (one by clicking its row), check `stats` against the worn pieces, then take a Husk hit for `max(ceil(20 × 0.25), 20 − armor)`. Also: the panel's tabs and take-off.
- **Playwright** `tests/e2e/equipmentShots.spec.ts` (REVIEW_SHOTS=1, into docs/review/036/): the bench with all four slots filled and a relic row, the HP bar's armor value, the ward shimmer, the ember flash (tweens held), the relic flare at the bench, and sheets of the new sprites.

## Not dictated by the spec
- Affix values roll as whole steps (regen in tenths, move speed in whole percents); move speed is stored as a fraction (0.04).
- Roll cooldown affixes are stored as the ticks taken off (positive); labels show "−4 roll cooldown".
- Featherplate's 25% applies to the whole roll distance, roll-distance affixes included.
- A Wardstone block takes nothing: no damage, knockback, hit invulnerability, or harvest/claim cancel, and doesn't count as a hit for healing; it resets the timer. Any hit that lands resets it too. The timer counts only while the Wardstone is worn.
- Last Ember's save sets the hit invulnerability to `saveInvulnTicks` (not 030's 30) and keeps the hit's knockback. Waking from a KO recharges it (the player wakes in the foundry, a bank).
- Rollbreaker: "through" is the feet boxes overlapping during the roll; underground Burrowers can't be staggered (untargetable). A staggered enemy shows its recover pose and chases again after.
- The playtest start's relic is the Wardstone Circlet; its pieces start unworn (equipping is at the bench).
- The bench panel stays open after a click (identify, equip, tab); Esc or walking away closes it. Rows page when a tab has more than fit.
- Common's "stone" is `rock-light`, Fine `cyan`, Rare `gold-trim`, Relic `wisp-light` (the nearest palette violet that reads on the tablet). Pending Shaun's review.
- The inventory panel's worn line reads "N worn · armor T".
- Body word lists stay 010's; helm, boots and trinket lists are new placeholders.
- Rollbreaker leaves an enemy that's already recovering (or a Charger stunned by a wall) be, so a stagger never cuts a punish window short.
- The gear panel sits at a fixed top (48 px), clear of the bottom HUD's tube slot; its list holds 4 plain rows a page.
- Last Ember's save still reports the hit's damage (the number shown), though the player keeps 1 HP.
- `addGear` dev hook (a relic for the screenshots without the roll).

## Build notes
- The side task went first, in its own commit: the HP chunk e2e holds the tween clock at 0 while it checks the chunk, then runs it at 20× for the drain; the schematic banner keeps a short record of the lines it started (`ui().schematics.bannersSeen`), so the research e2e runs the tween clock fast and waits on that record. Both passed 12 at once on 4 cores, where the chunk test had failed 5 of 6.
- The relic flare's screenshot needs a frame between a long in-page loop and the slowed tween clock: the first frame after the loop carries the whole loop's time.

## Risks
- Every e2e that reads `armorPieces` / `equippedArmor` breaks: rewritten.
- GameScene is at its limit; new views sit behind FeelView and SiteMenus.
- The panel's text must fit 640×360 next to the Stages panel; the layout test checks the boxes.
