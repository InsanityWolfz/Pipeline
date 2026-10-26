# Shaun's calls on the agent playtest

Oct 26, 2026 · Shaun's voice notes on docs/brainstorm/2026-10-26-agent-playtest.md (he was sick, so these are summarised) and his answers to two proposals (AskUserQuestion).

## Bugs
- **Ranged enemies healing when they leave the screen:** keep it. "If you get out of range, they should go back and heal." Balancing the Stormcrown will help.
- **The bottom HUD hides enemies:** "make the HUD not as large."
- **The boss bar covers bosses:** fix.
- **The intake hover missing the fifth entrance:** fix.
- **Arrow assemblers at half speed:** fine as is ("It's not like they're firing in the ... foundry").
- **A guarded pylon's E prompt:** "Should only show E if it needs cleared. Maybe a mouse over when it needs cleared has just a message that says kill all enemies."
- **The first armor:** "make it so the first armor you get can't be lost on death." Also: "when you do the armor tutorial, there's no arrow pointing to the identify all button. So maybe add that."
- **The objective banner:** "add some word wrap ... cap it as large as the mini-map".
- **Conduit drags:** no problem seen; skip.
- **Hit particles on the Forgewright:** hold off. He hasn't fought it, because the sandbox links don't work for him ("every sandbox link I try doesn't work"), which is now a bug.

These became two fix PRs:
- `claude/fix-playtest-ui`: the sandbox on the live site, the HUD, the boss bar, the intake hover, the pylon, the first armor, the objective wrap.
- `claude/fix-bulwark-ease`.

## Balance
- **The Bulwark:** "nerf him. Make him much easier. 900 health is fine. ... when he enrages, he doesn't throw double bombs. He just throws single bombs. And he does speed up a slight amount, but nothing crazy." Also: "make sure you can run from him. The door needs to work."
  - Claude read "Bulwark should be the hardest boss. It's the second region" as "shouldn't": he is the second region's boss and is being nerfed.
- **The Stormcrown:** needs balancing, but not now.
- **The late bosses:** "we got to buff the late bosses. They should be tough." Shaun OK'd Claude's proposal (spec 068):
  - **Forgewright:** 6,000 HP; heat keeps filling through a vent, so the Forge Flood happens about every 30 s; bellows at 300 HP each, patching in 3 s; slam and spray 20% faster.
  - **Conductor:** 8,000 HP; a storm shield while 3 or more rods stand; 0.5 s untargetable as he blinks in; storm call with 5 circles.
  - Measure targets: Forgewright 90–120 s, Conductor 120–180 s.

## The opening (spec 067)
Shaun: the ghost-guided builds "telegraphed really well". Players shouldn't go to the foundry until after the first boss. Before that they craft arrows, bombs and ley bolts by hand and are pointed at the first boss. "If they ... run out of ammo before the first boss, then at least they know how to make it from scratch." After the shrine's pylon, a ghost build of the first arrow maker "and feed its lines from the portals", then the tutorial continues as planned.

Claude's proposal, which Shaun OK'd:
1. Pick up the tube and gather (wood, stone, fiber, resin, ley crystal).
2. Craft arrows, then bombs, then ley bolts, all hand-craftable from the start.
3. Clear the ruin field.
4. Reach the shrine (its dome open from the start), kill the Warden, and claim the pylon.

Until then the foundry door stays sealed ("Claim the shrine first"). After the claim:
1. Travel to the foundry from the pylon.
2. The tube attunes.
3. A ghost build of the arrow line, fed from the wood, stone and fiber supply ports.
4. Restore the second entrance.
5. The ley bolt line and the frost rune, as now.

Gone: the pre-built example line and the "refill the hoppers" goal.

Banking before the claim (067.16): "Just make it so you don't lose things on death before you get to the foundry." Built in fix-keep-items-before-foundry: until the tube attunes on the first foundry entry, a KO loses nothing carried.

Late-boss balance (068.9–068.11: the Forgewright about 253 s against 90–120 s, arrows beating homing on the Conductor): "Keep it as is for now."

## Next
After these, an art and animation pass. Shaun will give a long description of the art style he wants, then a spec interview.
