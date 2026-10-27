# Off-screen attacks: Shaun's call and interview

Oct 27, 2026 · Shaun's call on 071 and his interview answers, for spec 073.

## The call on 071
Spec 071 (off-screen threat arrows, InsanityWolfz/Pipeline#85) was closed unmerged on Shaun's call:

> "if something can target you out of range of you seeing it then its range is too long, anything off the screen should de aggro"

## Interview answers
1. An enemy can never **start** an attack while it is off screen. The current 1 s leash grace before it walks home stays, so a small camera wobble doesn't reset fights.
2. Ranges are kept. The only rule is that attacks start on screen, so a sniper can still fire from the side edges.
3. Shots already in flight when their shooter goes off screen keep flying.
4. Bosses are exempt inside their locked arenas.

## Left to the draft (for Shaun's OK in 073)
- "On screen" is the sim's view box round the player (src/sim/aiCommon.ts), not the boss camera's lifted view.
- A wind-up already started on screen completes if the enemy leaves mid-wind-up (as answer 3).
- Boss guards and arena adds are not exempt: only the boss itself.
