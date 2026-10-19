# 035: Region 2 enemies
status: approved

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

Drafted from Shaun's spec interview (docs/brainstorm/2026-10-19-interview.md), 2026-10-19. Built right after 034, on its own branch; until it ships, 034's Region 2 packs use Husks and Wisps as placeholders.

## Goal
Stonefall Hollows (034) gets four new enemies, each asking for a different kind of dodge:
- **Charger:** shows its lane, then rams down it.
- **Burrower:** tunnels toward you as a visible ripple, then erupts under where you stood.
- **Shardback:** an armored front, a small Bulwark that has to be flanked.
- **Sniper construct:** paints you with a laser sight from behind cover before it fires.

Every attack is telegraphed and readable. They roam the Hollows in packs, and champions (032) can appear among them.

## Design references
- docs/design.md:
  - "Combat", Enemies: "a busy fight can hold 10 to 15 enemies. Every enemy still telegraphs attacks you read and dodge, and nothing becomes a mindless horde."
  - "Combat": "Running away is always allowed."
  - "World": "Difficulty by distance: enemies near the foundry are weak, and biomes get deadlier the farther out you go."
  - "Theme rule": every enemy fits the lost civilisation and its ley lines.
  - "The Foundry", "What monsters drop": raw materials, machine parts specific to each area, schematics, unidentified armor.
- docs/prototype.md, "Crude animations needed": enemies need idle, move, attack wind-up (the telegraph), attack, hit and death.
- Existing enemy specs:
  - docs/specs/004-enemies.md: the Husk; the wind-up, attack, recover and cooldown timing
  - docs/specs/009-claiming.md: the Wisp's orbs, the Warden's ground circle
  - docs/specs/017-overworld.md: on-screen aggro, leash, packs per ring, the spawn cap
  - docs/specs/023-melee.md: the punch and the `boss` flag
- docs/specs/034-stonefall-hollows.md: the region, ring 3, ley-iron, cover terrain, and **the shield rule**, which the Shardback shares.
- docs/specs/033-research.md: schematic drops and Region 2's machine part (`aqueduct-valve`).
- The champions and landmarks spec (032): champion multipliers and rates.
- docs/brainstorm/2026-10-19-content.md, section 6: "New enemies: 2–3 with new behaviours, for example a charger and a burrower, so dodging matters."
- Interview answers (Shaun, 2026-10-19):
  - Round 6, champions: "about 1.5× size, +50% HP, +30% damage, +15% speed; 2–3× drops and guaranteed armor; a glow and a name; about 1 in 8 packs has one, more often in the outer rings."
  - Round 8, new enemies: "all four":
    - "Charger: telegraphs, then rams in a line."
    - "Burrower: tunnels underground, shown by a ripple, and pops up under you after a wind-up."
    - "Shardback: an armored front, a mini-Bulwark."
    - "Sniper construct: a long-range shot with a laser-sight telegraph; it hides behind cover."

## Acceptance criteria

**Shared (data, sim)**
- [ ] `EnemyDef` gains four kinds, each with its own attack block on the shared `AttackTiming` (wind-up, attack, recover, cooldown): `charger`, `burrower`, `shardback` and `sniper`. Each AI is its own file in `src/sim`, as `slammerAi.ts` is.
- [ ] Every attack has a wind-up of at least `MIN_TELEGRAPH_TICKS` (starting 30) that shows a marker on the ground or in the air. A data test enforces this for every enemy, old and new.
- [ ] They use the existing rules unless stated otherwise:
  - aggro on screen (017)
  - leash and return home
  - separation
  - the hit flash and knockback
  - the punch, with knockback, since none is a boss
  - a KO resets unclaimed land
- [ ] Damage to the player goes through `damagePlayer`, so armor and i-frames apply as today.

**Charger (data, sim)**
- [ ] When the player is within `charge.triggerRange` with a clear line (no solid tile between them) and its cooldown is ready, it plants itself and winds up. During the wind-up:
  - It paws the ground and its horns glow.
  - A red lane shows on the ground from its feet, `charge.distance` long and `charge.width` wide.
  - The lane's direction is locked at the wind-up's start.
- [ ] It then charges down the lane at `charge.speed`. It hits the player once per charge if their feet box touches its body: `charge.damage` and knockback along the lane, unless i-frames are running.
- [ ] It stops at the lane's end. If it hits a solid tile first, it is stunned for `charge.stunTicks` (60, 1 s) with no damage to itself, which is a punish window, then recovers. It passes through other enemies without hurting them.
- [ ] After the charge it holds still for `recoverTicks`.

