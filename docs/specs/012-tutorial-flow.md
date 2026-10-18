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

## Build notes
These choices were made in the overnight build, not by the spec. They're logged for Shaun to accept or overturn in the morning report.
- **Starts.** There are three. The real game (no flag) is the tutorial start in the clearing. `?playtest` gives the boosted inventory, the tube, attuned, with gates open. `?start=hall` is the old sandbox start (hall, 30 arrows, tube in hand, gates open), which the sim's unit tests and most e2e specs use. `?start=hall&attuned` adds attunement for tests that craft bombs and ley bolts.
- **The spread objective needs one stager.** The prototype has one Warden, which drops one warden core, and a stager costs one, so the objective is one gravity stager facing the socket. Its text reads "Build a spread with a gravity stager".
- **The last objective** ("Head back out") only starts its 600-tick clock once every other objective is done. Otherwise it would complete during the shrine fight.
- **Objectives update on the next tick.** Crafts land between ticks, so a craft objective completes on the tick after the craft.
- **Gathering** counts each raw as harvested from a node at least once.
- **Gated doors** are solid to the player while shut: rubble on the foundry door, a ley barrier on the shrine door. Both fade out when they open.
- **Drops** never land inside the pylon or the tube stone. Before this they could be unreachable.
- **Layout.** The clearing is 24×18. Its door joins the ruin hall's bottom wall at (20,29), and the tube stone is at (12,11).
- **Waking after a KO.** Until the foundry gate opens, a KO wakes the player in the clearing, not the sealed foundry, so they can't be attuned before reaching it. From then on they wake in the foundry, as 011 says. Nothing is banked before the first trip home, so a KO in the first fight loses what was gathered (the death rule).
- **Prompts.** Each prompt shows within 64 px, dimmed, and at full strength once its key would work. The C (craft) prompt floats over the player anywhere. The B (build) prompt floats over the player only in the foundry. "Fill the tube from your line" prompts E over the nearest hopper. No objective uses the stash, so it never gets a prompt.
- **The objective line** sits on a dark band so it reads over doors and barriers, and fades in as it moves on.
- **Gates.** Doors carry `gate: GateId` (the spec named it `sealedBy`). Each gate's opening condition lives in `src/sim/tutorial.ts`.
- **"Build an ammo line into the tube socket"** completes when a socket is placed, and the last objective's "line running" only checks that a socket exists. "Fill the tube" checks the actual flow.

