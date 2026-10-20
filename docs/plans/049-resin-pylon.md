# 049 plan: Resin pylon (Husk Hive)

Spec: docs/specs/049-resin-pylon.md (approved on draft; the open questions' proposals are built).

## Approach
The Husk Hive is one more entry in `src/data/landmarkSites.ts`, built like the Quarry: an area, its blocks (here the
nest's amber-crusted stones), five resin seep nodes, a guard pack, a pylon that supplies `husk-resin`, and a ley line
home. Everything 032 does for a site (hidden until seen, the minimap marker, the banner, sealed while guarded, claim,
deposit, safe zone, waystone, supply motes) follows from the entry. New code is only what the data can't say today:

- A guard placement may be a **champion** (`champion: true`). World resets (and so a KO) make that guard a champion
  (named with the seeded RNG); a pack that already holds one draws no random champion.
- A **resin port** fixture on the foundry's west wall, standing once a claimed site supplies resin (028's rule).
- A **resin seep** node (`src/data/nodes.ts`) with the same uses, harvest, yield and regrow as the boulder (049.3),
  placed only in the Hive (a new placement, `hive`).
- A **goal** after "Claim a second pylon": "Find the Husk Hive and claim its pylon" (049.2: no lock; ring 2 scaling and
  the champion make it a post-Warden goal).
- **Art**: the nest's stones (two variants, by tile hash), amber crust painted on its ground, the seep at each use,
  bare and regrow stage, a resin harvest burst, and the supply motes' resin colour.

Placement (049.1): Region 1's east side, opposite the Old Grove: x 99–103, y 34–40, between the meadow's south-east
corner and the South-east Ley Spring, on the south-east path. The east middle is taken by the Ley Grotto, so this is the
nearest open ring 2 ground on that side; checked by the landmark tests (no overlap, ring 2, reachable, clear of other
sites' safe zones).

Saves: inserting a goal mid-chain shifts the saved objective flags, so SAVE_VERSION 5 → 6 with no migration
(Shaun's rule), and the shape fixture regenerated.

## Slices, tests first
1. **The site as data.**
   - Tests (tests/data/huskHive.test.ts, tests/data/landmarks.test.ts): the Hive is a ring 2 resource site in Region 1
     with a `site` marker, 5 resin seeps, a pack of 3–5 Husks with exactly one champion, a pylon supplying only
     `husk-resin` with a seep in its zone, and a ley line home; it overlaps no landmark or tutorial ground; it sits on
     the far side of the foundry from the Old Grove; the existing landmark checks (ring, reach, clear ground, zones)
     cover it. Node data: the seep matches the boulder's numbers, gives Husk resin, and stands only in the Hive.
   - Code: `landmarkSites.ts`, `landmarks.ts` (guard `champion`, `look.blocks: 'hive'`), `nodes.ts`, `claims.ts`
     (resin port), `art/nodes.ts`, `art/landmarks.ts`, `landmarkAssets.ts`, `assets.ts`, `juice.ts`, `art/ground.ts`.
2. **Sim: guards, seeps, pylon.**
   - Tests (tests/sim/huskHive.test.ts): a new game holds the Hive's guards, all Husks at ring 2 scaling, one a named
     champion with a champion's health; they come back after a KO, champion included, until the claim. Hidden until
     seen; found once in view. A seep harvests with E into Husk resin, depletes after 3 uses, and regrows through its
     stages. The claimed pylon raises the resin port (×1, 15 a minute) and pushes resin into the piece in front.
     A bomb line (shaper, fuse maker, grinder into a packer) runs from the stone, resin and ley crystal ports alone
     and makes bombs. Two runs replay identically.
   - Code: `src/sim/resetWorld.ts`, `src/sim/champions.ts`, `src/data/rooms.ts` (placement type), objectives.
3. **Render.** The nest's stones on its block tiles, the amber crust on its ground, seep frames (NodeView picks them
   from data already), resin motes on the line home. Contact sheet shows the new frames.
4. **Saves.** SAVE_VERSION 6, fixture regenerated.
5. **Verify.** `npm run check`; e2e: tests/e2e/huskHive.spec.ts (claim the Hive through the hook and see resin
   arrive at its port in `getState()`), plus review shots (REVIEW_SHOTS=1, docs/review/049): the Hive unclaimed with
   its guards, a seep in its stages, the claimed pylon with a resin mote. Older shots that 049 changes: 032's
   South-east spring view and the contact sheet row. Full `npx playwright test` once; `npm run measure` once.
