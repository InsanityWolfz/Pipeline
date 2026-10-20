# Playtest-notes interview

Oct 20, 2026 · Shaun's answers to the spec interview on docs/brainstorm/2026-10-20-playtest-notes.md. Recommended options are marked (rec); Shaun's own words are quoted.

Already settled before the interview: note 3 dropped (the Warden stays), notes 15, 17, 18 built (029 option A, 043), note 19 needs no change.

## Round 1
- **First batch:** 045 readability fixes, 046 foundry onboarding, 047 inventory and hotbars (rec). Volley shape (note 5) and the resin pylon (note 16) are the next batch.
- **HP bar (note 2):** red, nothing extra; the low-HP edges already warn.
- **Pickup (note 8):** magnet pull, 96 px (rec): drops within 3 tiles drift to the player; the E/walk-over reach grows to 96 px; nodes still need E.
- **Wisp aggro (note 13):** wake on screen like other enemies (rec).

## Round 2
- **Build controls (note 9):** a key strip above the build bar in build mode, using the bound keys (rec).
- **Cache loot (note 14):** items burst out of the chest as icons with names, then fly to the player; the pickup feed lists them (rec).
- **Example line (note 10):** runs until its stock is used up; then an objective shows how to refill the hoppers (rec).
- **Splitter (note 4):** unlocked from the start (rec).

## Round 3
- **Early ammo (note 1):** double Region 1 recipe outputs, by hand and in machines; costs and node yields unchanged (rec).
- **Hotbars (note 11):** left click fires the intake's volley; the carried bar (1–5) picks an item and right click uses it (rec).
- **Inventory (note 12):** a grid of stacks that scrolls. "Shift click for half and ctrl click for the whole stack and don't show those controls on the menu it looks bad."
- **Stages (notes 6, 15):** "In C, anywhere but don't call them stages just put them under their corresponding category in the crafting menu like frost arrows go in the arrows column and then because this makes the crafting menu more saturated just have a tab for each ammo type."

## Round 4
- **Craft tabs:** each ammo tab holds that ammo's whole chain, parts included; a part two families use shows in both (rec).
- **Hopper screen:** the hopper's own slots on top, the grid inventory underneath; click one, Shift+click half, Ctrl+click the stack, both ways (rec).
- **Carried bar:** drag a stack onto a slot, and a newly picked-up usable kind fills the first empty slot (rec).
- **Dry intake:** left click punches (023); carried items only go out on right click (rec).

## After the 046 build
- **046.7, early ammo:** "2× per resource" (rec). Only the last step of each Region 1 chain doubles, so one wood, stone and fiber make 16 arrows (from 8); parts and landmine costs stay as they were. The build had doubled every step, which compounded to 4×.
- **047.9, teaching right click:** "Left fires carried until attuned". Before the tube attunes (no intake yet), left click fires the selected carried item as right click does; once attuned, left click is the volley (or the punch) and right click the carried item. A one-time "Right click: carried items" hint shows as the attune ends, once per save.
