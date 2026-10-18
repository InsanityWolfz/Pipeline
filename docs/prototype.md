# Pipeline — Prototype Plan

Oct 17, 2026 · @Shaun

## Goal

The prototype is the new player experience, about 15 to 20 minutes long, ending when the player has their first ammo line running through the tube and heads back out.

It must prove one thing: **"I did it by hand, now it does itself" feels great**, and the combat around it is fun on its own. It should feel like a game, not a gray-box demo, so it gets crude but real art and animations.

## Player flow

Each beat introduces exactly one new idea.

1. **Wake and find the tube.** The player wakes in a clearing near ruins and finds the tube, dormant. It can only fire ammo they hand-load.
2. **Gather and hand-craft.** On the path they pick up wood, stone, fiber and a little ley crystal, and hand-craft a few rounds from a simple crafting menu.
3. **First fight.** Weak enemies teach movement, dodging and firing hand-loaded ammo. They drop raw materials and one piece of unidentified armor.
4. **Uncover the foundry.** Stepping inside, the tube attunes to the player and links to the foundry.
5. **Try the beginner ammo.** Recipes for three beginner ammo types appear. The player hand-crafts a small batch of each and tries them on nearby enemies.
6. **Commit the first supply slot.** They pick a favorite and build its line. Crafting each part by hand unlocked the machines. Now the tube fires straight from the factory.
7. **Identify armor.** The armor from the first fight is identified at the foundry and equipped.
8. **Clear and claim.** A nearby site is guarded by a tougher pack and an elite. Clearing it and reactivating the pylon claims it as a supply line, adds a deposit point, and unlocks fast travel.
9. **Build a spread.** Back home, materials are flowing. The elite's machine part lets them build a gravity stager and turn their ammo into a spread.
10. **Head back out.** The line keeps running while they explore. A death here sends them home and drops their haul, which tests the death rule. Coming back to a running factory ends the prototype.

## Camera and art

**Camera: three-quarter top-down.** The view looks down at an angle, so you see the tops and fronts of things, like Realm of the Mad God, Hyper Light Drifter, or classic Zelda. It reads better than straight overhead and is purely an art convention, so it needs no 3D. Try a straight-down variant early and compare.

**Art style: clean vector.** Smooth outlined shapes, soft gradients, glows and shadows, sharp at any screen size. Bright daylight colours, like RuneScape 3 or Realm of the Mad God, with ley-line cyan as the magic accent. Characters are rigs of parts that lean, kick and sway. The look was chosen from a three-way style test (spec 016, 2026-10-18); it replaced the earlier HD pixel art, whose 32-pixel limit made sprites lopsided.

**Theme check:** ruins, glowing ley lines, rune-carved stone, crystal conduits. Every placeholder should already fit the lost magical civilization.

**Crude animations needed:**

- Player: idle, walk (4 directions), dodge, firing the tube, hit, death
- Tube: dormant, attuning, firing each ammo type
- Enemies: idle, move, attack wind-up (the telegraph), attack, hit, death
- Foundry: machine idle and working loops, ammo moving between machines, pylon off and activating
- Effects: each ammo's projectile, spreads, AoE ground markers, pickup sparkle

**Sourcing:** Claude defines every sprite as typed shape data in one locked palette, and the game draws the shapes into textures at boot (see docs/art.md). Crude is fine; consistent is required.

## Content list

Names are placeholders.

**Beginner ammo types:**

| Ammo | Chain | Behavior |
| --- | --- | --- |
| Arrows | Wood into a cutter (shafts), stone into a knapper (heads), fiber into a spinner (rope), then an assembler | Fast and straight, physical damage |
| Bombs | Stone into a shaper (casings), husk resin into a fuse maker, ley crystal into a grinder (charge), then a packer | Arcs to the cursor, fire burst on landing |
| Ley bolts | Ley crystal into a grinder (shards), then a focuser | Slower, pierces through enemies |

**Enemies:**

- **Husk:** slow melee, telegraphed swipe. Starting area.
- **Wisp:** ranged caster, slow projectiles to dodge. Second area.
- **Pylon Warden:** elite guarding the pylon, with a telegraphed ground slam. Drops a machine part.

**Areas:**

- Starting clearing and the path to the ruins
- The foundry (sealed ruin, becomes the base)
- The claimable site with its pylon

**Materials and drops:**

- **Raw:** wood, stone, fiber, ley crystal, husk resin
- **Machine part:** warden core, needed to build the gravity stager
- **Armor:** one unidentified piece from the first fight

**Foundry placement:** the player walks around the foundry and places machines on a grid in the same top-down world, Factorio-style. There's no separate factory screen. Machine position and facing matter, since a stager's angle sets the spread.

**Foundry pieces:**

- **Crafting menu** for hand-crafting, instant in the prototype
- **Machines** for the chosen ammo's chain
- **Gravity stager** that splits a line into a spread
- **Identification bench**
- **Supply line** from the claimed site at a fixed rate

In the prototype, the tube's reservoir refills fast enough that the first line feels good right away. Tuning comes from playtesting.

## Tech

**Decision: Phaser 4 + TypeScript + Vite.** With 2D sprites and a three-quarter view, this is a 2D game, and Phaser is a mature 2D engine with sprites, animations, tilemaps, collision, and cameras built in. It's still pure TypeScript, so it suits AI-assisted coding.

Three.js stays an option if we later want a 2.5D look (pixel sprites in a 3D scene, like Octopath Traveler's HD-2D style). That adds lighting and depth but costs extra setup the prototype doesn't need.

**Tools:**

- **Tiled** for building maps, which Phaser loads directly
- Sprites as typed shape data, drawn into textures at boot

## Out of scope

The prototype leaves these out: the skill tree, bosses and boss cores, more than one supply slot, foundry wings, gold and the merchant, ley range falloff, blueprints, NPCs at claimed sites, save and load, menus beyond a pause screen, sound beyond placeholders.

## Playtest checks

- [ ] Is firing the tube fun for 5 minutes on hand-crafted ammo alone?
- [ ] Does linking the tube to the foundry feel like a big moment?
- [ ] Do players understand that the line layout shaped their shot?
- [ ] Does building the spread feel like making a new ability?
- [ ] Does claiming the pylon feel like a reward, not a chore?
- [ ] Does coming home to identify armor feel like a payoff?
- [ ] Does losing the haul on death sting the right amount?
- [ ] Do players want to keep going when it ends?

## Open questions

- [x] Three-quarter view or straight top-down, decided by testing both early: three-quarter (Shaun, 002 playtest, 2026-10-17)
- [ ] The locked palette for docs/art.md
