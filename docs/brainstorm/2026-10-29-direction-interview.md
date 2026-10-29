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

## Still open (next round)
- Multiplayer: a real goal, and when? Shared foundry or one each? It decides how heavy the foundry can be (friends
  waiting while one player builds for an hour).
- Which pitch the game is; Shaun wants to go back and forth before choosing a direction.
- Which rounds exist and which element each gets (his examples: Lightning arrow, Firebomb, Frost shards; is a ley bolt
  Frost shards, and what is the landmine?).
- Readability with free stacking: a line could fire many homing shards; is material cost enough of a limit?
- What "manual first" means for the tube's machines.
- What the extra raws, stages and talents keyed to today's families become.
