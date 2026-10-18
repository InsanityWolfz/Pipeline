# Plan: 010 Armor (docs/specs/010-armor.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/010-armor`, stacked on 009.

## Shape
- **Unidentified armor:**
  - It's an ordinary carried item, `unidentified-armor`, of a new kind `armor`. Pieces are all alike until identified, so a count is enough.
  - That means pickups, the pylon deposit to the stash, and 011's banking all work unchanged.
- **Identified pieces:**
  - They live in `state.armor: ArmorPiece[]`, each `{ id, weight, armor, name }`, with `state.nextArmorId` and `state.equipped: number | null`.
  - "Identified" means the piece is in this list.
- **Drops:**
  - `spawnDrops` adds one `unidentified-armor` when the enemy's armor roll succeeds.
  - The first Husk death ever always succeeds and sets `state.firstHuskDropped`, which a KO keeps.
- **Identification bench:**
  - A fixture `identification-bench` (kind `bench`) on the foundry's west side, there from the start.
  - E opens render's bench menu. Its commands are `identify: true` (rolls every carried unidentified piece) and `equip: { id: number | null }`.
- **Effects:**
  - `damagePlayer` takes `max(1, amount − armor)`.
  - `stepPlayer` gets a speed scale: 0.85 in heavy armor. Rolls are unchanged.

## Tests first
- **`tests/sim/armor.test.ts`:**
  - The first Husk kill always drops a bundle, and the flag survives a KO.
  - After that, the drop rates follow the seed (e.g. 200 Husk deaths give roughly 10%, the same for the same seed).
  - Wisp drops run about 15%; the Warden always drops one.
  - Picking up a bundle gives `unidentified-armor`.
  - Identify at the bench:
    - only works in reach and needs pieces
    - light rolls 2–4, heavy 5–8
    - the name comes from the word lists
    - it's deterministic per seed
  - Equip, swap, and unequip by clicking the equipped piece again.
  - Damage is `max(1, d − armor)`.
  - Heavy armor walks at 0.85× speed, and a roll covers the same distance.
  - A pylon deposit stashes unidentified armor.
- **Data test:**
  - the weight table's ranges
  - the bench fixture is on open floor
  - every drop-rate key is an enemy
  - every new sprite is in the atlas
- **`tests/e2e/armor.spec.ts`:** kill the first Husk, collect the bundle, walk to the bench, identify, equip, and take a reduced hit.

## Render
- **`BenchMenu` (via `ChoiceMenu`):**
  - an "identify all" row (bench icon and count)
  - one row per piece: light or heavy icon, armor value, and an equipped mark (a gold `+`)
- **HUD:** the armor icon and value next to the health bar.
- **Player:** a palette tint by weight (light: moss-light, heavy: stone-pale), applied when no hit flash shows.
- **Art:** `item-unidentified-armor`, `icon-armor-light`, `icon-armor-heavy`, `bench` (plus a working frame), `emblem-identify`.
