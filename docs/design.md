# Pipeline — Design Doc

Oct 17, 2026 · @Shaun

## Pitch

A solo fantasy action RPG where your weapon is a portal to your factory. You find an ancient tube relic that links to your magical foundry, and everything the foundry makes comes out the end of it: arrows, bombs, knives, ley bolts. Build a bigger, smarter factory and you hit harder.

The core verb is **conquer, claim, automate**. You clear a region by hand, reactivate its ley pylon, and its materials flow home to feed your ammo lines. The layout of each line decides what the shot does: five assembly lines set at five angles fire a five-arrow spread.

Every ARPG hand-waves infinite arrows. This game is about where they come from. Working title: **Pipeline**.

## Pillars and design rules

These rules settle arguments when two systems pull against each other.

1. **You are always your character.** No expeditions, no hired heroes. Everything gets done by your hands first.
2. **Manual first, then automated.** You hand-craft and hand-load ammo before you build the line that makes it. Every layer repeats that feeling.
3. **The factory layout is the ability.** A shot's shape comes from how you build its line, and every extra projectile costs real materials.
4. **Emergence from rules, not content.** Depth comes from a few dozen composable machines and stages, not hundreds of hand-tuned relics.
5. **Each half has its own reward.** Combat earns talents, armor, machine parts and schematics. The factory earns ammo and gold. Neither can farm the other's reward.
6. **Offense from the factory, defense from the field.** The factory never makes armor or defense, so nobody can turtle with it.
7. **No nagging.** No raids, no base defense, no timers that punish logging off.
8. **Not an idle game.** The world only runs while the game is open.

## Core loop

You head out to fight and claim, come home to identify loot and grow your ammo lines, then head out hitting harder.

_Core loop: the Field (fight packs and bosses, clear and claim sites, find unidentified armor) sends parts, schematics, boss cores and claimed-site supply lines to the Foundry (build ammo lines, layout shapes each shot, identify armor), which fires ammo back through the tube portal._

Claimed sites keep raw materials flowing on their own. Machine parts, schematics and boss cores only come from fighting, and they're what let the factory grow.

## Combat

Combat is deliberate and hands-on, closer to WoW than Vampire Survivors. Nothing auto-fires, and there are no hordes.

- **Controls:** WASD to move and dodge, mouse to aim, keys to fire, like Path of Exile.
- **The tube:** your only weapon. It's a relic portal that fires whatever your foundry makes.
- **Hotbar = ammo lines:** each supply slot is one ammo line on your hotbar. You start with one slot and can unlock up to four.
- **Targeting:** most ammo fires at the cursor. Ley-guided ammo locks onto a selected target.
- **Reservoir:** the tube holds a reservoir of each ammo that drains in bursts and refills from the foundry. Factory throughput sets the refill speed, and reservoir size is an upgrade.
- **Ley range:** the link is strongest near claimed pylons. Deep in unclaimed land, refill slows and ammo quality drops, so pushing into new regions is dangerous until you claim a foothold.
- **Enemies:** small packs with telegraphed attacks you read and dodge. Few enemies, each one matters.
- **Running away is always allowed.** You keep your haul but leave without the kill.

**Skill tree.** One character, one big tree branching in every direction with connecting paths. Its lanes map to ammo families: the knife lane makes knives hit harder, chain, and so on. You take whatever mix you want.

**Damage types behave differently.** There are no weaknesses or resistances. Instead each type has its own behavior, and tree nodes build on those behaviors:

- **Fire** burns over time and spreads to nearby enemies.
- **Cold** slows, then freezes after enough hits.
- **Lightning** chains between targets.
- **Poison** stacks without a cap and ramps up slowly.
- **Physical** deals big direct hits.

**Defense comes from found armor.** You have a health pool and armor, and armor only drops in the field. Heavy armor blocks more but slows you; light armor blocks less but keeps you fast. Heavy means you can afford to get clipped, never that dodging is impossible.

