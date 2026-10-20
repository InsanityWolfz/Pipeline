# 044: Sandbox
status: approved

Approved on draft by Shaun in chat, 2026-10-20 ("Approve 044 on draft"): the build follows the proposals in the open questions.

From Shaun in chat, 2026-10-20: playtesting the later parts of the game means replaying the whole progression, and the `?start=` links only help a little. He wants "a testing area … a sandbox that we spawn in, and we have just a ton of every single item and resource. And then there's an intake in the sandbox so we can simulate every type of ammo spread or combination and then test them. And then we just have random areas where the enemies are." Interview answers the same day are quoted below.

## Goal
`?sandbox` drops Shaun straight into a test room with everything: every item, every round and tag, every stage, the level cap with free talents, and every gear piece. A loadout panel sets the intake's volley to any combination. A spawn panel and fixed pens put any enemy in front of him. He can test a weapon, an enemy or a boss in seconds, without playing the run to get there.

## Design references
- Shaun's interview, 2026-10-20:
  - Entry: "URL flag ?sandbox": it works on every preview link, production builds included, and the shipped game never shows it.
  - Intake: "Loadout panel": a panel sets each intake entrance's ammo directly (any round, any tag, any stage), with bottomless reservoirs.
  - Enemies: "Spawn panel + pens": pens with one of each enemy that respawn when cleared, and a panel that spawns any enemy at any ring (1–3), champion or not, any count. The Warden and the Bulwark each get an arena.
  - Player tools: god mode, max level with free talents, every gear piece. (No damage readout.)
- Specs: 024 and 028 (entrances and the volley), 029 (tags and stages), 032 (champions), 034 and 043 (the Bulwark, its arena and seal), 035 (Hollows enemies), 036 (gear and relics), 037 (leveling and talents), 041 (ring scaling), 042 (the save slot and the flow).
- Existing starts in src/render/playtest.ts (`?playtest`, `?start=field`, `?start=hollows`) and the dev hook's spawn helpers (src/render/testHook.ts).

## Acceptance criteria

**Entry (render, data)**
- [ ] `?sandbox` boots straight into the sandbox room in play, with no title screen, in dev and production builds.
- [ ] The sandbox never reads or writes the save slot, its backup or the settings' save rows. A real save is untouched by a sandbox visit (tested). Settings (volumes, keys) and F notes work as usual.
- [ ] The shipped game (no flag) has no way into the sandbox.

