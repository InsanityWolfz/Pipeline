# Handoff for a new session

Updated 2026-10-20 by the session that built 021–041. Read this first, then the latest entries of docs/progress.md.

## Where things are
- **Branch:** all work is on `claude/laughing-volta-uac3nf`, which Shaun approved for building many specs as separate commits. It has not been merged to `main`.
- **Preview:** https://insanitywolfz.github.io/Pipeline/branch/claude/laughing-volta-uac3nf/ (add `?playtest` for a full kit, `?start=hollows` to start at the Bulwark's region). The `main` preview is old.
- **Built, reviewed and fixed:** 021–040. They wait for Shaun's /wrapup; their spec status stays `approved` until then.
- **041 (balance), last round:** check `git log` and the end of docs/specs/041-balance.md for whether this has landed.
  - **041.16:** Bulwark tuning against a 60–90 s target, measured as a pass rate over seeds 1–20 in tests/sim/bulwarkFight.test.ts.
  - **041.17:** the back wave is roll-proof and paused during the roar; adds every 25 s, capped at 4 alive.
  - **041.18:** the arena locks when the fight starts; E on the sealed door leaves and resets the fight. This stops players healing at a pylon or spring mid-fight.
  - **041.19:** slower Shardback turn.

  If any of these isn't in the history yet, finish it from the spec. Then run a reviewer pass on the 041 diff and fix what it finds.
- **Next: build 042,** the shippable playtest build (docs/specs/042-shippable-build.md, approved on draft). Note its "Changed by Shaun" section: screen shake is off entirely (already done, `SHAKE_ON = false` in src/data/juice.ts).
- **After 042: the playtest-notes interview.** docs/brainstorm/2026-10-20-playtest-notes.md has about 19 notes, from Shaun and from watching friends. Turn them into a spec interview with AskUserQuestion, then draft specs. Big themes:
  - a pre-built working arrow line in the foundry as the tutorial example
  - separate hotbars for the intake and for carried items
  - a Factorio-style grid inventory and hopper screens
  - stages in the crafting menu (C) instead of the bench
  - volleys that fan out across ammo types and fire together
  - a resin pylon so bombs can be automated
  - more ammo per early resource
  - a red HP bar
  - bigger pickup range
  - an E prompt on ley crystal nodes
  - on-screen build controls
  - Wisp aggro range
  - cache loot visuals
  - a Splitter available early

  Also fix this bug first: the Stages panel showed "0/4 arrows" when the player had arrows in an intake entrance and in the inventory.
- **Later backlog** (docs/brainstorm/2026-10-19-drive-rant.md): horizontal content (biomes, bosses, projectiles, augments, set bonuses), multiplayer Terraria-style (keep the sim deterministic and command-driven), and a bigger foundry with more involved processing.

## How the previous session worked
For each approved spec:
1. A general-purpose subagent builds it on this branch: plan in docs/plans/NNN, failing tests first, small commits, `npm run check`, the full `npm run test:e2e` twice, review shots in docs/review/NNN (REVIEW_SHOTS=1).
2. A separate `reviewer` agent reviews the diff.
3. The builder fixes every blocking issue and the reasonable suggestions.
4. Anything the spec didn't decide goes under "Raised after the build" in the spec, for Shaun.

The session never invents design. It asks Shaun, or records an open question with a proposal. Specs Shaun approved "on draft" let the builder implement the proposals.

## Gotchas
- **Machine load causes false timeouts.** The stop hook runs `npm run check` while e2e runs, so long scenario tests get explicit budgets with a comment giving their idle time. Never raise a timeout to hide a real slowdown; measure against the commit before first.
- **Keep scratch scripts out of tests/.** Use the session scratchpad.
- **Scripted e2e bots** must adapt their tactics honestly. No hidden healing, and no reading hidden state a player can't see.
- **One stat path.** All stats go through `resolveStat` (src/sim/statResolve.ts), and all player-facing rules text comes from the keyword data (039/040).

## Shaun's preferences
- Only tell him what needs him: approvals, decisions, playtests. Keep internal progress quiet unless he asks for a status report (CLAUDE.md).
- He likes AskUserQuestion interviews with a recommended option first.
- He may send voice-to-text "rants". Save them verbatim in docs/brainstorm/ and process them later.
