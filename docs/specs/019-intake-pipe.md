# 019: Foundry intake pipe
status: done

Approved by Shaun, 2026-10-18 ("I approve all"), for an unattended run.

## Goal
The placeable tube socket is replaced by the foundry intake: a waterslide-sized cyan pipe with dark rings and brass bands, built into the centre of the foundry's north wall. Lines feed into its 3-tile mouth. It matches the tube you carry, so the link between them is obvious. Its rings show the reservoir filling, light runs up it with each item, and it stays dark until the tube attunes.

## Design references
- docs/design.md: "The Foundry" ("Each supply slot feeds one ammo line, and everything a line produces comes straight out of your tube"; "Five assembly lines set at five angles, feeding gravity stagers, fire a five-arrow spread"), "Combat" (the reservoir)
- docs/specs/007-tube-link.md: the socket, the reservoir (cap 30), refusing items when full
- docs/specs/008-spread.md: stagers facing the socket add streams
- docs/specs/016-art-direction.md: the carried tube's look, which the pipe matches
- Shaun's notes, 2026-10-18: "The foundry pipe that you feed into should be like a waterslide size pipe with rings that's cyan that matches the smaller version that you carry so it's obvious that the two are linked. The tube should just be on one side of the foundry wall and that's what you fill into."
- Shaun's interview answers, 2026-10-18:
  - a 3-tile mouth on the north wall, centred
  - a matching look
  - a pulse on each fill
  - a reservoir gauge
  - dormant until attuned

## Acceptance criteria

**The intake (data, sim)**
- [ ] The foundry room has a fixed intake fixture whose mouth is the 3 wall tiles at the centre of the north wall. Its position is data.
  - It can't be placed, picked up, moved or rotated.
  - The 3 floor tiles in front of the mouth stay buildable.
- [ ] Each mouth tile takes items from the floor tile directly south of it, from any piece whose front faces it (a conduit, sorter, stager or machine output). It never takes items from other sides.
- [ ] Every item entering any mouth tile fills the one reservoir, with today's rules:
  - It takes only the slot's ammo.
  - The cap is 30.
  - It refuses items when full, so the line backs up.
- [ ] Before the tube attunes, the intake refuses everything.
- [ ] **Streams:** every gravity stager whose front is a mouth tile adds a stream at its angle, so the spread caps at 3 streams. With no stager facing the mouth, a shot is a single projectile as today. Streams sort as today: nearest 0° first, then left before right.
- [ ] The `tube-socket` piece is removed: its data, its build-bar entry, its unlock on attuning, and the one-allowed limit. The attunement objective and prompts that named the socket now name the intake.
- [ ] `__GAME__.getState()` reports the intake's mouth tiles, the reservoir count, and the stream angles.

**The look (render, data)**
- [ ] The pipe is drawn in the 016 vector style and matches the carried tube:
  - the same cyan body, dark ring bands and brass collars
  - a highlight along its top
  - It rises from a wide flared mouth across the 3 tiles at floor level, up the wall face, and curves into the wall out of sight.
  - Each mouth tile has an inlet port in the flare.
- [ ] **Dormant:** before attuning, the pipe is grey-cyan with dark rings. On attuning, its rings light up one by one, in time with the tube's attune animation.
- [ ] **Gauge:** a column of rings on the pipe lights up in proportion to the reservoir (all lit at 30/30), readable from across the room. The hover readout still shows the exact count.
- [ ] **Pulse:** each item that enters sends a ring of light up the pipe into the wall.
- [ ] Build mode shows each mouth tile's input arrow, as other pieces' inputs show today. Each stager facing the mouth shows its spread fan.

