# Plan 022: Hopper amounts

Spec: docs/specs/022-hopper-amounts.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec.

## Shape of the change
1. **Sim.** `src/sim/input.ts` gets `type HopperAmount = 'one' | 'half' | 'all'`, and the `deposit` and `withdraw` commands carry a required `amount`. `src/sim/foundryUse.ts` gets `amountOf(amount, n)` (one: 1, half: `ceil(n / 2)`, all: n; never more than n), and `deposit`/`withdraw` move that many. A hopper keeps its type until its count reaches 0; only then does `withdraw` clear its item and timer. Mixed types are still refused. Events report the count actually moved.
2. **Callers.** Every existing deposit/withdraw command (sim tests, e2e tests) sends `amount: 'all'`, which keeps what they test.
3. **Render (input).** `Controls.pointerDown` reads Shift and Ctrl off the pointer's DOM event and passes them with the UI click (`clickUi(x, y, mods)`). On any press with Ctrl held (over a menu or not) it calls `preventDefault()` on the event; the canvas context menu is already disabled. On macOS Phaser reports Ctrl+left-click as a right click, so a pure helper (`src/render/clickInput.ts`, `isLeftPress`) decides a left press from the DOM event's button whenever Ctrl is held. The picker's `overUi` covers its whole panel (rows, gaps and hint), so a near-miss never reaches the world. `MenuRouter.click` turns the modifiers into an amount (Ctrl wins, then Shift, else one), sends it through `MenuRequests.deposit/withdraw`, and no longer closes the picker. The picker's counts already refresh every frame from the sim; when the hopper empties, its rows rebuild to the put-in list.
4. **Render (hint).** `HopperPicker` draws one line under its rows, "Click 1 · Shift half · Ctrl all" (text and spacing in `PICKER_LAYOUT.hint`, `src/data/hudLayout.ts`), centred, inside the tablet. Row positions don't move, so `pickerRows` is unchanged.
5. **Hook.** `step()` already passes the deposit and withdraw objects through, so the amount rides along. `ui()` adds `pickerHint` (the hint's text while the picker is open, else null) and `pickerCounts` (the counts its rows show).

## Tests (written first)
- **Vitest** (`tests/sim/hopperAmounts.test.ts`):
  - `amountOf` for one, half and all at counts 1, 2, 5 and 30 (half of 1 is 1, of 5 is 3, of 30 is 15)
  - deposit with each amount at counts 1, 2, 5 and 30: hopper and inventory counts, and the event's count
  - withdraw with each amount at the same counts; the hopper keeps its type while any are left and forgets it (and its timer) at 0
  - depositing a different item into a non-empty hopper is refused, at every amount
  - a hopper emptied one at a time takes a new type afterwards
- **Vitest** (`tests/render/clickInput.test.ts`): with Ctrl held a left press is read from the DOM button (Phaser's macOS rewrite ignored); otherwise Phaser's left button decides; modifiers map to one, half, all with Ctrl winning
- **Playwright** (`tests/e2e/hopperAmounts.spec.ts`):
  - with the 30 starting arrows beside a hopper, open its picker with E, then click (1), Shift+click (half of 29: 15), Ctrl+click (the remaining 14) the put row; poll the hopper count after each; the picker stays open throughout and `ui().pickerHint` is the hint
  - then on the take row: click (takes 1), Shift+click (half), Ctrl+Shift+click (Ctrl wins: the rest); the hopper forgets its type
  - a Ctrl+click on the picker has its mousedown default-prevented, and a Ctrl+right-click's contextmenu is default-prevented
  - screenshot into `docs/review/022/` (with `REVIEW_SHOTS=1`): the open picker with its hint, one put in through the hook (no press flash), once `ui().pickerCounts` shows it

## Risks
- `foundry.spec.ts` expects one click to fill the hopper with both crystals and the picker to close after a click; it is updated to Ctrl+click (all) and to check the picker stays open; pressing E on the open picker just reopens the same hopper.