**Simple stats:** damage, fire rate, move speed, max health, health regen, armor.

**Bosses are engineering puzzles.** Each boss poses a problem a factory can solve: twin cores that must be hit at once (a two-stream line at the right angle), an armored front (arcing shots), evasive movement (ley-guided ammo), swarms of adds (a wide, cheap spread). A first attempt can be pure scouting: learn the mechanics, run, retool, return. A tailored layout is a big advantage, never a hard requirement, so raw throughput is always a slower but valid answer.

## The Foundry

The foundry makes ammo. Each supply slot feeds one ammo line, and everything a line produces comes straight out of your tube.

**Walk-around building.** You build the foundry by walking around it and placing machines on a grid in the same top-down world, Factorio-style. There's no separate factory screen, and each machine's position and facing matter.

**Ammo is built physically.** An arrow takes three chains: wood into a cutter makes shafts, stone into a knapper makes heads, and fiber into a spinner makes binding rope. An assembler combines them into arrows. Bombs, knives and ley bolts each have their own chains.

**The layout is the ability.** Five assembly lines set at five angles, feeding gravity stagers, fire a five-arrow spread. A hardening stage adds pierce, a ley guide adds homing, and refinement stages raise quality and damage. Every extra projectile costs real materials, so balance is built in.

**Scaling lives inside each line.** There are at most four lines, but each can grow into a large complex: more raw supply, parallel machines, more refinement stages. More resources mean more throughput, and better machines mean stronger ammo.

**Unlocks.** Crafting something by hand once unlocks the machine that makes it. Killing a boss unlocks a new foundry wing with new machine types, plus the next region. Rare schematics add new stage types.

**What monsters drop:**

- **Raw materials** in small amounts, enough to hand-craft ammo in a pinch
- **Machine parts** specific to each area, needed to build machines and never automated
- **Schematics**, rarely, with a big visual pop when one lands
- **Unidentified armor**
- **Boss cores**, rare, needed for top-tier machines and stages

**Identification.** Found armor is unidentified until you bring it home. Its stats roll at the foundry, and it can't be equipped until then.

- **No ratio math.** Supply lines deliver a fixed amount per minute. Machines show where the bottleneck is.
- **Play time only.** Machines run while the game is open and pause when it's closed.
- **Light upkeep.** Coming home is a harvest: identify loot, fix a bottleneck, add a stage, head out.
- **Blueprints.** Layouts can be saved and rebuilt quickly, like a twin-core breaker for a boss. Rearranging a line is fast, so retooling for a fight never takes long.

## World, regions, ley lines, bosses

Your base is your magical foundry, built and abandoned by a lost magical civilization, and the tube is one of its relics. Progress means bringing the foundry back online. Tech is rediscovered, never invented.

**Theme rule:** every enemy, machine, system and piece of art must fit the lost civilization and its ley lines. Nothing modern or out of place.

- **Fantasy machines:** cutters, knappers, spinners, gravity stagers, ley guides, runeforges. Mana flows through crystal conduits, and ley conduits carry materials home.
- **Difficulty by distance:** enemies near the foundry are weak, and biomes get deadlier the farther out you go (Realm of the Mad God style).
- **Claiming:** clear a site, then set it up as a supply line to the foundry. Reactivating its ley pylon makes monsters stop roaming there and extends the tube's range. Claims are permanent, and nothing ever threatens them. NPCs may move in, so cleansed sites become small hubs.
- **Pylons are deposit points:** reach any claimed pylon and your haul is sent home safe.
- **Fast travel:** between the foundry and any claimed site.
- **Regional pull:** ammo chains need materials from several regions, so growing a line means claiming new ground.
- **Boss gates:** each boss unlocks a new foundry wing and the next region, Terraria-style, and drops the cores for top-tier machines.

## Death and tension