**Burrower (data, sim)**
- [ ] It idles above ground at home. On aggro it digs in, a 20-tick dig animation during which it can still be hit.
- [ ] Underground it moves toward the player at `burrow.speed`, using normal ground collision, shown only by a ripple: a moving mound of cracked earth with a dust trail. Underground, nothing can hit it (shots, punches and bursts, bombs included), and it doesn't block or separate. It doesn't tunnel under cliffs. It is hittable only while digging in and while surfaced.
- [ ] When its ripple is within `burrow.lockRange` of the player's feet, or after `burrow.maxTunnelTicks`, it stops and locks the spot where the player's feet are. During the wind-up:
  - A red cracked ring of `burrow.radius` grows at the locked spot, with a rumble.
  - The ripple stays still at the spot.
- [ ] It then erupts at the spot: `burrow.damage` and knockback outward to a player whose feet are inside, unless i-frames are running.
- [ ] It then stays surfaced and dazed for `burrow.surfacedTicks`, which is the window to hit it, before digging in again.

**Shardback (data, sim)**
- [ ] It has a `shield` (034's rule) with `arcDegrees` and `turnDegPerSec`. It turns faster than the Bulwark, but slowly enough to flank on foot.
  - Straight shots and punches into its front arc are blocked.
  - Lobbed bursts and hits from outside the arc land.
- [ ] It walks toward the player. Within `bash.triggerRange` it winds up a short frontal shield bash. It has no bombs and no pound; those stay the Bulwark's:
  - The shield's runes flare, and a red arc of `bash.arcDegrees` and `bash.reach` shows in front of it, in the Husk's swipe style (004).
  - Then it bashes: `bash.damage` and knockback.
- [ ] It keeps turning during the wind-up and stops turning during the recovery, which is the window to get behind it.

**Sniper construct (data, sim)**
- [ ] It aggros at `snipe.aggroRange`, which is longer than other enemies' (on-screen aggro still applies).
- [ ] It looks for **cover**: a free tile within `snipe.coverSearch` tiles of itself where a solid tile that blocks projectiles is between it and the player.
  - Solid tiles here are cliffs, rocks, walls and aqueduct pillars (034).
  - Cover is worked out from the tile grid, so it is deterministic and needs no hand-placed data.
  - It walks to the nearest cover tile and waits there while its cooldown runs.
  - With no cover in range, it keeps its distance in the open, like the Wisp (009).
- [ ] When its cooldown is ready, it steps out to the nearest tile with a clear line to the player, at most `snipe.peekTiles` away, and winds up.
  - **Tracking:** for `snipe.trackTicks`, a thin red laser sight runs from its lens to the player and follows them.
  - **Locked:** for `snipe.lockTicks`, the line stops following, brightens and blinks. This is the dodge cue.
  - The laser never shows through solids. If the line is blocked during tracking, the wind-up is cancelled and it re-peeks.
- [ ] It then fires one bolt along the locked line:
  - `snipe.boltSpeed`, `snipe.damage`, ending at a solid or after `snipe.range`
  - It is an enemy projectile, in the same list as the Wisp's orbs, and a roll's i-frames dodge it.
  - It goes straight back to cover.
- [ ] When the player is closer than `snipe.backOff`, it retreats to the nearest cover tile away from them, rather than firing.

**Starting values (data)**
All values are starting values in data, tuned in playtest. Ticks are at 60 Hz. For comparison, the Husk has 40 health, 50 px/s and a 20-damage swipe; the Warden's slam does 30.

| | Charger | Burrower | Shardback | Sniper construct |
| --- | --- | --- | --- | --- |
| health | 50 | 35 | 70 | 30 |
| walk | 45 px/s | 40 px/s (70 underground) | 40 px/s | 50 px/s |
| trigger | 200 px, clear line | lock within 12 px, or after 180 ticks | 30 px | aggro 320 px; backs off within 96 px |
| wind-up | 45 | 50 | 40 | 60 tracking + 24 locked |
| attack | lane 220 px long, 24 px wide, 360 px/s | ring radius 28 px | arc 100°, reach 40 px | bolt 480 px/s, range 400 px |
| damage, knockback | 25, 48 px | 22, 32 px | 20, 40 px | 28, 12 px |
| recover | 45 (stun 60 on a wall) | 150 surfaced | 30 | back to cover |
| cooldown (from wind-up start) | 180 | 240 | 90 | 240 |
| other | | 20-tick dig | shield 180°, 120°/s turn | cover search 5 tiles, peek 1 tile |

**Drops (data)**
- [ ] Every Region 2 enemy always drops `ley-iron`: 1 from each of the four. Each also has its own chance at a raw from the region, stone. It also has a 4% chance at an `aqueduct-valve`, Region 2's part (033), the shared schematic roll (033), and a 10% chance at unidentified armor (the Husk's rate), so defense keeps coming from the field (pillar 6).
- [ ] Champions apply their drop multiplier and guaranteed armor (032).

**Spawning (data, sim)**
- [ ] Ring 3 (Region 2, 034) keeps `packs` packs alive under 017's rules: spawn distance, out of view, the respawn delay, the spawn cap of 15 within a screen, and never inside a safe zone or the arena. Starting values:
  - 6 packs of 4–5, picked from `['shardback', 'charger', 'charger', 'burrower', 'sniper']`
  - at most 1 sniper and 2 burrowers per pack, so a pack can always be read
  - Husks and Wisps never appear in Region 2 packs, and the four new enemies never appear in rings 1–2
