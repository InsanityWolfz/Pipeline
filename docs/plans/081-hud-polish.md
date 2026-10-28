# 081 plan: HUD polish

Plan for docs/specs/081-hud-polish.md on `claude/081-hud-polish` (InsanityWolfz/Pipeline#98). A plan file because
the spec touches every HUD piece and menu, the vector art, a new motion layer and the test hook, and will pass 300
lines. Pre-approved by Shaun in chat (2026-10-27). 081 has no sim rule, so its "failing tests first" are data tests
(tests/data), pure render helpers (tests/render) and the e2e. Each slice is committed with `npm run check` green.

## Findings that shape the plan
- **Stacking.** 081 is stacked on 074 (merged in at the start; it merges after 074). 075–080 aren't merged into it.
  080's boss name card isn't here: the tablet polish lives in the shared `drawTablet` and `tablet()`, so a card that
  draws with either takes the look with no change on its side (the seam, noted in the spec). 080 may also change the
  boss bar's phase look; 081 changes only the bar's frame, its fill's lit line and the name's outline, all in
  `BossBar`, so a merge keeps both.
- **Layout pins.** `tests/fixtures/hudLayoutMain.json` is main's (and 074's) `hudLayout.ts`, `hudPanels.ts`,
  `flowLayout.ts`, `MINIMAP`, `FOUNDRY_MAP`, `HOLLOWS_LOOK.bossBar` and the text styles' sizes and weights, dumped
  before any 081 change. The data test compares the live values to it (only `TABLET` and `MENU_FEEDBACK` are left out:
  the spec changes those).
- **The tablet's contrast.** `drawTablet` lays the ink edge over the whole box first, then the stone at its fill
  alpha, so at a piece alpha `a` the ground shows through only `(1 − a)(1 − 0.94 a)`: 3% for the objective band's 0.85.
  The contrast test composites exactly that (ground, ink edge, stone at its lightest stop) over snow and over ink.
- **The gradient** is drawn as a few flat bands (`TABLET_LOOK.bands`), colours mixed once at load, so it looks the
  same on WebGL and on the Canvas fallback (Graphics gradients are WebGL only) and costs nothing per call.
- **Menu motion as one.** Menus are loose game objects that set their own alphas every frame (greyed rows, closed
  tabs), so the open's fade can't write their alphas. Each menu's parts go into one `Container` (scroll factor 0, at
  the menu's lowest depth, children sorted by depth once): the container's alpha multiplies its children's at render
  and its y carries the 4 px rise, so the parts' own x and y (what `ui()` reads) are the final layout from the first
  frame. Phaser's input hit-tests children through the container, so during the rise a click lands where the row is
  drawn (at most 4 px above its final place for the first frames, so a click on a row's final box lands on it). The
  camera router sees the container's scroll factor 0, so it draws on the UI camera.
- **Hover fades.** Today a row's image swaps between its plain and hover frames. `RowHover` gains two overlay images
  (made on the first hover, not per frame) that carry the hover frame over the plain row and fade in and out (80 ms);
  callers swap `setFrame(hover.frame(k))` for `hover.paint(k, image)`. A closing menu hides them at once.
- **Tab fades.** The craft menu's rows, the talent panel's tree and Settings' lists sit in a child container whose
  alpha fades 0 → 1 over 80 ms on a tab switch; the panel doesn't re-open.
- **Tween time.** Every motion is a `scene.tweens.addCounter` made on the event, so the test hook's tween speed
  governs it. The eased values come from pure functions in `src/render/menuMotion.ts` (unit-tested); the tween only
  feeds them its elapsed ms.
- **Reduced motion.** `window.matchMedia('(prefers-reduced-motion: reduce)')`, read at each open (as JuiceView reads it
  for shake). Reduced: the open, tab and hover land at their end state at once.
- **Redraw on change.** The boss bar, the HP fill and the XP row redraw only when what they show changes (a key of
  their drawn numbers kept in fields, compared each frame: no allocation). `ui().hudDraws` counts each piece's redraws.

## Slice 1: data
**Tests first:** `tests/data/hudLook.test.ts`: layout and sizes equal the fixture; every `MENU_MOTION` duration under
150 ms, press 140; every colour a palette id; the contrast floor (4.5) for every text-carrying tablet's effective fill
over snow and over ink, for snow body text and `brass-light` titles; `item-casing` doesn't use `BOMB_SPHERE`.
**Build:** `src/data/hudLook.ts` (`TABLET` moved here with its added fields, `TABLET_LOOK` band colours, `MENU_MOTION`,
`CONTRAST_FLOOR`, `TEXT_TABLETS`: each text-carrying tablet and its piece alpha), `MENU_FEEDBACK.pressMs` 140,
`fonts.ts`: `title` fill `brass-light`, a `bossName` style (display 8, ink stroke 1.6).

## Slice 2: one tablet look
**Tests first:** `tests/render/tablet.test.ts` with a recording Graphics: nothing outside x−1..x+w+1, y−1..y+h+1; the
bands run `carve` → `carve-dark`; the bevel, the inner line, the base; brackets with a `brass-light` lit end; a small
box shortens its brackets.
**Build:** `drawTablet` (signature unchanged) and `tablet()` in `hud.ts` (inner line, lit bracket ends).

## Slice 3: baked frames and icons
**Tests first:** art tests: the new `hud-boss-bar` registered (244 × 10) and drawn; the redrawn icons registered,
16 × 16, anchored at (8, 8); the existing "every frame registered and drawn" test.
**Build:** wells cut in (dark top, lit lip), the selection ring's rim light, the tube slot (inner cyan-glow line,
rivets, brass end caps), the HP frame's deeper runes, row frames (cut well, lit hover rim, glow 3), the craft panel,
rarity frames' bevel and lit corner, `hud-boss-bar`; the casing (and steel and stormsteel), unidentified armor,
rimestone and the Tube lane.

