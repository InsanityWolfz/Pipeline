# 024: Spread from the intake: each fed entrance is a stream
status: done

Approved by Shaun in chat, 2026-10-18 ("approve 21-27").

## Goal
The gravity stager is gone. The game builds the spread itself from which intake entrances are being fed:
- Arrows fed into two entrances fire a two-arrow spread.
- Two bomb lines lob two bombs side by side.
- Two arrow lines and a bomb line fire a two-arrow spread plus a bomb.

The intake starts with one entrance open. The Pylon Warden's core opens the other two.

## Design references
- docs/design.md:
  - "Pillars" 3 (the layout is the ability; every extra projectile costs real materials)
  - "The Foundry" ("The layout is the ability")
  - "Combat" (reservoir)
- docs/specs/008-spread.md: stagers, which this replaces
- docs/specs/019-intake-pipe.md: the 3-tile mouth and the reservoir gauge
- Shaun's playtest notes, 2026-10-18: "get rid of the gravity shapers and just have the game make the spread itself if there is more than one opener of the tube in the foundry being fed ... if its two arrow and a bomb then it shoots 2 arrows in a spread and a bomb as well"
- Interview answers (Shaun, 2026-10-18):
  - Each entrance has its own reservoir. One fire press shoots one round from every entrance that has ammo.
  - Keep 3 entrances for now; more come later.
  - The warden core opens entrances 2 and 3.
  - design.md may be updated once this spec is approved.

## Acceptance criteria

**Entrances and reservoirs (sim, data)**
- [ ] The intake's 3 mouth tiles are 3 entrances, each with its own reservoir:
  - `{ ammoId: string | null, count: number }`
  - cap `ENTRANCE_CAP`, starting at 30
- [ ] An entrance accepts any ammo item while it's empty. Once it holds an ammo, it accepts only that ammo until it empties, and refuses everything else, so the line backs up. Non-ammo items are always refused.
- [ ] At the start only the centre entrance is open. The two side entrances are capped shut, and their mouth tiles refuse everything.
- [ ] Pressing E at the intake while carrying a `warden-core` spends it and opens both side entrances for good.
  - This records an event and saves like the rest of the foundry.
  - Before attuning, the intake refuses as today.
- [ ] The gravity stager is removed: the piece, its data, its art, its build-bar entry, its angle command and its events. The objective "Build a spread with a gravity stager" becomes "Open the intake's side entrances (E with a warden core)", then "Feed two entrances to fire a spread".

**The volley (sim, data)**
- [ ] When the tube fires from reservoirs, one press fires a volley: one round from every open entrance with a count above 0, each costing 1 from its own entrance.
- [ ] Rounds in a volley are grouped by ammo.
  - **One round** of an ammo fires straight at the aim, as today.
  - **Several aimed rounds** (arrow, ley bolt) of the same ammo fan out evenly, centred on the aim, `SPREAD_STEP` degrees apart (starting at 15°). Two arrows fly at ±7.5°; three fly at −15°, 0° and +15°.
  - **Several lobbed rounds** (bombs) land side by side at the aim distance, spaced `LOB_SPACING` px apart on the line across the aim (starting at 24 px). Two bombs land 12 px either side of the aim point.
- [ ] A volley's cooldown is the longest `fireTicks` among the ammo it fired.
- [ ] Firing order stays as today, with melee at the end:
  1. A carried round of the selected ammo fires first, as a single projectile.
  2. Otherwise the volley fires.
  3. Otherwise the press is a melee (023).

**Render**
- [ ] Each entrance shows its own gauge in the 019 style, in the colour of the ammo it holds.
- [ ] A capped entrance shows a brass cap. When the core opens it, the cap lifts off with a pulse and a sound.
- [ ] A prompt "E: open the side entrances" shows near the intake while a warden core is carried.

**Docs**
- [ ] Once approved, update docs/design.md:
  - "The Foundry" and "World": the spread comes from how many intake entrances are fed, not from stagers. Mixed lines fire mixed volleys.
  - The prototype scope line about the gravity stager.
  - The 5-arrow pitch line now says more entrances unlock later.

**Hook**
- [ ] `getState()` reports, per entrance: whether it is open, its ammo id and its count. `streams` is replaced by the volley the next press would fire, as a list of ammo ids.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Existing spread tests are rewritten for entrances. No test is deleted without a replacement.

## Data changes
- `src/data/foundry.ts`:
  - `INTAKE.entrances`: the mouth tiles, plus which one starts open
  - `ENTRANCE_CAP`, `SPREAD_STEP`, `LOB_SPACING`, `OPEN_ENTRANCES_COST: { 'warden-core': 1 }`
  - `STAGER_ANGLES` and `STAGER_TICKS` removed
- `src/data/pieces.ts`: `gravity-stager` removed from `PIECES` and `BUILD_BAR`.
- `src/data/objectives.ts`: the spread objectives reworded and re-checked, as above.
- `src/data/art`: stager art removed; entrance cap art added.
- `src/data/playtest.ts`: the warden-core override kept, for testing the opening.

## Out of scope
- More than 3 entrances. That belongs to the factory-diversity plan (029).
- Per-slot hotbars of different lines.
- Ley-guided homing.
- Aiming entrances at custom angles.

## Test plan
- **Vitest:**
  - Entrance accept and refuse: empty takes anything, a typed entrance refuses other ammo, and a full one refuses.
  - Capped entrances refuse. A core opens both side entrances and is spent.
  - The volley: 1, 2 and 3 arrows give angles {0}, {±7.5} and {−15, 0, 15}.
  - Two bombs land at ±12 px across the aim.
  - Two arrows and a bomb give two angled arrows and one straight bomb.
  - The cooldown is the longest `fireTicks`. An empty entrance is skipped.
  - Carried rounds fire before the volley, and melee happens when everything is empty.
- **Playwright:** with playtest cores, open the entrances, feed arrows into two of them, fire, and see two projectiles at ±7.5°.
- **Screenshots:**
  - the intake with the centre entrance open and both sides capped, then again once the core has opened them (both sides open together, so "one capped and two open" can't occur; corrected 2026-10-19)
  - a two-arrow-and-bomb volley in flight

## Open questions
None. Resolved by Shaun, 2026-10-18: each entrance has a cap of 30, so 90 once all three are open ("90 is fine and makes sense").
