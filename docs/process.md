# Pipeline — Build Process

Oct 17, 2026 · @Shaun

## How to use this doc

This is the operating manual for building Pipeline with Claude Code. It sits next to two other docs: the design doc (what the game is) and the prototype plan (what to build first). Claude Code reads all three from the repo, so every session starts with the same context.

**Setup:**

1. Complete the prerequisites below.
2. Export all three docs as Markdown into the repo as `docs/design.md`, `docs/prototype.md` and `docs/process.md`.
3. Open Claude Code in the repo and paste the first-session prompt.

**First-session prompt:**

```
Read docs/process.md, docs/design.md and docs/prototype.md in full.
Use the existing Git repo and its GitHub remote (origin).
Write the hook scripts as Node scripts so they run on Windows.
Add the GitHub Pages preview workflow from the "Preview builds" section.
Bootstrap the repo exactly as the "Starter files" and "Repo layout"
sections of process.md describe: scaffold Phaser 4 + TypeScript + Vite,
create CLAUDE.md, .claude/rules, .claude/commands, .claude/agents,
.claude/settings.json, docs/backlog.md and docs/progress.md.
Copy Phaser's agent skills into .claude/skills/phaser.
Get `npm run check` passing on an empty game, commit, then run /spec
for backlog item 001 and stop for my approval.
```

After that, every feature goes through the loop below, one backlog item at a time.

## Prerequisites

**Before the first session:**

- [ ] A Git repo in the project folder with a GitHub remote, since finished work lands through pull requests
- [ ] Node.js LTS and npm
- [ ] Git
- [ ] Claude Code installed and signed in
- [ ] The three docs exported as Markdown into `docs/`
- [ ] GitHub Pages available on the repo (a private repo needs a paid plan, and the published site is public)

**Before art work starts (not needed for the first slices):**

- [ ] Aseprite (optional) for touching up generated sprites
- [ ] Tiled for building maps

Claude Code installs the rest itself: Phaser 4, Vite, Vitest, Playwright and its Chromium browser.

## Repo layout and architecture

```
CLAUDE.md                 project memory, under 200 lines
docs/
  design.md               the game design (source of truth)
  prototype.md            prototype scope
  process.md              this doc
  art.md                  art spec: palette, sizes, camera angle
  backlog.md              ordered list of specs and their status
  progress.md             session log and current state
  decisions.md            technical decisions and why
  specs/NNN-name.md       one spec per feature
  plans/NNN-name.md       plans written by unattended /next runs
src/
  sim/                    pure TypeScript game logic, no Phaser
  render/                 Phaser scenes, sprites, input, UI
  data/                   machines, recipes, ammo, enemies, assets
  main.ts                 boots Phaser, wires sim to render
tests/
  sim/                    Vitest unit tests for src/sim
  e2e/                    Playwright game tests and screenshots
assets/fonts/             the two bundled OFL fonts and their licences
assets/build/sounds/      generated sound effects
assets/maps/              Tiled maps
scripts/build-sound.ts    generates the sound effects
.github/workflows/
  pages.yml               builds every branch and publishes a playable preview
  ci.yml                  npm run check and the full Playwright suite on every push
.claude/
  rules/  commands/  agents/  skills/phaser/  hooks/  settings.json
```

**Architecture rules** (these keep AI output accurate and testable):

1. **Sim and render are separate.** `src/sim` holds every game rule and never imports Phaser. `src/render` draws sim state and turns input into commands, with no game rules.
2. **The sim is deterministic.** Fixed timestep, all randomness from one seeded RNG in `src/sim/rng.ts`, never `Math.random()` or wall-clock time. Same inputs, same result, every time.
3. **Content is data.** Machines, recipes, ammo and enemies are typed entries in `src/data`. Adding content means adding data, not writing new systems.
4. **The game exposes a test hook.** In dev builds, `window.__GAME__` offers `getState()` (a compact JSON summary) and `step(frames)` so tests and agents can drive the game frame by frame without reading pixels.
5. **Small files.** One system per file, roughly 300 lines max.
6. **TypeScript strict mode, ESLint, no `any`.**

## Two tracks (Shaun, 2026-10-21)

The ceremony fits the change. Every change still gets its own branch, a test, green CI and Shaun's merge.

