# 042: Shippable playtest build
status: approved

Approved on draft by Shaun in chat, 2026-10-19 ("Approve on draft"); from docs/brainstorm/2026-10-19-balance-ship-interview.md.

## Goal
A friend opens the Pages link and gets a complete-feeling game, not a prototype:
- a painted title screen with New game, Continue, Settings and Quit
- one save slot that saves on entering the foundry, so closing the game costs only what was carried since then
- Settings for volume, shake, flashes and key bindings, plus save export and import
- a calm camera that locks to the player and shakes only for big moments
- an "end of the playtest build" card after the Bulwark, then free play
- an F key that saves a feedback note with a game-state snapshot, sent along with the exported save

Built after 041.

## Design references
- docs/design.md:
  - "Death and tension": a death sends you home and loses what you picked up since your last return or deposit; factory, level, talents and gear are kept.
  - "Pillars" 7 (no nagging, no timers that punish logging off) and 8 (the world only runs while the game is open); "The Foundry": "Play time only".
  - "World, regions, ley lines, bosses": the Bulwark and its first kill.
  - "Tech and prototype scope": the three-quarter view and the vector art style.
- docs/brainstorm/2026-10-19-balance-ship-interview.md, "042 shippable build", rounds 1 and 2 (the source of truth for this spec):
  - Title screen: "a painted vector scene. The wanderer stands on a ridge with the tube, the ruin's pipe glows below, the 'Pipeline' logo is in the display font, and ley light drifts slowly. The menu is New game, Continue, Settings and Quit."
  - Saving: on entering the foundry only. One save; New game asks before overwriting it. Browser storage, plus Export and Import of a save file in Settings.
  - Continue restores everything as of the last foundry entry: factory, research, claims, gear, level and talents, stash, landmarks found, boss kills and goals. "You wake in the foundry, and anything carried since then is lost, as on a death."
  - Settings: master, music and effects volume; shake and flash toggles; key bindings; save export and import.
  - Screen shake: "the screen shake or pan when you shoot is appalling so it needs removed". Shake only for big moments (taking a hit, a KO, boss slams and pounds, gates opening); none from firing, kills, or the player's own Bursts and mines. The camera locks tightly to the player with no easing pan, and the Settings toggle turns all shake off.
  - Ending: beating the Bulwark ends the demo. A short "end of the playtest build" card shows what's next, a thanks and a feedback prompt, and then free play continues.
  - Feedback: F opens a note at any time. Notes are saved with a game-state snapshot and included in the save export.
  - Hosting: after Shaun's playtest of this branch, merge it to main and share the Pages root link.
- docs/brainstorm/2026-10-19-drive-rant.md, theme 10 (a title screen with art and the name; a soft save that respawns you in the foundry; a start-to-finish flow so it feels like a complete game) and theme 11 (what comes after this sprint, for the end card).
- `.claude/rules/sim.md`: "State is plain serializable data." docs/process.md: the sim is deterministic, and preview builds are production builds without `window.__GAME__`.
- Specs: 011 (death and banking), 014 and 021 (juice; no shake on firing), 015 (no camera pan), 016 and 020 (vector art, the two bundled fonts, stone tablets), 019 (the intake pipe and the attune look), 020's pause menu, 031 (panels and the 021 pointer), 034 (the Bulwark's first kill, `bossDefeats`).

## Acceptance criteria

**Game flow (render)**
- [ ] One game-flow state machine in render (`src/render/flow/`) owns which screen is up: `title`, `play`, `paused`, `settings`, `endCard`, `feedback`, `confirm` and `farewell`. Each state change is logged, and `__GAME__.flow()` reports it.
- [ ] Transitions:
  - title → play: New game or Continue
  - play → paused: Esc; paused → play: Resume or Esc
  - title or paused → settings → back to where it was opened from
  - play → endCard: the Bulwark's first kill; endCard → play: Keep playing
  - any state but `confirm` → feedback: the feedback key; feedback → back to where it was opened from
  - paused → title: Quit to title, after a confirm
  - title → farewell: Quit
