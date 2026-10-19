# Spec interview: answers so far

Oct 19, 2026 · Shaun's answers, which follow on from docs/brainstorm/2026-10-19-content.md.

## Round 1
- **Healing:** safe spots only. There is no regen in the open field. You heal fast in a claimed pylon's safe zone and at Ley Springs, and fully at the foundry. Field regen comes only from gear and talents.
- **Fire order:** once the tube is linked, the volley fires first. Carried rounds are the backup, then the punch. (This changes 024.)
- **Entrances:** each boss core opens one more entrance. The Warden opens the 2nd, the next boss the 3rd, and later bosses the 4th and 5th. (This changes 024.)
- **Build order:** the playtester's ranking:
  1. foundry flow fixes and a goal after the shrine
  2. ammo stages
  3. healing
  4. HUD pass
  5. champions and landmarks
  6. Region 2, the Bulwark and research
  7. new enemies
  8. equipment
  9. leveling and the skill tree

## Round 2
- **Mixed volleys:** each entrance fires at its own rate while fire is held.
- **Supply:** one stream per resource. Shaun: "instead of a second pylon claim being another portal that needs sorted you can just increase the throughput of the resource coming in and just have a number of how many pylons are supplying that line." So each raw material has its own supply output, and every pylon that supplies it adds to its rate. The foundry shows how many pylons feed each line.
- **Stage cost:** yes, a small material input as ammo passes through (e.g. 1 stone per 4 arrows).
- **Ammo roster (Shaun's notes, verbatim in substance):**

  | Ammo | When | Role | Variants |
  | --- | --- | --- | --- |
  | Arrows | before 1st boss | good pierce damage. Physical, and **pierces** | cold (slows, then freezes), fire (burns), lightning (chains to nearby enemies) |
  | Bombs | before 1st boss | good AOE, a small explosion. As now, but **remove the burn for now** | cluster bomb (smaller explosions around it after it bursts), electric bomb (leaves static pools that do chip damage) |
  | Ley crystals | before 1st boss | good damage that doesn't need much aiming. Physical, **does not pierce** (arrows and ley swap their pierce) | homing crystals, and a shatter crystal that splits into 5 small shards in a star pattern on hit |
  | Landmines (idea) | after 1st boss, needs metal | good single-target damage on a delay. You shoot them onto the ground and they explode after about 5 s, with large damage in a small radius | |
  | Flamethrower (idea) | after 1st boss, needs oil | good close-range damage. A short flame that does fire and burn damage. Charged by sending fuel to the tube | |
  | Laser (idea) | after 1st boss, needs metal and oil | ramping single-target damage you aim. Ley-line coloured. Uses ley batteries, each charging the laser for about 3 s. It does tick damage to whatever it touches and doesn't pierce | |
  | Nets (idea) | before 1st boss, made from fiber | no damage, but utility: stuns the enemy it hits for 10 s (3 s on bosses), and it can't attack meanwhile. "Then you have uses for your hot bar" | |
  | Swords (idea) | after 1st boss, needs metal | slow, large projectiles that spin and pierce. "Could be something cool for players to experiment with" | |

  Shaun: the landmines, flamethrower, laser, nets and swords are ideas he isn't married to. Only build them if the playtester and Claude think they make sense. Each would get different styles later.

## Round 3
- **Firing control:** no nets. Keep the original plan: one pipe with its entrances, and one press fires the volley. Shaun: "maybe later we can add more tubes in the foundry for multiple hotbars of different tubes but keep one for now."
- **Nets:** removed.
- **Bombs:** burn is removed, and the blast radius grows from 32 to about 48 px.
- **Roster:** agreed. Nets are dropped and so is the flamethrower. Swords are cut, possibly coming back later as a "Heavy" arrow stage.
  - **Milestone 1 (before the first new boss):**
    - arrows (pierce)
    - ley crystals (no pierce, easy aim), with homing and the 5-shard star split
    - bombs (48 px, no burn)
    - the frost rune for arrows
  - **Milestone 2 (after it, with metal and oil):**
    - lightning and fire runes
    - cluster bombs
    - landmines
    - the laser (ley batteries)
    - the static-pool bomb, last
- **Variants:** made by in-line stage machines, as the playtester and Claude recommend. Each round takes at most one element stage and one shape stage.

## Round 4
- **Stage unlock:** hand-make one first, the same rule as today's machines. For example, hand-apply a frost rune to an arrow at the bench once, and the frost stage unlocks in the build bar.
- **Frost input:** a new landmark material: a frost crystal ("rime shard") gathered at a landmark such as a frozen Ley Grotto.
- **Goals after the shrine:** a guided goal chain for each milestone, as data. For example: build a stage, find a Grotto, claim a second pylon, breach Region 2's barrier, beat the Bulwark.
- **Supply ports:** one fixed port per resource on the foundry walls: wood, stone, fiber and ley crystal, with more later. Each shows "×N pylons" and its rate. Every claimed pylon that supplies that resource adds to its rate.

## Round 5
- **Carry limit:** none. The inventory panel (I or Tab) just organises the haul into Raw, Parts, Ammo, Gear and Cores, with names. It marks what's at risk against what's banked.
- **HP bar (bottom-left, large, "72 / 100"):** all four extras:
  - the armor value beside it
  - a low-HP pulse, with a red bar and tinted screen edges below 25%
  - a cyan glow while healing
  - a damage chunk that lingers white before draining
- **Ley Springs:** stand in the pool to heal fast. No uses and no timers.
- **Pylon supply:** each pylon sends the resources of its area. A Quarry pylon sends stone, a Ley Grotto pylon sends crystal.

## Round 6
- **Champions:**
  - about 1.5× size, +50% HP, +30% damage, +15% speed
  - 2–3× drops and guaranteed armor
  - a glow and a name
  - about 1 in 8 packs has one, more often in the outer rings
- **First landmarks:** all four:
  - resource sites (Quarry, Old Grove, Reed Marsh, Ley Grotto), each with a claimable pylon sending its resource home
  - a Frozen Grotto, the guarded rime-shard source
  - Ley Springs
  - a Ruined Cache, guarded, with a chance at a schematic or rare part
- **Discovery:** landmarks are hidden until found. A landmark appears on the minimap once seen, and finding one gives XP.
- **Map:** fixed and hand-tuned, with one seed, the same world every game.

## Round 7
- **Research UI:** restoration at the machines. Lost schematics show as faint diagrams on the foundry itself: at the intake, on the walls, in a sealed wing. Press E and pay the cost to bring that part back. A simple list panel shows them all.
- **Costs:** boss cores, machine parts and schematics. No gold.
- **First nodes:**
  - intake entrances (Warden core → 2nd, the Bulwark → 3rd later)
  - reservoir size (30 → 45 → 60)
  - machine speed
  - splitter and merger
- **Gold and merchant:** not yet.