When you die, you're sent back to the foundry and lose everything you picked up since your last return home or pylon deposit: raw materials, machine parts, schematics, boss cores and unidentified armor. Your factory, tube, level, talents, identified armor and blueprints are always kept.

The tension lives in the stretch between your last pylon and wherever you're pushing. Grabbing a rare schematic deep in unclaimed land means surviving the trip back with it. Running away is always an option.

## Economy and progression

Two separate reward streams keep players doing both halves of the game.

| Earned from | Reward | Used for |
| --- | --- | --- |
| Combat: leveling | XP and talent points | The skill tree |
| Combat: drops | Machine parts, schematics, boss cores | Building and growing the factory |
| Combat: drops | Unidentified armor | Defense |
| Combat: bosses | New supply slots and foundry wings | More ammo lines, new machine types |
| Factory: selling surplus ammo and unneeded armor to the foundry merchant | Gold | Foundry upgrades, reservoir size, cosmetics |

Gold never buys talent points, parts or schematics, so factory farming can't replace fighting.

Region progression follows boss gates. Each boss unlocks the next region.

## Opening: first 30 minutes

The player should do the whole core loop at tiny scale in the first 10 minutes. The beats:

1. Wake in a clearing near ancient ruins and find the tube. It's dormant and can only fire ammo you hand-load.
2. Pick up starter ingredients on the way (wood, stone, fiber, a bit of ley crystal) and hand-craft a few rounds to fight weak monsters.
3. Reach the buried foundry. The tube attunes to you, as nothing has to anyone before, and links to the foundry. A short mystery hook.
4. See recipes for a few beginner ammo types. Hand-craft a small batch of each and try them out.
5. Commit the one starting supply slot to a favorite and build its line. The tube now fires straight from the factory: the "I did it by hand, now it does itself" moment.
6. Identify the armor found on the way and equip it.
7. Clear a nearby site guarded by a tougher pack and an elite, reactivate its pylon, and claim it as a supply line.
8. Return to see the line running at full speed, add a stager to try a spread version, then push toward the first boss.

## Endgame: Ascension

After beating the final boss, players can restart with stacked difficulty modifiers, like Slay the Spire's Ascension or Hades' Heat. It's cheap content to make and keeps players optimizing their foundry.

Example modifiers:

- Claimed sites yield less per minute
- Machines run slower
- Bosses hit harder or gain new mechanics
- A smaller tube reservoir
- Tougher enemies near the foundry

## Tech and prototype scope

**Stack:** Phaser 4 + TypeScript + Vite, with Tiled for maps and Aseprite for sprites. Phaser is a 2D engine with sprites, animation, tilemaps and collision built in, which suits HD pixel art. Game logic (combat, foundry, affixes) stays in plain TypeScript, separate from rendering, so a later move to Three.js for a 2.5D look stays possible.

**Camera and art:** three-quarter top-down view in HD pixel art (characters around 32 to 48 pixels tall), generated by Claude as crude sprites in one locked palette, refined once the loop is fun.

**Build order:** combat first, then the foundry, then claiming. Each layer must be fun on its own before the next one goes in.

**First prototype, the smallest full loop:**

- [ ] The tube: hand-loaded at first, then linked to the foundry, with a reservoir
- [ ] Three beginner ammo types, each with its crafting chain
- [ ] One supply slot and one ammo line, plus a gravity stager for a spread version
- [ ] One region with 2 to 3 enemy types, telegraphed attacks and an elite
- [ ] One claimable site with a supply line, pylon deposit and fast travel
- [ ] Unidentified armor drops, identified at the foundry
- [ ] Death sends you home and drops your haul

## Open questions

- [ ] Skill tree shape, size, and how the lanes connect
- [ ] Which beginner ammo types ship, and their crafting chains
- [ ] Reservoir sizes and refill speeds
- [ ] Whether identification is free or costs materials
- [ ] Whether melee exists, for example as blade constructs
- [ ] Final names for the foundry and the tube
