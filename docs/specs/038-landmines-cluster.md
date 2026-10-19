# 038: Landmines and the cluster stage
status: approved

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); split out of 034 by the accepted proposal; text moved verbatim.

Split out of docs/specs/034-stonefall-hollows.md (034.13: "Split landmines and the cluster stage into their own backlog item? Proposal: yes, built after 034."). Everything under Goal, Acceptance criteria, Data changes, Hook, Art, Test plan and the interview lines below is 034's text, moved as written. The open questions at the end are new: they cover what the moved text leaves undecided, each with a proposed answer that the build follows until Shaun says otherwise.

## Goal
Ley-iron unlocks two things:
- landmines, which are shot onto the ground and explode after about 5 seconds
- the cluster stage, which makes a bomb burst into smaller explosions

## Design references
- docs/specs/034-stonefall-hollows.md: ley-iron (`ley-iron` items, seams, drops and the Cistern Terrace's ley-iron port), and its shield rule: "Lobbed bursts (bombs, cluster bomblets, landmines) are never blocked, even when they land on the front side."
- The ammo-stage spec (029): stage machines, tags, at most one element stage and one shape stage per round, and "hand-make one first" unlocks.
- Interview answers (Shaun, 2026-10-19):
  - Round 2, landmines: "good single-target damage on a delay. You shoot them onto the ground and they explode after about 5 s, with large damage in a small radius." They need metal and come after the 1st boss.
  - Round 2: a stage costs a small material input as ammo passes through (e.g. 1 stone per 4 arrows).
  - Round 3, milestone 2 includes cluster bombs ("smaller explosions around it after it bursts") and landmines. Each round takes at most one element stage and one shape stage.
  - Round 11, on the laser: "region 2 will just unlock metal for landmines and the ability to make the bombs into cluster bombs". The laser is parked.
- docs/brainstorm/2026-10-19-open-questions.md, "Shaun's decisions": "**H, 034.3 Shields:** lobbed rounds and mines always land." 034.1 keeps the names (the plate press, the mine packer and `iron-plate`); 034.9–034.12 are the chain, the rules, the cluster numbers and key 4 below.

## Acceptance criteria

Landmines and the cluster stage below are their own vertical slice: they are split into a separate backlog item, built after 034's region and boss and after 029.

**Landmines (data, sim)**
- [ ] New ammo `landmine`, a new kind `mine`:
  - It is lobbed to the aim like a bomb, with the same arc, speed and max range.
  - On landing it arms and stays on the ground, showing a fuse ring that fills over `fuseTicks` (starting 300, which is 5 s).
  - It then explodes: `damage` 60 in `radius` 24 px. That is large damage in a small radius (round 2), against a bomb's 15 in 48 px.
  - It ignores contact. Only the timer sets it off.
  - Its damage type is physical.
  - There is no cap on live mines.
  - Carried landmines take hotbar key 4 (`SLOT_AMMOS`; `AMMO_KEYS` has room for four).
- [ ] Several mines in a volley land side by side, `LOB_SPACING` apart (024).
- [ ] A mine's explosion is a lobbed burst, so shields never block it.
- [ ] Mines don't hurt the player.
- [ ] Mines left behind vanish when the player changes area or is KO'd.
- [ ] The chain, in round-2 style (starting amounts):
  - ley-iron into a **plate press** makes iron plates, 2 per ley-iron
  - 1 iron plate, 1 fuse (husk resin) and 1 ley shard go into a **mine packer**, which makes 2 landmines. It reuses the bomb chain's fuse and shard.
  - Hand-crafting each part once unlocks its machine, as today (005).
  - The recipes appear in the crafting menu once ley-iron has been picked up.

**The cluster stage (data, sim)**
- [ ] The **cluster** shape stage for bombs, built on the ammo-stage framework (029):
  - an in-line stage machine, the **Shard die**, that takes bombs in and puts bombs tagged `cluster` out
  - a stage cost of 1 ley-iron per 4 bombs (round 2)
  - unlocked by hand-applying it to a bomb at the bench once (round 4)
  - A bomb takes at most one shape stage (round 3).
- [ ] A cluster bomb bursts as a normal bomb. Then, `cluster.delayTicks` later (starting 12), `cluster.count` bomblets (starting 4) land evenly around the burst point at `cluster.distance` (starting 40 px). Each bursts for `cluster.damage` (starting 8) in `cluster.radius` (starting 20 px).
- [ ] Bomblets are lobbed bursts: shields don't block them.

**Art (render, data)**
- [ ] Also drawn:
  - the landmine, armed with its fuse ring, and its explosion
  - the bomblets
  - the new machines

**Hook**
- [ ] `getState()` reports:
  - armed mines, with their fuse
  - the event `mineBursts`

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/items.ts`: `iron-plate` (part), `landmine` (ammo), each with its 031 panel group.
- `src/data/ammo.ts`: `landmine` (kind `mine`); the cluster block on the bomb's tag behaviour (029's tag table).
- `src/data/recipes.ts` and `src/data/pieces.ts`: the plate press and the mine packer with their recipes, and the Shard die (the cluster stage machine).
- Sounds: mine arm and burst.

## Out of scope
(034's, for this slice.) The laser, oil, the flamethrower, the static-pool bomb, and the lightning and fire runes (parked or later milestones, round 11).

## Test plan
- **Vitest:**
  - Landmines: they land at the aim, arm, and burst at 300 ticks for 60 within 24 px; contact doesn't set them off; a volley lands them side by side; they clear on an area change.
  - Cluster: tagged bombs throw 4 bomblets at 40 px after 12 ticks, and the stage cost is spent.
- **Playwright:**
  - Fire a landmine and a cluster bomb.
- **Screenshots:**
  - an armed mine
  - a cluster burst

## Open questions
The moved text leaves these undecided. Each has a proposed answer, and the build follows the proposal until Shaun says otherwise.

- **038.1 The new machines' sizes, speeds and place in the build bar?** Proposal: the plate press is 1×1 and makes a batch in 60 ticks (like the cutter); the mine packer is 3×1 and takes 90 ticks (like the bomb packer, which also joins three inputs); both sit in a new "Mines" group at the end of the build bar. The Shard die is a 029 stage: 1×1, batches of 4 in 60 ticks, in the Bombs group.
- **038.2 The cluster round's name, and when the Shard die's bench row shows?** Proposal: the tag's prefix is "Cluster", so the round is "Cluster bomb" (`bomb+cluster`). The Shard die's row joins the bench's Stages section with the other stages (029: once the shrine is claimed), dimmed until 4 bombs and a ley-iron are carried.
- **038.3 What counts as "ley-iron has been picked up"?** Proposal: ley-iron entering the inventory by a harvest or a ground pickup, or carried from the start (`?playtest`, `?start=hollows`). It's remembered for good (kept through a KO). Until then the crafting menu hides the Landmines group's header and both rows (iron plate, landmine), as it hides attunement recipes (012).
- **038.4 The crafting menu has no scroll and no room for a fourth group (026's known limit: 360 px tall).** Proposal: the menu lays its groups out in two columns side by side, each group's column in data: Arrows and Bombs on the left, Ley and Landmines on the right. Rows and headers are unchanged.
- **038.5 Do talents (037) reach landmines and bomblets?** Proposal: talents scoped to all ammo (Oiled Breech's fire rate, Hard Bore's damage) reach landmines; the bomb lane's (Black Powder, Wide Casing, Short Fuse) don't, since a landmine isn't a bomb. A cluster bomb is a bomb: its own burst takes every bomb talent, and its bomblets take the bomb's damage bonus and Wide Casing's radius bonus (20 px → 23 px), all through `playerStats`.
- **038.6 Does Blastfletch (037) charge ground from mines or bomblets?** Proposal: no. Blastfletch reads "a bomb's blast": a cluster bomb's own burst charges its ground as any bomb does; its bomblets and mines don't.
- **038.7 A landmine's fire rate?** Proposal: `fireTicks` 40, a bomb's.
- **038.8 What is "changes area"?** Proposal: any room change, through a door or by fast travel (a waystone or a pylon's "Travel to foundry", even from one overworld site to another): every armed mine vanishes, and so do mines still in flight.
- **038.9 Where do the bomblets land first, and how do they reach their spots?** Proposal: the first along the bomb's flight, the rest `360 / count` degrees apart (029's star split does the same). They fly out from the burst point over the delay on a short arc (render only) and burst together when the delay ends. They fly over everything, as lobs do.
- **038.10 Sounds the moved text doesn't list?** Proposal: the landmine fires with the bomb's launch sound; the bomblets burst with the bomb's burst sound, played quieter; the mine has its own arm and burst sounds as listed.
- **038.11 The landmine's and cluster bomb's looks?** Proposal: the landmine is a flat brass-rimmed iron disc with a cyan ley pip, lying flat on the ground once armed; its fuse ring is a thin cyan ring round it that fills clockwise and turns red over its last second. Its explosion is a tight bright flash with iron shards. A cluster bomb's icon is the bomb's with a badge of four small dots round a centre (029's badge style); a bomblet is a small dark pellet with a fuse glint. The Shard die is a brass die that stamps a pattern into the bomb's casing. Pending Shaun's approval by eye.
