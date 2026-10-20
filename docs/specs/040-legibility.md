# 040: Legibility UI
status: done

Approved on draft by Shaun in chat, 2026-10-19 ("Approve on draft"); built from docs/brainstorm/2026-10-19-keyword-interview.md.

## Goal
Hovering an ammo round, a stage, a talent or a piece of gear shows a short summary: its name, its keyword chips and one-line rules with the player's real numbers. Holding Shift while hovering opens the full breakdown with the damage calculation: the base, every +% source summed, every × multiplier and the final value. A Build tab on the T panel lists every ammo round the player knows with its final numbers and what changes them, and clicking any keyword chip opens that keyword's glossary entry. A casual player only ever sees the summary unless they ask for more.

Depends on 039 (the keyword data, content lines and `resolveStat`).

## Design references
- docs/design.md: "Combat" ("Simple stats", "Damage types behave differently", "Skill tree") and the Keywords paragraph 039 adds.
- docs/brainstorm/2026-10-19-drive-rant.md, Part 2, theme 13: "Hovering an ammo, augment, affix or talent shows exactly what it does and the damage calculation. New players get a short summary; experienced players can open a full breakdown somewhere." Theme 14: builds must link visibly.
- docs/brainstorm/2026-10-19-keyword-interview.md:
  - Q14: times in seconds (1 decimal), changes in %, distances in px only in the full breakdown.
  - Q15: "hover shows a summary. Shift+hover shows the full breakdown with the damage calculation. A Build tab on the T panel lists every ammo's final numbers, and clicking a keyword chip opens its glossary entry."