- **Feature track:** anything with new design, new content or several systems. It runs the feature loop below.
- **Fix track:** a bug or small tweak with no design question: it changes how something already specced behaves or looks, in about one system and under about 100 lines. No spec, no plan, no reviewer, no wrapup. Branch `claude/fix-<name>` off `main`; a failing test first (Vitest, or Playwright for render-only bugs), then the fix; `npm run check` and the touched e2e files locally; push and let CI run the rest; one PR with what was wrong, the cause, the fix and the test. Add a `fix-<name>` row to the status page; skip progress.md unless there's a handoff note. If a fix turns out to need design, stop and make it a spec.
- Several small fixes Shaun names together may share one fix branch and PR.

## The feature loop

Every backlog item on the feature track goes through the same steps, each with its own slash command.

_Loop: Spec, then you approve, then Plan, Build, Verify, Review, then you playtest, then Log. Verify failures and review changes loop back to Build._

1. **Spec** (`/spec`): Claude interviews you about the feature, then writes `docs/specs/NNN-name.md` with testable acceptance criteria tied to the design doc, as the first commit on the spec's own branch (`claude/NNN-name`), and opens that branch's draft PR. There is no separate spec PR: the same PR carries the spec, the build and the wrapup. You approve it before anything is built.
2. **Plan** (`/plan`): Claude breaks the spec into a vertical slice that works end to end (sim, render and data together), not one layer at a time. A written plan file (`docs/plans/NNN-name.md`) only for a spec that spans several systems or is expected to pass about 300 lines; otherwise the plan is a short checklist in the PR body.
3. **Build** (`/build`): sim tests are written first, then the code. Small commits on the spec's branch.
4. **Verify** (`/verify`): `npm run check` and the e2e files the change touches, locally; the full Playwright suite runs in CI (`.github/workflows/ci.yml`, 4 shards) on every push. A hook enforces `npm run check`, so Claude can't declare done with failing checks, and a PR is ready only when CI is green on its head.
5. **Review** (`/review`): a separate reviewer agent with fresh context checks the diff against the spec, the architecture rules and the design doc. It never sees the build session's reasoning, so the work isn't grading itself.
6. **Log** (`/wrapup`): written into the PR before it goes to you for the playtest, so "merge" is only the merge: the spec marked done, backlog, decisions, one progress entry, and any repeated mistake turned into a new rule in `.claude/rules`. That's how the process improves over time.

Failures loop back to Build. If the spec itself turns out wrong, Claude stops and asks rather than redesigning on its own.

### Keeping the loop small (Shaun, 2026-10-20)

From 021 to 041, 21 specs were stacked on one branch with no pull requests. `main` fell behind, nothing could be wrapped up, the diff was too large to review, and the stop hook ran the full check on every reply. These rules prevent that:

1. **One spec, one branch, one PR.** Each spec gets its own branch (`claude/NNN-name`) and its own PR into `main`, merged after Shaun's playtest and before the next spec starts. Unattended runs may build several specs, but each one stacks on the previous spec's branch and has its own draft PR, so each can be reviewed and merged on its own.
2. **A spec closes.** It is done when its acceptance criteria are met, or the unmet ones are recorded with measurements and a question for Shaun. New playtest notes and new ideas become new specs, never new items in a spec that is still open.
3. **At most one "raised after the build" round per spec.** If Shaun's answers lead to more building that misses again, record the numbers and put the follow-up in a new spec.
4. **Balance targets are measurements.** Scripted-bot targets over many seeds (fight lengths, clear times, damage taken) are printed by `npm run measure` (tests/measure, its own Vitest config; a missed target never fails it) and recorded in the spec and PR. They are not tests in `npm run check`, and the build doesn't loop on tuning to make chaotic seeds pass. Balance is judged at playtest.
5. **Small approval batches.** About three specs approved at a time, so the proposals Shaun approves on draft are ones he has read.
6. **CI runs the full suite.** Sessions run `npm run check` and the e2e files the change touches; the full Playwright suite runs in CI on every push (2026-10-21). A local full `npm run test:e2e` (about 7 minutes) only when CI can't be read, once per spec.
7. **Commit after each item.** A container restart loses anything uncommitted.
8. **Each fact in one place.** Live step state (building, review, ready to play) lives on the status page; the work and its history in the PR and git; spec status in the spec and docs/backlog.md. docs/progress.md is a handoff log: one entry per merged PR or per session that leaves something unfinished, never one per step.
9. **Review shots for the current change only.** Take shots for the spec being built. Don't retake older specs' shots because the map or HUD moved; old shots are history. A shot spec that breaks is fixed only when Shaun asks for it.

