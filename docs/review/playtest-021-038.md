# Playtest checklist: specs 021–038

Oct 19, 2026 · Claude. Everything built on `claude/laughing-volta-uac3nf` and waiting for Shaun's playtest. Each section below is copied from that spec's "Raised after the build" notes: tuning to feel out, choices the spec didn't make, and art to approve by eye. Screenshots are in `docs/review/NNN/`.

**State at the end of the sprint:** `npm run check` passes with 1,223 unit tests. The full `npm run test:e2e` passes: 89 passed, and the skipped ones are the REVIEW_SHOTS screenshot specs. Every spec was planned, built tests-first, verified, and reviewed by a separate reviewer agent, and every finding was fixed or is listed here.

## 021–027 (built earlier)
See the 2026-10-19 "021–027 built" entry in docs/progress.md for the judgement calls to confirm.

## 028: Foundry flow: a port per resource, fed hoppers, entrances at their own rate, and goals after the shrine
- **The entrance fire pulse can't be seen.** The pulse is drawn on the intake pipe in the foundry, but the tube never fires in the foundry, so in play it's almost never visible. It's built as specified. Shaun to decide where it should show instead (for example, as a flash on the matching icon in the HUD's tube slot). Until he does, the pulse has no visibility test.
- **Port art** waits on Shaun's approval by eye (docs/review/028/).

## 029: Ammo roles and stage machines (Milestone 1)
- **Husks can't be frozen at these numbers.** Freezing takes 4 chill stacks, and each frost arrow does 10 damage against a Husk's 40 HP, so the 4th hit kills it instead. Only the Pylon Warden lives long enough to freeze. The numbers are built as specified, and the e2e freezes the Warden instead of a Husk. Shaun to choose the fix: freeze after 3 stacks, less frost-arrow damage, or leave it.
- **Choices the spec didn't make, for Shaun to confirm:**
  - frozen enemies' attack cooldowns keep counting down
  - hand-applying a stage needs the bench in reach
  - the hotbar count includes tagged rounds
  - a frost hit that kills doesn't freeze
- **Art** for the stage machines, rime and the Grotto waits on Shaun's approval by eye (docs/review/029/).

## 030: Healing: safe spots only
- **Two readings of the spec to confirm:**
  - `healing` stays set on every tick a source is building toward the next HP, not only on the 1-in-6 ticks a whole point lands, so it doesn't flicker.
  - A tie between equal rates reports the table order, so a spring inside a pylon zone reads "pylon".
- **The north spring:** the spec says to cut it if healing near home is too easy. Its clearing is a square cut out of a grove, which may look tight (docs/review/030/03).
- **Spring art and the heal motes** wait on Shaun's approval by eye (docs/review/030).

## 031: HUD pass: inventory panel and HP bar
- **Panel on death:** the spec didn't say. An inventory panel left open when the player is knocked out now closes, so it can't overlap the wake panel.
- **Panel size:** the panel keeps a row for every item each group could hold, so its size never jumps. This leaves empty space under Raw and Parts. When open, it covers the tube slot, as the crafting menu does.
- **Look:** Shaun to judge whether the red screen-edge tint below 25% HP is strong enough, and to approve the new HUD art (docs/review/031).

## 032: Landmarks and champions
- **The map has no generated ponds now.** The seed's two generated ponds sat where the Ley Grotto and Reed Marsh go, so they were removed whole. Only hand-placed ponds remain.
- **Landmark guards wake as soon as they're on screen,** so every landmark is a fight on arrival. The cache's five guards are the toughest pack outside the shrine. Review found the Quarry guards could join the tutorial's first fight; they are being moved out of its range.
- **Champion names and the "Claim a second pylon" wording** are first drafts for Shaun to edit. The landmark art waits on his approval by eye (docs/review/032).
- **After review:** the Quarry guards moved west, with a test that the ruin-field fight wakes no landmark guard. The Ley Grotto pylon moved to (72,22) so its safe zone stops short of the Reed Marsh. One thing to feel out: from the reed beds the Ruined Cache's guards are nearer than the field pack, so a new player gathering fiber may find the cache sooner than intended.

## 033: Foundry research as restoration
- **Shared schematics row (differs from the spec):** all schematics share one inventory row, so the panel still fits the screen. It reads "Schematics" when more than one known kind is held. The spec says a schematic takes its real name once banked. Shaun to choose: keep it, or give each banked schematic its own row in a bigger panel.
- **Placement and names:** wall panels sit at (6,0), (17,0) and (19,0), and the sealed wing door is in the wall's notch at (9–10,1). The node names are placeholders: Second entrance, Third entrance, Reservoir I, Reservoir II, Machine speed, Splitter, Merger, Sealed wing. Shaun to confirm both.
- **Art:** the restoration art waits on Shaun's approval by eye (docs/review/033).

