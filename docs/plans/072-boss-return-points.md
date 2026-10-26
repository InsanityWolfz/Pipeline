# 072 plan: boss return points

Plan for docs/specs/072-boss-return-points.md on `claude/072-boss-return-points` (InsanityWolfz/Pipeline#86, from main).
Pre-approved by Shaun with the spec (2026-10-26).

Five vertical slices, each committed with `npm run check` green before the next. Each lists its tests first; the code
follows them.

## Findings that shape the plan
- **The doors** (src/data/arenas.ts `BOSS_ARENAS`): the Forum's is in its north wall (tiles 100–104, row 96, `leaveTo`
  102,94); the Anvil Hall's and the Crown Spire's are in their south walls (119–123 row 60, `leaveTo` 121,61; 111–115
  row 32, `leaveTo` 113,33). The road reaches the Forum from the north-east and the other two from the south-west.
  Each stone goes three tiles west of `leaveTo`, off the door's span and off the road, on floor in the overworld and in
  the sandbox's room (which holds the arenas at the same tiles): (99,94), (118,61), (110,33). Each has an `arrive` tile
  beside it on the side away from its door (built: one below put the Forum's arrival within the door's E reach, so E
  there entered the arena; now (99,93), (118,62), (110,34)).
- **Fast travel today** (src/sim/claims.ts): the foundry's waystone (a fixture, added by the shrine's claim) travels to
  `claimedPylons`; with exactly one it travels on E, with two or more render opens its menu (`cmd.travel` = site). A
  claimed pylon's menu (`cmd.pylon`) has only "Send inventory to stash" and "Travel to foundry". So:
  - a new `travelDestinations(state)` in claims.ts: the claimed pylons (in claim order), then the woken return stones
    (in wake order), each `{ id, name, roomId, tile }`. The waystone uses it in place of `claimedPylons` (its one-row
    rule counts destinations), and so does its menu in render;
  - the claimed pylon's menu gains a "Travel to Sunken Forum door" row per woken stone (`cmd.travel` = stone id with a
    claimed pylon in reach);
  - at a woken stone, E opens a one-row menu, "Travel to foundry" (`cmd.travel` = `'foundry'`), as the pylon's row does.
- **Banking**: travel lands with `travelTo`, whose `arrived` banks only in the foundry. So travel to a stone banks
  nothing (no deposit), and "Travel to foundry" from it banks on arrival as any way into the foundry does (011, 042).
  To raise.
- **The KO** (fix-keep-items-before-foundry): unchanged. The stones need the Hollows' barrier down, which needs the
  shrine's claim; `resetWorld` doesn't touch the woken list, so they stay woken through a KO and Continue (067's reset
  of unclaimed land is about enemies, not travel points). The Warden's shrine gets none (spec: three arenas).
- **Arena doors**: "E Leave (resets the fight)" is untouched; the stone is outside, so it never wakes from inside
  (an explicit `playerInside` check too, since a tile inside the wall is within the wake reach of the stone outside).
- **Solid**: the stone stands on its tile like an altar (`standingRects`), so it joins every room's bodies.
- **Waking**: a wake reach in data (80 px from the feet box, 2.5 tiles), larger than E's 20 px so walking out of
  the door past it wakes it (`leaveTo` is 72 px off). Once a tick after the player moves, in a room that holds stones,
  outside every arena, not in the sandbox (already woken). A `returnWakes` event; no XP (spec).
- **Spawning**: population.ts's `KEEP_OUT` rects gain one per stone, its tile grown by `packMargin` tiles (data, 5).
  This changes the candidate tiles, so seeded pack positions move; tests that assumed one are checked.
- **The sandbox**: its start lists all three as woken (a new `StartDef.returnStones`). The sandbox is its own world
  with no way to the foundry, so E at a stone there does nothing. To raise.
- **Save**: `SimState.returnStones` (woken ids) and the `returnWakes` event change the shape: `SAVE_VERSION` 23
  (22 is 069's). saveRun's late game wakes one so the item kind is in the fixture.
- **Sound**: the wake reuses the existing `reveal` chime (033's diagram appearing) rather than a new recipe. To raise.

## Slice 1: the stones and waking (sim, data)
Tests first (tests/sim/returnStones.test.ts):
- data: three stones, one per boss arena, named "<arena> door"; each on walkable ground outside its arena's bounds in
  the overworld and the sandbox; `arrive` walkable; both reachable from the door's `leaveTo` (flood fill);
- the stone is solid (feet stop at it);
- dormant on a new game; walking within the wake reach outside wakes it, once (event), and it stays woken through a KO
  and a snapshot/restore; standing inside the arena by the wall nearest it never wakes it; another room never does;
- the sandbox starts with all three woken; a save never carries the sandbox's start (as now).
Code: src/data/returnStones.ts; `Room.returnStones` from overworldGen and sandboxRoom; standingRects; state field,
StartDef field, events; src/sim/returnStones.ts `stepReturnWake`; summary (`returnStones` in hollowsSummary);
SAVE_VERSION 23 and saveShape.json.

## Slice 2: travel (sim)
Tests first:
- `travelDestinations`: claimed pylons then woken stones; a dormant one isn't listed;
- the waystone: one claimed pylon and one woken stone opens the menu (E travels nowhere); `travel` = the stone's id
  lands on its `arrive` tile, banks nothing;
- a claimed pylon's `travel` = a woken stone's id goes there; a dormant stone's id, or away from the pylon, does nothing;
- at a woken stone, E is taken (no harvest) and `travel` = 'foundry' lands in the foundry and banks; a dormant stone
  takes no E and travels nowhere; out of reach, nothing; in the sandbox, nothing;
- the interact target: a woken stone has the `return-stone` prompt; a dormant one and the sandbox's have none;
- replays identically.
Code: claims.ts (`travelDestinations`, the waystone's travel), returnStones.ts (`stepReturnStones`), step.ts, input.ts
doc, INTERACT_KINDS and its prompt, interactables.ts.

## Slice 3: the spawn margin (sim, data)
Tests first: no pack-ground tile within `packMargin` of a stone; a populated ring still has candidates; existing
population tests pass.
Code: `RETURN_STONE.packMargin`; KEEP_OUT.

## Slice 4: render
- Art (src/data/art/fixtures.ts): a dormant return stone (the waystone's ring, its middle dark stone, no glow), and the
  woken one as the waystone's own shimmer animation. Keys in foundryAssets.
- src/render/ReturnStoneView.ts: one sprite per stone in the shown room, dormant or woken; on a `returnWakes` event a
  short glow swell (a tween on the sprite's scale and a glow image's alpha) and the chime. Per frame it only sets
  frames and visibility.
- SiteMenus: the waystone's rows from `travelDestinations`; the pylon's rows plus a row per woken stone; the stone's
  one-row menu. `ui()` gains `pylonMenu` and `returnMenu` rows (as `waystone`).
- No hover line: the spec gives none (a pylon's and a cache's are their own specs').
Tests: tests/render for the menus' row models if they're pure; the prompt test covers the new kind.

## Slice 5: e2e and review shots
- tests/e2e/returnStones.spec.ts: `?start=hollows`, walk to the Forum's door: the stone wakes; KO; wake in the
  foundry; E at the waystone, its menu lists "Travel to Shrine" and "Travel to Sunken Forum door"; click it: standing by
  the stone outside the Forum.
- tests/e2e/returnStonesShots.spec.ts (REVIEW_SHOTS=1): docs/review/072/ a dormant stone, a woken one, the waystone's
  menu listing them (and the claimed pylon's menu).
