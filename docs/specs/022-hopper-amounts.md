# 022: Hopper amounts: one, half or all
status: draft

## Goal
Putting items into a hopper and taking them out works like an inventory stack:
- a click moves one
- Shift+click moves half
- Ctrl+click moves the whole stack

## Design references
- docs/design.md: "The Foundry" (light upkeep, rearranging is fast)
- docs/specs/006-foundry-building.md: hoppers
- docs/specs/015-after-overnight.md: the hopper picker
- Shaun's playtest notes, 2026-10-18: "One click just puts one in and a shift click puts in half and a ctrl click puts in the whole stack"
- Interview answer (Shaun, 2026-10-18): the same rules apply to taking items out.

## Acceptance criteria

**Sim**
- [ ] `deposit` and `withdraw` take an `amount`: `'one' | 'half' | 'all'`.
  - **Deposit:**
    - `one` moves 1 of the held item.
    - `half` moves half the carried count, rounded up.
    - `all` moves every carried one.
  - **Withdraw:** the same rules, applied to the hopper's count.
- [ ] A hopper still holds one item type. It forgets the type only when its count reaches 0.
- [ ] Depositing a different item into a non-empty hopper is still refused.
- [ ] Amounts never move more than exist. Half of 1 is 1.

**Render (input)**
- [ ] In the hopper picker:
  - a plain click on a row sends `one`
  - Shift+click sends `half`
  - Ctrl+click sends `all`
  
  Ctrl wins if both modifiers are held.
- [ ] The picker shows a one-line hint: "Click 1 · Shift half · Ctrl all".
- [ ] The picker stays open after a deposit or withdraw, so repeated clicks work. Its counts update live.
- [ ] Ctrl+click never triggers a browser shortcut or a context menu.

**Hook**
- [ ] `step()` accepts the amount on the deposit and withdraw commands.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- None. The amount names are a type in `src/sim`.

## Out of scope
- Crates and sorters. Crates still empty fully.
- Drag-and-drop.
- Typed amounts.

## Test plan
- **Vitest:** deposit and withdraw with one, half and all, at counts 1, 2, 5 and 30. Refusing a mixed type. The type is forgotten at 0.
- **Playwright:** open a hopper, then click, Shift+click and Ctrl+click a row, and check the hopper count after each.

## Open questions
None.