## Working with Shaun (2026-10-20)

Shaun follows the work from his phone, so sessions keep him informed without him having to check in. Do it exactly this way.

**The status page.** "Pipeline Build Status" is a claude.ai artifact: https://claude.ai/artifact/A7a8wWq39rvSPn6PpeKEdQ. It renders from its own database, so update the data with the `ArtifactData` tool; republish the page only to change its design. Read a document first and pin each write with `if_version`.
- `meta/now`: `headline` (one line on what's happening now), `needsYou` (exactly what Shaun should do, or `""`), `updated` (an ISO time).
- `specs/<NNN>`: `order` (the number), `num` ("047"), `name`, `step` (0 Spec, 1 Build, 2 Review, 3 Fixes, 4 Playtest, 5 Merged), `state` (`working`, `you`, `queued` or `done`), `eta` (a clock time in Eastern time, e.g. "ready to play about 6:30 pm ET"), `note` (one or two plain sentences), `pr` and `preview` (full https links).
- Update it at every step change: build started, built, review findings, fixes done, ready to play, merged. Move an ETA when it slips. Add a row when a spec is drafted. Mark a merged spec `done` and drop its `eta`.

**Notifications.** When something needs Shaun (a playtest, a decision, a merge), set `needsYou` and send one `PushNotification`: one line that leads with what to do, e.g. "046 is ready to play: New game, walk into the foundry. Say 'merge 34' when happy." Clear `needsYou` once he's done it. Don't notify for routine progress.

**ETAs.** Base an ETA on how long similar recent PRs took in git history (056: about 45 minutes from approval to ready), not a guess.

**Each spec, end to end.**
1. The spec's draft PR already exists (from /spec). On approval, a `general-purpose` builder agent builds on that same branch (stacked on the previous spec's branch when that one isn't merged yet) and keeps `npm run check` green at every commit.
2. A separate `reviewer` agent reviews the diff. The builder fixes every blocking issue and the reasonable suggestions.
3. CI green on the final head (the full Playwright suite runs there). The wrapup goes in now: spec `done`, backlog, decisions, one progress entry. Then mark the PR ready, set the page to Playtest with `needsYou`, and notify.
4. When Shaun says "merge NN": merge with a merge commit (keeps stacked branches valid) and retarget the next stacked PR to `main`. If his playtest asks for changes instead, they go on the same branch, and the wrapup is touched up only if it changed.

**Fixes, end to end.** Fix track (see "Two tracks"): the main session or one builder agent makes the fix on `claude/fix-<name>`, CI green, PR ready, page set to Playtest with `needsYou`, notify. Shaun says "merge" as for a spec.

**Talking to him.**
- Keep replies short and phone-friendly: what's ready, the preview link, and what's needed, at the end.
- List the build's own decisions as short bullets with the conservative choice already built; he OKs or changes them.
- Ask design questions with AskUserQuestion, recommended option first; save his answers in docs/brainstorm/.
- A balance or design fork found mid-build (like 046.7's compounding) goes to him as one question with a recommendation, while the builder carries on with the rest.

**Saves.** Don't preserve old saves (Shaun, 2026-10-20). A change that breaks the save format bumps `SAVE_VERSION` with no migration; an older save reads as too old and the player starts over.

**While a builder works.** Never edit files a builder is changing. If the stop hook reports the builder's in-progress failures, wait with one bounded loop (`timeout 570 bash -c 'until npm run check ...; do sleep 30; done'`) rather than replying to each report.

## Agents, commands and hooks

Keep the team small. More agents means more tokens and more places for drift.

**Agents:**

| Agent | Job | Tools |
| --- | --- | --- |
| Main session | Orchestrates the loop: specs, plans, builds | All |
| `reviewer` | Checks a diff against the spec, rules and design doc. Reports issues, never edits | Read, Grep, Glob, Bash (read-only commands) |
| `qa` | Runs Playwright game tests, captures screenshots, checks them against acceptance criteria | Read, Bash |
| Explore (built in) | Codebase searches, so file dumps stay out of the main context | Read-only |

**Commands:**

| Command | Does |
| --- | --- |
| `/spec <item>` | Interviews you, writes the spec on its own branch, opens its draft PR, sets status to draft |
| `/plan` | Plans the approved spec as a vertical slice (a plan file only for big specs) |
| `/build` | Implements the plan, tests first |
| `/verify` | Runs `npm run check`, the touched e2e files and the `qa` agent; CI runs the rest |
| `/review` | Runs the `reviewer` agent on the branch diff |
| `/wrapup` | Before the playtest: marks done, updates backlog, decisions, progress and rules in the PR |
| `/next` | Unattended mode: takes the top approved spec, runs plan through review, opens a draft pull request |

**Hooks** (deterministic, unlike CLAUDE.md, which is advisory):

- **Stop hook:** runs `npm run check` (typecheck, lint, unit tests) whenever Claude tries to finish. A failure blocks finishing and feeds the errors back.
- **PostToolUse hook on edits:** runs ESLint with autofix on the changed file, so style never costs tokens.

## Starter files

The first session creates these files exactly as written. Later sessions may refine them through `/wrapup`, never silently.

### CLAUDE.md

```markdown
# Pipeline

Solo fantasy action RPG. The player's tube weapon is a portal to a factory
they build; the factory's layout shapes every shot.

Source of truth: docs/design.md. Prototype scope: docs/prototype.md.
How we work: docs/process.md. Current state: docs/progress.md.

## Stack
- Phaser 4, TypeScript (strict), Vite
- Vitest for src/sim, Playwright for game tests
- Phaser API questions: read .claude/skills/phaser before guessing

## Commands
- npm run dev        start the game
- npm run check      typecheck + lint + unit tests (must pass)
- npm run test:e2e   Playwright game tests
- npm run measure    balance measurements (report only)

## Architecture (non-negotiable)
- src/sim: all game rules, pure TypeScript, never imports Phaser
- src/sim is deterministic: fixed timestep, randomness only from
  src/sim/rng.ts, no Math.random or wall-clock time
- src/render: Phaser scenes and views only, no game rules
- src/data: content as typed data; new content = new data, not new code
- Dev builds expose window.__GAME__ with getState() and step(frames)
- One system per file, ~300 lines max, no `any`

## Workflow
Every feature runs /spec -> /plan -> /build -> /verify -> /review -> /wrapup.
One backlog item per branch. Never skip verify or review.
Never report done while checks fail.

## Never
- Invent design. If docs/design.md or the spec doesn't say, ask, or add
  an open question to the spec.
- Add a dependency without asking.
- Edit docs/design.md without explicit approval.
- Leave a session without updating docs/progress.md.
```

### .claude/rules/sim.md

```markdown
---
paths: src/sim/**
---
- No imports from phaser or src/render.
- Every new rule gets a Vitest test in tests/sim before the code.
- Use the seeded RNG from src/sim/rng.ts. Never Math.random.
- Advance by fixed ticks; never read real time.
- State is plain serializable data so getState() can summarize it.
```

### .claude/rules/render.md

```markdown
---
paths: src/render/**
---
- Phaser 4 APIs only. Check .claude/skills/phaser for anything unfamiliar.
- Read sim state; send input as commands. No game rules here.
- Asset keys come from src/data/assets.ts, never string literals.
```

### .claude/rules/data.md

```markdown
---
paths: src/data/**
---
- Every entry is typed and has a kebab-case id.
- A test validates that every reference (recipe input, machine id) exists.
- Numbers here are tuning values; change them, don't hardcode in systems.
```

### .claude/commands

One file per command, each a short instruction. These are the bootstrap versions; the live text is in `.claude/commands` (updated 2026-10-21 for the two tracks, one PR per spec, CI and the early wrapup).

- **spec.md:** "Read docs/design.md, docs/prototype.md and the backlog item $ARGUMENTS. Interview me with AskUserQuestion until the feature is unambiguous. Write docs/specs/NNN-name.md from the spec template in docs/process.md with status: draft. Stop."
- **plan.md:** "Only for a spec with status: approved. Enter plan mode. Plan a vertical slice touching sim, render and data together. List the tests first. Stop for my approval."
- **build.md:** "Create a branch for the spec. Write failing sim tests, then the code, in small commits. Follow the plan; if it's wrong, stop and say why."
- **verify.md:** "Run npm run check and npm run test:e2e. Delegate to the qa agent for screenshots against the acceptance criteria. Fix failures and rerun until green."
- **review.md:** "Delegate to the reviewer agent with the spec path and the branch diff. Address every blocking issue, then rerun /verify."
- **wrapup.md:** "After I confirm the playtest: set the spec to done, update docs/backlog.md and docs/progress.md, record technical choices in docs/decisions.md, and if a mistake happened twice, propose a new rule for .claude/rules. Commit, push the branch and open a pull request into main that links the spec, summarizes the change and gives the preview link. Merge it only when I explicitly say so in chat for that PR."
- **next.md:** "Take the first spec in docs/backlog.md with status: approved. Plan it as /plan would, but write the plan to docs/plans/NNN-name.md instead of entering plan mode, since nobody is there to approve it; continue only if the plan stays inside the spec. Then run /build, /verify and /review. Push the branch, open a draft pull request into main that links the spec and lists the verify and review results and the preview link, and stop. Never merge, never start a second spec, never write or approve specs."

### .claude/agents/reviewer.md

```markdown
---
name: reviewer
description: Reviews a branch diff against its spec and the project rules.
tools: Read, Grep, Glob, Bash
---
You review code you did not write. Inputs: a spec path and a git diff.
Check, in order:
1. Every acceptance criterion is met and tested.
2. Architecture rules in CLAUDE.md and .claude/rules hold.
3. Nothing beyond the spec was added; no invented design.
4. No dead code, duplicated logic, magic numbers outside src/data.
Output: a list of blocking issues and a list of suggestions, each with
file and line. Never edit files.
```

### .claude/agents/qa.md

```markdown
---
name: qa
description: Runs Playwright game tests and checks screenshots.
tools: Read, Bash
---
Run npm run test:e2e. Drive the game through window.__GAME__.step()
for deterministic frames. For each acceptance criterion with a visible
result, capture a screenshot and say whether it matches. Report console
errors. Output pass/fail per criterion with evidence.
```

### .claude/settings.json

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node .claude/hooks/check.mjs" }] }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/lint-file.mjs" }]
      }
    ]
  }
}
```

Both are Node scripts so they run the same on Windows, macOS and Linux. `check.mjs` runs `npm run check` and exits with code 2 on failure, which blocks Claude from finishing and sends it the errors. It exits 0 without running anything when there's no `package.json` yet or no file outside `docs/` has changed, so spec interviews and doc edits aren't blocked. `lint-file.mjs` reads the edited file path from the hook input and runs ESLint with autofix on it. Claude writes both scripts during bootstrap and confirms them against the current Claude Code hooks documentation.

## Preview builds

Every pushed branch gets a playable build on GitHub Pages, so playtesting needs only a browser, including on a phone.

- `.github/workflows/pages.yml` runs on every push: `npm ci`, `npm run build`, then commits the build to the `gh-pages` branch. `main` goes to the site root; any other branch goes to `/branch/<branch-name>/`. It uses plain `git` commands, no third-party deploy action.
- When a branch is deleted, the workflow removes its folder from `gh-pages`.
- Vite builds with a relative base (`base: './'`) so the same build works at any path.
- Pages is set once in the repo settings: source "Deploy from a branch", branch `gh-pages`, folder `/`.
- Every PR from `/wrapup` or `/next` includes its preview link. Preview builds are production builds, so `window.__GAME__` is not exposed there.

## Spec template and backlog

### Spec template (docs/specs/NNN-name.md)

```markdown
# NNN: Feature name
status: draft | approved | done

