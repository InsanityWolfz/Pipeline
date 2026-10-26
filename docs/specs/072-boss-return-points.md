# 072: Boss return points
status: approved

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-26. The plan: docs/plans/072-boss-return-points.md.

Drafted from the Hollows playtester's findings (a KO at the Bulwark meant a 100 s walk back; docs/brainstorm/2026-10-26-agent-playtest.md) and the proposal Shaun approved.

## Goal
Retrying a boss is quick. Each boss arena gets a waystone just outside its door. It wakes when you first reach it, then joins fast travel, so a KO means foundry, fast travel, door.

## Design references
- docs/design.md: "Fast travel"; "Running away is always allowed"; "Death and tension".
- Specs 032 (the waystone menu), 034, 055, 060, 064 (the arenas and doors).

## Acceptance criteria
- [ ] A return waystone stands just outside each boss arena's door: the Sunken Forum, the Anvil Hall and the Crown Spire. Tiles go in data, on open ground reachable from the door.
- [ ] It is dormant until the player first walks within reach of it outside the arena. Then it wakes for good, with a glow and a sound, and records an event. It never wakes from inside the arena.
- [ ] A woken return waystone appears in fast travel's destinations: from the foundry's waystone and from every claimed pylon's menu, named after its arena ("Sunken Forum door").
  - It has no safe zone, no deposit and no supply.
  - E at it offers "Travel to foundry".
- [ ] Woken return waystones are saved. `SAVE_VERSION` goes up by one.
- [ ] Packs never spawn within a few tiles of a return waystone. The spawn rule's margin is in data.
- [ ] The sandbox shows all three woken.
- [ ] Review shots (docs/review/072): a dormant and a woken return waystone; the travel menu listing them.

## Out of scope
Respawning at a return waystone after a KO (you still wake in the foundry).

## Test plan
- Sim tests for: waking (outside only), the travel list, travel there and back, the save, the spawn margin.
- Playwright: wake the Forum's waystone, KO, travel back to it.
- Review shots.

## Decisions in this draft
- A return waystone is a travel point only. It isn't a claim: no safe zone, deposit or supply, and no XP for waking it.
- Packs are kept a small distance off it, so arriving isn't an ambush.
