# 050: Playtest fixes and the title screen
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("approve 050-052"): the build follows the proposals in the open questions.

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, themes A and F) and his interview answers (docs/brainstorm/2026-10-21-playtest-interview.md).

## Goal
Clear the small bugs and rough edges Shaun hit playing from a New game, and give the title screen a little more life.

## Design references
- Specs: 016 (the wanderer's rig), 031 (inventory panel, at risk or banked), 032 (discovery banners), 036 (gear, ward), 037 (Mending), 040 (hover and Shift breakdown), 042 (title screen, end card), 045 (E prompts), 046 (the second-line goal), 047 (grid inventory, hopper and crate screens).

## Acceptance criteria
**Character art (A.1)**
- [x] Facing forward, both arms are the same size; the shoulders no longer overlap the head; the belt wraps all the way round the body.

**HUD and text (A.2, A.3, A.5)**
- [x] Hover name tags are smaller and sit where they never cover the E prompt or the player.
- [x] Discovery banners show at the top of the screen, not over the player.
- [x] The end-of-playtest card shows the cursor above it.

**Screens and E (A.6–A.9, A.12–A.14)**
- [x] E closes the inventory and any hopper, crate or stash screen, as Esc does.
- [x] E opens the hopper or crate under the cursor when it's within 3 tiles of the player, not the one nearest the player. With nothing under the cursor in reach, E falls back to the nearest, as today.
- [x] A crate's 8 slots all hold stacks (stack sizes from 047), instead of 100 items in total.
- [x] Gear scrolls instead of paging.
- [x] Hovering an inventory item shows its name in a tooltip.
- [x] The gear tooltip goes away as soon as the mouse leaves the gear's square, even onto the tooltip.
- [x] Holding Shift over gear shows its breakdown (040), as it does elsewhere.

**Safe items (A.10)**
- [x] Anything picked up, crafted or taken from a crate or the stash inside the foundry is banked at once (Shaun).

**The second-line goal (A.11)**
- [x] The goal reads "Feed ammo into the new entrance". It completes when the entrance the Warden's core restored holds ammo (any ammo).
- [x] Its arrow points at that entrance (left or right), not the middle. A test reproduces Shaun's case from his save (docs/brainstorm/2026-10-21-playtest-save.json).

**Effects (A.15, A.16)**
- [x] Mending shows no sparkle while it heals.
- [x] The ward's ring stays still under the player (it doesn't shake as they walk) with a small shield icon while the ward is ready; its expand-on-hit stays.

**Title screen (F)**
- [x] The wanderer breathes (a slow bob), the cloak and hose sway in the wind, and the tube's glow pulses (Shaun).
- [x] The logo and the menu buttons are bigger, centred where they are.

**F11 (A.4)**
- [x] Fullscreen (F11) no longer flickers scroll bars.

## Out of scope
- Guidance (051), foundry logistics (052), the world reshape and boss doors, combat readability.

## Test plan
- Vitest: E targets the hovered hopper or crate within 3 tiles; crate slots hold stacks; items gained in the foundry bank at once; the second-line goal from Shaun's save; E closes screens.
- Playwright: tooltips appear and go away; banners at the top; the end card's cursor; the title screen's motion via `ui()`.
- Screenshots: the wanderer facing forward, a name tag beside an E prompt, a top banner, the ward ring, the title screen.

## Open questions
- **050.1 Where do name tags go?** Proposal: below the hovered thing's feet, in the small label font, so the E prompt above it stays clear.
- **050.2 F11's cause.** Proposal: fix whatever makes the page overflow at fullscreen (likely the canvas sizing); if it needs a design choice, record it.

