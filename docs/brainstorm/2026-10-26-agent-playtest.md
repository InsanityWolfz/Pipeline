# Agent playtest of main (061–066 merged)

Oct 26, 2026 · four AI "expert playtester" agents, at Shaun's request ("run some expert gaming playtesters in parallel to play the game from the beginning and have them report back any bugs or anything that bothers them or can be improved").

The four testers played the latest main (35e5b1d, before #79's fixes) through Playwright, each covering one stretch:
1. **The opening:** a New game.
2. **Stonefall Hollows and the Bulwark:** `?start=hollows`.
3. **The foundry, as a factory game:** `?playtest`.
4. **The late game:** the Emberworks and the Stormcrown, in `?sandbox`.

**Caveat.** The machine was heavily loaded, so the game ran at about 3 ticks a second in a real browser. Testers 1 and 4 drove most fights through `step()` with a scripted player that reacts after a delay and misses some telegraphs. So read their game feel as approximate; their numbers (HP, damage, clear times) are exact. Their screenshots were in the session scratchpad and are not kept.

Already fixed from this round: Shaun's two bugs, plus tester 2's exact repro of the KO camera bug (InsanityWolfz/Pipeline#79). Opening the inventory or another big panel leaves build mode; a move key held through a KO is ignored until it's released; a door fade no longer breaks the KO fade's camera follow.

## Bugs (fix-track candidates), most important first

1. **Keep-distance enemies leash themselves back to full health** (tester 4).
   - The storm sentinel keeps 200–300 px from the player and the kiln-tender 160–240 px. Both drift past the aggro box's ±180 px vertically.
   - After the off-screen grace they walk home and heal to full: a sentinel went from 48 to 600 and a gale ram from 92 to 1,400.
   - Repro: in the sandbox, spawn a ring 5 sentinel, shoot it to about 37%, then step 2 tiles north.
2. **The bottom HUD hides enemies and mines south of the player** (testers 2 and 4).
   - The five-slot tube gauge and the big ammo card sit about 100 world px below the player.
   - A sentinel parked 182 px south calls strikes from under the HUD, and landmines lobbed south land hidden.
3. **The boss bar covers both late bosses** (tester 4).
   - The Forgewright's fan distance puts it under the bar when you come from the south.
   - The Crown Spire's north rods and the Conductor standing at them sit under it too.
4. **The intake hover never shows the fifth entrance** (tester 3). `MAX_LINES` in `src/render/HoverReadout.ts` is 4 (the largest recipe + 1); the intake has 5 rows.
5. **Arrow assemblers run at about half speed, invisibly** (tester 3).
   - `OUTPUT_CAP` is 8, the same as the arrow batch, so a craft can't start until all 8 arrows have left.
   - That gives about 2.3 arrows a second against a 4 a second fire rate, and the hover still says "working".
6. **A guarded pylon shows an E prompt that does nothing** (tester 1). `interactTarget` (`src/sim/interactables.ts`) ignores `occupied`. Show "Guards remain (N)" instead.
7. **The guaranteed first armor can be lost for good** (tester 1, likely).
   - `firstHuskDropped` stays true after a KO before the foundry, so the drop never comes back.
   - Then the "Identify your armor" goal has nothing to identify.
8. **UI overlaps:**
   - The objective banner eats build clicks under it (tester 3).
   - The crafting panel covers the objective banner (tester 1).
   - A new objective briefly shows a tick (tester 1).
9. **Build mode:**
   - A conduit drag past the screen edge is cut short with no dead-end marker (tester 3).
   - The controls strip shows place and drag hints while the Area tool or a blueprint is held (tester 3).
10. **Hit particles hide a vented Forgewright** (tester 4): you can't see the stagger or the core glow.
11. **Smaller ones:**
    - A same-frame right-click doesn't fire a carried landmine.
    - An entrance cap's prompt needs you flush to the wall.
    - In the sandbox, talents raise max HP but not current HP.
12. **Test starts only:**
    - `?playtest` and `?start=hollows` show a stale "Gather wood, stone and fiber" goal.
    - `?playtest` has no claims, so no supply ports, and the crafting menu hides tagged and tier rows.

## Balance and design calls for Shaun

1. **The Bulwark is far tougher than its spec** (tester 2).
   - It has 3,800 HP. Spec 034 says 900 for a 30–45 s fight; 041 retuned it.
   - With one open entrance, a cluster-bomb line did about 550 damage in 90 s; the tester couldn't kill it in two tries.
   - `npm run measure` already records the Bulwark's decent build at 12/20 seeds.
2. **You can't run from the Bulwark** (tester 2). The forum's door seals (055), while design.md and 034 say running away is always allowed.
3. **Ring 5 is binary** (tester 4).
   - With Lightning chains, clumped ring 5 packs die in 6–12 s before they attack.
   - Without chains, any misread is a one-shot: a sentinel strike of 240 against 115 HP.
   - Tester 4's idea: cap any single hit at about 60–70% of a sensible late-game max HP, and spread pack spawns so chains aren't free.
4. **Late bosses don't press the player** (tester 4).
   - The Forgewright vents about every 8 s, and each vent resets heat, so the Forge Flood never happens (heat never passed 3%).
   - The Conductor falls in 27 s with homing bolts. Breaking rods is slower than ignoring them, because he has no plating and stands still between blinks.
5. **The opening loses its "I did it by hand" moment** (tester 1).
   - The example line is pre-built, so the player only waits.
   - It runs dry before the shrine with no warning; the refill goal shows only after fast travel.
   - A KO before the foundry wipes everything and resets every node and Husk.
6. **Walking** (tester 2): foundry → Bulwark is about 100 s, and a KO means the whole walk again. A return point near the forum would help.
7. **"Melee" on the ammo card** (testers 1 and 2): it shows even when carried rounds will fire on right-click.
8. **Off-screen threats** (testers 2 and 4): Snipers and sentinels hit from off-screen. An edge marker, or a cap on firing from off-screen, would help.
9. **Ring 4 keep-distance enemies outrange bombs** (tester 4): a stone build couldn't finish a lone kiln-tender in 80 s, since bombs reach 192 px against its 160–240 px band.

## Quality of life (factory and handling)

- **Numbers:**
  - recipe cards in tooltips ("1 wood → 2 shafts · 1.0 s");
  - items a minute on machine hovers;
  - supply against fire rate on each intake entrance (this would expose bug 5).
- **Build camera:** zoom out or pan, with auto-scroll while dragging.
- **Building tools:** a pipette (copy the hovered piece and its facing), and copy and paste from the Area tool without saving.
- **Moving items:**
  - hopper insert amounts (Ctrl-click currently sends a whole stack);
  - area pick-up to the inventory instead of the stash;
  - a "purge lane" on each entrance (adding a stage to a running line jams it until 30 plain rounds are fired);
  - a splitter filter or priority.
- **Hand work:** hold E to harvest a node, and craft the most you can, or a whole chain, in one click.
- **Readability:**
  - only one tree in a grove is harvestable;
  - the ruin field's flagstones look like debug squares;
  - the player vanishes behind tall props (no silhouette);
  - hoppers' item picker needs names;
  - hover panels cover the hovered machine.

## What felt good

- **Readability:** telegraphs read instantly throughout (Husk and Warden wind-ups, Bulwark bomb rings, hawk dive lanes, storm-call circles, the hound's lane and trail). Lightning arcs look great.
- **The foundry:**
  - Conduit drag-to-bend and carried facing.
  - Underground belts paired and crossed a conduit on the first try.
  - The tier chain gave stormsteel arrows on the first try.
  - Blueprints work as specced: auto-names, turn and mirror, red tiles skipped, the ghost stays for repeat stamps.
  - The five-lane mixed fan outside is "very satisfying".
- **The Forgewright's fan puzzle** clicks; venting it feels earned.
- **The Hollows' look**, landmark discovery, the gear bench's "Identify all", and claiming the shrine all feel like rewards.
- **Small touches:** the punch is viable with no ammo, and the hand-craft ratios feel generous.
