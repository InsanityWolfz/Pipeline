# 055 plan: Boss doors and the rimestone pylon

Spec: docs/specs/055-boss-doors-rimestone.md (approved on draft: the open questions' proposals are built). Stacked on
053 (`claude/053-round-world`), which placed both arenas (055.2).

## Approach
Both boss arenas become one kind of thing, an **arena with a door**, listed in data (`src/data/arenas.ts`): the
Warden's walled shrine and the Bulwark's Sunken Forum. Each has its boss, its inside, its walls and a **door**: a row of
door tiles in its wall (a new solid tile symbol, `G`, stopping feet and shots like a wall), the floor tile just inside
(`enterTo`), the one just outside (`leaveTo`), the gate whose opening unlocks it, and its hover name and sealed hint.

043's arena lock (`src/sim/arenaLock.ts`) becomes the shared door system, so there's one lock, not two:
- The door is always solid, so the arena is always closed; the old seal rects and the push-off go (nothing can be
  standing in a doorway as it shuts any more).
- E within reach of a door, from outside: if its gate is open, the player stands on `enterTo` (an `arenaEnters`
  event); if not, nothing (the hover line says what opens it).
- E within reach from inside: the player stands on `leaveTo` and, if the boss lives, the fight resets as 043's does
  (`resetBoss`, an `arenaLeaves` event). Leaving needs no unlock.
- "Locked" (043's seal) stays derived from the boss: while it fights, render draws 043's ley curtain over the door and
  plays its hum, now for both arenas.
- The sandbox's room holds the forum at the same tiles (044): its door is always unlocked there.

Unlocks: the Warden's door opens with 012's shrine gate (the first line fills the tube; that gate's tiles are gone, the
door replaces them), the Bulwark's with 034's Hollows barrier (the shrine's claim). See "Raised after the build" for
why the Warden's is the shrine gate and not the claim itself.

The shrine's walls close: the front wall's two fallen stretches and the side walls' gap row become wall (Shaun found
the holes either side of the door). The forum's way in (5 tiles) becomes its door. Both are stamped after generation,
so the generated map doesn't change.

**Rimestone pylon:** the Frozen Grotto's landmark entry gets a pylon supplying `rimestone` (029's raw), so everything
032 does for a site follows from data: dormant until the shrine is claimed, claimed after its guards are cleared, a
safe zone, waystone travel, its guards stop returning once claimed, a ley line home (`leyLines.ts`, a new route north),
supply motes. A `rimestone-port` fixture on the foundry's west wall stands once it's claimed (028's rate).

Saves: the door doesn't change the state's shape; if the fixture list or anything else does, SAVE_VERSION goes up with
no migration and the shape fixture is regenerated.

## Slices, tests first
1. **The Warden's arena walled, with a door (data).**
   - Tests (tests/sim/arenaDoors.test.ts): each arena's bounds ring is solid all round, door tiles included (no gap);
     door tiles are `G`; `enterTo` is open floor inside, `leaveTo` open floor outside, both next to the door's middle;
     the shrine has no gate tiles any more; the pylon and the Warden stand inside.
   - Code: `src/data/rooms.ts` (TILE.arenaDoor), `src/data/home.ts` (whole walls, the door), `src/data/arenas.ts`,
     `src/data/hollows.ts` (forum door in place of its seal), `src/sim/overworldGen.ts`, `src/sim/sandboxRoom.ts`.
2. **The shared door (sim).**
   - Tests: sealed until its gate opens (E outside does nothing, the summary says sealed); once open, E outside enters;
     E inside leaves (works sealed or not); leaving mid-fight resets the boss (Warden and Bulwark); the door stops feet
     and shots; the sandbox forum door is open; interactTarget names `arena-door` at an unlocked door, none at a sealed
     one; determinism (same commands, same state).
   - Code: `src/sim/arenaLock.ts`, `src/sim/bodies.ts`, `src/sim/step.ts`, `src/sim/interactables.ts`,
     `src/data/interact.ts`, `src/sim/events.ts`, `src/sim/summaryHollows.ts`.
3. **Render.** A door sprite per width (rune-carved stone frame, brass-banded leaves, a dormant rune while sealed, a
   cyan rune once open), drawn over the door tiles in the overworld and the sandbox; hover name and line (055.1);
   043's curtain and hum for both arenas while locked; the minimap colour for `G`.
   - Tests: tests/render hover name test (sealed hint, open line); art registration tests already cover new frames.
4. **The Bulwark's door.** Its e2e and sandbox tests walk to the door and press E instead of walking through the way in.
5. **The Grotto pylon and rimestone port.**
   - Tests (tests/sim/grottoPylon.test.ts, landmarks/ports data tests): the Grotto has a pylon supplying only rimestone,
     dormant until the shrine's claim, claimable once its guards are dead, its guards no longer return once claimed;
     the port stands after the claim and pushes rimestone every SUPPLY_TICKS; its ley line home meets no road or line.
   - Code: `src/data/landmarks.ts`, `src/data/grotto.ts`, `src/data/leyLines.ts`, `src/data/claims.ts`, the supply
     icon colour for rimestone.
6. **e2e.** tutorial.spec (E into the shrine; still unaided), arenaLock.spec (E in, lock, E out resets), the Warden door
   e2e (E in once the shrine gate is open; leaving resets), and the specs that walk into the forum. Review shots in
   docs/review/055/: each door sealed and open, inside a locked arena, the Grotto pylon claimed; older shots of the
   arenas, 043's seal and the Grotto retaken.
7. `npm run measure` once; record. Progress entry.
