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
- [ ] Facing forward, both arms are the same size; the shoulders no longer overlap the head; the belt wraps all the way round the body.

**HUD and text (A.2, A.3, A.5)**
- [ ] Hover name tags are smaller and sit where they never cover the E prompt or the player.
- [ ] Discovery banners show at the top of the screen, not over the player.
- [ ] The end-of-playtest card shows the cursor above it.

**Screens and E (A.6–A.9, A.12–A.14)**
- [ ] E closes the inventory and any hopper, crate or stash screen, as Esc does.
- [ ] E opens the hopper or crate under the cursor when it's within 3 tiles of the player, not the one nearest the player. With nothing under the cursor in reach, E falls back to the nearest, as today.
- [ ] A crate's 8 slots all hold stacks (stack sizes from 047), instead of 100 items in total.
- [ ] Gear scrolls instead of paging.
- [ ] Hovering an inventory item shows its name in a tooltip.
- [ ] The gear tooltip goes away as soon as the mouse leaves the gear's square, even onto the tooltip.
- [ ] Holding Shift over gear shows its breakdown (040), as it does elsewhere.

**Safe items (A.10)**
- [ ] Anything picked up, crafted or taken from a crate or the stash inside the foundry is banked at once (Shaun).

**The second-line goal (A.11)**
- [ ] The goal reads "Feed ammo into the new entrance". It completes when the entrance the Warden's core restored holds ammo (any ammo).
- [ ] Its arrow points at that entrance (left or right), not the middle. A test reproduces Shaun's case from his save (docs/brainstorm/2026-10-21-playtest-save.json).

**Effects (A.15, A.16)**
- [ ] Mending shows no sparkle while it heals.
- [ ] The ward's ring stays still under the player (it doesn't shake as they walk) with a small shield icon while the ward is ready; its expand-on-hit stays.

**Title screen (F)**
- [ ] The wanderer breathes (a slow bob), the cloak and hose sway in the wind, and the tube's glow pulses (Shaun).
- [ ] The logo and the menu buttons are bigger, centred where they are.

**F11 (A.4)**
- [ ] Fullscreen (F11) no longer flickers scroll bars.

## Out of scope
- Guidance (051), foundry logistics (052), the world reshape and boss doors, combat readability.

## Test plan
- Vitest: E targets the hovered hopper or crate within 3 tiles; crate slots hold stacks; items gained in the foundry bank at once; the second-line goal from Shaun's save; E closes screens.
- Playwright: tooltips appear and go away; banners at the top; the end card's cursor; the title screen's motion via `ui()`.
- Screenshots: the wanderer facing forward, a name tag beside an E prompt, a top banner, the ward ring, the title screen.

## Open questions
- **050.1 Where do name tags go?** Proposal: below the hovered thing's feet, in the small label font, so the E prompt above it stays clear.
- **050.2 F11's cause.** Proposal: fix whatever makes the page overflow at fullscreen (likely the canvas sizing); if it needs a design choice, record it.