- [ ] The Cistern Terrace guards (034) are a fixed pack: 2 Shardbacks, 2 Chargers, 1 Burrower and 1 Sniper.
- [ ] Champions (032) can be any of the four. 032 sets 1 in 8 packs for ring 1 and 1 in 5 for ring 2, and leaves later regions to add their own entries. Ring 3 is 1 in 4.
  - A champion Shardback keeps its shield arc and turn speed. Its 1.5× size enlarges its hurtbox and its shield together.
  - A champion's +15% speed applies to walking, tunnelling and the charge.
  - Telegraph durations are never shortened.

**Render, art**
- [ ] Each enemy fits the Hollows' lost civilisation, in grey-blue stone, brass, rust and cyan, drawn in the 016/020 vector style with the shared ink outline:
  - **Charger:** a horned stone ram-construct.
  - **Burrower:** a segmented quarry-borer with a drill snout.
  - **Shardback:** a squat construct with a crystal-studded shield plate, the Bulwark's little cousin.
  - **Sniper construct:** a tall tripod construct with one ley lens.
- [ ] Each gets the prototype's set of animations: idle, move, wind-up (the telegraph), attack, recover, hit and death. In addition:
  - the Charger's stun
  - the Burrower's dig in, ripple and erupt
  - the Shardback's block flash
  - the Sniper's step-out and back
- [ ] Every telegraph uses the shared enemy red, as the Warden's circle does: the Charger's lane, the Burrower's ring, the Shardback's arc and the Sniper's laser. Cyan stays the player's colour.
- [ ] Sounds: charge wind-up and impact, rumble and erupt, shield clang and bash, laser hum and lock beep, and the bolt.

**Hook**
- [ ] `getState()` reports each enemy's kind-specific state:
  - the Charger's lane
  - whether a Burrower is underground, and its locked spot
  - shield facing angles
  - the Sniper's phase (cover, tracking, locked) and its line
- [ ] Events: `charges`, `eruptions`, `blocked` (034), `snipes`.
- [ ] `?start=hollows` (034) can spawn a test pack of each kind in the sandbox.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/enemies.ts`:
  - kinds `charger`, `burrower`, `shardback` and `sniper`, with their attack blocks
  - the four entries, with drops
  - `MIN_TELEGRAPH_TICKS`
  - the optional `shield` field (034), used by `shardback`
- `src/data/population.ts`: ring 3 packs and the per-pack limits.
- `src/data/champions.ts` (032): ring 3's champion chance.
- `src/data/overworld.ts` or `src/data/hollows.ts` (034): the Cistern Terrace guard pack.
- `src/data/assets.ts`: `ENEMY_ANIMS` keys for the four.
- `src/data/art` and `src/data/palette.ts`: the four rigs and the telegraph markers.
- Sounds, as above.

## Out of scope
- The Bulwark, the region, the shield rule itself and cover terrain (034).
- Changes to Husks, Wisps or ring 1–2 populations.
- Elites or mini-bosses in the Hollows.
- XP for kills (037, which sets their XP values).
- Enemy armor values, resistances or weaknesses (design.md: there are none).
- Status effects on the player, such as slows or stuns.

## Test plan
- **Vitest:**
  - Data: every enemy's wind-up is at least `MIN_TELEGRAPH_TICKS`, and every drop item exists.
  - Charger: the trigger needs a clear line; the lane locks at the wind-up's start; a sidestep during the wind-up dodges; the hit lands once per charge; it stops at the lane's end; a wall stun lasts 60 ticks; it passes through enemies.
  - Burrower: it is untargetable underground; it locks within 12 px or at 180 ticks; the ring and erupt hit inside and miss outside; i-frames dodge; it can be hit while surfaced.
  - Shardback: front shots are blocked and back shots land (034's tests reused); turning is capped; the bash arc hits and misses; it doesn't turn during the recovery.
  - Sniper: it finds cover from the tile grid; with no cover, it keeps its distance; it peeks to a clear line; the line tracks and then locks; a blocked line cancels; the bolt flies along the locked line, a roll dodges it, and it stops at solids; it backs off when close.
  - Spawning: ring 3 pack makeup and limits; no spawns in the arena or a safe zone; champion multipliers apply without shortening telegraphs.
  - Determinism.
- **Playwright:** with `?start=hollows`, fight one of each kind:
  - dodge a charge sideways
  - step out of a burrower's ring
  - kill a Shardback from behind
  - roll through a sniper's bolt after the lock
- **Screenshots:**
  - each enemy idle, and each mid-telegraph: the lane, the ring with the ripple, the bash arc, and the laser while tracking and while locked
  - a champion Shardback
  - a mixed Region 2 pack

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).
