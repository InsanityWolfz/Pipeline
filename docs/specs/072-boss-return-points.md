# 072: Boss return points
status: done

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-26. The plan: docs/plans/072-boss-return-points.md.

Drafted from the Hollows playtester's findings (a KO at the Bulwark meant a 100 s walk back; docs/brainstorm/2026-10-26-agent-playtest.md) and the proposal Shaun approved.

## Goal
Retrying a boss is quick. Each boss arena gets a waystone just outside its door. It wakes when you first reach it, then joins fast travel, so a KO means foundry, fast travel, door.

## Design references
- docs/design.md: "Fast travel"; "Running away is always allowed"; "Death and tension".
- Specs 032 (the waystone menu), 034, 055, 060, 064 (the arenas and doors).

## Acceptance criteria
- [x] A return waystone stands just outside each boss arena's door: the Sunken Forum, the Anvil Hall and the Crown Spire. Tiles go in data, on open ground reachable from the door.
- [x] It is dormant until the player first walks within reach of it outside the arena. Then it wakes for good, with a glow and a sound, and records an event. It never wakes from inside the arena.
- [x] A woken return waystone appears in fast travel's destinations: from the foundry's waystone and from every claimed pylon's menu, named after its arena ("Sunken Forum door").
  - It has no safe zone, no deposit and no supply.
  - E at it offers "Travel to foundry".
- [x] Woken return waystones are saved. `SAVE_VERSION` goes up by one.
- [x] Packs never spawn within a few tiles of a return waystone. The spawn rule's margin is in data.
- [x] The sandbox shows all three woken.
- [x] Review shots (docs/review/072): a dormant and a woken return waystone; the travel menu listing them.

## Out of scope
Respawning at a return waystone after a KO (you still wake in the foundry).

## Test plan
- Sim tests for: waking (outside only), the travel list, travel there and back, the save, the spawn margin.
- Playwright: wake the Forum's waystone, KO, travel back to it.
- Review shots.

## Decisions in this draft
- A return waystone is a travel point only. It isn't a claim: no safe zone, deposit or supply, and no XP for waking it.
- Packs are kept a small distance off it, so arriving isn't an ambush.

## Results
Built in five slices on `claude/072-boss-return-points` (docs/plans/072-boss-return-points.md). Every criterion
above is met. `SAVE_VERSION` is 23 (22 is 069's): the woken stones and their wake event are new saved fields.

- **The stones** (src/data/returnStones.ts): one per boss arena, three tiles west of its door's outside tile, on open
  floor off the road, in the overworld and in the sandbox's room at the same tiles; solid, like an altar. Named "Sunken
  Forum door", "Anvil Hall door", "Crown Spire door".
- **Waking** (src/sim/returnStones.ts): within 80 px (2.5 tiles) of the player's feet, from outside every arena, once;
  a `returnWakes` event, the woken look (the waystone's shimmer), a swell and the chime. Kept through a KO and saved.
- **Travel** (src/sim/claims.ts `travelDestinations`): the claimed pylons in claim order, then the woken stones in wake
  order. The foundry's waystone lists them all (its one-destination shortcut counts them too); every claimed pylon's
  menu gains a row per woken stone; E at a woken stone opens "Travel to foundry". Travel lands on the floor tile west of
  the stone and banks nothing there.
- **Spawning**: packs never spawn within 7 tiles (`RETURN_STONE.packMargin`) of a stone, every way.
- **The sandbox** starts with all three woken.
- **Tests**: tests/sim/returnStones.test.ts and returnTravel.test.ts (waking outside only, the travel list, travel
  there and back, the save, the spawn margin, the sandbox); tests/e2e/returnStones.spec.ts (wake the Forum's stone,
  KO, travel back from the waystone's menu, then home from the stone; the sandbox's three woken). Run locally one file
  at a time: returnStones, claiming, landmarks, bossDoors, arenaLock, sandbox, death, hollows, saving, exportImport and
  newGameAfterQuit all pass, and bossDoorsShots passes with REVIEW_SHOTS=1 (its old shots not retaken).
- **Review shots** in docs/review/072: the Forum's stone dormant (01) and woken (02); after a KO the foundry waystone's
  menu listing the Shrine and the Forum's door (03); the shrine pylon's menu with its Forum door row (04); and the
  stone's own menu (05).

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle. **Needs Shaun** marks the ones that want your call; the rest are the
conservative reading, already built.

Where they stand and how they wake:
- 072.1 Each stone stands three tiles west of its door's outside tile, off the door's span and the road, and is solid
  like an altar. Travel lands on the tile west of it: one below (a pylon's way) put the Forum's arrival in its door's
  E reach, and one above hid the player behind the stone.
- 072.2 It wakes within 2.5 tiles of the player's feet (data), wider than E's reach, so walking out of the door or up
  to it wakes it without touching it. Inside an arena never wakes it, even by the wall nearest it.
- 072.3 The wake's sound is the existing reveal chime (033's diagram appearing), not a new sound; its glow is the
  waystone's own shimmer, with a short swell as it wakes. No banner and no XP.

Travel:
- 072.4 Destinations are listed claimed pylons first (claim order), then woken stones (wake order), in the waystone's
  menu and in the pylon's rows. A stone's menu has only "Travel to foundry", as the spec says.
- 072.5 **Needs Shaun.** "Travel to foundry" from a stone arrives in the foundry, and arriving there banks the haul,
  as any way into the foundry does (011, 042). So a woken stone outside a boss door is, in effect, a way to bank after
  the fight without walking to a pylon. The stone itself has no deposit. Keep it, or make travel home from a stone
  not bank (it would then be the only foundry arrival that doesn't)?
- 072.6 Woken stones stay woken through a KO and Continue (the spec's "for good"); 067's KO reset is about unclaimed
  land's enemies, and stones aren't claims.

Spawning and the sandbox:
- 072.7 The spawn margin is a square, 7 tiles every way (data), matching a resource pylon's safe radius (5 let an
  arrival pull a fresh pack: a slammer's aggro is 5 tiles, a sniper's 10). It keeps packs from spawning there; a pack
  spawned elsewhere can still roam past, as it can past a pylon's edge. OK?
- 072.8 The sandbox's stones stand woken, but E there does nothing: the sandbox has no way to the foundry and back.

Not done (the spec doesn't ask):
- 072.9 **Needs Shaun.** No minimap icon and no hover line for the stones. Want one (a waystone icon once woken)?