## 034: Region 2: Stonefall Hollows and the Bulwark
- **Bulwark HP probably too low.** At 900 HP, a bot circling behind it with single arrows kills it in about 25 s, so triple volleys would beat the 30–45 s target easily. 2,000–2,500 HP may be right. A sim test now records the full-HP fight so it can be retuned.
- **Arena-only attacks (the spec didn't say).** The Bulwark lobs and pounds only while the player is inside its arena. Before the fix it could keep lobbing at a player anywhere on the map for up to 300 ticks.
- **Stand-off distance.** It stops walking about 54 px from the player (`standOff` in data). It wasn't in the spec.
- **Altar panel.** It also opens while the altar is spent or summoning, with Summon greyed out.
- **Placement choices** are listed in the 034 plan. The Ley-iron Cut has no pylon of its own; the Cistern Terrace is the region's only claim.
- **Art** waits on Shaun's approval by eye (docs/review/034).
- **After review, measured:** a bot circling to the Bulwark's back with single carried arrows beats the full 900 HP in 1,515 ticks (about 25 s) and takes no damage at all (tests/sim/bulwark.test.ts). So the fight may need more HP, a faster turn, or more pressure on a player who circles. Shaun to tune at playtest.

## 035: Region 2 enemies
- **Two gaps the spec didn't cover, decided by Claude so nothing deadlocks:**
  - **Burrower:** when it locks (close to the player, or after 180 ticks underground) it surfaces where its body is. It never jumps to the player or erupts through a cliff.
  - **Sniper:** if no tile within one step can see the player, it keeps its distance in the open, as a Wisp does, and tries peeking again on its next cooldown.
- **Tuning to watch:**
  - a player circling close can out-turn a Shardback
  - the Sniper's 28 damage is the region's hardest hit
  - packs of five with a 1-in-4 champion chance may be a lot this early
- **Art** for the four enemies is a first draft (docs/review/035). Their telegraphs use the shared rust red, while the Bulwark uses the brighter danger red; compare them side by side.

## 036: Equipment slots, affixes and relics
- **Colours and art:** rarity colours are Common rock-light, Fine cyan, Rare gold-trim and Relic wisp-light. The gear sprites wait on Shaun's approval by eye (docs/review/036). With the Stages panel open beside it, the gear panel covers the bench and the player.
- **Small choices the spec didn't make:**
  - a Wardstone block cancels the whole hit
  - Last Ember keeps the hit's knockback, and its damage number shows the full hit
  - a Rollbreaker stagger wakes an idle enemy into a chase
  - new placeholder names for helms, boots and trinkets

## 037: Leveling and the talent tree
- **Shatterpoint's ice shards are physical.** The spec says only "4 ice shards for 50% damage". Making them cold would chill, and with Rimecraft freeze, nearby enemies, which the next ley bolt shatters again: a self-feeding chain. Cold is a one-line data change if Shaun wants it.
- **Boss refight XP** (50%) comes only from an altar summon. Killing the Warden again after a KO gives no boss XP.
- **Choices the spec didn't make:**
  - the Blastfletch charged burst hits for the charged arrow's damage
  - Rimecraft's +0.5 s also lengthens a boss's freeze
  - Fleet's move speed can go past the gear move cap
  - fire-rate bonuses round to whole ticks, so +8% is +7% on arrows, +5% on ley bolts and +8% on bombs
- **Art:** lane colours, the tree art and the new sounds wait on Shaun's approval (docs/review/037).
- **Blastfletch is hard to trigger with carried ammo alone.** Carried arrows and bombs share one cooldown (40 ticks after a bomb), and a short bomb flight's 20-tick charge often runs out before the next arrow can fire. It works naturally with a two-entrance volley of bombs and arrows. Shaun may want a longer charge.

## 038: Landmines and the cluster stage
- **Every open question above is built as proposed** (038.1–038.11); Shaun may change any of them.
- **Layout knock-ons of the new items:** the inventory panel (031) reserves a row per item, so its rows are now 15 px, not 16, to keep it in two columns on screen; a sorter's item menu (it lists every item) grows longer columns instead of a fourth column off the screen's edge; the crafting menu is always two columns.
- **Choices the spec didn't make:** a landmine that meets the shut ley barrier mid-flight drops and arms there (a bomb bursts there); bomblets take the talent numbers when their bomb bursts; the intake gauge shows landmines in iron and cluster bombs in a hotter ember.
- **Art** for the landmine, the iron plate, the bomblets, the flashes, the cluster badge and the three machines waits on Shaun's approval by eye (docs/review/038).

