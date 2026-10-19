# Plan 037: Leveling and the talent tree

Spec: docs/specs/037-leveling-talents.md (approved; open questions settled in docs/brainstorm/2026-10-19-open-questions.md, 037.1–037.10, D and L: arrow pierce is unlimited by 029's base rule, so no node touches pierce; keystones are lane capstones and combos between ammo; XP never from the factory; one point per level; free respec at the foundry; the highest healing rate wins; T opens the tree and nothing pauses). Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`). docs/design.md already carries the 037 wording ("Skill tree", the leveling row, the closed open question), so it isn't touched; the spec asks for no docs/prototype.md change.

## Shape of the change
Small vertical commits, tests first in each:

1. **XP and levels (data, sim).**
   - `src/data/leveling.ts`: `XP_CURVE` (40 … 650), `LEVEL_CAP` 15, `RING_XP` [1, 1, 2, 3], `CHAMPION_XP` 3, `CLAIM_XP` 50, `LANDMARK_XP` 25, `BOSS_REFIGHT_XP` 0.5.
   - `src/data/enemies.ts`, `bulwark.ts`, `hollowsEnemies.ts`: `xp` on every enemy (Husk 5, Wisp 6, Warden 150, Bulwark 300, Region 2's four 6).
   - `src/sim/leveling.ts`: `gainXp` (levels up through the curve with carry-over, several levels from one gain, a point each, a `levelUps` event each; nothing counts at the cap), `killXp` (a boss's `xp` on its first kill, `BOSS_REFIGHT_XP` of it after; anything else `xp × RING_XP[ring] × (CHAMPION_XP for a champion)`, the ring of the enemy's home tile in the overworld, ring 0 elsewhere), `stepLeveling` (this tick's `claims` and `discoveries` events give `CLAIM_XP` and `LANDMARK_XP`), `xpToNext`.
   - `state.ts`: `level` 1, `xp` 0, `talentPoints` 0, `talents` ['start'], `killedBosses` [] (bosses killed at least once). Kept through a KO (resetWorld doesn't touch them).
   - `combat.ts` `removeDead` gives each death's XP (any kill: ammo, punch, burst). `step.ts` runs `stepLeveling` after the claims and discoveries of the tick.
   - Events: `xp: { amount, source }`, `levelUps: { level }`. `events.ts`'s `clearEvents` empties every list generically (it would pass 300 lines otherwise).
2. **Talents, allocation, respec (data, sim).**
   - `src/data/talents.ts`: `TALENTS` (the spec's table: id, name, lane, kind, panel position, links, effect as data, a one-line effect text), `TALENT_START`, the keystone tuning (`BLASTFLETCH`, `SHATTERPOINT`, `OVERPRESSURE`), `LANES` (name, colour, icon key). Ids are the table's in lower case (`a1`, `k3`), kebab-case per the data rules.
   - `src/sim/talents.ts`: `canTake`, `takeTalent` (a point, not taken, linked to a taken node; a `talents` event), `respec` (foundry only; every node but the start back, points returned, health clamped to the new max; a `respecs` event), `hasKeystone`, `talentTotals` (each effect kind summed).
   - `input.ts`: `takeTalent: string | null`, `respec: boolean`, with one `EDGE_RESET` list that the test hook uses for the ticks after the first (testHook.ts is at its limit).
3. **Stat nodes into `playerStats`.** `stats.ts` adds the talents' max health, regen, armor and move speed (the gear's move cap stays the gear's, 036), and the new fields: `firingWalk` (016's 0.7, +0.1 from Steady Grip), and `ammo`: per-base damage and fire-rate multipliers (base + all-ammo bonuses, added), `freezeHits`, `freezeTicks`/`bossFreezeTicks`, `blastRadius`, `lobTime`, `homingTurn`, `starShards`. `tube.ts`'s `firingWalkScale` reads `firingWalk`.
4. **Ammo-behaviour nodes.** The 029 systems read the stats: `tube.ts` (damage onto each round at launch, each entrance's and the carried cooldown from `fireTicksOf`), `bombs.ts` (damage, radius and lob time snapshotted at the throw), `cold.ts` (freeze hits and length), `homing.ts` (turn), `combat.ts` (shard count and damage).
5. **Keystones (`src/sim/keystones.ts`).** Blastfletch (a player bomb's burst leaves a charged area of its radius for 20 ticks; an arrow inside one takes its charge once: ×1.5 damage on the next enemy it hits and a 24 px burst there, which spends it; the arrow pierces on), Shatterpoint (a ley bolt on a frozen enemy ends the freeze for double damage and sends 4 ice shards from it for half the bolt's damage), Overpressure (`tube.overpressure` counts ticks of fire held while firing, up to 120, for up to +25% fire rate; releasing fire resets it). Events: `charges`, `chargedBursts`, `shatters`.
6. **Hook.** `getState()` gains `level`, `xp`, `xpToNext`, `talentPoints`, `talents`, `overpressure` (ticks and the bonus), `blastCharges` (in `summaryLeveling.ts`), and the events. Commands `takeTalent` and `respec` through `step`.
7. **Render.**
   - The XP bar (`HealthBar` grows a row under the HP frame: a thin bar under the fill, "Lv 7" under the shield, a pip when points are unspent; the bar ticks brighter on an XP gain). No popups.
   - `LevelUpView` (owned by `FeelView`): a cyan ring flash on the player, the chime, and "Level 7 · talent point (T)" over the bottom HUD, on tween time. Talent and respec sounds. `KeystoneView`: the charged areas' shimmer, the ice bursts, and the heat shimmer on the tube while Overpressure ramps.
   - `TalentPanel` (owned by `HudView`, T or Esc, never pauses; it takes turns with the inventory and research list): the constellation from `TALENTS` positions, links (glowing between taken nodes), nodes (taken glow cyan, available bright outline, the rest dim; keystones larger rune-stones), a header (level, XP, unspent points), hover text (name and effect), clicks take an available node, and "Reset talents (free)" only in the foundry. Layout pure in `talentLayout.ts`.
   - Art (`src/data/art/talents.ts`), keys and look in `src/data/talentAssets.ts`, sounds in `src/data/talentSounds.ts` (`npm run sound`).
   - `ui()`: `talents` (panel open, header, nodes with state and boxes, hover, reset box, glowing links), `xpBar` (fill, text, pip), `levelUp` (line, rings live), `keystones` (charge shimmers, ice bursts, heat alpha).

## Tests (written first)
- **Vitest** `tests/sim/leveling.test.ts`: kill XP for a Husk in rings 1 and 2, a ring-3 Charger, a champion, the Warden (first, then a re-kill at half), the Bulwark refight; a claim and a landmark discovery give XP once each; a punch kill counts; a long foundry run (crafting, building, identifying, depositing, research) gives none; the curve with carry-over and several levels from one gain; the cap; a KO keeps everything; determinism.
- **Vitest** `tests/sim/talents.test.ts`: the start is taken and free; taking needs a point, a taken neighbour, an untaken node; events; respec only in the foundry, returns every point, clamps health.
- **Vitest** `tests/sim/talentStats.test.ts`: each minor node reaches `playerStats` or the 029 value it changes (arrow/bomb/ley damage, fire rate on a carried and an entrance shot, freeze after 3 hits and 30 ticks longer, blast 55 px, a quarter shorter lob, sharper homing, 7 shards, firing walk ×0.8, max health, regen in whole steps and never added to a spring, armor, move speed).
- **Vitest** `tests/sim/keystones.test.ts`: Blastfletch charges an arrow through a blast (and not one outside it, nor a ley bolt), the burst on the next hit spends it; Shatterpoint on a frozen enemy only; Overpressure ramps over 120 ticks, caps and resets on release.
- **Vitest** `tests/data/talents.test.ts`: 19 nodes plus the start, three keystones, links symmetric and to real ids, every node reachable, lanes and colours valid, no pierce or foundry effect, damage types only physical and cold. `tests/render/talentLayout.test.ts`: the panel inside the view, nodes inside the panel, none overlapping, hit-testing.
- **Rewritten:** `stats.test.ts`'s bare-numbers `toEqual` (the new fields), the healing-step test (talent regen joins it), the HP block's resting top in the 031 e2e (the XP row under it).
- **Playwright** `tests/e2e/talents.spec.ts`: with `?playtest`, kill Husks until a level-up, open the panel with T, take a node by clicking it, check `getState()`, then respec in the foundry with the panel's button.
- **Playwright** `tests/e2e/talentsShots.spec.ts` (REVIEW_SHOTS=1, into docs/review/037/): the panel with taken, available and dim nodes and a hover, the XP bar with "Lv" and the pip, the level-up flash (held), the three keystone effects, and the sprites on the contact sheet.

## Not dictated by the spec
- A kill's ring is its home tile's ring in the overworld (where it was placed or spawned), ring 0 in any other room. Bosses take no ring or champion multiplier.
- A boss's later kill gives `BOSS_REFIGHT_XP` of its XP only when it was summoned at its altar (034); any other later kill (the Warden again after a KO before its pylon is claimed) gives none (review). `killedBosses` stays its own list: 034's `bossDefeats` holds only altar bosses and its goals read it.
- Claims and discoveries give XP from this tick's events, so a start's claims (`?start=hollows`) and the dev hook's `claim()` give none.
- At the cap `xp` stays 0 and `xpToNext` reads 0; the bar shows full.
- Fire rate bonuses add up (+8%, +10%, Overpressure's ramp) and divide the ammo's `fireTicks`, rounded to whole ticks (at least 1). Damage bonuses add up (+10% and +6% is ×1.16) and stay fractional; the numbers shown round.
- Rimecraft's +0.5 s applies to a boss's shorter freeze too.
- Lane bonuses reach the shots of their rounds: arrow bonuses reach frost arrows; ley bonuses reach star shards and Shatterpoint's shards.
- Blastfletch: only the player's bombs charge ground; an arrow takes a given area's charge once; the burst hits every other enemy within 24 px for the charged arrow's damage, like a bomb's (no knockback, it lands through shields); a blocked arrow spends nothing.
- Shatterpoint's ice shards fly like star shards (64 px at 360 px/s), never hit the shattered enemy, and deal physical damage (review: cold shards would chill their way into a freeze chain the spec never asked for; the cold alternative is flagged for Shaun). The shattering hit thaws the enemy as a normal thaw (the refreeze window starts). The shards' and the charged burst's damage types are data (`SHATTERPOINT`, `BLASTFLETCH`).
- Overpressure counts while fire is held and the tube is really firing; a roll or an empty tube holds the ramp where it is; releasing fire resets it; a KO resets it.
- Respec with nothing taken is still allowed and recorded. Losing Tough Hide clamps health to the new max; taking it doesn't heal.
- The level-up line sits centred over the bottom HUD for 2.6 s (2.2 s, then a 0.4 s fade) in the title face, in cyan; the XP bar's "tick" is a 0.3 s brightening of the bar's end.
- Untaken links take their lane's colour (`LANE_COLORS`), as does the hovered node's name; taken links glow cyan.
- A charged arrow's burst flashes the charged ground's ring at its 24 px radius.
- The tree panel's lanes carry their ammo's icons (Arrows, Bombs, Ley) and new ones for Survival (a heart) and the Tube (the relic tube); keystones have their own icons. Lane colours: Arrows rust-light, Bombs cinder, Ley cyan, Survival leaf-light, Tube brass-light. Pending Shaun's review.
- Opening the tree closes the crafting menu, the hopper picker and any site menu, as the inventory does, and takes turns with the inventory and the research list; a KO closes it.
- The XP row sits under the HP frame: the bar under the fill, "Lv 7" and the pip under the shield.
- Talent ids are the spec's in lower case (`a1`, `k3`): data ids are kebab-case (.claude/rules/data.md).

## Build notes
- The XP row and the tree panel's layout went into `src/data/hudPanels.ts` (beside the HP bar's) and `src/data/talentAssets.ts`, not `hudLayout.ts`, which is at its 300-line limit. The HP block grows by the XP row (`HEALTH_BLOCK_HEIGHT`); its bottom stays at the margin, so the frame sits 8 px higher. The 031 e2e's resting top reads the new height.
- `testHook.ts` was at its limit: its held ticks now come from `heldPart` (input.ts) and the UI's actions merge through `withUi` (menuRequests.ts), so new edge commands need no hook change.
- `clearEvents` empties every list generically (events.ts would have passed 300 lines).
- Damage bonuses land on the round at launch (`arrow.damage`), the bomb's damage, radius and flight at the throw, so a respec never changes a shot in flight.
- The level ring and the ice burst start their clock on the first frame they're drawn: the first frame after a long hook loop carries the whole loop's time and ran them out unseen (036 saw the same with the relic flare). Both are drawn plain, not added, so the ring stays cyan on bright grass and the ice reads over a white hit flash.
- A `gainXp` dev hook gives a later level for the screenshots; XP given that way lands between ticks, so its level-up events are cleared before render sees them (the level-up shot levels up from a kill instead).
- Hover text wraps onto a second line at a word when it's wider than the panel (the keystones' effects).

## Risks
- `GameScene.ts` and `testHook.ts` are at their limits: the panel and XP bar sit behind `HudView`, the effects behind `FeelView`, and the hook's per-tick edge reset becomes one list in `input.ts`.
- Bots in e2e that fight for a while now level up; nothing they check reads stats that a level changes (points are unspent).
