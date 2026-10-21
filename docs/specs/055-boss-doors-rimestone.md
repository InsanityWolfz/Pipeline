# 055: Boss doors and the rimestone pylon
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("approve 053-055"): the build follows the proposals in the open questions (053.1's design.md line included).

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, theme D: D.5, D.6) and his interview answers (docs/brainstorm/2026-10-21-world-combat-interview.md). Shaun: "Just put a door there, like, ooh, what's this? I'm going to go in. And then the boss is there and you can leave if you'd like."

## Goal
Both boss arenas have a real door: sealed until you're ready, E to go in, and locked inside like the Bulwark's fight. The Frozen Grotto gets a pylon that supplies rimestone.

## Design references
- Specs: 009 and 012 (the Warden, the shrine), 029 (the Frozen Grotto, rimestone), 032 (landmark pylons), 034 and 043 (the Sunken Forum, the arena lock), 053 (the round world places both arenas).

## Acceptance criteria
**Boss doors (D.5)**
- [ ] The Warden's arena is fully walled, with no gaps either side (Shaun found holes), and a big door.
- [ ] Each arena's door shows sealed, with a hint of what opens it, until its unlock: the shrine claim for the Warden, the Hollows barrier falling for the Bulwark (Shaun).
- [ ] Once unlocked, E at the door enters. Inside, the arena locks as the Bulwark's does today (043): E at the door leaves, and the fight resets.
- [ ] The Bulwark's arena gets the same door in place of today's open way in plus seal.

**Rimestone pylon (D.6)**
- [ ] The Frozen Grotto (029) gets a pylon to claim, guarded like other sites (032), that supplies rimestone through a foundry port at the usual rate (028) (Shaun).

## Out of scope
- Boss fights' own tuning; other sites.

## Test plan
- Vitest: the walls have no gap; the door's sealed state follows its unlock; E enters and leaves; the lock and reset; the Grotto pylon's claim and supply; determinism.
- Playwright: E into the Warden's arena once the shrine is claimed; leaving resets it.
- Screenshots: each door sealed and open, the Grotto pylon claimed.

## Open questions
- **055.1 The hint on a sealed door.** Proposal: a short line on hover: "Sealed: claim the shrine's pylon" for the Warden, "Sealed: break the Hollows barrier" for the Bulwark.
- **055.2 Built on 053.** Proposal: build 055 after 053, since 053 moves both arenas.

## Raised after the build
The build's own choices where the spec didn't decide, each with the conservative option built. One round. Plan: docs/plans/055-boss-doors-rimestone.md.

- **055.3 What unlocks the Warden's door, and its hint.** The shrine's pylon stands inside the Warden's arena, so its claim can't be what opens the door. The door opens with 012's shrine gate, as the old gap did (the first line fills the tube, so the tutorial runs as before), and its hover hint says what opens it: "Sealed: fill the tube from your line". 055.1 proposed "Sealed: claim the shrine's pylon"; if you'd rather have that wording, it's one line in `src/data/arenas.ts`. The Bulwark's door opens when the Hollows barrier falls, hint "Sealed: break the Hollows barrier" as proposed (in play the barrier keeps players away from that door until then).
- **055.4 The door stops shots.** The door is part of the wall, so straight shots don't pass it either way (lobbed bombs fly over walls, as everywhere). 043.3 let shots through the forum's seal; with a closed door there's no gap to shoot through.
- **055.5 Locked means a fight with the player inside.** 043's seal (the ley curtain over the door, its hum) shows while the boss fights the player inside. The Warden wakes on sight through its walls (017's rule), so a fight seen from outside doesn't lock anything. Leaving resets only the boss, as 043 does: the Warden's Wisps and Husks keep any damage.
- **055.6 Doors are always shut.** E goes in and E comes out, before and after the kill; nothing walks through an open door.
- **055.7 Kept as it was:** the dome over the shrine while its gate is shut (012), and the waypoint arrow, which still points at the pylon or the boss rather than the door.
- **055.8 New text:** an open door's hover line: "E to go in. E here again leaves, and the fight starts over."
- **055.9 Where E puts the player.** One tile off a door on its south side, two tiles off on its north side, so the door's sprite (taller than the walls) never hides the player.
- **055.10 The sandbox.** The forum's door in the sandbox's room is always open. The sandbox's own Warden arena (044, open on its north side) is unchanged.
- **055.11 The Grotto's pylon.** It stands between the two upper rime outcrops (all three in its safe zone). Its ley line runs east of the north road to the ruin's north edge (bearing 355°). The rimestone port is on the foundry's west wall below the resin port; its plate sits a tile into the room, clear of the wall corner. No new goal points at it.
- **055.12 The tutorial e2e.** Its bot still fights the Warden unaided and wins. Fought inside the shrine's walls, the fight can end before the example line has run dry, so after the claim the bot fires its tube at the open floor until the line runs dry (the goal chain then reads as before).

## Results (build)
