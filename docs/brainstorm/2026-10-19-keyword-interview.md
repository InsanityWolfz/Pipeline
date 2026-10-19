# Keyword spec interview: answers

Oct 19, 2026 · Shaun's answers to the open questions in docs/brainstorm/2026-10-19-keyword-audit.md, section 5.

## Round 1
- **Q1, gear offense:** relics may bend a keyword's rule or numbers, and so may sets later (for example "Cluster: +2 Bomblets"). Regular affixes stay defensive. This loosens pillar 6 for relics only.
- **Q2, boss sets:** not now. Revisit after the glossary ships.
- **Q3, what content targets:** families and keywords. Each content line names exactly one scope: a family ("Bomb: +10% damage") or a behaviour keyword ("Burst: +15% radius", which reaches every Burst).
- **Q4, landmines:** a family of their own. A landmine's explosion is a Burst, so Burst content reaches it and Bomb content doesn't.

## Round 2
- **Q5, names:** approved: Shot, Lob, Mine, Pierce, Homing, Split (replacing "Star"), Burst, Cluster, Knockback, Physical, Cold, Chill and Freeze. **Thaw is dropped.** Shaun: "I'm not sold on the statuses stagger and charged either maybe those will be later". So Stagger and Charged are not keywords for now.
- **Q6, reserved words:** rename now. One word, one rule.
- **Q7, name rule:** item and stage names don't have to contain their keyword; the keyword chips show it.
- **Q9, ley shapes:** keep one shape per round (Homing or Split). Revisit in the ammo content spec.

## Round 3
- **Stagger and Charged:** Shaun: "Change stagger to stun and use pools for circles that get dropped on the ground for now". So:
  - **Stun** replaces Stagger as the status keyword. Rollbreaker stuns.
  - **Pool** is the keyword for any circle left on the ground. Blastfletch's charged ground becomes a Pool. This also fits the later static-pool bomb.
  - "Charged" isn't used as a keyword.
- **Q8, Splitter:** keep both names. Splitter is a piece name and never shows as a keyword chip.
- **Q10, Physical:** no rule. Physical is plain damage, and design.md's "big direct hits" line is updated.
- **Q11, Knockback:** lives on each round, and builds can raise it. It's scaled by an enemy weight, and bosses have weight 0.

## Round 4
- **Q12, elements:** every family. An element stage can tag any ammo family; shapes (Homing, Split, Cluster) stay per family.
- **Q13, stacking math:** all "+%" bonuses to a stat add together; relics and keystones use "×". Cooldowns become fractional, so the shown % is exactly what the player gets.
- **Q14, units:** times in seconds (1 decimal), changes in %, and distances in px only in the full breakdown.
- **Q15, breakdown:** hover shows a summary. Shift+hover shows the full breakdown with the damage calculation. A Build tab on the T panel lists every ammo's final numbers, and clicking a keyword chip opens its glossary entry.
