# 048: Volley shape
status: draft

From Shaun's playtest note 5 (docs/brainstorm/2026-10-20-playtest-notes.md): "When the tube has multiple ammo in it 2 should shoot at two different angles and three should shoot in like a middle and two on each side not just two or three things in succession." Interview answers: docs/brainstorm/2026-10-20-playtest-interview.md, "Next batch: 048".

## Goal
Every fed entrance fires down its own lane of a fan, whatever its ammo, so a mixed volley reads as one spread instead of shots one after another.

## Design references
- docs/design.md: "The Foundry" (the factory's layout shapes every shot).
- Specs: 024 (spread from the intake: same-family rounds fan, mixed families fly straight), 028 (each entrance fires at its own rate; the volley before carried rounds), 029 (ammo roles), 047 (left click fires the volley).

## Acceptance criteria
**Lanes**
- [ ] Each entrance owns a fixed lane, ordered west to east: west fires left of the cursor, centre fires at it, east fires right (Shaun: "entrance = lane").
- [ ] Lanes are 15° apart (`SPREAD_STEP`, Shaun).
- [ ] Every ammo family fans, mixed or not. 024's rule that only same-family rounds fan, and mixed families fly straight at the cursor, is replaced.

**Timing**
- [ ] Each entrance keeps its own fire rate (028). When two or more entrances are ready on the same tick, they fire together, each down its lane (Shaun: "together, each keeps its rate").

**Bombs**
- [ ] A bomb lands at the cursor's distance, rotated to its lane's angle, so a bomb volley lands on an arc around the aim point (Shaun). This replaces 024's side-by-side line.

**Readability**
- [ ] The build-mode spread preview and the tube slot's volley display show the lanes as they will fire.

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
