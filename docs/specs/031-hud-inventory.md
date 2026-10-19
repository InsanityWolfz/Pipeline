# 031: HUD pass: inventory panel and HP bar
status: draft

## Goal
The screen stays clean, and the death rule becomes readable:
- The materials column on the left is gone.
- I or Tab opens an inventory panel. It groups the haul into Raw, Parts, Ammo, Gear and Cores, with names, and marks what is at risk against what is safe.
- A small pickup feed replaces the stacked "+1" popups. Machine "+ part" popups no longer overlap.
- The HP bar moves to the bottom-left. It is much larger, reads "72 / 100" and has the armor value beside it. It pulses when you are low, glows while you heal, and shows the damage you just took.
- The bomb casing icon becomes a plain black sphere.

## Design references
- docs/design.md:
  - "Death and tension": a death loses "everything you picked up since your last return home or pylon deposit", while identified armor is always kept
  - "World, regions, ley lines, bosses": "Pylons are deposit points: reach any claimed pylon and your haul is sent home safe"
  - "Combat": the simple stats (max health, armor)
- docs/specs/011-death.md: banking on entering the foundry or depositing at a pylon
- docs/specs/010-armor.md: the worn piece and its armor value
- docs/specs/020-vector-pass.md: the HUD, menus and item icons in vector
- docs/specs/021-playtest-fixes.md: the menu pointer and the pickup slide
- docs/specs/025-bottom-hud.md: the bottom-centre hotbar row and tube slot. This spec must not overlap them.
- docs/specs/027-foundry-tutorial.md: the "+ part" popup over a machine
- docs/specs/030 (healing, draft): the healing state this spec's cyan glow reads
- docs/brainstorm/2026-10-19-content.md, "What the playtest found", Clutter:
  - "The materials list reaches 13 rows (about 60% of the screen height) with no names."
  - "The HP bar is a thin strip top-left with no number."
  - "'+1' popups stack about 7 high, and machine popups overlap."
