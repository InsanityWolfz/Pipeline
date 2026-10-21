# 054: Combat readability
status: draft

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, theme E) and his interview answers (docs/brainstorm/2026-10-21-world-combat-interview.md).

## Goal
Fights tell the player what's happening: when an enemy can't be hurt, where a hit will land, and when a talent or stage is doing something.

## Design references
- Specs: 029 (homing and split ley bolts, stages), 035 (the Burrower), 037 (talents: the Pool-arrow talent), 039 (keywords, Pool), 041 (the Bulwark's back wave, adds).

## Acceptance criteria
**Immune health bar (E.1)**
- [ ] While nothing can damage an enemy (a burrowed Burrower, an add still rising), its health bar turns blue with a small shield icon; it goes back to normal as soon as it can be hit. Shielded fronts (Shardbacks, the Bulwark) don't count (Shaun).
- [ ] The rule is in the sim (an enemy's "immune" flag), so any future immune state gets the bar for free.

**The Bulwark's back wave (E.2)**
- [ ] While the back wave builds, its area is shaded red on the ground, like other telegraphs.

**The Pool-arrow talent (E.3)**
- [ ] An arrow that passes through a bomb pool with the talent catches fire: a burning tip and a short ember trail for the rest of its flight, and a small flash when it hits (Shaun).

**Homing bolts (E.4)**
- [ ] Homing ley bolts fly at about 60% of a plain bolt's speed with the same turn rate (Shaun). The speed is data.

**Star shot (E.5)**
- [ ] On a hit, the star shot sends 5 small, visible ley shards out evenly spaced. They skip the enemy that was hit; each deals half the bolt's damage to the first other enemy it touches, out to about 3 tiles (Shaun).

## Data changes
- `src/data/ammo.ts`, `src/data/stages.ts`: homing speed, star shards.
- `src/data/hudPanels.ts` or the enemy bar data: the immune colour and icon.
- `src/data/art`: the shards, the burning arrow.

## Out of scope
- New enemies, other talents' visuals, balance beyond the two numbers above.

## Test plan
- Vitest: the immune flag (burrowed, rising, and not for shields); homing speed; star shards' count, directions, skip and damage; the pool-arrow flag on an arrow.
- Playwright: in the sandbox, a burrowed Burrower's bar reads blue in `ui()`; a star shot's shards appear.
- `npm run measure` re-run and recorded.
- Screenshots: the blue bar, the shaded back wave, a burning arrow, star shards in flight.

## Open questions
- **054.1 The star shot's keyword text.** Proposal: the rules text (039) says "On hit: 5 shards fly out, each dealing half damage to another enemy."
- **054.2 Does a burning arrow do anything extra?** Proposal: no; it shows the talent's existing effect, nothing new.
