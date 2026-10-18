# 011: Death
status: approved

Approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18). He reviews it in the morning report.

## Goal
When the player's health hits 0, a short death animation plays and they wake in the foundry. They lose everything they picked up, harvested, crafted or withdrew since they last banked it. Walking into the foundry banks everything carried, and so does a pylon deposit. Unclaimed rooms reset. The factory, the tube and its reservoir, the stash, claims, and identified or equipped armor are always kept.

## Design references
- docs/design.md: "Death and tension" (sent back to the foundry, lose everything picked up since your last return home or pylon deposit; the factory, tube, identified armor and blueprints are always kept), "World" (pylons are deposit points), "Pillars" 7 (no nagging)
- docs/prototype.md: "Player flow" beat 10 (a death sends them home and drops their haul), "Crude animations" (player death)
- Interview decisions (Shaun, 2026-10-18):
  - Entering the foundry banks the haul, as does a pylon deposit.
  - Everything un-banked is lost: raws, parts, cores, hand-crafted ammo and unidentified armor.
  - Respawn is in the foundry. Unclaimed rooms reset.

## Acceptance criteria

**Banking (sim)**
- [ ] The sim keeps a `banked` snapshot: item counts plus the ids of unidentified armor pieces. Entering the foundry room, by door or travel, or depositing at a pylon, sets it to what the player holds right then and records a bank event. The game's start counts as banked.
- [ ] After a deposit the inventory is empty, so the banked snapshot is empty too. Anything in the stash is safe.

**KO (sim)**
- [ ] When health reaches 0, the player enters a 60-tick `dying` state. They take no input and can't be hit, the death animation plays, and enemies lose them as a target.
- [ ] Then the KO resolves:
  - **Inventory:** for each item, keep min(held, banked). Unidentified armor pieces stay only if their id is in the banked snapshot.
  - **Player:** goes to the foundry spawn at full health with velocity cleared, a fade, and a KO event.
  - **Unclaimed rooms:** enemies and nodes reset, ground items clear, and projectiles in flight clear.
  - **Kept:** claimed rooms stay empty. The foundry (pieces and items in flight), the link and reservoir, the stash, claims, crafted set, armor that's identified or equipped, and the `firstHuskDropped` flag all stay. A playtest start doesn't change these rules.
  - **The new bank:** the result becomes the banked snapshot.
- [ ] A lost-items summary is recorded in the KO event (item → count lost).

**Render, art**
- [ ] A player death animation, about 4 frames per view, falls and dissolves into ley motes. After the fade, a centred line "You wake in the foundry", then a short list of what was lost, shows for 3 s.
- [ ] A small "banked" swirl plays on the player when banking.

**Hook**
- [ ] `getState()` gains `banked`, the player's `dying` ticks, the KO's `lost`, and the bank events.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Existing KO tests are updated: the spawn is the foundry, and the inventory follows the banked rule. Sprites are pending review.

## Data changes
- `src/data/player.ts`: `DYING_TICKS = 60`, and the respawn room is the foundry.

## Out of scope
- Dropping a recoverable corpse pile, death penalties beyond the haul, and lives.

## Test plan
- **Vitest:**
  - Banking on foundry entry, on travel and on deposit.
  - KO keeps banked counts and loses newer pickups, harvests, crafts and withdraws.
  - Unidentified armor kept or lost by id, and identified or equipped armor always kept.
  - Unclaimed rooms reset and claimed rooms stay empty.
  - The foundry, reservoir and stash are unchanged.
  - The dying state has no input and no hits.
  - The lost summary is correct.
  - Determinism.
- **Playwright:** gather wood, die to Husks, wake in the foundry with the wood gone and the banked arrows kept.
- **Screenshots:** the death animation mid-frame and the wake-up text with the lost list.

## Open questions
- None. Every number is a starting value.
