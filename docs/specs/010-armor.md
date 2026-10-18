# 010: Armor
status: approved

Approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18). He reviews it in the morning report.

## Goal
Enemies drop unidentified armor. The first Husk ever killed always drops a piece. At the identification bench in the foundry, E identifies every piece the player carries for free, rolling it as light or heavy armor. The bench menu equips one piece in the single body slot. Armor blocks a flat amount from every hit, and heavy armor slows the walk.

## Design references
- docs/design.md: "Combat" ("Defense comes from found armor": heavy blocks more but slows you, light blocks less but keeps you fast, and heavy never makes dodging impossible; "Simple stats": armor), "Pillars" 5–6 (combat earns armor; the factory never makes defense), "The Foundry" ("Identification": stats roll at the foundry, and armor can't be equipped until then)
- docs/prototype.md: "Player flow" beats 3 and 7, "Content list" (one unidentified piece from the first fight; "Identification bench")
- Interview decisions (Shaun, 2026-10-18):
  - Identification is free.
  - Armor is a flat block. Light rolls 2–4 at full speed, and heavy rolls 5–8 at 85% walk speed with the roll unchanged.
  - There's one body slot.
  - The first Husk kill always drops a piece. After that, Husks drop one 10% of the time, Wisps 15%, and the Warden always.
  - Equipping and swapping happen in the bench menu.

## Acceptance criteria

**Armor items (sim, data)**
- [ ] Armor pieces are their own list in the sim, separate from the item-count inventory, because each piece has its own stats. A piece has an id, `identified`, and once identified a `weight` (`light` or `heavy`), an `armor` value and a name.
- [ ] An unidentified piece drops as a ground item and is picked up like any item into `armorPieces`. Its HUD icon is a wrapped bundle.
- [ ] Drops: the first Husk death ever (tracked in state, kept through a KO) always drops one. After that it's a 10% chance per Husk, 15% per Wisp, and the Warden always drops one. Rolls come from the seeded RNG.

**Identification bench (sim, render)**
- [ ] A fixed solid piece `identification-bench` stands in the foundry, its tile set in /plan. It's there from the start, like the stash.
- [ ] E at the bench opens its menu:
  - "Identify all" (shown while any piece is unidentified) rolls every carried unidentified piece. It's 50/50 light or heavy, then light rolls an armor value of 2–4 and heavy 5–8, with a generated name like "Worn Husk-hide Vest" or "Heavy Ruin Plate" from word lists in data. It records identify events.
  - One row per identified piece shows its name, weight and armor, with the equipped one marked. Clicking it equips that piece, and the old one stays in the list. Clicking the equipped piece takes it off.

**Effects (sim)**
- [ ] With a piece equipped, each hit the player takes deals `max(1, damage − armor)`. That covers swipes, orbs and slams.
- [ ] Heavy armor multiplies walk speed by 0.85. The roll's distance and i-frames are unchanged.

**Pylon deposit**
- [ ] Depositing at a pylon (009) also sends unidentified armor to the stash, and the stash menu shows it.

**Render, art**
- [ ] Sprites:
  - the unidentified bundle icon and ground item
  - light and heavy icons
  - the bench (rune table with a glowing lens) with a working pulse
  - an identify flash
  - the player's body tinted or trimmed for light and heavy (overlay frames per view)
- [ ] The HUD shows the equipped armor's icon and value next to the health bar.

**Hook**
- [ ] `getState()` gains `armorPieces`, `equippedArmor`, `firstHuskDropped`, and the identify and equip events. A new `equip` command (piece id or null) works through the hook.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The sprites are pending Shaun's review.

## Data changes
- `src/data/armor.ts` (new): the weight table (armor range, speed multiplier), name word lists, and the drop chances per enemy.
- `src/data/pieces.ts`: fixed piece `identification-bench`.

## Out of scope
- More slots, other stats on armor, selling armor, and losing armor on death (011 handles unidentified armor).

## Test plan
- **Vitest:**
  - The first Husk drop is guaranteed and kept through a KO, and later drop rates come from the seeded RNG.
  - Pick-up.
  - Identify rolls fall in range and are deterministic per seed.
  - Equip, swap and unequip.
  - The damage formula, including the minimum of 1.
  - Heavy walk speed, with the roll unchanged.
  - Deposit sends unidentified pieces to the stash.
- **Playwright:** kill a Husk, pick up the bundle, walk to the bench, identify, equip, and get hit for reduced damage.
- **Screenshots:** the bundle on the ground, the bench menu, and the HUD armor readout.

## Open questions
- None. Every number is a starting value.

## Build notes
These choices were made in the overnight build, not by the spec. They're logged for Shaun to accept or overturn in the morning report.
- **Unidentified armor is a carried item.** Pieces are carried as a count of `unidentified-armor` (item kind `armor`), not as entries in a list with `identified: false`. Unidentified pieces are all alike, so a count is enough, and pickups, the pylon deposit, the stash and 011's banking all treat it like any other item. Identified pieces are a list. `getState()` names them as the spec does: `armorPieces` (each `identified: true`) and `equippedArmor`.
- **The bench is a fixture.** It's in `FIXTURES` (`src/data/claims.ts`), like 009's stash, rather than in `src/data/pieces.ts`. It sits at foundry tile (1,12).
- **Bench menu rows:** each piece row shows "name weight armor", and the worn one adds "worn". The identify row reads "Identify all (n)". This added a 3×5 letter font (`hud-letters`), which the pylon and stash menus now use too.
- **Body tint:** the body is tinted below the head (moss for light, slate for heavy) rather than drawn with overlay frames per view, which the spec's "tinted or trimmed" allows. The identify flash is the bench's lens flaring.
- **Light or heavy:** each roll is 50/50 (`HEAVY_CHANCE`).
- **`?playtest`** carries 3 unidentified pieces.