**Tests unchanged in meaning**
- [ ] Every 007 and 008 reservoir, refill and spread test passes, rewritten for the fixed intake. The full tutorial run still reaches the first line beat, by building into the intake.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/rooms.ts` (or `foundry.ts`): the intake's fixed mouth tiles on the north wall.
- `src/data/pieces.ts`, `foundry.ts`, `foundryAssets.ts`: `tube-socket` is removed from the pieces, build bar, unlocks and limits.
- `src/data/art/`: the intake pipe, dormant and lit rings, gauge, pulse and inlet ports.
- `src/data/objectives.ts` and the prompts: the socket wording becomes the intake.

## Out of scope
- More than one reservoir or supply slot, and pipe upgrades past 3 streams.
- The rest of the foundry's vector pass (spec 020).
- Changes to the reservoir cap or the fire rate.

## Test plan
- **Vitest:**
  - Each mouth tile accepts only from its south tile.
  - Items fill the shared reservoir, refuse when full, and refuse before attuning.
  - Streams from stagers facing mouth tiles cap at 3 and sort correctly.
  - The socket piece is gone from the build data.
  - The intake can't be placed over, picked up or rotated.
- **Playwright:**
  - Attune, build a line into the middle mouth tile, and fire from the reservoir.
  - Three stagers fire a 3-way spread.
  - A full reservoir backs the line up.
- **Screenshots (qa):**
  - the pipe dormant, mid-attune and lit
  - the gauge at 0, 15 and 30
  - a pulse running up the pipe
  - build mode with input arrows and three spread fans

## Build notes
- **The intake is room data, not a piece.**
  - Its mouth is the north wall's tiles 11–13 (`INTAKE.mouth` in `src/data/foundry.ts`).
  - A mouth tile takes only from the tile directly south of it: a conduit, sorter (front or side exit), stager or machine output, never a hopper. Since the mouth sits in the wall, nothing can stand east or west of it to feed it from a side.
  - `refills` now names the mouth tile (0–2).
- **The socket's leftovers are gone:** the piece, its unlock, the generic piece `limit` (only the socket used it), its sprites and its readouts. The objective now asks for a line built into the intake: a piece whose front, or a sorter whose side exit, is a mouth tile.
- **The look.**
  - The pipe matches the carried tube: a cyan body, dark ring bands and brass collars.
  - Dormant, it is grey-cyan. When the tube attunes, its five bands light one by one over the attune time. The player only sees the dormant pipe during that second, because the first entry into the foundry attunes the tube.
  - A 10-ring gauge column lights with the reservoir, and a ring of light runs up the pipe per item. Lit parts are drawn additively and dark parts normally.
- **The extra wall above the foundry (an addition, see the open question).** The camera never showed above the foundry's top wall row, leaving the pipe a 32 px sliver hidden under the objective banner. Tiled rooms now show 48 px more wall above their top row (`ROOM_TOP_MARGIN`), and the camera may scroll that far, so the pipe visibly rises up the wall and turns into it. Layout, collision and the grid are unchanged.
- **The brazier at (12,0) is removed**, not moved: the pipe stands there, and every other wall spot is taken or too near the flare. The intake's own glow lights the centre instead.
- **Review.** All three blocking items are fixed:
  - dark rings are drawn with normal blending
  - render alphas moved to data
  - the extra wall is raised as an open question

  From the suggestions, these are in:
  - the build arrows draw over pieces
  - the pipe's upper part answers hover too
  - one shared anchor
  - a sorter's side exit counts as feeding
  - an objective test
  - stale comments fixed

- **From QA.** Everything passes in mechanism:
  - the mouth tiles, south-only feeding, the reservoir rules
  - streams capped at 3 and sorted
  - the socket's removal
  - the gauge at 0, 15 and 30
  - the hover readout
  - build arrows and fans
  - z-order

  Its visual findings:
  - The dark rings and unlit gauge rings looked bright, because QA ran on the build before the review fix. They now draw dark.
  - The fill pulse was faint; it is now a brighter, wider ring.

## Open questions
All answered by Shaun (2026-10-18) and built:
- **The attune isn't on screen.** *Answer:* pause the player when they walk in, make their gun glow, then pan to the pipe and show it glowing the same way. *Built:*
  - The first walk-in holds the player still for the whole attune (`ATTUNE` beats in `src/data/tube.ts`).
  - **Gun beat:** the tube's rings light one by one while a glow grows round it.
  - **Pans:** the camera pans to the pipe, its rings light and its glow grows the same way, and the camera pans back.
- **The objective banner covers the pipe's top.** *Answer:* put it on the right side of the screen. *Built:* it is right-aligned below the minimap.
- **The extra wall above the foundry.** *Answer:* the extra wall is fine. Kept.
