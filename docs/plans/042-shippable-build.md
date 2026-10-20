# Plan 042: Shippable playtest build

Spec: docs/specs/042-shippable-build.md (approved on draft, with "Changed by Shaun, 2026-10-20": no shake at all, so no shake toggle and no shake list). Branch `claude/042-shippable-build`, stacked on `claude/043-arena-lock` (PR #28). Each slice is playable on its own, tests first, a commit after each.

## Shape of the change

### Structure
- **Two kinds of Phaser scene.** `FlowScene` (new, `src/render/flow/FlowScene.ts`) runs for the whole session, drawn on top: the title, Settings, the key list, the end card, the note, the confirm and the farewell card. A `GameScene` is built per game (a fresh instance under a fresh key for New game and Continue, removed on Quit to title), so nothing of one run leaks into the next.
- **The flow machine** (`src/render/flow/flowMachine.ts`, pure TypeScript, no Phaser) owns the state (`title`, `play`, `paused`, `settings`, `endCard`, `feedback`, `confirm`, `farewell`), the allowed transitions, where Settings and the note return to, and a log of every change. `GameScene` asks it whether to step (only in `play`) and tells it about Esc, the pause menu's rows, foundry arrivals and the Bulwark's first kill.
- **Storage stays out of the sim.** `src/render/flow/storage.ts` wraps every `localStorage` read and write in try/catch and says once when storage is blocked. `saveStore.ts`, `settingsStore.ts` and `feedbackStore.ts` sit on it. File download and the file picker are in `src/render/flow/files.ts`.
- **The sim's part is pure:** `src/sim/save.ts` (`snapshot`, `restore`, the default fill, `wakeInFoundry`), `src/sim/saveFile.ts` (the envelope: `SAVE_MIGRATIONS`, reading a text into a status, the shape fingerprint) and the `foundryArrivals` event.

### Slice 1: the flow machine, the title and the locked camera
- **Data:** `src/data/titleScreen.ts` (layout, logo, rows and words, the Continue line's format, confirm and farewell texts); `src/data/art/title.ts` (sky, ridge, ruin and pipe, glow, mote); `CAMERA_LERP` 1.
- **Render:** `flowMachine.ts`, `FlowScene.ts`, `TitleView.ts` (the painted scene, the posed wanderer from the player rig, the logo in the display font with a cyan glow, the menu rows with hover and press feedback). `main.ts` boots `FlowScene`. A `?start=…` or `?playtest` URL skips the title (042.1); `?start=tutorial` is the real start without it.
- **Hook:** `__GAME__` follows the live `GameScene`; `getState()` is `null` on the title; `flow()`; `ui().flow` with the title's rows.
- **Tests:** Vitest `tests/render/flowMachine.test.ts` (every transition in the spec, every refused one, return targets, the log); `tests/data/titleScreen.test.ts` (texts fit). The e2e specs that boot the plain URL move to `?start=tutorial` (`tutorial`, `hud`, `melee`, `smoke` with `?seed=123`). New `tests/e2e/shippable.spec.ts`: the plain URL shows the title with Continue greyed; New game reaches play; Quit's farewell; the camera centre equals the player for 120 frames.

### Slice 2: save on foundry entry, Continue, versioning
- **Sim:** `foundryArrivals: { via: 'door' | 'travel' | 'wake' }[]` from `arrived()` and from a KO's wake into the foundry; `woke` flag on both wakes (the Continue wake plays the KO's fade-in and "You wake in the foundry", but not the KO sound). `snapshot`/`restore`/`wakeInFoundry`, the default fill from `createSim`, `readSave(text)` → `ok | corrupt | newer | too-old`, `SAVE_MIGRATIONS`, `saveShape()`.
- **Data:** `src/data/save.ts` (`SAVE_VERSION` 1, keys, file names and formats, 1 MB budget, note limits).
- **Render:** `saveStore.ts` writes the envelope on the arrival tick (skipped under `?start`/`?playtest`, and while a newer save holds the slot); the "Couldn't save" notice in the pickup feed's style; the title's Continue line and its greyed reasons; New game's confirm (old save to the backup key); Continue wakes in the foundry.
- **Tests:** Vitest `tests/sim/save.test.ts` (plain-JSON walk of a fresh and a late-game state; under 1 MB; the round trip of N fixed-command ticks from the original and from the restored JSON; restore + wake twice is deterministic; the Continue contents; a claim after the save is gone), `tests/sim/saveTriggers.test.ts` (door, travel and KO wake each emit one arrival; a pylon deposit none), `tests/sim/saveFile.test.ts` (synthetic v1 → v2 migration; missing field filled; newer, garbage, wrong format, wrong type each give their status without throwing; too old), `tests/sim/saveShape.test.ts` (fingerprint vs `tests/sim/saveShape.v1.json`, message says bump the version). E2e: save on entering, reload, Continue matches; carried items lost; New game confirm and Cancel; garbage and version 999 saves.

### Slice 3: the pause menu, Settings and Quit
- **Data:** `src/data/settings.ts` (defaults, actions in order, default bindings with feedback F and flip G, volume step); `hudLayout.ts`'s pause rows become Resume, Settings, Quit to title; the Settings, key-list, confirm and farewell tablets.
- **Render:** `SettingsView.ts` (master/music/effects with − and +, mute, flashes, key bindings, export, import, export damaged save, notes count, back), `settingsStore.ts` (`pipeline.settings`, reads `pipeline.sound` once), `SoundView` plays loops at master × music and one-shots at master × effects; the flash toggle in `EffectsView`, `MineView`, `EnemyView`, `PlayerView`, `EdgeTint`, `TalentFxView`; Quit to title's confirm (two wordings).
- **Key bindings:** `BindingsView.ts`; `keys.ts` reads the bindings; a used key swaps; Esc, Tab and the mouse fixed; Reset to defaults; hints show the bound key (`keyHint.ts` rewrites the default letters in prompt and goal text).
- **Export and import:** `files.ts` downloads `pipeline-save-YYYY-MM-DD.json` and opens the picker; the import is checked like a stored save, confirmed, merges notes.
- **Tests:** Vitest `tests/data/settings.test.ts` (no duplicate default key, defaults), `tests/render/bindings.test.ts` (swap, fixed keys refused, reset), `tests/render/settingsStore.test.ts` (old key read once, versioned, garbage → defaults), `tests/render/exportFile.test.ts` (export shape, import checks, note merge by id), `tests/render/keyHint.test.ts`. E2e: settings persist across a reload and Shift rolls; a used key swaps; export then import in a fresh context and Continue matches.

### Slice 4: the end card
- **Data:** `src/data/endCard.ts` (`delayTicks` 180, title, what's next, thanks, feedback prompt).
- **Render:** `EndCardView.ts`; `GameScene` notes the `bossDefeats` event for `bulwark` and asks the flow for the card 180 ticks later; `meta.endCardSeen` rides in the envelope from the next save.
- **Tests:** Vitest text-fit test; e2e with `?start=hollows`: the card after 180 ticks, Keep playing resumes, a refight shows none.

### Slice 5: feedback notes
- **Render:** `NoteView.ts` (an HTML textarea over the canvas; Phaser's keyboard manager is off while it shows), `feedbackStore.ts` (`pipeline.feedback`, newest last, at most 50, warning near the limit), notes in every export and merged on import.
- **Tests:** Vitest `tests/render/feedbackStore.test.ts` (cap, ids, merge); e2e: F in play, on the title and on the end card; typing doesn't move the player; the note's snapshot matches `getState()`.

### Review shots
`tests/e2e/shippableShots.spec.ts` (REVIEW_SHOTS=1, docs/review/042/): the title (greyed and with a save line), Settings, the key list, the note box, the end card, the confirm and the farewell card.

## Not dictated by the spec (raised after the build)
Recorded in the spec under "Raised after the build" as they come up, each with the conservative choice the build takes.
