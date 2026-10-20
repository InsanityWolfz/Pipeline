# Plan 024: Spread from the intake

Spec: docs/specs/024-intake-spread.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec. docs/design.md already carries the 024 wording, so it isn't touched.

## Shape of the change
1. **Data.**
   - `src/data/foundry.ts`: `INTAKE.mouth` becomes `INTAKE.entrances`, the three mouth tiles, each with `startsOpen` (only the centre). New `ENTRANCE_CAP = 30`, `SPREAD_STEP = 15`, `LOB_SPACING = 24`, `OPEN_ENTRANCES_COST = { 'warden-core': 1 }`, and `INTAKE_REACH` (how close the player's feet box must be to the mouth for E to open it). `STAGER_ANGLES`, `STAGER_TICKS` and `STAGER_START_ANGLE` go.
   - `src/data/tube.ts`: `RESERVOIR_CAP` goes (each entrance has `ENTRANCE_CAP`).
   - `src/data/pieces.ts`: `gravity-stager` and the `stager` kind go from `PIECES` and `BUILD_BAR`. The piece `cost` field goes too, since the stager was its only user (as 019 did with `limit`), along with the `cost` place failure.
   - `src/data/objectives.ts`: the `streams` check is replaced by `sidesOpen` ("Open the intake's side entrances (E with a warden core)") and `volley` with `min: 2` ("Feed two entrances to fire a spread": the volley the next press would fire has at least two rounds).
   - `src/data/items.ts`, `playtest.ts`: comments only; `warden-core: 5` is kept.
   - Art: the stager sprite, its emblem and the build fan go. `src/data/art/intake.ts` gains a brass cap sprite over a side inlet and three gauge columns, one per entrance. Sounds: `intake-open` (a brass clank and a rising chime) added, `rotate` (only the stager's turn used it) removed; `npm run sound` regenerates the wavs.
2. **Sim: entrances.** `src/sim/link.ts`: `link.reservoir` becomes `link.entrances: { open, ammoId, count }[]`, one per mouth tile, kept through a KO like the rest of the link. `entranceAccepts` / `fillEntrance` / `takeFromEntrance` replace the reservoir helpers: an empty entrance takes any ammo item, a typed one only its own, never above `ENTRANCE_CAP`, never non-ammo, never while capped. `src/sim/flow.ts` fills the entrance whose mouth tile the item goes into; `refills` names the `entrance` index.
3. **Sim: opening.** `src/sim/intake.ts` (new): `intakeOpenable(state)` (in the foundry, attuned, a side still capped, a `warden-core` carried, the feet box within `INTAKE_REACH` of the mouth) and `openSideEntrances(state)`, which spends `OPEN_ENTRANCES_COST`, opens both side entrances for good and records `events.intakeOpens`. `stepFoundryUse` runs it on E before pieces, so E there does nothing else. `feedsIntake` moves here from `spread.ts`.
4. **Sim: the volley.** `src/sim/volley.ts` (new), pure:
   - `nextPress(state)`: `{ kind: 'carried', ammoId, count }` if the tube is in hand and a round of the selected ammo is carried; else `{ kind: 'volley', rounds: [{ ammoId, count, entrance }] }` if any open entrance has a count above 0 (entrance order); else `{ kind: 'melee' }`. This is the helper 025's HUD will read; `hasRoundToFire` is now `nextPress(state).kind !== 'melee'`.
   - `volleyShots(rounds, dx, dy)`: groups the rounds by ammo; one round flies straight; several aimed rounds fan at `(i − (n−1)/2) · SPREAD_STEP` degrees; several lobbed rounds keep the aim's direction and land `(i − (n−1)/2) · LOB_SPACING` px across the aim point.
   - `stepTube` fires a carried round (one projectile, its own `fireTicks`) or the volley (one round from each fed entrance, cooldown the longest `fireTicks` fired), else punches. `throwBomb` takes an `across` offset for the side-by-side landing.
   - `spread.ts` keeps only `rotate`, so it's folded into `volley.ts` and the file goes.
5. **Stager removal.** The `setAngle` command, `angles` event, `StagerState`, `cycleAngle`, the stager in flow, placement refunds, foundry use, hover readout, build view, controls' `stagerAt`, the build fan (`SPREAD_FAN`, `DEPTHS.spreadFan`) and the contact sheet group all go.
6. **Hook.** `getState().link` drops `reservoir`; `getState().intake` becomes `{ entrances: [{ tx, ty, open, ammo, count, cap }], volley: string[] }`, where `volley` is the ammo ids the reservoirs' next volley would fire (one per fed entrance, as `streams` reported the stagers whatever was carried). `getState().tube` gains `next: 'carried' | 'volley' | 'melee'`. Events carry `intakeOpens`.
7. **Render.**
   - `IntakeView`: three gauge columns on the pipe's body, one per entrance (left, centre, right), each lit in proportion to its count in its ammo's colour (`ENTRANCE_GAUGE_COLORS` in `src/data/art/intake.ts`: arrows straw, bombs cinder, ley bolts cyan glow). Lit rings draw normally on their own layer above the lit bands, with a soft additive glow, so the colour reads on the cyan pipe. A brass cap sits over each capped side inlet. On an `intakeOpens` event each cap lifts and fades by one tween, which also drives a ring of light at its inlet (so a stopped tween holds the whole effect), with brass flecks and the `intake-open` sound (FeelView). Build-mode input arrows show only under open entrances.
   - Prompt (`IntakePrompt`): a key cap "E" and the text "open the side entrances" on the wall right of the pipe, shown anywhere in the foundry while `intakeCanOpen` holds (a core carried, a side still capped, attuned), dimmed until in reach, as other prompts are. `ui().intakePrompt` reports "E: open the side entrances" while it shows.
   - Hover readout over the intake: one line per entrance, west to east: its ammo icon (the tube emblem when empty) and `count/30`, or a cap emblem and "capped".
   - `MenuRouter`: E while the intake is openable opens no hopper or sorter menu.
   - HUD slot (until 025): the carried count, else the volley's total rounds with the reservoir glow, else 0.
   - `ui().intakeCaps` reports the caps still drawn (seated or lifting) and `ui().intakeLift` how far a lift-off is (0..1, null when none), for the e2e and the mid-lift screenshot.

## Tests (written first)
- **Vitest** `tests/sim/entrances.test.ts` (replaces `stager.test.ts` and the stream parts of `intake.test.ts`):
  - an empty open entrance takes any ammo; a typed one refuses other ammo; a full one refuses; non-ammo is refused; each refusal backs the line up
  - capped side entrances refuse; only the centre starts open
  - E at the intake with a core opens both sides, spends one core, records the event; without a core, out of reach, or before attuning nothing happens; it lasts through a KO
  - volley angles: 1, 2 and 3 arrow entrances give {0}, {±7.5} and {−15, 0, 15}
  - two bomb entrances land ±12 px across the aim point
  - two arrows and a bomb: two angled arrows and one straight bomb
  - cooldown is the longest `fireTicks`; an empty entrance is skipped; each round costs 1 from its own entrance
  - a carried round of the selected ammo fires first as one projectile; the volley fires whatever ammo is selected; melee when everything is empty (`nextPress` says which each time)
  - three ley bolt lines into the three entrances fire three bolts per press (the old full-line test)
  - determinism replay
- Rewritten: `intake.test.ts` (entrance per mouth tile, `refills.entrance`), `link.test.ts`, `melee.test.ts` (a reservoir of another ammo now fires the volley), `tutorial.test.ts` (first line full = an entrance at the cap; the new objectives), `death.test.ts`, `population.test.ts`, `placement.test.ts`, `sim.test.ts`, `tube.test.ts`, `data.test.ts` (no stager; the cap art and the new data numbers).
- **Playwright** `tests/e2e/spread.spec.ts` rewritten: `?playtest`, walk to the intake, the prompt and two caps show, E opens the sides (core spent, event recorded, caps lift away), build two arrow lines (hopper → conduit) into the side entrances with every carried arrow, spend the carried ley bolts out in the meadow, and the next press fires two arrows at ±7.5° about the aim. With `REVIEW_SHOTS=1`, into `docs/review/024/`: the intake capped (the start state: the centre open, both sides capped), the caps mid-lift, the intake open and fed (arrows, bombs, arrows), a two-arrow-and-bomb volley in flight, and the cap art on the contact sheet. The spec's "one capped and two open" can't happen (both sides open together), so the capped and opened states are separate shots. `cameraSettled` moved from `melee.spec.ts` into the shared helpers. `tutorial.spec.ts`: beat 11 is E at the intake with the Warden's core; beat 12 hand-crafts arrows from the leftover gathering into a hopper and conduit into the east entrance, and tops the ley line's hopper up with the ley crystal left (the shrine fight drew it dry); beat 13 is heading out. `tubeLink.spec.ts`, `foundry.spec.ts` and `firing.spec.ts` read entrances.

## Not dictated by the spec
- `INTAKE_REACH` (40 px from the mouth): more than a tile, so a piece built in front of the mouth doesn't put E out of reach.
- `getState().intake.volley` lists the reservoirs' volley whatever is carried (as `streams` listed the stagers), and `tube.next` says what the next press really does.
- The HUD slot until 025: the carried count, else the total rounds in the fed entrances with the ley glow.
- The generic piece `cost` and the `cost` place failure went with the stager, their only user.

## Risks
- The volley fires whatever ammo is selected (the spec's order only names the selected ammo for carried rounds), so a player selecting bombs with arrows carried still fires carried bombs first if they have them. That's the spec's order.
- E near both a hopper and the intake: the intake wins while openable, so the hopper menu waits until the sides are open.