**The room (sim, data)**
- [ ] A room of its own (not the overworld), laid out in data, with:
  - a spawn point with clear floor around it;
  - the intake rig: the tube is attuned and linked to three open entrances, wherever the player is;
  - one pen per non-boss enemy type: Husk, Wisp, Charger, Burrower, Shardback and Sniper construct;
  - a Warden arena and a Bulwark arena (the Sunken Forum's layout, seal included).
- [ ] The room has no ring of its own. Enemies take the ring the panel or pen gives them (041's `RING_SCALE`).

**Kit (sim, data)**
- [ ] The player starts with 99 of every item and resource and every round and tagged round, every stage and piece unlocked, all research done, and every recipe known. The kit is data in `src/data/sandbox.ts`, derived from the item, round and tag lists, so new content is included without editing it.
- [ ] The player is at the level cap with every talent point, and respec is free (as 037).
- [ ] A stash holds every gear piece and every relic (036).

**Loadout panel (sim, render)**
- [ ] A Sandbox panel, toggled by a key, sets each of the three entrances to any round: a base round plus any legal tags (029). The volley fires as in the real game (024, 028).
- [ ] Entrance reservoirs in the sandbox never run out (bottomless).

**Spawn panel and pens (sim, render)**
- [ ] The same panel spawns any enemy (bosses included) at ring 1, 2 or 3, as a champion or not, 1–10 at a time, a short distance in front of the player. A Clear button removes every spawned enemy.
- [ ] Each pen holds one of its enemy. Once a pen is cleared, its enemy comes back after a short delay.
- [ ] The Warden and the Bulwark each wait in their arena. A button in the panel resets either one, as the altar's summon does (034).

**Player tools (sim, render)**
- [ ] A god mode toggle in the panel: the player takes no damage. Hits still show their feedback, so fights and telegraphs can be watched.

**Dev hook and checks**
- [ ] `getState()` reports `sandbox: true` and the loadout. `ui()` reports the panel.
- [ ] `npm run check` passes, and the e2e covers: boot `?sandbox`; set a mixed loadout and fire it; spawn a ring 3 champion pack; god mode on, then a hit that takes no health; the save slot untouched.

## Data changes
- `src/data/sandbox.ts` (new): the room layout, the pens, the spawn defaults, the kit rules, the panel's key and the pen respawn delay.
- `src/data/rooms.ts`: the sandbox room.

## Out of scope
- A damage readout (not chosen).
- Saving or sharing sandbox setups.
- Any balance change. The sandbox only puts existing content in reach.
- Changes to `?playtest`, `?start=field` and `?start=hollows`. They stay for the e2e tests.

## Test plan
- Vitest (sim): the kit covers every item, round, tag and stage, derived from data; bottomless reservoirs; spawn at ring and champion; pen respawn; boss reset; god mode; determinism.
- Vitest (render/data): `?sandbox` parses to the sandbox start, and the sandbox never touches the save keys.
- Playwright: the flows in "Dev hook and checks".
- Screenshots: the room overview, the panel, a mixed volley in flight, a ring 3 champion pack.

## Open questions
Each has a proposal. The build follows the proposals if Shaun approves on draft.
- **044.1 The panel's key.** Proposal: the backquote key (`` ` ``), unbound in the game today, and rebindable (042).
- **044.2 How long until a pen refills?** Proposal: 5 s after its last enemy dies.
- **044.3 Pen rings.** Proposal: Region 1 enemies (Husk, Wisp) at ring 1, Hollows enemies at ring 3, the rings they meet in the real game. The spawn panel covers any other ring.
- **044.4 Gear rolls in the stash.** Proposal: each piece at each rarity (Common, Fine, Rare) with mid rolls, plus every relic, so the stash stays browsable.
- **044.5 Does the sandbox show the objective line and the end card?** Proposal: no. The objective panel is hidden, and the Bulwark's kill doesn't show the end card.
- **044.6 Does KO still happen with god mode off?** Proposal: yes, but the player wakes at the sandbox's spawn point with the kit intact, since nothing is at risk there.

## Raised after the build
The build (branch `claude/044-sandbox`) follows the open questions' proposals. These points weren't decided by the spec; each was built the most conservative way, and each is a proposal for Shaun.
- **044.7 Wearing the stash's gear.** Gear is worn only at the identification bench (036), and the sandbox can't reach the foundry, so the room has its own bench beside the spawn (its gear panel, and its Stages rows). Proposal: keep it.
- **044.8 Respec.** 037's respec is free but works only in the foundry; in the sandbox it works anywhere in its room (the tree's reset button shows there). Proposal: keep it.
- **044.9 Boss reset.** Reset puts the boss back at its arena's start at full health, idle, with its adds and bombs gone, at once (043's reset when the player leaves the forum), and brings a dead one back. It doesn't play the altar's crack-and-rise (that draws at the Hollows' altar). Proposal: keep it.
- **044.10 Where "in front" is.** The cursor is on the panel when Spawn is clicked, so spawns go the way the player faces: 5 tiles out, 2 tiles apart across. A spawn that would stand in a wall comes back toward the player. A boss is never a champion. Proposal: keep it.
- **044.11 A Bulwark from the spawn panel.** The Bulwark's AI (034) never leaves the Sunken Forum, so one spawned outside it stands idle. The forum's Bulwark is the one to fight. Proposal: leave it.
- **044.12 God mode's feedback.** A hit lands as usual (knockback, flash, hit invulnerability, and the damage number it would have dealt) but takes no health. Last Ember never fires; a ready Wardstone still blocks. Proposal: keep it.
- **044.13 The panel's key in Settings.** The key list shows "Sandbox panel" only in the sandbox. A settings file that already binds the backquote to something else, or a rebind onto it outside the sandbox, leaves the panel unbound (rebind it in Settings in the sandbox). The key is only bound in the sandbox, so the shipped game never captures it. The save rows (Export save, Import save) are hidden in the sandbox. Proposal: keep it.
- **044.14 The room.** The foundry's tiled floor and walls, with the forum in the Hollows' stone, the overworld's daylight and outdoor sounds. The pens are walled bays open to the south, far enough apart that standing at one doesn't wake the next; their enemies chase and walk home as anywhere. The default loadout is three plain arrows. Only the entrances are bottomless; the 99 carried rounds aren't. Proposal: keep it.
- **044.15 Saves.** The sandbox's own state exists only in a sandbox run, which is never saved, so a real save's shape is unchanged and `SAVE_VERSION` stays 1 (the save-shape fingerprint test passes as it is).
