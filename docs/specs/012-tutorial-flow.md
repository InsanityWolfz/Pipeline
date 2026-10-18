# 012: Tutorial flow
status: approved

Approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18). He reviews it in the morning report.

## Goal
The prototype plays end to end as the new player experience in docs/prototype.md. The player wakes in a new clearing with nothing and picks up the dormant tube. They gather, craft arrows and fight the hall's Husks, which unseals the foundry, where the tube attunes. They try the beginner ammo, build their first line, identify armor, then clear and claim the shrine. They build a spread and head back out. One objective line and floating key prompts guide each beat. The final art pass moved to 014.

## Design references
- docs/prototype.md: "Goal", "Player flow" beats 1–10, "Questions the prototype must answer"
- docs/design.md: "Opening: first 30 minutes", "Pillars" 1–2
- Interview decisions (Shaun, 2026-10-18):
  - The game opens in a new clearing room, with the tube lying on a stone.
  - Soft gates:
    - The foundry is sealed until the hall's Husk pack is dead.
    - Bomb and ley bolt recipes appear after attunement.
    - The shrine door opens once the first line has filled the reservoir.
  - One objective line plus key prompts guide the player.
  - No mystery-hook text for now.

## Acceptance criteria

**The clearing and the tube (data, sim)**
- [ ] New room `clearing`, about 24×18, with trees, reeds, rubble and a ley vein, and a door to the ruin hall's bottom or left wall (tile chosen in /plan). The player now spawns here. The default start is empty: no arrows.
- [ ] The tube lies on a stone in the clearing. Until the player picks it up (E within reach), they have no tube: fire and select do nothing, and the HUD slot is hidden. Picking it up records an event and shows the dormant tube held. `hasTube` is kept through a KO.

**Gates (sim)**
- [ ] The hall's foundry door is blocked by rubble, a solid sealed door, until every enemy that started in the hall is dead at once. Then it opens for good, with an event and a crumble effect. It never re-seals after a KO.
- [ ] Recipes have a `requires` flag in data. Arrow, shaft, arrowhead and rope recipes are known from the start. Bomb, ley bolt and their parts need `attuned`. The crafting menu only lists known recipes.
- [ ] The hall's shrine door is sealed by a ley barrier until the reservoir has first held 30 rounds (a `firstLineFull` flag). Then it opens for good.
- [ ] `?playtest` skips every gate: it starts with the tube, attuned, all gates open, plus 007's boosted inventory.

**Objectives (data, sim, render)**
- [ ] An ordered list of objectives in data, each with text and a completion check over sim state:
  1. "Pick up the tube (E)"
  2. "Gather wood, stone and fiber (E)"
  3. "Craft arrows (C)"
  4. "Defeat the Husks"
  5. "Enter the foundry"
  6. "Craft a bomb and a ley bolt (C)"
  7. "Build an ammo line into the tube socket (B)"
  8. "Fill the tube from your line"
  9. "Identify your armor at the bench (E)"
  10. "Claim the shrine's pylon"
  11. "Build a spread with gravity stagers"
  12. "Head back out — the foundry keeps running"
- [ ] The current one shows as a single line at the top centre in the sprite font, with a small cyan tick and a fade when it advances.
- [ ] Objectives complete in any order. The line always shows the first unfinished one. The last clears after 10 s outside the foundry with the line running, and records `prototypeComplete`.
- [ ] Key prompts: a small floating key glyph ("E", "C", "B") over the nearest thing the current objective uses, while it's within 64 px. That covers the tube stone, nodes, the bench, the pylon, the stash and hoppers.

**Hook**
- [ ] `getState()` gains `hasTube`, `gates` (each open or closed), `objective` (index and text), `prototypeComplete`, and `firstLineFull`.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Existing e2e tests that assume the hall spawn or the starting arrows use `?playtest`, or a hook option, to start where they need to. The new sprites (clearing tiles, tube stone, rubble door, ley barrier, key prompts, objective tick) are pending review.

## Data changes
- `src/data/rooms.ts`: `clearing`, the hall door changes, and sealed-door data (`sealedBy`).
- `src/data/objectives.ts` (new).
- `src/data/recipes.ts`: `requires`.
- `src/data/player.ts`: the default start is empty, and the spawn is in `clearing`.

## Out of scope
- Story text and the mystery hook, the first boss, save and load, and menus beyond a pause screen.
- The art and sound polish pass (014).

## Test plan
- **Vitest:**
  - Without the tube: no fire.
  - The tube pick-up.
  - Each gate opening on its condition and staying open through a KO.
  - Recipe visibility before and after attunement.
  - The objective order and any-order completion.
  - `prototypeComplete`.
  - `?playtest` skips the gates.
- **Playwright:** a scripted full run with the hook. It walks every beat in order from a fresh start, with no `?playtest`, using hook steps and crafts, and checks each objective advances. That's the prototype's end-to-end test.
- **Screenshots:** the clearing with the tube, the objective line, a key prompt, the sealed and open foundry door, and the ley barrier.

## Open questions
- None. Objective wording is a first draft for Shaun to edit.
