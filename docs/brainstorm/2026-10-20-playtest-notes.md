# Shaun's playtest notes, for after 042

Oct 20, 2026 · Shaun in chat, while 041 was being built. Raw notes plus Claude's reading. Nothing here is decided yet.

> Early resources need to create more ammo. Ho bar needs to be red not green. First boss needs a buff. Need a way to split the resources into two belts but I think we already have that planned. When the tube has multiple ammo in it 2 should shoot at two different angles and three should shoot in like a middle and two on each side not just two or three things in succession

1. **More ammo per early resource.** Raise the yields of the Region 1 recipes (shafts, arrowheads, rope, casings and so on), or the node yields.
2. **The HP bar should be red, not green.** 031 chose green for the normal fill.
3. **Buff the first boss, the Pylon Warden.** It dies in about 8 s to piercing bolts (first playtest).
4. **Splitting a resource onto two belts.** A Splitter exists (033), but it's locked behind research: a wall-panel schematic in the foundry. Question: should it be unlocked from the start, or earlier?
5. **The volley shape.** Two fed entrances should fire at two different angles. Three should fire a middle shot plus one on each side, all together, not one after another. Today:
   - only rounds of the same family fan out (024); different families each fly straight at the cursor
   - each entrance fires at its own rate (028), so mixed ammo comes out staggered, which reads as "in succession"
   - this changes both earlier decisions

6. **Stages are hard to find.** Shaun picked up rimestone, then found no way to make a frost arrow in the crafting menu (C). Stages are hand-applied only at the bench, in its Stages panel, after the shrine claim. Options: a Stages section in C that points to the bench, or applying stages from C directly.

## Later notes (same day), including watching a first-time player

> ley crystal gathering has no E indicator / pickup range is still too small to grab the resources easily / building controls on screen when in build mode somewhere / so I watched someone whose never played these kind of games really struggle and I think what we need in the foundry is an example. so maybe we should start the game where when you first walk to the foundry it activates and theres already an arrow maker with some resources in the three hoppers and it activates so you can see how it works and then the tutorial can have you build a second arrow maker to feed into the second tube once you beat the 1st boss / I think we should have a separate hot bar for the foundry intake and for things in your inventory just in case you wanted to bring some one off landmines and use them. And we definitely need some kind of grid inventory because the other one fills quite and has not scroll bar and the hoppers should only show what is in them not what matches it from your inventory its too confusing. we can just copy factorios inventory and hopper management screens and I think thatd be fine / aggro range for the wisp looks too small when they were on the far left of right of the screen you can shoot them when they arent moving / better graphics of what you got out of the cache chests / had a bug where the player had arrows in their foundry intake and in their inventory and the stages menu said 0/4 arrows but either way stages need to added to the crafting menu instead of the gear bench / There should be a resin pylon somewhere so bombs become solved

7. **No E prompt on ley crystal nodes.**
8. **Pickup range still too small** (64 px today, from 021).
9. **On-screen build controls** in build mode (place, rotate/flip, pick up, drag).
10. **A working example foundry.** Watching a first-time player struggle, Shaun suggests that on first entry the foundry activates with an arrow line already built: the three hoppers stocked, running into the intake, so the player sees how it works. The tutorial then has them build a second arrow line into the second entrance after the first boss. This changes 027's tutorial flow.
11. **Two hotbars:** one for the foundry intake (the volley) and one for carried items such as one-off landmines.
12. **A grid inventory, Factorio-style,** that holds more and can scroll. **Hopper screens** show only what's in the hopper, not the matching items you carry. Copying Factorio's inventory and hopper screens is fine.
13. **Wisp aggro range too small.** Wisps at the far left or right of the screen stand still and can be shot.
14. **Better visuals for what comes out of a cache.**
15. **Bug:** with arrows in an intake entrance and in the inventory, the Stages panel showed "0/4 arrows". Also, stages should move into the crafting menu instead of the gear bench (repeats note 6).
16. **A resin pylon somewhere,** so bombs can be automated. Husk resin is only a drop today, so the bomb line can't be fed from supply.

## Friends' playtest (same day)

> good moments that the players liked. seeing their items go up the tube for the first time, getting overwhelmed by enemies in the stone quarry was exciting / found a bug where players would drag the bulwark to a pylon so they had continuous healing for the fight. maybe when the fight starts it locks you in the room and then you can press e on the door it locks you in to leave but then you lose your progress / shield guys in the hollow need to not turn instantly and leave some room to get hit even if its just time for one projectile. / also my friend was struggling to kill the warden but he is a casual gamer

**What players liked:**
- watching their items go up the tube for the first time
- getting overwhelmed by enemies in the Quarry

17. **Exploit: healing during the Bulwark fight.** Players fought him where a pylon's safe zone (or a spring) heals them. Shaun's fix: when the fight starts, the arena locks. Pressing E on the locking door leaves, but the fight's progress resets (the Bulwark heals).
18. **Shardbacks turn too fast** (120°/s today). They need a window, even just enough for one projectile to land.
19. **A casual friend struggled with the Pylon Warden.** This pulls against note 3 ("first boss needs a buff"), so the interview needs to settle it. One option is to keep the Warden's damage but make its telegraphs easier to read.