- docs/brainstorm/2026-10-19-content.md, area 1 (Shaun's original request): the inventory panel, the HP bar and the bomb casing
- Shaun, on the casing: "make the bomb casing just a black sphere like the bomb without the wick of the orange ring"
- Shaun's interview answers, 2026-10-19, round 5:
  - **Carry limit:** "none. The inventory panel (I or Tab) just organises the haul into Raw, Parts, Ammo, Gear and Cores, with names. It marks what's at risk against what's banked."
  - **HP bar:** "bottom-left, large, '72 / 100'", with all four extras:
    - the armor value beside it
    - a low-HP pulse, with a red bar and tinted screen edges below 25%
    - a cyan glow while healing
    - a damage chunk that lingers white before draining
- Shaun's interview answers, 2026-10-19, round 1: healing happens only in safe spots (030), which is what the glow shows.
- **What the sim already tracks** (read from the code, 2026-10-19). The death rule needs no new sim state. Three records already exist:
  - **`inventory`** is what the player carries.
  - **`banked`** is a snapshot of the inventory, taken on entering the foundry and on a pylon deposit. On a death the player keeps, per item, `min(held, banked)` and loses the rest (`wake()` in `src/sim/health.ts`).
  - **`stash`** holds what a pylon deposit sent home. A deposit empties the inventory into it.
  - So per carried item, **safe** = `min(held, banked)` and **at risk** = `held − safe`.
  - Identified armor lives in `state.armor` and is never lost.
  - This spec adds one pure helper that computes these numbers. The panel and the hook both use it, and a test checks it against what `wake()` actually keeps.
- **Depends on:**
  - **030 (healing)** must land first for the cyan glow. Build order puts healing (3) before the HUD pass (4). If 030 isn't built yet, every other criterion can still be built, and the glow criterion waits.
  - Items from 029 (the rime shard and the tagged rounds), which is built before this spec, are mapped below. Items added after it (033's machine parts and schematics, 034's ley-iron, iron plate, landmine and Bulwark core) each add their panel `group` in their own spec. The data test enforces this.

## Acceptance criteria

**At-risk helper (sim)**
- [ ] A pure helper in `src/sim/banking.ts` returns, for every carried item, how many are safe and how many are at risk, using the rule above.
- [ ] A test checks that a death loses exactly the at-risk counts and keeps exactly the safe counts, for a mix of items.
- [ ] Cases covered:
  - right after entering the foundry, nothing is at risk
  - right after a pylon deposit, nothing is carried
  - picking up 3 wood after banking 10 gives 10 safe and 3 at risk
  - spending carried items reduces the at-risk count first, then the safe count. This follows from the `min()` rule.
- [ ] `getState()` reports `atRisk: Record<itemId, number>`, listing only items with at least one at risk.

**Inventory panel (render, data)**
- [ ] I or Tab toggles the panel, and Esc closes it.
  - Tab never moves the browser's focus.
  - Opening the panel closes the crafting menu, the hopper picker or a site menu if one is open. Opening any of those closes the panel.
  - The panel doesn't open while the pause menu or the wake panel is up.
- [ ] Like the crafting menu (020), the panel doesn't pause the world. The player can move, but a click on the panel never fires (015). The 021 pointer shows while it is open.
- [ ] The panel is a vector tablet in the 020 style, centred, with a title card reading "Inventory". It stays inside the 640×360 view, using two columns if one won't fit.
- [ ] Groups always appear in this order, each with a header: **Raw**, **Parts**, **Ammo**, **Gear**, **Cores**. A group with nothing in it shows a dim "Nothing" under its header, so the layout doesn't jump around.
- [ ] Each item row shows the item's icon, its name (from `ITEMS`) and its carried count. Only items with a count above 0 get a row.
- [ ] Each row marks risk:
  - **All safe:** the count with a small "safe" mark in the ley cyan.
  - **Some or all at risk:** the at-risk part in `rust-light` with a warning mark, for example "10 safe · 3 at risk".
  - The numbers come from the helper above.
- [ ] **Gear** lists:
  - the carried unidentified armor, marked like any other item
  - identified armor pieces by name, weight and armor value. The worn piece is marked "worn". Identified pieces are always shown as safe, since a death never takes them.
- [ ] A footer line explains the rule: "At risk: lost if you die before reaching the foundry or a claimed pylon." Exact wording is up to Shaun.
- [ ] Every item has a panel group in data. A data test fails if an item has none. Current mapping:
  - **Raw:** wood, stone, fiber, ley crystal, husk resin, rime shard (029)
  - **Parts:** shaft, arrowhead, rope, casing, fuse, ley shard
  - **Ammo:** arrow, bomb, ley bolt, and 029's tagged rounds (frost arrow, homing ley bolt, star ley bolt)
  - **Gear:** unidentified armor
  - **Cores:** warden core
  - The warden core goes under Cores. Its `kind` stays `part`; the panel's `group` field places it (033 later also tags it `research: 'core'`).
  - 033's machine parts (such as `ancient-gear`) and its schematics go under Parts (open question 2; 033 agrees).
- [ ] `__GAME__.ui()` reports `inventory: { open, groups: [{ id, rows: [{ itemId, count, atRisk }] }] }`.

**Materials column removed (render, data)**
- [ ] The top-left column of material and part icons and counts is removed, along with `HUD_MATERIALS_LAYOUT` and its rows in `HudView.overUi`.
- [ ] Ammo counts stay in the 025 hotbar, unchanged.

**Pickup feed (render, data)**
- [ ] The "+1 [icon]" text popups that rise over the player on a pickup are removed. The pickup sparkle and the 021 slide-in stay.
- [ ] A pickup feed sits in the HUD at the top-left, where the materials column was. It must be clear of the objective panel and the minimap, which are both top-right.
  - Each line shows the item's icon, "+N" and the item's name. For example: [icon] +3 Wood.
  - It is driven by the sim's `pickups` events only.
- [ ] Repeats merge into one line. A pickup of an item that already has a live line adds to that line's N and restarts its timer, instead of adding a new line.
- [ ] Timing and limits:
  - A line holds for `holdMs` (starting at 2500) after its last repeat, then fades over `fadeMs` (400).
  - At most `maxLines` lines show (starting at 5). The newest is on top, and the oldest leaves first.
- [ ] Picking up 7 wood in a burst shows exactly one line, "+7 Wood".
- [ ] `__GAME__.ui()` reports `pickupFeed: [{ itemId, count }]`, newest first.

**Machine popups (render, data)**
- [ ] No two live "+ part" popups (027) overlap. A popup that would overlap a live one starts above that popup's current top plus a gap, `MADE_POPUP.stackGap` (starting at 2 px), and both keep rising together.
- [ ] Two popups for the same machine and the same item within a short window merge into one popup that shows a count, for example "+ shaft ×2".
- [ ] `MadePopups` reports each live popup's text and screen box, so a test can check that none overlap.

**HP bar (render, data)**
- [ ] The bar sits at the bottom-left, `HUD_LAYOUT.margin` px from the left and bottom edges.
  - It is much larger than today. Starting size: about 3× the old well, so a 144×12 px fill in a carved frame (today's is 48×4).
  - The numbers are in a new `HUD_HEALTH_LAYOUT`, which replaces the old one.
- [ ] The text "72 / 100" (current / max) is drawn centred on the bar in the HUD's count font. Current health is rounded up, so a living player never reads 0.
- [ ] The armor value sits right of the bar: a new vector **shield icon** and the worn piece's armor value.
  - With nothing worn, the shield and a "0" are shown dimmed.
  - This replaces the light/heavy armor icon top-left (010). The weight is still shown in the inventory panel's Gear group.
- [ ] **No overlap with 025:**
  - The bar, text and shield never overlap the hotbar row or the tube slot, including a volley as wide as five entrances.
  - In build mode, if the build bar's left edge would come within `HUD_LAYOUT.gap` of the HP block, the block moves up to sit above the build bar's label row.
  - An e2e test checks these boxes with every piece unlocked.
- [ ] **Low HP:** below 25% of max health (`HP_BAR.lowFraction`, starting at 0.25):
  - The fill turns red (`hit-red`).
  - The bar pulses, scaling and brightening, once per `pulseMs` (starting at 900).
  - The screen edges get a red tint that pulses with it, drawn under the HUD and menus.
  - All three stop when health is back at or above the threshold, and during the KO fade.
- [ ] **Healing glow:** while the sim reports that the player is healing (030's healing state), the bar has a soft cyan glow, and the fill rises smoothly instead of jumping.
- [ ] **Damage chunk:** when health drops, the lost part of the bar stays white for `chunkHoldMs` (starting at 400), then drains to the new value over `chunkDrainMs` (300).
  - A hit during the hold grows the same chunk and restarts the hold.
  - Healing past the chunk clears it.
- [ ] `__GAME__.ui()` reports `health: { box, text, low, healing, chunk }`. `chunk` is the white part's current value in HP, or 0.

**Bomb casing icon (data/art)**
- [ ] The `casing` icon becomes a plain black sphere. It uses the same sphere as the bomb icon, with the same dark radial fill, outline and highlight, but has no fuse, no spark and no orange (cinder) band. The open-shell shape and its ley rune are removed.
- [ ] The bomb icon is unchanged. The comment in `src/data/art/items.ts` about telling the casing and bomb apart is updated, since the wick and band are now the only difference.
- [ ] The casing on the ground, riding conduits, in menus and as the shaper's build emblem all use the new icon. It is pending Shaun's review on `/sheet.html`.

**Art (data/art)**
- [ ] New vector sprites in the 016/020 style, pending Shaun's review:
  - the larger HP frame
  - the shield icon
  - the inventory panel's tablet and title card
  - the at-risk warning mark

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Screenshots:
  - the HUD at full HP with armor worn
  - the HUD below 25% with the edge tint
  - a damage chunk mid-hold
  - the healing glow, in a pylon's safe zone (030)
  - the inventory panel with safe and at-risk rows in every group
  - the pickup feed after a burst of mixed pickups
  - two "+ part" popups at once
  - the new casing icon next to the bomb icon
  - build mode with every piece unlocked, showing the HP block clear of the build bar

## Data changes
- `src/data/items.ts`: a `group` per item (`raw | parts | ammo | gear | cores`) for the panel.
- `src/data/hudLayout.ts`:
  - `HUD_HEALTH_LAYOUT` (bottom-left, 144×12 fill), which moves here from `assets.ts`
  - `HP_BAR`: `lowFraction`, `pulseMs`, the edge tint's colour and alpha, `chunkHoldMs`, `chunkDrainMs`, the glow's colour and blur
  - the shield's layout, which replaces `HUD_ARMOR_LAYOUT`
  - `INVENTORY_PANEL`: rows, columns, groups' labels and order, the footer text
  - `PICKUP_FEED`: `holdMs`, `fadeMs`, `maxLines`, position
- `src/data/assets.ts`:
  - `HUD_MATERIALS_LAYOUT` and the old `HUD_HEALTH_LAYOUT` are removed
  - `PICKUP_POPUP` becomes the feed's or is removed
  - `MADE_POPUP` gains `stackGap` and a merge window
  - new sprite keys
- `src/data/art/hud.ts`: the HP frame, shield icon, panel tablet and warning mark.
- `src/data/art/items.ts`: the casing as a black sphere.

## Out of scope
- A carry limit or weight (Shaun: none).
- Dropping, using, sorting or moving items from the panel. The panel is read-only.
- Showing intake reservoirs or foundry contents in the panel.
- Changes to the death rule, banking or the stash.
- How healing works. That is spec 030; this spec only draws its state.
- The equipment slots (helm, body, boots, trinket) and affixes from round 9, which 036 adds to Gear later.
- A feed line for stash takes, crate takes or hand crafts.
- Enemy overhead health bars.

## Test plan
- **Vitest:**
  - The at-risk helper: after banking, after a deposit, after new pickups, after spending.
  - The helper agrees with `wake()` on a death.
  - Every item has a panel group.
- **Playwright:**
  - I and Tab toggle `ui().inventory.open`, Esc closes it, and Tab leaves page focus where it was.
  - Pick up 3 wood after entering the foundry, open the panel and check that the wood row reports 3 at risk.
  - Deposit at the claimed shrine pylon, and check that nothing is carried or at risk.
  - A burst of 7 wood pickups gives one feed line with count 7.
  - Two "+ part" popups at once have boxes that don't intersect.
  - The HP block's box doesn't intersect the hotbar row, the tube slot or the build bar, in play and in build mode with every piece unlocked.
  - Below 25% HP, `ui().health.low` is true. After a hit, `chunk` is above 0 and falls to 0 after the hold and drain.
  - In a healing state (030), `ui().health.healing` is true.
- **Screenshots (qa):** the list under Checks.

## Open questions
1. **What the panel shows from the stash.** Shaun said the panel marks "what's at risk against what's banked". In the sim, banked items are carried items you'd keep, while a pylon deposit moves items into the stash at home. **Proposal:** rows show carried items split into safe and at risk, and each row also shows a dim "home N" from the stash, so the panel tells you what you own in total.
2. **Where schematics go.** 033 adds a `schematic` item kind, which isn't one of Shaun's five groups. **Proposal:** schematics go under Parts beside 033's machine parts, cores go under Cores, and no sixth group is added.
3. **Gear with many identified pieces.** Pieces pile up, since 010 keeps every one, and the panel could overflow. **Proposal:** Gear lists the worn piece and the unidentified count, then one line, "N spare pieces (kept)". The full list waits for 036 (round 9's slots).
4. **Where the pickup feed sits.** **Proposal:** top-left, where the materials column was, clear of the objective panel and minimap. The alternative is just above the HP block, bottom-left, which is closer to the bar but crowds the corner.
5. **HP bar size.** "Much larger" could mean about 3× (144×12 fill), which in build mode rises above the build bar when the bar is wide. A smaller bar, about 96×10, would never need to move. **Proposal:** 144×12 with the rise rule. These are starting values in data either way.
6. **The normal fill colour.** Today the fill is `rust`, which already looks reddish, so "a red bar" below 25% would barely show. **Proposal:** normal fill `leaf`, a green, and `hit-red` below 25%.
7. **The armor icon.** **Proposal:** the shield icon replaces the light/heavy armor icon, and weight shows only in the inventory panel. The alternative tints the shield by weight.
