# Direction interview (2026-10-29)

After playing the merged art pass on main, Shaun: "I don't know if I see the vision anymore. At first it was supposed
to be just Factorio meets ARPG meets Realm of the Mad God, but I went wrong somewhere." His read: too many projectile
types ("Bomb Arrow of Shard is good, but maybe one element per one projectile would be better, like Lightning Arrow,
Firebomb, Frost Shards"), and maybe multiple entrances into the tube was wrong, rather than "somehow augmenting the
projectiles coming out".

Not a build request: talk it through over a few rounds before anything changes ("we're gonna have to go back and forth
a couple times"). Nothing here is decided until design.md is rewritten with his approval.

## Context from the build (Claude's look)
- 84 of 121 items are ammo: 4 families (arrow, bomb, ley bolt, landmine) × 3 material tiers × 4 elements (none, frost,
  fire, lightning) × shapes (cluster, homing, split), each combination its own item, crafting row and hotbar card.
- The layout shapes the shot only through how many entrances are fed (one fan, a lane each, each its own ammo and
  rate). Where machines stand sets throughput; what a shot is comes from the chain that made it, baked into the item.
- Claude's take: the two halves meet at an inventory, not at the tube; "augment what comes out" fixes both the count
  and the gap between factory and fight. Combat, bosses as puzzles, regions and claiming and the art aren't the problem.

## Round 1
- What felt wrong (all four): too many ammo types; the factory doesn't change how fights play; can't read his own
  shots; the foundry feels like chores.
- A shot's character (spread, homing, power): **built at the tube**: simple rounds, and machines placed where the
  line meets the intake change the volley as it fires.
- Elements: **one element per family** (Lightning arrow, Firebomb, Frost shards).
- Entrances: **hotbar lines, one each**: each entrance is one ammo line on its own key; one press fires one thing.

Note: every answer in round 1 was the option Claude marked recommended; later rounds test them from other sides.

## Round 2
- What makes the foundry chores: long raw-to-round chains; build changes feel small; fiddly building (not the trips home).
- The foundry's fun at its best: **both, in two places**: production in the halls (the Factorio feeling), volley
  design at the tube's end (the gun).
- Lines: **up to 4** (design.md's supply slots; one at the start, more from boss cores).
- Open tension: he wants the Factorio feeling in the halls, but long chains are chores.

## Round 2 (cont.)
- The way out of the chain tension: **production feeds the gun**: base rounds take one short chain; each machine at
  the tube's end eats a material per shot (a splitter eats crystal), so a bigger gun needs bigger production, and the
  halls grow because the gun is hungry.
- Rounds: **one per family, growing by region**: each round one identity with its element (Lightning arrow, Firebomb,
  Frost shards...); 3–4 at the start, a region or boss may add one, never more than about 8.
- What the tube's machines change: **count and pattern** (spread, split, ring, burst) and **path** (homing, pierce,
  bounce, boomerang, orbit). Not rhythm (charge, burst fire) or payload (bigger blast, longer burn).
- Stacking: **freely, the floor is the limit**: as many as fit in front of that entrance, stopped by space and each
  machine's material cost; their order on the floor matters.

## Round 3
- The pitch: **no preference** between "build the gun, feed the gun" (Noita-style gun building made physical),
  "Factorio with a gun" and "Realm of the Mad God with a home". This is the unsettled core: the mechanics above lean
  to the first, but he isn't sold on what the game is.
- Power over the game: **better material, same round**: steel heads make the same Lightning arrow hit harder; quality
  is a property of the line, shown on its card, never a new item.
- Firing: **each line on its own key, held to fire** (Path of Exile's bar: left and right click and two keys; two can
  fire at once).

## After round 3 (Shaun, in his words)
"So I'm tempted to say, build the gun, feed the gun. I just don't know how we're going to test, like how that's going
to be tested at bosses. Like, won't it just be throughput? So I kind of want to say Realm of the Mad God with a home,
because my plan is to make it multiplayer like Terraria, where you just get the gang in there and you guys all go out
into the world. Maybe I'm trying to combine too many games at once."

- New: **multiplayer like Terraria** is a plan (friends go out into the world together). design.md says solo, and
  pillar 1 is "you are always your character"; nothing changes until he decides it.
- Claude's read, for him to react to: the games stack as layers rather than compete: the minute-to-minute is Realm of
  the Mad God (fight, dodge, loot, with friends); the foundry is where you build your gun, the hook no other game
  has; Factorio is the flavour of how the gun gets fed, kept light. Bosses test the gun's shape, not its throughput,
  through the puzzles design.md already gives them (twin cores, a front shield, evasion, swarms), with raw throughput
  the slower fallback; `npm run measure` can show a tailored gun against an untailored one.

## Then (Shaun, in his words)
"I almost hate to say it, but the worst part about the game is the foundry. Like, I like Factorio, but you go in
there, dude, it's just like, it's confusing, and the pylons are confusing. We'd be better off just making a
Terraria-style Realm of the Mad God multiplayer game, where the classes and talents like an ARPG, and you just pick a
class and have talents and augment them with stuff and get gear. Would that be better? I feel like that might be a
better game."

- Claude's read: combat is the strongest part, and a class ARPG with friends is likely more fun than today's game.
  Most of the sim isn't the foundry: a rough name-based count puts foundry, claims and crafting at about an eighth
  of src/sim's ~14.5k lines; combat, enemies, bosses, world, gear and talents carry over. The cost is the hook: without
  the foundry it's a well-made game in a crowded genre. Middle path: drop the factory and keep the tube as the weapon
  you augment (a class picks its tube; augments socket into it), which is the "augment them with stuff" part.
  Multiplayer is the biggest single piece of work in any direction (netcode, hosting, a shared world).
- A free test before choosing: play only the fighting (`?sandbox` or `?playtest`) for a session, with friends in mind.
  If the fighting carries the game on its own, the pivot stands on solid ground.

## Multiplayer (Shaun)
"Yeah, I think combat's the best part. I think the only way to make this game be fun or be able to sell is to make it
multiplayer."

- Party size: **2–4 friends**, Terraria-style co-op.
- Hosting: **one player hosts, friends join** with a code or link (a small relay to connect people, no game servers).
- Platform: **browser now, Steam later** (a desktop wrapper once it's worth selling).
- Ownership: **characters travel, worlds are the host's**: class, level, talents and gear are the player's and join
  any friend's world; the world's progress belongs to its host.

Every multiplayer answer was the option Claude marked recommended.

## Late that night
- Claude's pitch for classes (not decided): keep the projectiles, one class per family with its own element
  (Ranger: arrows and lightning; Bombardier: bombs and fire; Ley mage: ley bolts and frost; Trapper: mines and
  poison), skills on the four keys instead of ammo items, augments socketed into each class's tube from loot,
  co-op combos through the keyword statuses, the built bosses as party puzzles; cut the factory, keep the foundry
  as a home base. Order: a one-player class test, then a two-player network test, then design.md.
- Shaun then asked which of his two games is better to finish and sell on Steam. Claude's answer: SlotsVsSlots
  (smaller, a proven genre, an open hook, close to a product); Pipeline could come back as a second game.
  The overnight review of SlotsVsSlots is Shaun's doc "Slots vs. Slots: the road to Steam".

## Still open (next round)
- The foundry's fate: cut, or the middle path (each class's tube takes socketed augments, no factory).
- Classes: how many, what sets them apart (their tube? their talents?), and how they work together in a party.
- A cheap proof before any redesign: two players in today's combat over the network, to see that it feels right.
- Why the game exists: to play with friends, or to ship and sell? It decides how much the hook is worth.
- Multiplayer: a real goal, and when? Shared foundry or one each? It decides how heavy the foundry can be (friends
  waiting while one player builds for an hour).
- Which pitch the game is; Shaun wants to go back and forth before choosing a direction.
- Which rounds exist and which element each gets (his examples: Lightning arrow, Firebomb, Frost shards; is a ley bolt
  Frost shards, and what is the landmine?).
- Readability with free stacking: a line could fire many homing shards; is material cost enough of a limit?
- What "manual first" means for the tube's machines.
- What the extra raws, stages and talents keyed to today's families become.