## Goal
One or two sentences: what the player can do when this ships.

## Design references
Sections of docs/design.md and docs/prototype.md this implements.

## Acceptance criteria
- [ ] Each one testable: a sim test, a Playwright test, or a screenshot.

## Data changes
New or changed entries in src/data.

## Out of scope
What this deliberately does not do.

## Test plan
Which tests prove each criterion.

## Open questions
Anything the design doesn't answer. Must be empty before approval.
```

### Backlog (docs/backlog.md)

An ordered list, one line per item: number, name, status (`idea`, `draft`, `approved`, `done`). Only you move a spec to `approved`. Unattended runs only ever pick up `approved` items.

### Progress log (docs/progress.md)

A handoff log, latest entry first: one short entry per merged PR, or per session that leaves work unfinished (date, what changed, what's next, notes for the next session). Never one entry per step; the status page and the PR carry those. A fresh session reads the latest entry first.

## Prototype backlog

The starting contents of `docs/backlog.md`, in build order: combat first, then the foundry, then claiming. Each item is a vertical slice that's playable when done. All start as `idea`.

1. **001 Scaffold:** Phaser 4 + Vite + TypeScript, sim/render split, seeded RNG, fixed timestep, `window.__GAME__` hook, `npm run check`, one Playwright smoke test, plus docs/art.md and the art pipeline (npm run art).
2. **002 Movement:** player walks and dodges in a three-quarter view with camera follow, using placeholder shapes.
3. **003 Tube firing:** hand-loaded ammo in an inventory, cursor aiming, projectiles in the sim.
4. **004 Enemies:** Husk with a telegraphed swipe, health, damage, death, raw material drops.
5. **005 Hand crafting:** gather wood, stone, fiber and ley crystal; craft the three beginner ammo types from a crafting menu.
6. **006 Foundry building:** walk-around grid placement of machines with facing, items moving between them, one working ammo line.
7. **007 Tube link:** the tube attunes at the foundry; reservoir drains while firing and refills from the line.
8. **008 Spread:** gravity stager splits a line into angled streams that fire as a spread.
9. **009 Claiming:** Wisp enemies and the Pylon Warden elite, pylon activation, supply line, deposit point, fast travel.
10. **010 Armor:** unidentified drops, identification at the foundry, equip, heavy versus light.
11. **011 Death:** return to the foundry and lose the carried haul.
12. **012 Tutorial flow:** the prototype's player flow stitched together from start to end, with a final pass so every sprite matches the art spec.

## Unattended runs and token discipline

**Unattended runs.** Because every bit of context lives in files, a fresh session can pick up work at any time, including a scheduled one after usage limits reset. A scheduled run executes `/next`: it takes the top approved spec, runs plan, build, verify and review on its own branch, and stops with a draft pull request ready for your review. Scheduled runs can happen on your computer (it needs to be on with Claude Code available) or in a Claude Code cloud session, since the repo is on GitHub. It never merges, never writes or approves specs, and never makes design decisions. An overnight run that builds several specs starts each one on a new branch stacked on the previous one and opens a draft PR for each (see "Keeping the loop small"). Your job is to keep a few specs approved ahead of time and review the pull requests it opens.

**Token discipline:**

- **One feature per session.** Start fresh for each backlog item, and clear context between steps when it gets long.
- **Delegate searching.** Use the Explore agent for codebase lookups, so file dumps stay out of the main context.
- **Lazy context.** Path-scoped rules and skills only load when relevant; CLAUDE.md stays under 200 lines.
- **Point, don't paste.** Reference spec and design sections by path instead of pasting them.
- **Data over code.** New content is a data entry, which costs a fraction of a new system.
- **Right-size the model.** Use the strongest model for specs, plans and review, and a faster one for routine builds and fixes.
- **Read the state, not the pixels.** Tests and agents use `getState()` and reserve screenshots for visual criteria.

## Art pipeline

Since 016 sprites are vector shape data, and since 020 there are no others: the pixel grid pipeline (`assets/sprites`, `npm run art`, the atlas and the pixel palette) is gone. Claude generates all the art itself in one signature style. No asset packs, so anything the game needs can be made to fit.

**Art spec first.** `docs/art.md` locks the style so every sprite matches:

- Three-quarter top-down view, light from the top left
- 32-px tiles in world px, drawn at the device's resolution
- One locked daylight palette, with ley-line cyan as the signature accent
- One shared ink outline on characters, enemies, items, machines and props
- The theme rule: lost magical civilization, rune-carved stone, glowing ley lines, brass and crystal, nothing modern

**Sprites are source files.** Each sprite is shape data in `src/data/art/` (ellipses, rects, SVG-style paths, lines, gradients and glows in palette ids), or a rig of parts with poses. Because it's code, Claude can draw, diff and revise it, and the palette can't drift. Render bakes every frame into one texture at boot.

**The contact sheet.** `npm run dev`, then `/sheet.html`, draws every frame at 4×, grouped by family, for review.

**The `/sprite` command.** `.claude/commands/sprite.md`: draw the sprite as vector shape data in `src/data/art`, check it on `/sheet.html` at 4×, register its key, and show Shaun.

**When art happens:**

1. **Slice 001** builds the art pipeline and writes `docs/art.md` with the palette.
2. **From slice 002 on,** every new entity gets a generated sprite as part of its slice, so the game looks like a game from the start.
3. **After the prototype proves fun,** key sprites like the player, tube and bosses get a refinement pass, by Claude or by hand in Aseprite.

**Limits to expect:** tiles, items, machines, projectiles and effects come out well this way. Characters and multi-frame animations are the hardest and will look the crudest, which is fine for a prototype.

**What you do:** approve every sprite by eye before it goes in, since consistency is a human judgment.
