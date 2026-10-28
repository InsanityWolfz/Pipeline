# 081: HUD polish
status: approved

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27. Plan: docs/plans/081-hud-polish.md.

Stacked on the art pass before it, as "Depends on" says: 080's branch (with 073–076) and 078's (with 074–077) are merged into this branch, and 081 merges last, after 073–080. 080's boss name card is drawn with the shared `drawTablet` (`src/render/tablet.ts`), so it takes the new tablet look with no change on its side, and the boss bar keeps 080's intro fill and fade on 081's frame.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 15, 17, 25, 27 and 28) and his calls on 081 that day. This is art spec 8 of 8, built in order after 074–080. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
The HUD and menus keep their carved stone and brass, made tighter: one crisp tablet look everywhere, wells that read as cut into the stone, brass that catches the light, a soft ley glow on what the cursor is over, and four icons redrawn where they read wrong at real size. Menus open, light and press with short, snappy motion that never holds up a click. Nothing moves to a new place, nothing gets smaller, and everything reads the same in the sunny Region 1 and the dark Stormcrown.

## Shaun's calls (2026-10-27)
- The whole art pass (074–081) is approved ("Approve all, build in order"). 081 is approved.
- **HUD and menus:** polish the stone tablets. Keep the carved stone and brass look, but tighter, with better icons, and light glow and motion on menus (the interview's option text).
- **Particles are moderate. No screen shake.** The HUD and menus have neither.
- **Motion is judged in motion, at real speed,** at the playtest.
- **"Just build it":** no sample pages.
- His earlier HUD calls stand (docs/brainstorm/2026-10-26-playtest-calls.md, built in #88): the HUD smaller (the tube card at the carried cells' size), the boss bar slimmer with the camera easing up under it, and the objective band wrapping at the corner map's width. 081 undoes none of them.

## Design references
- docs/design.md "Camera and art" (the 2026-10-27 wording, applied by 074) and the theme rule: rune-carved stone, glowing ley lines, brass and crystal, nothing modern.
- docs/art.md "HUD, menus and text" (020, 025): tablets as vector frames (`hud.ts`) and live panels in the same look (`src/render/tablet.ts`, `TABLET`), the tube slot ringed in cyan, the fist, menu rows lit cyan under the cursor and flashing brass when pressed, Cinzel and Source Sans 3. The build updates this section.
- docs/specs/074-light-and-moods.md: the readability layer ("the HUD camera is never lit or tinted; the HUD's pixels are the same in every region"), its HUD check in lighting.spec.ts (the HP bar's pixels match between Region 1 and the Stormcrown on High), and the Graphics quality setting.
- docs/specs/079-foundry-mood.md: its readability checks (a hover card, a purge prompt and a recipe card match mood off; the HUD's pixels the same).
- Earlier specs it builds on: 020 (vector HUD and fonts), 025 (bottom HUD, tube slot), 026 (menu labels), 031 (HP bar, inventory, pickup feed), 034 (boss bar), 036 and 075 (gear panel and rarity frames; 075 left the gear panel's frames to 081), 037 and 040 (talents, the Build tab), 042 and 050 (flow screens, Settings, the title's menu), 047 (the grid inventory, carried bar), 051 (minimap), 052 (stash), 069 (recipe cards), 070 (the empty-tube card, greyed slots), #88 (smaller HUD, boss bar, objective wrap).

## Depends on
074–080, built in order. 081 changes the boss bar's frame only; if 080 changes the bar (its phase look), 081 builds on 080's version and keeps what 080 added. If one of them is still unmerged when the build starts, the build merges its branch in first and says so in the PR.

## Rules for this spec
1. **Visual only.** No file under `src/sim` changes. `SAVE_VERSION`, settings and key bindings stay as they are.
2. **No layout moves.** Every box, position, size, gap and wrap width in `hudLayout.ts`, `hudPanels.ts`, `flowLayout.ts`, `minimap.ts`, `HOLLOWS_LOOK.bossBar` and the objective's cap (`objectiveCapWidth`) stays as on main. Every e2e that reads a HUD or menu position or its text through `ui()` holds unchanged. `ui()` reports each menu's final layout from its first frame, never a mid-motion one.
3. **Nothing shrinks.** Text sizes and weights (`TEXT_STYLES`), cell and card sizes, the HP bar, the boss bar, the minimap's scale and the 16×16 icon size stay as they are. Nothing grows either: #88 made the HUD smaller on Shaun's word.
4. **Readable in every mood.** The HUD stays unlit and untinted (074). Text on a tablet keeps at least 4.5:1 contrast against the tablet over any ground, from snow to ink. Text on the world keeps its ink outline.
5. **Motion only on menus, and short.** Every menu motion ends within 150 ms. It never blocks input. It respects the player's reduced-motion preference. The HUD at rest and a menu at rest are still.
6. **No per-frame allocations.** 081's code creates no objects, arrays, strings, closures, tweens or game objects per frame. Tweens are made on an event (open, hover, press). A piece 081 redraws in Graphics redraws only when what it shows changes.
7. **No shake, no particles, no camera moves** in the HUD or menus.
8. **Colours that carry meaning stay:** danger red, low-HP red, the immune blue, the heat ember, rarity colours, keyword chip colours, cyan for the tube and selection, greyed empty slots (070).

## One tablet look
Today the baked tablets (`tablet()` in `hud.ts`) have a gradient, rounded corners and brass brackets, while the live ones (`drawTablet`) are a flat fill with 1 px L-corners. 081 gives both one look, drawn inside today's outer box (`drawTablet` still covers x−1 to x+w+1, y−1 to y+h+1, and its signature is unchanged):
- **Stone:** a vertical gradient from `carve` at the top to `carve-dark` at the foot, at today's fill alpha or more.
- **Carving:** a 1 px lit top bevel (`carve-light`), a dark base line (`mortar`), and a thin carved inner line 2 px in (`mortar` at 0.5), so the edge reads as cut, not painted.
- **Brass:** corner brackets as today's length, each with a `brass-light` lit end at its top-left, as light falls from the top left.
- **Runes:** big panels (the craft menu, inventory, talents, gear, Settings, cards) keep or gain a faint rune course along the top, `carve` at 0.7 as today's craft panel.
- Text-carrying tablets keep an effective fill alpha (the fill alpha times the piece's alpha) high enough for rule 4. Today's lowest, the objective band at 0.85, passes, so no alpha has to drop or rise. The tests check it.

Every `drawTablet` caller takes the look at once, including the world-space plates (waypoint plates, the foundry ports' rate plates). Their positions and sizes don't change.

## What changes, per HUD piece
All still: no idle motion. Today's existing motions are unchanged: the low-HP pulse and red edges, the healing glow, the XP gain tick, the heat gauge's flash, the build-bar pulse, the objective's fade and tick, the carried hint's swap.

| Piece | Today | 081 |
| --- | --- | --- |
| **Carried bar** (047, `hud-ammo-cell`, also the build bar's cells and the inventory grid's) | Small tablet, flat dark well | The well cut in: darker at its top edge, a 1 px lit lip (`carve-light` 0.4) at its foot; lit brass brackets. Key numbers, icons and counts where they are. Greyed empty slots as 070 |
| **Selection ring** (`hud-ammo-select`) | Cyan ring, glow 3 | Same ring, a `cyan-glow` rim light on its top-left arc. It still snaps to the selected cell |
| **Tube card** (025, 070, `hud-tube-slot-1..5` and the wide card) | Tablet, wells ringed cyan, brass studs | Wells as the carried cells', each ring with a thin inner `cyan-glow` line; studs become rivets with a lit point; brass end caps like the HP bar's, so the card reads as the tube's brass. The wide card drawn live matches. "Melee" and "Tube empty · RMB fires carried" unchanged |
| **HP bar** (031, `hud-health`) | Carved frame, flat fill | The frame's rune course a little deeper. The fill gains a 1 px lit top line (`snow` 0.25) and a dark foot line (`ink` 0.2): a rim light. Red, low red, the white chunk and the text unchanged |
| **XP row** (037) | Thin `ink` 0.7 well, flat cyan fill | The well edged in `ink` with a lit lip under it; the fill's top px in `cyan-glow`. "Lv 7", the pip and the gain tick unchanged |
| **Shield and armor value** (036) | | Unchanged |
| **Boss bar** (034, #88) | Flat brass, ink and red rectangles redrawn every frame | A baked frame, `hud-boss-bar`, in the HP bar's look (carved stone, brass end caps and studs) at today's outer box, 244 × 10, so `bossBarBottom` and the camera lift don't move. The fill keeps `danger` (or the immune blue) with a lit top line. The heat gauge sits in a carved well, its colours unchanged. The name keeps the display font and size and gains an ink outline (1.6), so it reads over Region 1's bright ground. The bar redraws only when health, shield or heat change |
| **Minimap** (017, 051) | Live tablet frame, 2 px | The new tablet at the same 2 px; a 3 px inner shadow (`ink` 0.35) along the map's top and left, so the map reads as set into the stone. Terrain colours, fog, markers and icons unchanged. The hover label is the new tablet |
| **Objective band** (058, #88) | Live tablet at 0.85 | The new tablet. The cap at the corner map's width, the right alignment, the wrap, the tick, the sub-lines and the fade unchanged |
| **Pickup feed, carried hint, banners, the wake text, notices** | Live tablets | The new tablet; layout and timing unchanged |
| **Crosshair, menu pointer, key caps, the intake marker** | | Unchanged |

## What changes, per menu
Every menu gets the new tablets, the row frames below, and the menu motion (next section).
- **Row frames** (`craft-row`, `craft-recipe-row` and their hover and press frames; also the picker, pause, site, Settings and flow rows through `MENU_ROW_FRAMES` and `MenuColumn`): the plain row is a cut well as the carried cells'. Hover: today's cyan rim and 0.08 wash, with the rim lit at its top-left (`cyan-glow`) and its glow at blur 3. Press: today's brass rim and wash.
- **Crafting** (026, 047, 062): the panel frame (`craft-panel`) redrawn in the new look with its rune course; tabs drawn live take it at once; the open tab's brass stripe gains a soft `gold-trim` glow (blur 2). The title card's word in pale brass (below).
- **Inventory and the hopper and crate screens** (047): the panel, the Sort button, the grid cells (the carried cells' wells) and the title card. Drag and drop unchanged.
- **Talents and the Build tab** (037, 040): the panel, the reset box and the tab bar (the open tab's brass glow as Crafting's). Nodes, links and their colours unchanged, except the Tube lane's icon (icon list).
- **Gear panel** (036, 075's hand-off): the panel, and the four rarity frames (`frame-common`, `-fine`, `-rare`, `-relic`) get the bevel and lit corner. Rarity colours and glow strengths unchanged.
- **Stash, pylon and waystone menus, research list, blueprint list, restore panel** (009, 032, 033, 052, 063): panels and rows.
- **Pause, Settings and the flow screens** (042, 050): the pause card, Settings, the title's menu column (at its 050 scale), the cards, notes, notices and the end card: panels, rows and motion. The title screen's painting and wanderer are unchanged.
- **Hover cards and recipe cards** (015, 040, 069): the new tablet. They appear at once, with no motion, so a tip is readable the moment it shows and 079's pixel checks hold. Text, keyword chips and the recipe line ("1 wood → 2 shafts · 1.0 s") unchanged.
- **Titles in pale brass:** the `title` text style's fill becomes `brass-light` (the menus' title cards, the pause card, the wake text), keeping its ink stroke and size. Body text stays `snow`.

## Icons
Icons stay 16×16 vector frames, anchored at their middle, drawn at today's scale. Four are redrawn, plus two tier variants that share one's shape. Each was checked at real size (1×, 1280 × 720) in the inventory, the carried bar and the talent panel.

| Icon (frame) | Why | Redraw |
| --- | --- | --- |
| **Casing** (`item-casing`, `items.ts`) | It is today the bomb's plain black sphere, so at 1× it reads as a bomb. art.md's 005 rule says "the casing an open shell and the bomb a sealed sphere" | An open iron shell: two halves parted, a brass rim on each, the dark hollow showing. No wick, no cinder band |
| **Steel and stormsteel casings** (`item-steel-casing`, `item-stormsteel-casing`, `tiers.ts`) | They are the bomb's sphere in steel, and follow the casing | The new shell in dark steel with its sheen, and tempered as today |
| **Unidentified armor** (`item-unidentified-armor`) | At 1× it reads as a banded wooden chest, like the stash's emblem, not as armor | A cuirass's shape under a cloth wrap tied with cord, a dim rune on the wrap: armor, not yet known |
| **Rimestone** (`item-rimestone`, `stages.ts`) | At 1× it is an upright crystal cluster beside the ley crystal's; they differ only by tint | Flat chips of rime lying on a crust of frost (what its comment describes), white with pale blue, so it differs from the ley crystal by shape |
| **The Tube lane** (`talent-lane-tube`, `talents.ts`) | At node size its grey body and cyan bands read as a battery: modern, against the theme rule | The relic tube in three-quarter view: a ringed cyan barrel, brass bands and a flared brass mouth |

Every other icon stays. The frame keys don't change, so nothing that shows an icon changes.

## Menu motion
Data in `MENU_MOTION` (src/data). All durations are tween time, so the test hook's tween speed slows or freezes them like every other effect; the sim never waits on them.

| Motion | Duration | What moves |
| --- | --- | --- |
| **Open** (a menu, panel, card or Settings) | 120 ms, ease out | The panel and everything in it fade from 0 to 1 and rise 4 px into place, as one |
| **Close** | instant | Gone on the frame it closes, as today |
| **Hover in** (a row, tab or cell under the cursor) | 80 ms | The hover rim fades in, instead of snapping |
| **Hover out** | 80 ms | The rim fades out |
| **Press** | 140 ms | Today's brass flash fading out (was 160 ms, shortened to fit the 150 ms rule) |
| **Tab switch** (Crafting's tabs, Talents and Build, Settings' main list and key list) | 80 ms | The new tab's rows fade in; the panel doesn't re-open |

- **Never blocking.** A menu takes keys, clicks, hover and scroll on its first frame. Clicks hit the final layout, so a click on a row during the open lands on that row. Esc closes a menu mid-open. A menu opened and closed inside 120 ms leaves nothing behind.
- **Reduced motion.** The game has no motion setting of its own (checked: Settings has the volumes, Mute, Flashes, 074's Graphics quality, the key list and the save rows). It already honours the system's `prefers-reduced-motion: reduce` for shake (JuiceView). 081 does the same, read at each open: menus open at once, tabs switch at once and hover rims switch at once (as today). The press flash stays as today. No Settings row is added.
- **Flashes off** (042.10) changes nothing here; the press flash was never on its list.
- **The HUD has no new motion.** The selection ring snaps between cells as today.
- **Same on every Graphics tier.** The look is baked frames and a handful of short tweens.

## Phaser 4 notes (from .claude/skills/phaser)
- Tweens through `scene.tweens` (already used by `flashRow` and the objective's fade), so `tweens.timeScale` from the test hook governs them.
- A menu's parts move as one: a Container, or one shared offset and alpha applied to the parts the menu already holds. The builder checks the skill for Container input and scroll-factor behaviour before choosing.
- `window.matchMedia('(prefers-reduced-motion: reduce)')`, as JuiceView reads it.

## Acceptance criteria
- [ ] **Layout unchanged:** every layout constant named in rule 2 equals main's (a data test pins them). The e2e files that read HUD and menu positions or text through `ui()` pass unchanged: hud, hudInventory, hotbars, handling, playtestUi, menuLabels, settings, talents, crafting, stash, equipment, legibility, hoverPress, sandboxStrip, zoom, and the rest in CI.
- [ ] **Nothing shrinks:** `TEXT_STYLES` sizes and weights, the cell, card, HP bar, boss bar and minimap sizes, and the icon size equal main's (the same data test).
- [ ] **One tablet look:** `drawTablet` and `tablet()` draw the gradient, bevel, inner line, base and lit brass brackets. `drawTablet` draws nothing outside x−1..x+w+1, y−1..y+h+1 (a unit test with a recording Graphics).
- [ ] **Readability:** for every text-carrying tablet, its effective fill over snow and over ink gives snow text and pale-brass titles at least 4.5:1 (a unit test over the data). In the Stormcrown on High against Region 1 (074's method), the HP bar's pixels, a carried cell's, the tube card's and an open craft menu row's differ by less than 3 per channel on average. 074's and 079's readability checks pass.
- [ ] **Icons:** the five frames in the icon list are redrawn, 16×16, anchored at (8, 8), and registered; the contact sheet shows them. `item-casing` no longer uses the bomb's sphere (a data test). Review shots show each beside its old look at 1× and 4×.
- [ ] **Motion:** every `MENU_MOTION` duration is under 150 ms (a data test). Opening the craft menu, `ui().menuMotion` reports the open running and then settled within 150 ms of tween time. A click on a recipe row on the menu's first frame crafts. Esc on the first frame closes it. With `reducedMotion: 'reduce'` emulated, the menu is at full alpha and in place on its first frame.
- [ ] **Still at rest:** with no input for 120 frames, nothing in the HUD or an open menu changes alpha, position or scale, outside the existing motions listed above (`ui().menuMotion` idle, the HUD's redraw counts flat).
- [ ] **No per-frame allocations:** over 120 idle frames, with the HUD alone and with each menu open, the scene's game object count and live tween count stay flat, and the HUD's Graphics redraw counts don't grow. In a boss fight the boss bar redraws only on a health, shield or heat change. Review checks 081's update paths for allocations.
- [ ] **Sim untouched:** no file under `src/sim` changes. `SAVE_VERSION` is unchanged.
- [ ] **No shake or particles:** nothing in this spec moves the camera or spawns a particle.
- [ ] **Docs:** art.md's "HUD, menus and text" describes the one tablet look, the wells and brass, the boss bar frame, the menu motion and its limits, reduced motion, and the redrawn icons.
- [ ] **Review shots (docs/review/081):**
  - the HUD in Region 1 and in the Stormcrown on High (carried bar, tube card, HP and XP, minimap, objective);
  - the boss bar in a fight, and with the Forgewright's heat gauge;
  - Crafting, the inventory, Talents, the gear panel, the stash, pause, Settings and the title's menu, each open;
  - a hovered row and a pressed row (the flash held with its tween stopped);
  - a hover card and a recipe card;
  - the redrawn icons at 1× and 4×, old beside new;
  - motion strips of the craft menu opening and a row's hover, a frame every 16 ms on Playwright's clock.

## Data changes
- `src/data/hudLook.ts` (new; `hudLayout.ts` is at its ~300-line limit): the tablet look's added fields (gradient stops, inner line, brass highlight), `MENU_MOTION` (open 120 ms and its 4 px rise and ease, hover 80, tab 80, press 140), and the 4.5:1 contrast floor. `TABLET` moves here if that keeps `hudLayout.ts` under its limit.
- `src/data/hudLayout.ts`: `MENU_FEEDBACK.pressMs` 160 → 140.
- `src/data/fonts.ts`: `title`'s fill `brass-light`; a `bossName` style (the display font at 8, ink stroke 1.6).
- `src/data/art/hud.ts`: `tablet()`, the cells, selection ring, tube slot frames, HP frame, row frames and the craft panel in the new look; the new `hud-boss-bar` frame.
- `src/data/art/items.ts` (casing, unidentified armor), `tiers.ts` (steel and stormsteel casings), `stages.ts` (rimestone), `talents.ts` (the Tube lane), `gear.ts` (rarity frames' bevel).
- `src/data/assets.ts`: `SPRITES.hudBossBar`.
- No palette, sim, save or settings changes.

## Out of scope
- Moving, resizing or re-flowing any HUD piece or menu; new HUD information; new menus or rows.
- New fonts, font sizes or weights.
- The minimap's terrain colours, fog and markers.
- World-space readability pieces: enemy health bars and name tags (054, 076), damage numbers, prompts, key caps and the intake marker.
- The title screen's painting and wanderer.
- Sound: hover and press sounds stay as they are.
- A reduced-motion row in Settings.
- Motion on the HUD (the selection ring gliding, counts popping).
- The boss's name card and phase looks (080).
- Tidying existing per-frame allocations in the HUD's sim reading (the input objects `HudView.update` builds, the minimap's marker list, the objective's key string). 081 adds none; the PR lists these for a later fix.
- Screen shake and particles.

## Test plan
- **Unit (Vitest, tests first):**
  - `tests/data/hudLook.test.ts`: the layout and size constants equal main's; every `MENU_MOTION` duration is under 150 ms and the press flash is 140; every colour is a palette id; the contrast floor holds for every text-carrying tablet's effective alpha over snow and ink, for snow and pale-brass text; `item-casing` doesn't use the bomb's sphere.
  - `tests/render/tablet.test.ts`: `drawTablet` with a recording Graphics stays inside its box and draws the gradient, inner line and lit brackets; a small box shortens its brackets as today.
  - `tests/render/menuMotion.test.ts`: the open's alpha and rise over time end at 1 and 0 by 120 ms; reduced motion gives the end state at once; hover in and out and the tab fade; stepping the motion reuses its state (no new objects).
  - The existing art tests: every frame registered and drawn, icons 16×16.
- **Playwright:**
  - `ui().menuMotion` (the menu opening, the motion running and its ms, settled) and `ui().hudDraws` (redraw counts for the boss bar and the other Graphics pieces 081 touches).
  - `tests/e2e/hudPolish.spec.ts`:
    - the open motion settles within 150 ms of tween time;
    - a click on the first frame crafts, and Esc on the first frame closes;
    - reduced motion emulated: in place at once;
    - still at rest over 120 frames, the HUD alone and each menu open;
    - object, tween and redraw counts flat;
    - the boss bar redraws only on change, its box and `bossBarBottom` as main's;
    - the Stormcrown against Region 1 readability checks.
  - `tests/e2e/hudPolishShots.spec.ts` (`REVIEW_SHOTS=1`): the review shots.
- **Kept green:** the e2e files listed in the layout criterion, lighting.spec.ts (074), foundryMood.spec.ts (079), newGameAfterQuit.spec.ts, and the other files the change touches. The full suite runs in CI. Older specs' review shots aren't retaken.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **One tablet look for every panel,** baked and live, world plates included, inside today's boxes.
- **Motion on menus only.** The HUD at rest stays still, so nothing flickers by the player in a fight and 074's pixel checks stay steady. The selection ring keeps snapping.
- **Open in 120 ms** (fade and a 4 px rise), **close at once**, hover 80 ms, tab switch 80 ms, and the press flash shortened from 160 to 140 ms to fit the 150 ms rule.
- **Reduced motion follows the system setting,** as the shake already does. No Settings row.
- **Hover and recipe cards appear at once,** with the new look but no motion: a tip mid-fight shouldn't lag.
- **Titles in pale brass** (`brass-light`), body text in snow.
- **The boss's name gets an ink outline,** at its size, for Region 1's bright ground.
- **Four icons redrawn** (casing, unidentified armor, rimestone, the Tube lane), and the two tier casings with the casing. Others stay.
- **Same on every Graphics tier.**
- **Existing per-frame allocations** in the HUD's sim reading stay, listed in the PR. 081 adds none and makes the boss bar redraw on change only.

## Open questions
None.

## Results
Built on `claude/081-hud-polish` (PR #98) to docs/plans/081-hud-polish.md, stacked on 074 at first and, after review, on 080's branch (with 073–076) and 078's (with 074–077): 081 merges last, after 073–080. 080's name card takes the look through `drawTablet` with no change on its side; the boss bar keeps 080's intro fill and fade on 081's frame. No file under `src/sim` changes; `SAVE_VERSION`, settings and key bindings are as on main. `npm run check` green: 3,053 unit tests with the merged specs (20 new for 081 in tests/data/hudLook, tests/render/tablet, menuMotion and rowHover; the 031 casing test now pins the open shell, as the spec redraws it).

- **Layout and sizes:** tests/fixtures/hudLayoutMain.json is main's `hudLayout.ts`, `hudPanels.ts`, `flowLayout.ts`, `MINIMAP`, `FOUNDRY_MAP`, `HOLLOWS_LOOK.bossBar` and the text styles' sizes, dumped before any change; the data test holds them equal (only `TABLET`, moved to `hudLook.ts`, and `MENU_FEEDBACK.pressMs`, 160 → 140, change).
- **One tablet look:** `TABLET` and `HUD_EDGES` in `src/data/hudLook.ts`; `drawTablet` (signature unchanged, a recording-Graphics test keeps it inside its box) and `tablet()` share it. Wells, rings, the tube card (baked and wide), HP and XP rims, the minimap's inner shadow, the open tab's glow, rarity frames' bevel; `hud-boss-bar` registered (244 × 10).
- **Readability:** the contrast test composites every text-carrying tablet (objective band 0.85, notice 0.85, pickup feed 0.75, hover name 0.85, banner 0.9, waypoint and port plates, panels, title cards, a closed craft tab) over snow and ink: all at least 4.5:1 (lowest: snow on the feed over snow, about 7.1:1; pale brass on a full tablet, 5.4:1). On High, the HP bar's, the tube card's, a carried cell's and an open craft row's pixels differ by under 3 a channel between Region 1 and the Stormcrown (hudPolish.spec.ts); 074's lighting.spec.ts passes (10).
- **Motion:** `MENU_MOTION` (open 120, rise 4, hover 80 in and 80 out, tab 80, press 140, all under 150). The craft menu fades without the rise (081.3). Menus wired: Crafting, the inventory with its hopper, crate and stash screens, Talents and Build, the gear panel, the pylon, waystone and purge menus, the blueprint menu and list, the research list, the restore and offering panels, pause, Settings (main and key list as tabs), cards, the note, the end card and the title's column. `ui().menuMotion` and `ui().hudDraws`.
- **e2e (each file alone, `--workers=1`, port 5347, after the review fixes and the 078 and 080 merges):** hudPolish (8: the open settles at 120 ms of tween time, the craft menu without the rise and the inventory with it; a click on the first frame crafts and Esc closes; a hovered row keeps its words; the row the cursor leaves keeps its rim the next frame, down and back up; reduced motion whole at once; HUD, Crafting, inventory and Talents still over 120 frames with redraws, tweens and objects flat; the boss bar's box and redraw on change only; through 080's intro the bar redraws as it fills and its frame fades in; the Stormcrown check with the carried cell required), bossIntro 7, hud 3, hudInventory 10, hotbars 3, handling 7, playtestUi 3, menuLabels 3, settings 2, talents 1, crafting 4, stash 2, equipment 2, legibility 8, hoverPress 1, sandboxStrip 3, zoom 1, newGameAfterQuit 1, blueprints 5, research 6, claiming 1, endCard 1, guidance 4, lighting 10: all green.
- **Motion check (real time, no fake clock):** every frame the game drew was copied straight after Phaser's step while the craft menu opened, a row was hovered and a tab switched (`?playtest`, 1280 × 720). This shared machine drew 8–13 frames a second (software GL, four builds), so each motion finishes inside one or two drawn frames: the menu's first frame is clear (alpha 0) and the next is in place; no frame is lost to a tween's start; the hover rim and a new tab's rows show on the next frame; nothing lags a click. After review: the row the cursor leaves keeps its rim while the new one comes in, so a sweep down and back up has a rim lit on every captured frame (strip 22); at 60 fps the two cross-fade over five frames. On a tenth-speed tween clock the open reads as one fade and rise (0 → 0.64 → 0.92 → 1). The curve's feel at 60 fps is for the playtest.
- **Review shots (docs/review/081):** 01–02 the HUD in Region 1 and the Stormcrown on High; 03–04 the boss bar with the Forgewright's heat gauge (plated); 05 Crafting; 06 a hovered row; 07 a pressed row (tweens stopped); 08 inventory; 09 Talents; 10 the gear panel; 11 the stash; 12 pause; 13 Settings; 14 the title's menu; 15 a hover card; 16 a recipe card; 17 the icons old beside new at 4× and at real size; 18–20 real-time strips of the open, a hover and a tab switch (`?playtest`); 21 the open on a tenth-speed tween clock; 22 the hover swept down and back up in real time; 17 retaken with the stormsteel casing struck through.

## Raised after the build
Conservative choices built; items marked **(Shaun)** want a yes or a change at the playtest.

- **081.1 The discovery banner's name turns pale brass (Shaun).** It uses the `title` style, which the spec turns `brass-light`. The title screen's logo keeps its snow (`TITLE_SCREEN.logo.fill`): it's the painting's, which the spec leaves alone.
- **081.2 Motion judged at real speed on your machine (Shaun).** This container draws 8–13 frames a second, so a 120 ms open shows as one or two frames here. Please open Crafting, hover rows and switch tabs at the playtest; the timings are data (`MENU_MOTION`).
- **081.3 The craft menu fades without the rise.** A menu's parts move as one container, and Phaser hit-tests a container's children where they're drawn. Every menu but Crafting hit-tests its own final layout, so its rise is visual only. Crafting's rows take clicks through Phaser's hit areas and sit 1 px apart, so a rise would have let a click in a row's top 2 px craft the row above during the open: it fades in place instead (`MenuMotion`'s `rise` false). A menu's first frame is drawn at `INPUT_ALPHA_FLOOR` (0.001), not 0: Phaser 4.2.1's `InputManager.inputCandidate` takes no input on a container's children at alpha 0.
- **081.4 A tween's first update.** A new Phaser tween spends its first update taking its start values; each motion's tween is stepped past that silently when made (`SEEK_MS`), so no frame is lost.
- **081.5 The gear panel's own press flash** shortened 160 → 140 ms too (`GEAR_PANEL.flashMs`), under the 150 ms rule.
- **081.6 What appears at once inside a moving menu:** the Build tab's keyword chip labels (made as their chips show) and the note's typing box (a page element). Hover and recipe cards appear at once, as specced.
- **081.7 Redraw on change.** The HP fill, the XP row, the wide tube card and the boss bar now redraw only when what they show changes; the boss bar no longer builds its report each frame. The HUD's existing per-frame allocations stay for a later fix: `HudView.update`'s input objects, the minimap's marker list and its show list, the objective's key string, `HealthBar`'s XP report.
- **081.8 Gear tabs and the sandbox panel** keep their tabs as they were (no tab fade): the spec's tab list is Crafting, Talents and Build, and Settings.
- **081.9 Strips.** The spec's "a frame every 16 ms on Playwright's clock" became real-time strips plus one slowed-tween strip for the curve's shape: Phaser's tweens step on `Date.now`, which Playwright's fake clock distorts.
- **081.10 Files at the line limit.** `InventoryPanel.ts` is 306 lines (302 on main) and `assets.ts` 315 (313); the casing's shell moved to `art/casing.ts` to keep `items.ts` under 300. `GameScene.ts` is 314 after 078's and 080's pieces met in the merge (each branch kept its own).
- **081.11 Hover-out fixed after review.** The row the cursor left snapped plain: moving down retired the lit rim twice (the second time onto the new row), and a seek reset a fade-out with a bare `to` to an unset start, so it began at 0. The fading rim has its own slot (a pool of two overlays), every fade names its start, a RowHover unit test with a fake scene fails on either old cause, and an e2e checks the old rim still shows the frame after the cursor leaves, down and back up.
- **081.12 The stormsteel casing** is struck through with lightning (a violet vein down the bowl, a spark at the lid), so it parts from the steel casing at real size.
- **081.13 The boss bar during 080's intro** redraws as it fills (its change key is the drawn fill's width) and its baked frame fades with the bar; `ui().bossBar` reports the real heat and the frame's alpha.

