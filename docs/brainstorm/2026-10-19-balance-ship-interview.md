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