## Slice 4: live HUD pieces
**Build:** the HP fill's rim light, the XP well and lit fill, the boss bar on its baked frame with the lit fill line,
the carved heat well and `bossName`, redrawn on change; the minimap's inner shadow; the wide tube card's live look;
the craft and talent tabs' gold glow. `ui().hudDraws`.

## Slice 5: menu motion
**Tests first:** `tests/render/menuMotion.test.ts`: the open's alpha and rise over time (0 → 1, 4 → 0, done at
120 ms), reduced motion at the end state at once, hover in and out and the tab fade at 80 ms, stepping reuses its
state object.
**Build:** `menuMotion.ts` (pure curves) and `MenuMotion` (the container, open, close, tab fade, the report);
`RowHover` overlays; every menu wired: Crafting, the inventory and hopper/crate screens, Talents and the Build tab,
the gear panel, the site menus (stash, pylon, waystone, bench), the research and blueprint lists, the restore panel,
pause, Settings and the flow screens (title column, cards, note, end card). Hover and recipe cards stay instant.
`ui().menuMotion`.

## Slice 6: e2e, shots and motion strips
**Tests:** `tests/e2e/hudPolish.spec.ts`: the open settles within 150 ms of tween time; a click on the first frame
crafts; Esc on the first frame closes; reduced motion in place at once; still at rest over 120 frames (HUD alone,
each menu open); object, tween and redraw counts flat; the boss bar redraws only on change, its box and
`bossBarBottom` as main's; the Stormcrown against Region 1 pixel checks (HP bar, a carried cell, the tube card, an
open craft row). `tests/e2e/hudPolishShots.spec.ts` (`REVIEW_SHOTS=1`): the review shots into docs/review/081.
**Motion check:** the craft menu opening, a row's hover and a tab switch captured at real speed (no fake clock) as
frame strips; a couple saved to docs/review/081.

## Slice 7: docs
art.md's "HUD, menus and text"; the spec's Results and raised items (081.N).

## Kept green
`npm run check`; locally, one at a time on port 5347 with `--workers=1`: hud, hudInventory, hotbars, handling,
playtestUi, menuLabels, settings, talents, crafting, stash, equipment, legibility, hoverPress, sandboxStrip, zoom,
lighting, newGameAfterQuit and the files 081 touches; the full suite in CI. No file under `src/sim`; `SAVE_VERSION`
unchanged.
