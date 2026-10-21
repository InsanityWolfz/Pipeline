# 048: Volley shape
status: done

Approved by Shaun in chat, 2026-10-20 ("Start 48/49"), taken as approval on draft: the build follows the proposals in the open questions.

From Shaun's playtest note 5 (docs/brainstorm/2026-10-20-playtest-notes.md): "When the tube has multiple ammo in it 2 should shoot at two different angles and three should shoot in like a middle and two on each side not just two or three things in succession." Interview answers: docs/brainstorm/2026-10-20-playtest-interview.md, "Next batch: 048".

## Goal
Every fed entrance fires down its own lane of a fan, whatever its ammo, so a mixed volley reads as one spread instead of shots one after another.

## Design references
- docs/design.md: "The Foundry" (the factory's layout shapes every shot).
- Specs: 024 (spread from the intake: same-family rounds fan, mixed families fly straight), 028 (each entrance fires at its own rate; the volley before carried rounds), 029 (ammo roles), 047 (left click fires the volley).

## Acceptance criteria
**Lanes**
- [x] Each entrance owns a fixed lane, ordered west to east: west fires left of the cursor, centre fires at it, east fires right (Shaun: "entrance = lane").
- [x] Lanes are 15° apart (`SPREAD_STEP`, Shaun).
- [x] Every ammo family fans, mixed or not. 024's rule that only same-family rounds fan, and mixed families fly straight at the cursor, is replaced.

**Timing**
- [x] Each entrance keeps its own fire rate (028). When two or more entrances are ready on the same tick, they fire together, each down its lane (Shaun: "together, each keeps its rate").

**Bombs**
- [x] A bomb lands at the cursor's distance, rotated to its lane's angle, so a bomb volley lands on an arc around the aim point (Shaun). This replaces 024's side-by-side line.

**Readability**
- [ ] The build-mode spread preview and the tube slot's volley display show the lanes as they will fire. (The tube slot lists the rounds in lane order; there is no build-mode spread preview to change: 048.3.)

## Data changes
- `src/data/foundry.ts`: `SPREAD_STEP` stays 15; each entrance's lane index.

## Out of scope
- Fire rates, damage and ranges; carried rounds (they fire singly at the cursor, as 047 built).
- More than three entrances.

## Test plan
- Vitest: the lane angles for one, two and three fed entrances; mixed families fan; entrances at different rates fire on their own beats and together when they line up; bombs land on the arc; determinism.
- `npm run measure` re-run and recorded (packs and the Bulwark), not tuned.
- Playwright: a mixed arrow and bomb volley in the sandbox shows the fan in `getState()`.
- Screenshots: a three-lane mixed volley, a bomb arc.

## Open questions
- **048.1 Which lanes fire when not every entrance is fed?** Fixed lanes mean a lone fed west entrance would fire 15° left of the cursor and miss what you aim at. Proposal: the fed entrances fan symmetrically around the cursor in west-to-east order: one fed fires at the cursor, two fire 7.5° either side, three fire left, centre and right. The order still follows the entrances, so where you build each line still decides its side.
- **048.2 Arrows and the fan's centre at close range.** Proposal: lanes start at the tube's muzzle, so close targets can sit between lanes; no change to that.

## Raised after the build
Built on `claude/048-volley-shape` (plan: docs/plans/048-volley-shape.md). 048.1 and 048.2 are built as proposed: the fed entrances fan symmetrically about the cursor in west-to-east lane order (one at the cursor, two at ±7.5°, three at −15°, 0°, +15°), and lanes start at the tube's muzzle. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **048.3 The build-mode spread preview.** The game has no build-mode spread preview, so there was nothing to change; drawing a new one would be new design. Built: the tube slot (shown in build mode too, above the build bar) lists the fed rounds left to right in lane order, so its left unit fires left of the cursor and its right unit right, and `getState().intake.lanes` gives each fed entrance's lane beside `intake.volley`. Proposal: keep; a drawn fan preview at the intake would be a new spec.
- **048.4 docs/design.md.** "The Foundry" still says "two bomb lines lob two bombs side by side". Proposal, on Shaun's OK: "every fed entrance fires down its own lane of one fan, whatever its ammo; bombs land on an arc at the cursor's distance (048)". **Answered (Shaun, 2026-10-21):** approved; design.md "The Foundry" now says every fed entrance fires down its own lane of one fan, whatever its ammo, and bombs land on an arc at the cursor's distance (marked "Changed 2026-10-21, Shaun, spec 048").
- **048.5 Which entrances count as fed.** An entrance is fed while it's open and holds a round, whether or not it's ready to fire this tick, so an entrance firing on its own beat always uses the same lane. When one runs dry the others re-fan (three fed at ±15° become two at ±7.5°) until it refills. Proposal: keep (it's 048.1's rule applied as written).
- **048.6 Landmines.** Lobbed like bombs, they take lanes too and land on the arc. 024's `LOB_SPACING` (side by side) is removed, since nothing uses it. Proposal: keep.
- **Review shots (a note, no question).** For the 024/04 retake, spread.spec.ts now walks out to the hall itself (`toHall`, then a few steps south of its door so the dome doesn't stop the left lane's arrow), waits for the camera (`cameraSettled`) and plays out the door's fade and the schematic banner (046's `quietScreen`) before firing, so the shot isn't covered by 046's fade or banner; `fireVolley` gained `there` to skip its own walk. The 024/04 and 044/06 retakes also show HUD changes from specs merged since (047's bars); those aren't 048 changes.
- **048.7 Measurements (recorded, not tuned).** `npm run measure` after the build, against 047:

  | Measurement | Target | 047 | 048 |
  | --- | --- | --- | --- |
  | Ammo, line / still | arrow / mine fastest on every seed | 5/5, 5/5 (met) | 5/5, 5/5 (met) |
  | Ring 1 pack, seeds 1–5 | ≤ 15 s, no KO | 2.2–2.9 s (met) | 2.2–2.9 s (met) |
  | Ring 2 pack, seeds 1–5 | ≤ 15 s, no KO | 2.8–4.2 s (met) | 2.8–4.2 s (met) |
  | Ring 3 pack, seeds 1–5 | 8–18 s, no KO | 10.2–17.6 s (met) | 3/5 in band, 10.3–21.8 s (missed) |
  | Bulwark, decent build, seeds 1–20 | ≥ 15/20 meet all three; ≤ 2 KOs | 13/20, 3 KOs (missed, 043.2) | 10/20, 6 KOs (missed) |
  | Bulwark, naive bot | KO'd every seed | 5/5 (met) | 5/5 (met) |

  The decent Bulwark build feeds an arrow line and a bomb line. Before 048 both flew at the cursor; now they take the two lanes 7.5° either side of it, and 041.7's bot still aims at the Bulwark's middle, so at its 100 px circle each round lands about 13 px off. The pack bot turns its aim so a straight round's lane is on the target (as it did for 024's two-arrow fan), so its bombs land off to the side. Question for Shaun at playtest: is a mixed volley that can't put every round on one target the trade he wants (proposal: yes, it's the spread he asked for; the bots stay as they are), or should the Bulwark bot learn to aim like the pack bot? Either way balance is judged at playtest.

  **Answered (Shaun, 2026-10-21):** "Keep it, judge at playtest." The mixed volley that can't put every round on one target is the trade; the bots stay as they are, and balance is judged at playtest.

## Shaun's playtest (2026-10-21)
- "048 preview looks great", then "merge 38". 048.3, 048.5 and 048.6 stand as built; 048.4 and 048.7 were answered earlier.
