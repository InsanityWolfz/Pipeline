# 048 plan: Volley shape

Spec: docs/specs/048-volley-shape.md (approved on draft; the open questions' proposals are built, 048.1's symmetric fan
included).

## Approach
A volley's lanes come from the entrances that are fed (open and holding a round), not from which ones fire this tick
or which ammo they hold. The fed entrances, in their data lane order (west to east), take lanes fanned symmetrically
about the cursor, `SPREAD_STEP` apart (048.1): one fed fires at the cursor, two at ±7.5°, three at −15°, 0°, +15°.
Whenever an entrance fires (on its own beat, 028), its round goes down its lane, whatever its ammo: aimed rounds are
turned to the lane's angle, and a bomb or landmine lands at the cursor's distance on the lane's line, so a bomb volley
lands on an arc around the aim point. 024's grouping by family and the side-by-side line (`LOB_SPACING`, `across`) go.

Lanes are derived each tick, so SimState's shape doesn't change: no SAVE_VERSION bump.

## Slices, tests first
1. **Lanes in the sim.**
   - Tests (tests/sim/volleyLanes.test.ts, and the 024/029/038 tests rewritten, none deleted without a replacement):
     lane angles for one, two and three fed entrances; a lone fed west entrance fires at the cursor (048.1); mixed
     families fan (arrow, ley bolt, arrow at −15°, 0°, +15°); an arrow and a frost arrow from west and east at ±7.5°;
     entrances at different rates fire on their own beats, each down its own lane every time, together when they line
     up; two and three bombs land on the arc at the cursor's distance; a bomb past max range lands on its lane at max
     range; landmines take lanes too; determinism (two runs of a mixed volley give the same state).
   - Data test: every entrance has a distinct lane index, ordered west to east like its tile.
   - Code: `src/data/foundry.ts` (each entrance's `lane`, `LOB_SPACING` removed), `src/sim/volley.ts`
     (`laneAngles`, `volleyShots` by lane), `src/sim/tube.ts`, `src/sim/bombs.ts` (no `across`).
2. **Hook and readability.**
   - Tests: `getState().intake.lanes` gives each fed entrance's lane angle, parallel to `intake.volley`; the tube
     slot's units run west to east, as the lanes fire (left unit fires left).
   - Code: `src/sim/summary.ts`; `hudActive` keeps lane order.
3. **The measure bot.** tests/sim/packBot.ts aims so a straight round's lane is on the target, counting every fed
   entrance, not only straight ones.
4. **e2e and shots.** tests/e2e/volleyShape.spec.ts: in `?sandbox`, an arrow west, a bomb centre and an arrow east
   fire as one fan (arrows at ±15°, the bomb at the cursor); two bombs and an arrow land on the arc. Review shots in
   docs/review/048 (REVIEW_SHOTS=1): a three-lane mixed volley, a bomb arc. spread.spec.ts's mixed volley assertion and
   comment updated; 024's 04 and 044's 06 retaken.
5. **Verify.** `npm run check`; the touched e2e while building; full Playwright once; `npm run measure` once.

## Not in this spec
- A build-mode spread preview: none exists in the game today. Raised after the build (048.3).
- design.md's "two bomb lines lob two bombs side by side": needs Shaun's approval to edit. Raised (048.4).
