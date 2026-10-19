# Spec interview for 041 (balance) and 042 (shippable build): answers

Oct 19, 2026 · Shaun, in chat.

## 041 balance, round 1
- **Damage per hit:** arrow 14, ley bolt 9, bomb 12. Landmine stays at 60, and fire rates don't change. This gives the order landmine > arrow > ley ≈ bomb.
- **The Bulwark, all four:**
  - much more HP (about 2,500)
  - enrage below 30% HP (turns faster and lobs more often)
  - punishes circling (a rear stomp or quick spin if the player stays behind it too long)
  - adds during the fight (a couple of Shardbacks or Chargers at 50% HP)
- **Frost:** leave it. Freezing is for tougher enemies and bosses, and Husks can die before they freeze.
- **Ring scaling:** each danger ring multiplies enemy HP and damage (for example ring 1 ×1, ring 2 ×1.4, ring 3 ×2), on top of the tougher enemy types.

## 041 balance, round 2
- **Ring multipliers:** steeper, ×1 / ×1.6 / ×2.5 for rings 1, 2 and 3. They apply to enemy HP and damage; bosses keep their own numbers.
- **Targets the scripted tests check:**
  - a Bulwark fight takes 60–90 s with a decent build and real damage taken; a naive bot can lose
  - a ring-matched pack clears in 8–15 s with a fitting volley
  - each ammo family wins its own scenario: arrows vs a line, bombs vs a cluster, ley bolts vs movers behind walls, mines vs a stationary target
- **Survival:** no change. Gear, talents and springs already scale it.
- **Anything else:** no. 041 is complete.

## 042 shippable build, round 1
- **Title screen:** a painted vector scene. The wanderer stands on a ridge with the tube, the ruin's pipe glows below, the "Pipeline" logo is in the display font, and ley light drifts slowly. The menu is New game, Continue, Settings and Quit.
- **When it saves:** on entering the foundry only.
- **Slots:** one save. New game asks before overwriting it.
- **Storage:** browser storage, plus Export and Import of a save file in Settings.

## 042 shippable build, round 2
- **Continue:** restores everything as of the last foundry entry: factory, research, claims, gear, level and talents, stash, landmarks found, boss kills and goals. You wake in the foundry, and anything carried since then is lost, as on a death.
- **Settings:** master, music and effects volume; shake and flash toggles; key bindings; save export and import.
- **Screen shake:** Shaun: "the screen shake or pan when you shoot is appalling so it needs removed". Decision: shake only for big moments (taking a hit, a KO, boss slams and pounds, gates opening). No shake from firing, kills, or the player's own Bursts and mines. The camera locks tightly to the player, with no easing pan, and the Settings toggle turns all shake off. (Shaun had been playing the `main` preview, which doesn't have 021+.)
- **Ending:** beating the Bulwark ends the demo. A short "end of the playtest build" card shows what's coming next, a thanks and a feedback prompt, and then free play continues.
- **Feedback:** the F key opens a note at any time. Notes are saved with a game-state snapshot and included in the save export.
- **Hosting:** after Shaun's playtest of this branch, merge it to main and share the Pages root link with friends.
- **Approval:** 041 and 042 are approved on draft, to be built after 040.