- docs/brainstorm/2026-10-19-keyword-audit.md, section 4 (the two layers, with mock-ups) and 2.13 (today's tips are too small: the build tip wraps at 34 characters over 2 lines, the talent hover is a name plus 2 lines).
- docs/specs/039-keyword-system.md: `KEYWORDS`, content `lines`, `STATS`, `rulesText.ts`, `resolveStat`, `KEYWORD_DEBT`.
- docs/specs/020-vector-pass.md: rune-carved stone tablets with brass corners, the two bundled fonts (display face for names, body face for numbers), hover and press feedback on every row.
- docs/specs/031-hud-inventory.md: panel conventions (doesn't pause the world, a click on a panel never fires, the 021 pointer, inside the 640×360 view, `__GAME__.ui()` reports).
- docs/specs/015 (hover names, build-bar tips), 025 (hotbar and tube slot), 029 (bench Stages rows), 036 (bench gear rows and totals line), 037 (the T panel, 300×300, and its info area).

## Acceptance criteria

**Describe module (render, pure)**
- [ ] `src/render/describe.ts` (no Phaser import) returns `{ chips, summary, breakdown }` for a round, a stage, a talent, a gear piece (relics included) and a keyword (the glossary), from 039's data and the live sim state (`resolveStat`, `playerStats`). Every number and keyword in its output comes from data; it holds no rules text of its own.
- [ ] Number formats follow 039's formatter: damage to 1 decimal without a trailing ".0" (11.6, 15), rates as shots/s to 1 decimal, times in s to 1 decimal (2 where 1 isn't exact, 039.8), changes in %, multipliers as ×. Px appear only in the breakdown and the glossary.

**Chips (render, data)**
- [ ] A chip is a small rounded tablet with the keyword's name in the body font, filled in its group's colour (palette ids in data, one per group: delivery, behaviour, damage type, status, ground, family, trait, plus All ammo and You). Colours are pending Shaun's approval by eye.
- [ ] A round's chips come in a fixed order: family, delivery, behaviours, damage type (Physical included, 040.3). A content piece's chips are its lines' scopes, then any keyword its rule lines create or trigger.
- [ ] Clicking a chip anywhere it shows opens its glossary entry. A click on a chip never fires the tube (015).

**Summary: hover (render)**
- [ ] Shown while hovering:
  - **an ammo round:** its inventory panel row (031), hotbar slot and tube slot (025)
  - **a stage:** its build-bar button (015) and its bench Stages row (029)
  - **a talent:** its node on the T panel (037), in the panel's info area
  - **gear:** its bench row and worn slot cell (036)
- [ ] Format, at most four rows:
  1. the name, then its chips on the same row (wrapping to a second row only if they don't fit)
  2. one or two rules lines with the player's numbers after every bonus
  3. "N bonuses · hold Shift", only when at least one talent, relic or affix changes a number shown
- [ ] What the lines say, by kind:
  - **Round:** its key numbers. A Shot round: damage · shots/s, plus "Freeze in N hits" if Cold, "N Shards × damage" if Split. A Lob or Mine round: Burst damage · shots/s, plus "arms in N s" (Mine) or "N Bomblets × damage" (Cluster). Example, a Frost arrow with Fletcher's Eye and Hard Bore: "11.6 dmg · 4.0/s · Freeze in 4 hits".
  - **Talent or relic:** its generated lines (039), and "Reaches: " with the rounds the player knows that it changes (Wide Casing: "Reaches: Bomb, Cluster bomb, Landmine"). A line that reaches nothing the player knows says "Reaches: nothing you have yet".
  - **Stage:** its generated line (039) and which of the player's rounds it can take.
  - **Gear:** rarity and slot, base armor, then its affixes as one "You:" line ("You: +12 max health · +4% move speed"); a relic adds its rule lines.
- [ ] The summary tablet is at most 200 px wide, sits beside the hovered thing, and flips side or moves up so it always stays at least 4 px inside the 640×360 view.
- [ ] The build-bar tip (015) and the talent info area (037) are replaced by this summary; `BUILD_TIP`'s 34-character, 2-line limit goes.

**Breakdown: Shift + hover (render)**
- [ ] While Shift is held over anything with a summary, its tablet expands in place to the breakdown. Releasing Shift returns it to the summary. Shift+click keeps its 022 meaning in hoppers.
- [ ] **A round's breakdown**, one line per stat, each with base, every +% source summed, every × multiplier and the final value:
  - "Damage 10 × (1 + 10% Fletcher's Eye + 6% Hard Bore) = 11.6"
  - "Fire rate 4.0/s × (1 + 10% Quick Nock + 8% Oiled Breech) = 4.7/s · one every 0.21 s", with Overpressure as "× up to 1.25 while held 2.0 s = 5.9/s"
  - conditional multipliers after the final, as "when" lines: "×1.5 through a Pool (Blastfletch) = 17.4"
  - each keyword's rule line with its final numbers, px included: range and speed, Homing's lock and turn, Split's Shards and their damage, Burst's damage and radius, Cluster's Bomblets, Knockback's push, Cold's Chill and Freeze numbers
  - "Linked:" every talent, relic, affix and stage that touches any of its keywords or its family, taken or not, with taken ones lit
- [ ] **A talent or relic's breakdown:** each line's before → after on every round it reaches ("Burst radius: Bomb 48 → 55.2 px · Bomblet 20 → 23 px · Landmine 24 → 27.6 px · Pool-burst 24 → 27.6 px"), and for a talent its lane and cost.
- [ ] **A stage's breakdown:** the keyword's glossary rule with its numbers, its cost per batch, and the rounds it takes and gives.
- [ ] **A gear piece's breakdown:** base armor and each affix, then the totals line (036) before → after equipping it ("max health 115 → 127 · armor 14 → 16"), and a relic's rule with its numbers in s and px.
- [ ] The breakdown tablet is at most 280 px wide and 16 lines of 10 px; it follows the summary's placement rule and stays inside the view.
- [ ] Nothing shows breakdown text unless Shift is held, a Build tab row is hovered, or a glossary entry is open. A test hovers every summary source without Shift and finds no breakdown line.

**The Build tab (render, data)**
- [ ] The T panel's title card gains two tabs, **Talents** and **Build**, in 036's tab style. Talents is shown first; the panel remembers the tab while the game runs.
- [ ] The Build tab lists, under a header per family (Arrow, Bomb, Ley, Landmine), every round the player knows (040.2). A family with none is hidden.
- [ ] Each row shows the round's icon, its name, its shape and element chips, its final damage, its shots/s, and "N sources" (the count of talents, relics and affixes changing it).
- [ ] Hovering a row shows that round's breakdown beside the panel, without Shift. Clicking a chip in a row opens the glossary.
- [ ] Every row fits in the 300×300 panel at 14 px a row; with more rows than fit, the list takes two columns (031's rule).

**Glossary (render, data)**
- [ ] Clicking a chip opens that keyword's entry on a tablet, centred, above any open panel, at most 260 × 170 px. It shows:
  - the name, its group and its chip
  - its rule from the template, with the data's numbers, and "yours:" beside any number the player's bonuses change
  - **Sources:** what grants it (rounds, stages, relics, keystones), from 039's computed sources
  - **Payoffs:** what scales or consumes it, from 039's computed payoffs, or "None yet" for a keyword in `KEYWORD_DEBT`
  - **Changes:** the stats it exposes
- [ ] Chips inside the entry are clickable and replace the entry. Esc, or a click outside it, closes it. Like other panels it doesn't pause the world (031).
- [ ] Every entry's text is generated from 039's data; reserved keywords have no entry.

**Hover persistence (render)**
- [ ] A summary or breakdown tablet stays open while the cursor is on its source or on the tablet itself, with a short grace on leaving (`TIP.graceMs`, starting 200), so its chips can be clicked (040.1).

**Enemy hover (render)**
- [ ] An enemy's hover name (015) gains its trait chips (Boss, Shield, Burrowed) and its live status chips ("Chill 2", "Freeze", "Stun"). These chips are not clickable in the world, since a click there fires (040.4).

**Style and fit (render, data)**
- [ ] Every tablet is a 020 stone tablet with brass corners; names use the display face and numbers and rules the body face; rows have 020's hover and press feedback.
- [ ] Panels follow 031: no pause, a click on a tablet never fires, the 021 pointer shows over them, and everything stays inside 640×360.
- [ ] The bundled fonts draw + − % × · → ° / and digits; a data test checks the glyphs. The stale comment in `src/data/descriptions.ts` about the HUD font's punctuation is corrected.

**Hook**
- [ ] `__GAME__.ui()` reports:
  - `tip: { source: { kind, id }, mode: 'summary' | 'breakdown', chips, lines, box } | null`
  - `talentPanel: { open, tab }`
  - `buildTab: { rows: [{ round, chips, damage, perSecond, sources }] }`
  - `glossary: { keyword, lines, box } | null`

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Chip colours, tabs and tablets are pending Shaun's review by eye.

## Data changes
- `src/data/legibility.ts` (new): `TIP` (summary and breakdown sizes, line height, gap, edge margin, `graceMs`), `CHIP` (padding, height, radius, colours per group), `BUILD_TAB` (row height, columns, header style), `GLOSSARY` (size, section labels: "Sources", "Payoffs", "Changes", "None yet"), the hint text ("hold Shift") and the "Reaches:"/"Linked:" labels.
- `src/data/talentAssets.ts`: `TALENT_PANEL` gains `tabs`; its `info` area hosts the summary.
- `src/data/hudLayout.ts`: `BUILD_TIP` removed in favour of `TIP`.
- `src/data/descriptions.ts`: the font comment.
- New render files: `src/render/describe.ts`, `src/render/RuleTip.ts`, `src/render/KeywordChip.ts`, `src/render/BuildTab.ts`, `src/render/GlossaryView.ts`.

## Out of scope
- Damage per second or per-target estimates (040.5).
- Comparing two gear pieces side by side, beyond the before → after totals.
- A glossary index or search, or a Glossary tab (040.6).
- Breakdowns for factory pieces other than stages, for enemies' stats, or for the punch.
- Content that targets traits; any balance change (041).
- Controller or touch input for Shift and chips.

## Test plan
- **Vitest (render, pure):**
  - `describe` for an arrow with Fletcher's Eye and Hard Bore: chips Arrow · Shot · Pierce · Knockback · Physical; summary "11.6 dmg · 4.0/s"; breakdown damage line as written above.
  - Wide Casing's talent breakdown lists the four Burst radii before → after.
  - A Frost bomb's summary has the Cold chip and its Freeze hits; a Cluster bomb's has its Bomblets.
  - A relic's summary has its generated rule line; a gear piece's breakdown totals match `playerStats` after equipping.
  - The glossary entry for Pool lists Blastfletch as source and payoff and shows "None yet" for further payoffs (debt); Burst's lists Wide Casing.
  - No summary line holds "px"; every breakdown number matches `resolveStat`.
- **Vitest (data):** layouts fit 640×360 at their maximum sizes; the font glyph check.
- **Playwright:**
  - With `?playtest`, hover the arrow hotbar slot: `ui().tip.mode` is `summary` with the expected chips; hold Shift: `breakdown`; release: `summary`.
  - Take Fletcher's Eye, reopen the tip: its damage reads 11 and the bonus hint shows.
  - Open T, switch to Build: rows for every known round; hover one for its breakdown.
  - Click the Burst chip: `ui().glossary.keyword` is `burst`; Esc closes it. The tube didn't fire.
  - Hover a Husk with frost hits on it: its hover shows "Chill" with the stack count.
- **Screenshots:** a round's summary and breakdown, a talent summary, a gear breakdown, the Build tab, a glossary entry, and an enemy hover with chips, each at 640×360.

## Open questions
Each has a proposed answer that the build follows (approve-on-draft); Shaun may change any of them at playtest.

- **040.1 A hover tablet vanishes when the cursor leaves its source, so how is a chip on it clicked?** Proposal: the tablet stays while the cursor is on it, with a 200 ms grace when moving from the source to the tablet.
- **040.2 Which rounds does the Build tab list?** Proposal: every round the player knows: hand-crafted or hand-applied, made by a machine, or carried at least once. Rounds the player has never seen stay hidden, as recipes do before they're found.
- **040.3 Does every round show a Physical chip, though Physical has no rule?** Proposal: yes, so every round shows its damage type the same way, and the chip leads to the glossary's "Plain damage" line.
- **040.4 Enemy chips weren't in the interview's list.** Proposal: show trait and status chips on the enemy hover name, not clickable. Q18 names traits as chips, and the hover name is the only place they can show.
- **040.5 A damage-per-second line?** Proposal: no. It depends on aim and pierce and would be a guess; 041 may add one if the balance pass wants it.
- **040.6 Can a keyword be looked up without a chip?** Proposal: not in this spec. Every live keyword shows as a chip somewhere the player can reach (a round, a talent, a relic or a stage); a Glossary tab can follow if playtests ask.
- **040.7 Where does the "hold Shift" hint show?** Proposal: only on line 3, only when something changes the numbers, so a new player with no bonuses never sees it.
