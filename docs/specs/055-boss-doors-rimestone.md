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