## Raised after the build
Built on `claude/050-playtest-fixes` (plan: docs/plans/050-playtest-fixes-2.md). 050.1 and 050.2 are built as proposed. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **050.1 Name tags, as built.** The tag is in the small label font and sits under the hovered thing's feet. Where that would cover the player, it goes just above the thing; if that meets the E prompt (wherever the prompt is) it goes beside the thing, away from the player first; last, above the prompt. It never covers the player, the E prompt's key cap or the minimap. Proposal: keep.
- **050.2 F11's cause.** The page had no overflow rule and the canvas was inline, which leaves a few px under it. At a window the view fits exactly (F11 on a 1080p screen: 1920×1080 at zoom 3) the page was 1084 px tall, so a scroll bar came, the window narrowed, the fit dropped to zoom 2, the bar went, and round it went. Fixed in index.html (no overflow, a block canvas), no design choice. An e2e holds the page to the window's size at 1920×1080.
- **050.3 The second-line goal's cause (A.11).** Reproduced from Shaun's save (tests/sim/secondLine.test.ts lays its state over a fresh sim, rewound to his note: only the Warden's node restored, at the east cap, his bomb line feeding it, his split ley bolts in the centre). The goal checked "two entrances hold arrows" (046), so with split bolts in the centre it could never hold, whatever the new entrance held; and its marker took the middle of the open entrances, which with the centre and east open is the centre. Now each entrance records the research node that opened it, the goal reads "Feed ammo into the new entrance" and holds once the entrance the Warden's core opened holds any ammo, and its arrow points at that entrance. The next goal, "Feed two entrances to fire a spread", is unchanged. SAVE_VERSION 7, no migration (an older save reads as too old). Proposal: keep.
- **050.4 Which screens E closes.** E closes the inventory, a hopper's or crate's screen and the stash (the spec's list), as Esc does, before it opens anything. Other site menus (the bench, a claimed pylon, the waystone) keep their behaviour (Esc or walking away closes them). Proposal: keep; say if E should close every menu.
- **050.5 E on the hovered piece.** The cursor's hopper or crate opens within 3 tiles (feet box to its box), and its screen keeps working, and stays open, while the player is that close; nothing hovered falls back to the nearest in reach, as before. Sorters keep the nearest-only rule (052 removes them). Proposal: keep.
- **050.6 Crates.** Each of the 8 slots holds one stack at 047's sizes (raws 50, rounds 100, thrown 20), for hand deposits and lines alike. A hopper's line cap stays 99 (028). Proposal: keep.
- **050.7 Banked in the foundry.** Gains in the foundry are banked at once, including taking from a hopper (Shaun: "stuff in the foundry"); a banked schematic reveals its node, as banking does. 011's test that a hopper withdrawal is lost on a death now says it's kept. Proposal: keep.
- **050.8 Shift over gear (A.7).** Couldn't reproduce: in the build, Shift over a gear row or a worn piece's cell shows its breakdown (the e2e holds it). A guess at what Shaun saw: the summary says "hold Shift" only when a bonus changes the piece's numbers, so a plain piece never mentions Shift. Proposal: keep as built; say if every gear tip should show the hint.
- **050.9 Small choices.** The gear list scrolls a row per wheel step, with a thin brass bar at its right while it scrolls; a row's tip now sits beside the panel, clear of the bar. Item name tips show for every non-round in the grid and in a hopper's or crate's row (rounds keep their summary). The banner sits at y 34, under the boss bar and above the objective line. The ward's shield is a small violet shield on the ring's front edge. The title's wanderer is drawn live (breath 3.6 s, wind 2.7 s, glow 2.2 s); the logo is 1.28× and the buttons 1.25×. The flow's own pointer shows over its screens (the end card, Settings and cards over a game) only while the game hides the OS cursor. Proposal: keep.
- **050.10 Results.** `npm run check` passes (1701 unit tests). The full `npx playwright test`, once at the end: 141 passed, 2 failed, 128 skipped (review shots). The two: 050's own gear test assumed the tip never covers another row (fixed; the file's 9 tests pass) and settings.spec timed out under the parallel run (passes alone, on this branch and on main). Review shots in docs/review/050 (the wanderer facing forward in play and on the sheet, a boulder's name tag beside its E prompt, a banner at the top, the ward ring and shield, the title, the scrolled gear list and an item tip). Older shots retaken only where 050 changes them: 031/05 (its at-risk pickups now happen outside, since gains in the foundry are banked), 032/11–12 (the banner), 033/08 and 040/07 (small name tags), 036/01 and 040/04 (the gear list's bar and row tip), 036/04 (the ward's shield), 042/01–06 (the title). The wanderer's new front view shows in every older shot with the player facing down; those weren't retaken. `npm run measure`, recorded, not tuned, identical to main: ammo line and still 5/5 met; ring 1 2.2–3.2 s, ring 2 2.4–4.0 s met; ring 3 4/5 in band (14.1–21.6 s, MISSED); the Bulwark's decent build 14/20 with 2 KOs (MISSED); the naive bot KO'd 5/5.
- **050.11 The bench with the bag open (follows from 050.4).** With the inventory open beside the bench, the first E closes the bag and the second opens the bench (before 050 one press did both, the bag closing as the bench opened). The same goes for the stash. An E that closes a screen is used up: it no longer also reaches the sim, so closing the bag beside a boulder or a pylon doesn't harvest or claim it (a bug the review found). Proposal: keep.
- **050.12 A champion's name showed twice (seen in the retaken 040/07).** Its nameplate (032) names it over its head, and the hover tag named it again under its feet. Built: over a champion the hover tag shows only its chips (Chill 2 and the like), and nothing when it has none; any other enemy's tag still names it. Proposal: keep.
- **050.13 The title's pipe.** The bigger Quit row covered the intake pipe's cap. The pipe now stands against the ruin's left wall (24 px left, its glow with it), so the cap and the menu both show and the menu stays centred where it was. Proposal: keep.
