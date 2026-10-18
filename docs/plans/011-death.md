# Plan: 011 Death (docs/specs/011-death.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/011-death`, stacked on 010.

## Shape
- **Banking:**
  - `state.banked: Inventory` is a snapshot of carried counts. Unidentified armor is a counted item since 010, so the spec's "armor ids" collapse to its count.
  - The start sets it to the start inventory.
  - Entering the foundry (by door, travel or waystone) and a pylon deposit set it to the current inventory and record `banks`.
- **Dying:**
  - `checkKo` no longer resets at 0 health. It starts `player.dying = DYING_TICKS`.
  - While dying, the player takes no input or hits, and enemies treat them as gone: they don't aggro and leash home.
  - At 0, the KO resolves:
    1. `lost` is held minus min(held, banked) per item.
    2. The inventory becomes min(held, banked).
    3. `resetWorld` respawns the player in the foundry at full health. Rooms reset except claimed ones, as before.
    4. The inventory, link, foundry, stash, claims, crafted set, armor and `firstHuskDropped` all carry over.
    5. The banked snapshot becomes the kept inventory.
    6. The KO event carries `lost`.
- **The start inventory is no longer a KO refill.** The kept haul replaces it, so `?playtest` dies the same way.
  - This changes 007's behaviour, where a KO restored the boosted inventory.
  - Spec 011 is explicit that nothing comes back, so it wins.
  - Tests that relied on the restore are updated.

## Tests first
- **`tests/sim/death.test.ts`:**
  - Entering the foundry banks. A pylon deposit banks (to empty).
  - A KO keeps banked counts and loses later pickups, harvests, crafts, withdraws and unidentified armor.
  - Identified and equipped armor stays.
  - The respawn is in the foundry at full health.
  - Unclaimed rooms reset; claimed rooms stay empty.
  - The foundry's pieces and items in flight, the reservoir and the stash are unchanged.
  - Dying takes no input and no hits, and lasts `DYING_TICKS`.
  - The `lost` summary.
  - Determinism.
- **Existing KO tests:**
  - The spawn moves to the foundry.
  - The inventory follows the banked rule.
- **`tests/e2e/death.spec.ts`:** gather wood, get KO'd by Husks, wake in the foundry without the wood, with the banked arrows.

## Render
- **Death animation:** `player-death`, 4 frames, plays while dying.
- **Wake text:** `WakeView` shows the fade, then "You wake in the foundry" and the lost list for 3 s. That needs letter glyphs: a small 3×5 uppercase-and-space font `hud-letters`, so `GlyphLine` gets a letters mode.
- **Bank swirl:** a short ley swirl on the player when banking.