- [ ] The sim steps only in `play`. Every other state pauses the world, as Esc does today (020).
- [ ] The shipped game (a URL with no `start` or `playtest` parameter) always boots to the title. Any `?start=…` or `?playtest` URL skips the title and never reads or writes the save slot (042.1). A new `?start=tutorial` boots the real start without the title, for the e2e tests that boot today's plain URL.

**Title screen (render, data, art)**
- [ ] A painted vector scene fills the 640×360 view, in the 016/020 style with the shared ink outline:
  - a dusk-to-daylight sky
  - the hooded wanderer standing on a ridge in the foreground with the tube and its brass tank (the player rig, posed)
  - the ruin below, with the intake pipe's cyan glow (019's look) breathing slowly
  - ley motes drifting slowly across the scene (014's ambient motes, slower)
- [ ] The "Pipeline" logo in the display font, large, with a soft cyan glow.
- [ ] A column of menu rows in 020's style, with hover and press feedback: **New game**, **Continue**, **Settings** and **Quit**.
  - Continue is greyed out when there is no save. With a save it shows one line under it: level, pylons claimed, bosses beaten and when it was saved ("Level 8 · 3 pylons · Bulwark · saved 19 Oct, 21:40").
  - With an unreadable save, Continue is greyed out and the line says why (see Versioning).
- [ ] Sound: the foundry's ambient loop plays under the title from the first click or key (browsers block sound before one); the menu's click sounds as other menus' do.
- [ ] The scene, logo and rows are pending Shaun's approval by eye.

**New game (render, sim)**
- [ ] With no save, New game starts the real game (012's tutorial start) at once.
- [ ] With a save, it shows a confirm first: "Start a new game? Your saved game will be replaced." with **Start new game** and **Cancel**. Confirming moves the old save to the backup key (042.6) and clears the slot, then starts. The new game first saves when it first enters the foundry.

**Saving (sim, render)**
- [ ] The game saves **only on entering the foundry**, by any way in: the door, fast travel, and waking there after a KO (042.2). It saves on the tick the arrival banks the haul (011), so the save holds what the player brought home.
- [ ] Saving serializes the sim state (042.3):
  - `src/sim/save.ts` (pure, no browser APIs) has `snapshot(state)`, which returns the whole `SimState` as plain JSON-safe data with the tick's `events` emptied, and `restore(data)`, which returns a `SimState`.
  - The sim emits a `foundryArrivals` event; render writes the snapshot to storage on that tick. The sim never touches storage.
  - Render-side extras (the save time, the build id, whether the end card was seen) go in the envelope around the snapshot, never in the sim state.
- [ ] A data-shape test walks a fresh state and a late-game state (`?playtest`, after a scripted run through the foundry, a claim and a boss) and fails on anything that isn't plain JSON: `undefined` in arrays, `NaN`, `Infinity`, functions, Maps, Sets or class instances.
- [ ] A late-game save is under 1 MB of JSON (a test measures it).
- [ ] A failed write (storage full, blocked or missing) shows a short "Couldn't save. Export your save from Settings." notice in 031's pickup-feed style and never stops play.

**Continue (sim, render)**
- [ ] Continue restores the save and wakes the player in the foundry, as a KO's wake does (011): the same wake spot and animation, and the world outside reset as a KO resets it (unclaimed land's packs, the Bulwark if not yet beaten). Nothing is lost on waking, because the save was taken as the haul was banked.
- [ ] Everything as of the last foundry entry comes back exactly: the factory (pieces, their contents and progress), the link and the intake's entrances, research, claims and their supply, gear and what's worn, level, XP, talent points and talents, the stash, landmarks found and caches opened, boss kills and the altar, goals, recipes known (`crafted`, `found`, `carried`), and the inventory and banked haul at that moment.
- [ ] Anything that happened after that entry is gone, as on a death: items picked up, pylon deposits, claims, kills and XP (042.2).
- [ ] **Determinism:** a test runs a scripted game, saves at a foundry entry, and keeps stepping it N ticks with fixed commands. It then restores the save from its JSON text and steps the same N ticks with the same commands. The two states are deep-equal (`events` aside). The same holds after a restore, the Continue wake and N ticks, run twice.

**Versioning and bad saves (sim, render)**
- [ ] The envelope is `{ format: 'pipeline-save', version, build, savedAt, meta: { endCardSeen }, state }`. `SAVE_VERSION` starts at 1 and lives in data.
- [ ] **Migrations:** `SAVE_MIGRATIONS` maps each version to a pure function that upgrades its envelope to the next. Loading runs them in order up to `SAVE_VERSION`. A test proves the hook with a synthetic v1 → v2 migration registered in the test.
- [ ] Fields missing from an older save are filled from a fresh `createSim`'s values, so a later spec that only adds a field needs no migration. A rename or reshape needs one.
- [ ] A shape test fixes the save's key paths and value types (from a fresh state and the late-game state). It fails if they change while `SAVE_VERSION` doesn't, with a message saying to bump the version and add a migration if needed (042.7).
- [ ] **A corrupt save** (it isn't JSON, the format is wrong, a required field is missing or the wrong type, or `restore` throws) never crashes the game. Continue is greyed out with "Your save couldn't be read." Settings offers **Export damaged save**, which downloads the raw text. New game still works after its confirm.
- [ ] **A save from a newer build** (version above `SAVE_VERSION`) is never loaded or overwritten. Continue is greyed out with "This save is from a newer version of the game." While that save is in the slot, this build doesn't save until New game is confirmed (042.5).
- [ ] **A save too old to migrate** (no migration path) is treated as unreadable, and is kept until the player confirms New game or imports another save.

**Export and import (render)**
- [ ] Settings → **Export save** downloads `pipeline-save-YYYY-MM-DD.json`: the save envelope (or `null` with no save) and every feedback note, as `{ format: 'pipeline-export', version, exportedAt, build, save, feedback }`. Settings aren't included (042.8).
- [ ] Settings → **Import save** opens the browser's file picker. The file is checked like a stored save (format, version, migrations, shape).
  - A good file asks "Replace your saved game with this one?"; confirming replaces the slot (the old one goes to the backup key), and its notes are added to the stored notes, skipping any whose id is already there.
  - A bad file shows why ("not a Pipeline save", "from a newer version", "couldn't be read") and changes nothing.
- [ ] After an import, the title's Continue line shows the imported save. From the pause menu, an import takes effect at the next Continue.

**Settings (render, data)**
- [ ] Settings opens from the title and from the pause menu. It is a 020 tablet inside 640×360 with these rows:
  - **Master volume**, **Music volume**, **Effects volume**: 0–100% in 10% steps, each with − and + buttons. The heard level is master × channel. Music is the room ambience loops, since the game has no music yet (042.9); effects are every one-shot sound.
  - **Mute**: on/off (today's mute, kept).
  - **Screen shake**: on/off. Off means no shake at all.
  - **Flashes**: on/off (042.10). Off removes full-screen and bright flashes: the Cold Burst tint, muzzle, burst, mine and Split flashes, and the white hit flash on enemies (it becomes a short tint). The low-HP edge stops pulsing and holds steady. Telegraphs, damage numbers and the danger reds never change.
  - **Key bindings**: opens a list (below).
  - **Export save**, **Import save**, and **Export damaged save** when there is one.
  - **Back**.
- [ ] The pause menu becomes **Resume**, **Settings** and **Quit to title**. Its sound rows move into Settings. The `[` and `]` keys still step the master volume.
- [ ] **Key bindings:** one row per action: move up, down, left and right; roll; interact; crafting menu; build; inventory; research; talents; rotate piece; flip piece; ammo slots 1–4; and feedback.
  - Clicking a row waits for a key and binds it; Esc cancels.
  - A key already bound to another action swaps with it, so no key ever does two things.
  - Esc (close and pause), Tab (the inventory's tab, 031) and the mouse buttons aren't rebindable.
  - **Reset to defaults** restores today's keys, with feedback on F and flip moved to G (042.4).
  - Every on-screen key hint (prompts, goals, the build bar, the tutorial) shows the bound key, not a fixed letter.
- [ ] Settings persist in browser storage under one key, `pipeline.settings` (versioned), and survive reloads. The old `pipeline.sound` key's mute and volume are read once into it. Under automated tests and `?mute`, sound starts muted, as today.
- [ ] Every storage read and write is guarded (try/catch, as `soundSettings.ts` does). With storage blocked, the game plays with defaults and says once that settings and saves won't be kept.

**Screen shake and camera (render, data)**
- [ ] Which events shake, and how big, is a table in data (`SHAKE_ON`). Exactly:
  - the player taking a hit: medium
  - a KO: big
  - a boss slam or pound: the Warden's slam medium, the Bulwark's pound big, the Bulwark's stomp (041) medium
  - a gate or barrier opening: medium
- [ ] Nothing else shakes (042.11): not firing, not kills, not the player's own Bursts, Bomblets, Pool-bursts or mines, not a Charger hitting a wall, a Burrower erupting or the Bulwark's bombs landing. When one of those hits the player, the hit's own shake plays.
- [ ] With Screen shake off, or with the system's reduced-motion setting, nothing shakes. JuiceView's shake log (021) still records what was asked for, with a flag saying it was suppressed.
- [ ] **The camera locks to the player:** `CAMERA_LERP` becomes 1, so the camera's centre is the player's position every frame (before any shake), inside the room's bounds. No easing pan, no lead toward the aim. The door fades, the KO fade and the attune look at the intake (019) are unchanged (042.12).

**End of the demo (render, data)**
- [ ] On the Bulwark's first kill (`bossDefeats` gains `bulwark`), `endCard.delayTicks` (180) later, so its death and drops play, the end card shows and the world pauses:
  - "End of the playtest build", in the display font
  - **What's next**: three to five lines from data (from the drive rant's theme 11: new regions and bosses; more ammo, and new ways to combine and augment it; a bigger foundry with setups to switch between; gear sets). Shaun may rewrite them.
  - "Thanks for playing."
  - a feedback prompt: "Tell Shaun what you thought: press F to leave a note, then Settings → Export save to send it."
  - **Leave feedback** (opens the note) and **Keep playing** (closes the card)
- [ ] After Keep playing, free play continues. The objectives go on (the third entrance), and nothing else changes.
- [ ] The card shows once per save: `meta.endCardSeen` is set and saved at the next foundry entry. A Continue from a save made before the kill shows it again after the next first kill. Altar refights never show it.
- [ ] The card's text lives in data (`src/data/endCard.ts`) and is pending Shaun's rewrite.

**Feedback notes (render, data)**
- [ ] The feedback key (F by default) opens a note at any time in any state but `confirm`: on the title, in play, paused, in Settings and on the end card. In play it pauses the world.
- [ ] The note is a small tablet with a multi-line text box (an HTML textarea over the canvas; no new dependency), up to 2,000 characters, with **Save note** and **Cancel**. While it is open, typing never reaches the game's keys. Enter adds a new line, and Ctrl+Enter saves.
- [ ] A saved note stores `{ id, writtenAt, build, state, text, snapshot }`, where `state` is the flow state. `snapshot` is the compact game-state summary that `getState()` returns, taken when the key was pressed, or `null` on the title. Notes live under `pipeline.feedback`, newest last, at most 50 (the oldest is dropped, with a warning when the limit is near).
- [ ] Notes survive New game and Continue. They are included in every export and merged on import.
- [ ] After saving: "Note saved. It goes with your save when you export it (Settings → Export save)." Settings shows the count of stored notes.

**Quit (render)**
- [ ] **Quit to title** (pause menu) asks first. In the foundry: "Quit to the title?" Elsewhere: "Quit to the title? Anything you've picked up since you last entered the foundry will be lost." Confirming discards the running game and shows the title, which reads the slot again.
- [ ] **Quit** (title) shows a farewell card: "Thanks for playing. You can close this tab now." with **Back to title**. It calls `window.close()` first, which works only where the browser allows it (042.13).

**Release (wrapup)**
- [ ] After Shaun's playtest of this branch's preview, /wrapup merges it into `main` only when Shaun says so for that PR, and the Pages root link is the one to share with friends. Preview builds are production builds, so the title, saves and feedback work there without `__GAME__`.

**Hook (dev only)**
- [ ] `__GAME__` follows the running game across New game, Continue and Quit to title: `getState()` and `step()` act on whichever sim is live, and `getState()` returns `null` on the title.
- [ ] `__GAME__.flow()` reports `{ state, hasSave, saveStatus: 'none' | 'ok' | 'corrupt' | 'newer' | 'too-old', saves, notes }`, where `saves` counts the writes this session.
- [ ] `__GAME__.ui()` adds the title's rows, the settings rows and their values, the end card, the note box, and `camera: { x, y, player: { x, y } }`.

**Docs (on approval)**
- [ ] docs/design.md, "Death and tension" gains: "The game saves each time you enter the foundry. Continue wakes you there, and anything carried since is lost, as on a death. (Added 2026-10-19, Shaun, spec 042.)"
- [ ] CLAUDE.md's "Dev builds expose window.__GAME__" line notes `flow()`. `.claude/rules/sim.md` gains: "A change to SimState's shape bumps SAVE_VERSION; a rename or reshape adds a migration (042)."

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The e2e tests that boot the plain URL today boot `?start=tutorial`, and the PR lists them.

## Data changes
- `src/data/save.ts` (new): `SAVE_VERSION` (1), the storage keys (`pipeline.save`, `pipeline.save.backup`, `pipeline.settings`, `pipeline.feedback`), the export file names and formats, the 1 MB size budget, and the note limits (2,000 characters, 50 notes).
- `src/data/settings.ts` (new): the default settings (volumes, mute, shake on, flashes on), the bindable actions in display order, the default bindings (feedback F, flip G) and the volume step.
- `src/data/titleScreen.ts` (new): the scene layout, the logo, the menu rows and their words, the Continue line's format, and the confirm and farewell texts.
- `src/data/endCard.ts` (new): `delayTicks` (180), the title, the "What's next" lines, the thanks and the feedback prompt.
- `src/data/juice.ts`: `SHAKE_ON` (event → size); `SHAKE` sizes unchanged.
- `src/data/config.ts`: `CAMERA_LERP` 0.12 → 1.
- `src/data/sounds.ts`: the volume channels (music = room ambience, effects = one-shots); `SOUND_SETTINGS_KEY` is kept only to read the old key once.
- `src/data/hudLayout.ts`: the pause menu's rows; the Settings, key-binding, note, end-card, confirm and farewell tablets.
- `src/data/art`: the title scene (sky, ridge, the posed wanderer, the ruin and its pipe, the logo glow).
- Sim: `src/sim/save.ts` (`snapshot`, `restore`, `SAVE_MIGRATIONS`, the default fill), the `foundryArrivals` event, and a `wakeInFoundry` entry that reuses the KO's wake and world reset with nothing to lose.
- Render: `src/render/flow/` (the state machine and its screens), `TitleScene`, `saveStore.ts` and `settingsStore.ts` (guarded storage), the settings, bindings, note and end-card views, and `keys.ts` reading bindings from settings.

## Out of scope
- Multiplayer. The save is a snapshot of one deterministic sim, so a future host could send the same snapshot to a joining peer, but nothing here builds toward it (042.3).
- Cloud saves, accounts or more than one save slot.
- Saving anywhere but on entering the foundry, autosave timers, or a save-and-quit that keeps the carried haul.
- Music composition beyond what exists (today, only the room ambience loops); new sound effects beyond menu clicks.
- New content of any kind: enemies, regions, ammo or bosses. Balance (041).
- An in-game list for reading or deleting feedback notes, or sending them anywhere but the export file.
- Controller or touch input, and rebinding the mouse.
- A credits screen, a settings tab for graphics, or localisation.

## Test plan
- **Vitest (sim):**
  - `snapshot` is plain JSON (the data-shape walk) for a fresh and a late-game state, and under 1 MB.
  - The round trip: snapshot at a foundry entry, then N ticks of fixed commands from the original and from the restored JSON give deep-equal states.
  - Continue: restore, then the wake in the foundry; the inventory equals the banked haul; claims, research, factory, gear, level, talents, stash, landmarks, boss kills and goals match the snapshot; a claim made after it is absent.
  - Saving triggers: the door, fast travel and a KO wake each emit `foundryArrivals` once; a pylon deposit doesn't.
  - Versioning: a synthetic v1 → v2 migration runs; a missing field is filled from `createSim`; a newer version, garbage text, a wrong format and a wrong-typed field each give their status without throwing; the shape-fingerprint test.
- **Vitest (data, render-pure):** `SHAKE_ON` lists exactly the big moments; the default bindings have no duplicate key; the end card's and title's text fit their tablets at 640×360; the settings defaults.
- **Playwright:**
  - The plain URL shows the title; Continue is greyed out with clean storage. New game reaches play. A scripted run to the foundry saves (`flow().saves` is 1). Reload: Continue shows the line; Continue wakes in the foundry with the same factory and claims (`getState()`).
  - Carry items out, pick more up, reload, Continue: only what was banked at the last foundry entry is held.
  - New game with a save shows the confirm; Cancel keeps the save; confirming clears it.
  - Write garbage into `pipeline.save`, reload: Continue is greyed out with the corrupt line, nothing throws, and Export damaged save downloads the raw text. Write a version 999 save: the "newer" line, and entering the foundry doesn't overwrite it.
  - Export downloads a file holding the save and a note; import it into a fresh context and Continue matches.
  - Settings: set music to 30%, shake off, flashes off, rebind roll to Shift; reload; all four persist, and Shift rolls. Binding a used key swaps.
  - Shake: firing arrows, killing a Husk, a bomb's Burst and a landmine log no shake; taking a Husk's swipe logs medium; with shake off, a hit logs a suppressed shake.
  - Camera: walking, rolling and firing for 120 frames, the camera centre equals the player's position every frame (away from room edges).
  - With `?start=hollows`, kill the Bulwark (dev hook health set low): the end card shows after 180 ticks; Keep playing resumes; a refight shows no card.
  - Press F in play, on the title and on the end card: the note opens and the game's keys don't fire while typing; save it; `flow().notes` grows, and the note's snapshot matches `getState()`.
  - Quit to title from the pause menu (with the confirm), and Quit's farewell card.
- **Screenshots:** the title screen, Continue greyed out and with a save line, Settings, the key bindings list, the note box, the end card, the confirm and the farewell card, each at 640×360. Pending Shaun's approval by eye.

## Open questions
Each has a proposed answer that the build follows (approve-on-draft); Shaun may change any of them at playtest.

- **042.1 Dev and test URLs and the save slot?** Proposal: any `?start=…` or `?playtest` URL skips the title and never reads or writes the slot, so tests and sandbox runs can't overwrite a real save. The plain URL is the shipped game. `?start=tutorial` gives the real start without the title.
- **042.2 What counts as "entering the foundry", and what's lost between saves?** Proposal: the door, fast travel to the foundry, and waking there after a KO all save. As the interview set it, nothing else saves. Pylon deposits, claims, kills, XP and boss kills made since the last foundry entry are lost if the game closes, and so is foundry work done since entering (building a line after you walk in isn't saved until the next entry). The build saves on entry only. If playtesters lose foundry work, Shaun may add a save on leaving the foundry.
- **042.3 Save the whole sim state, or only the progress fields?** Proposal: the whole `SimState`, as plain JSON with the tick's events emptied, then a KO-style world reset on Continue. It is one rule with no list of fields to keep in step, and it is exactly "serializing sim state". It suits a future multiplayer host too: a deterministic lockstep game needs a full state snapshot to bring in a peer. The state is not split into world and player parts now; the version and migration hook leave room for that later.
- **042.4 F already flips a piece in build mode (`src/render/keys.ts`).** Proposal: F becomes the feedback key everywhere, as Shaun asked ("at any time"), and flip moves to G by default. Both are rebindable.
- **042.5 Every Pages preview shares one browser origin, so all branch previews and the root share one save.** Proposal: keep one shared slot, so a save carries from a branch preview to `main`. Protect it with the version: a build never loads or overwrites a save newer than it understands. Shaun can export before trying an older preview.
- **042.6 Where does a replaced save go?** Proposal: one backup key (`pipeline.save.backup`), written on New game and on import. It isn't shown in the UI yet; it exists so a mistaken confirm can be recovered by hand. Exports hold only the main slot.
- **042.7 How do later specs keep old saves working?** Proposal: the shape-fingerprint test fails when the state's shape changes, and its message says to bump `SAVE_VERSION`. Added fields are filled from defaults with no code. Renames and reshapes add a migration. A rule line in `.claude/rules/sim.md` says so.
- **042.8 Does the export include settings?** Proposal: no. Settings are per device (volume, keys). The export holds the save and the feedback notes, which is what Shaun needs from a playtester.
- **042.9 "Music volume" when there is no music?** Proposal: the music channel carries the room ambience loops (the clearing's wind and birds, the foundry's hum) and any music added later; effects carry every one-shot. Master scales both.
- **042.10 What does the flash toggle cover?** Proposal: full-screen and bright flashes only: the Cold Burst tint, muzzle, burst, mine and Split flashes, and the enemies' white hit flash (it becomes a short, dim tint). The low-HP edge holds steady instead of pulsing. Telegraphs and the danger reds are game information and never change.
- **042.11 Enemy bursts that aren't a boss slam (the Bulwark's bombs, a Burrower's eruption, a Charger hitting a wall)?** Proposal: no shake of their own, since the interview's list doesn't name them; if one hits the player, the hit shakes. The Bulwark's 041 stomp is a boss slam, so it shakes (medium).
- **042.12 Does "no easing pan" remove the attune look (019)?** Proposal: no. It's a one-off scripted look at the intake when the tube first links, not a follow pan. Everything that follows the player locks.
- **042.13 Quit in a browser?** Proposal: a page can't close a tab the player opened, so Quit shows a farewell card ("You can close this tab now") with Back to title, and tries `window.close()` first.
- **042.14 Does Continue keep the player's health?** Proposal: Continue wakes the player as a KO's wake does, with the health a wake gives, in the foundry, which heals at 50 HP/s anyway (030).


## Changed by Shaun, 2026-10-20
- **Screen shake is off entirely** ("we need to turn off the screen shake entirely"). Already done: `SHAKE_ON = false` in src/data/juice.ts. 042 removes the shake toggle from Settings and doesn't build the "big moments only" shake list. The camera still locks tightly to the player with no easing pan, as the spec says.

## Raised after the build
Built 2026-10-20 on `claude/042-shippable-build` (stacked on #28). Where the spec didn't decide, the build took the most conservative option it could; each is listed with that choice as the proposal. Shaun may change any of them at playtest.

**Criteria status.** Done: game flow, title screen (pending Shaun's eye), New game, saving, Continue, versioning and bad saves, export and import, Settings (without the shake row, per "Changed by Shaun"), key bindings, the camera lock, the end card (words pending Shaun), feedback notes, Quit, the dev hook. Superseded by "Changed by Shaun": the shake table, the shake list and its toggle, the suppressed-shake flag. Remaining: Release (wrapup, after Shaun's playtest), and Docs (on approval): the design.md line, CLAUDE.md's `flow()` note and the `.claude/rules/sim.md` rule wait for Shaun's approval.

- **042.15 Esc on the flow screens.** Proposal (built): Esc backs out one level in Settings (the key list → Settings → where it was opened from), cancels a confirm, and cancels the note; on the end card and the farewell card it does nothing (they have their own buttons).
- **042.16 Which keys can't be bound?** The spec fixes Esc, Tab and the mouse. Proposal (built): M, [ and ] (mute and master volume, which work on every screen) are fixed too, so no key ever does two things; pressing a fixed key while a row waits cancels the wait. Shift can be bound (the spec's test binds Roll to Shift); held, it still opens a tip's breakdown (040).
- **042.17 The note's tablet.** Proposal (built): a "Feedback note" heading and a "N / 2000" counter above the box. Save note does nothing while the box is empty (an empty note isn't kept). Esc cancels.
- **042.18 Words the spec didn't give.** Proposal (built, in src/data/save.ts): after an import, "Save imported. Continue from the title to play it."; storage blocked, "Settings and saves won't be kept: this browser is blocking storage."; a bad import, "Not a Pipeline save." / "That save is from a newer version of the game." / "That save couldn't be read."; near the note limit, "N notes stored: past 50, the oldest are dropped. Export your save to send them."
- **042.19 The Mute row.** Proposal (built): labelled "Mute", On meaning muted (the old pause menu's row read "Sound: On/Off").
- **042.20 What Flashes off removes.** Proposal (built): the muzzle, Split, mine and bomblet flashes and the Burst's flash sprite (so the Cold Burst's tint too) are not drawn; the Burst's embers still fly. The enemies' white hit flash becomes a short multiply tint (`ENEMY_FX.dimFlashColor`). The low-HP edge holds steady at half its swell. Not on the spec's list, so unchanged: the Pool-burst ring, relic and talent flashes, and the player's hit flicker.
- **042.21 Older saves and list items.** Loading fills a missing field from a fresh `createSim` inside objects (the player, the tube, the link, gates, ...), but not inside list items (enemies, gear pieces, foundry pieces): there's no default item to fill from. Proposal: a later spec that adds a field to a list item adds a migration (the fingerprint test fails and says so).
- **042.22 The shape fingerprint.** It is the union of a fresh state's and the late-game state's paths (tests/sim/saveShape.json), with keyed lookups (inventories, the stash, research, a machine's buffer) collapsed so item ids aren't shape. A change to what the late-game run happens to hold (say, a new piece kind) can also change it; the fix is the same: bump `SAVE_VERSION` if the shape really changed, else regenerate.
- **042.23 The build id.** Proposal (built): the envelope's and the notes' `build` is `<branch>@<short sha>` on CI (a Vite define in vite.config.ts) and `dev` locally.
- **042.24 New game's world.** Proposal (built): New game uses the default seed, so every new game is the same world, as the plain URL was before 042.
- **042.25 The end card and a closed game.** The card waits 180 ticks after the kill. If the game closes in those ticks after a foundry entry saved the kill, the card won't come back on Continue (the kill is in the save and `meta.endCardSeen` is still false). Proposal: leave it; Shaun may ask for the card on Continue in that case.
- **042.26 Headless screenshots and the note box.** In the review shot the note's box has a white block under it. Any DOM element over the WebGL canvas shows the same in headless Chromium (a plain dark div does), and the box itself measures right (680×300 px at 2×). Proposal: check it by eye in a real browser at playtest; if it shows there, draw the box on the canvas and keep the textarea invisible.
- **042.27 Sizes.** The flow screens' layout lives in `src/data/flowLayout.ts`, not `hudLayout.ts` (which is near its 300 lines). `GameScene.ts` (309) and `controls.ts` (321) were near 300 before 042 and are a little over now.
