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
  progress.md             session log and handoff notes
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
assets/sprites/           sprite source grids (text)
assets/build/             rendered sprite sheets
assets/maps/              Tiled maps
scripts/build-art.ts      renders sprite grids to PNG
.github/workflows/
  pages.yml               builds every branch and publishes a playable preview
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

## The feature loop

Every backlog item goes through the same six steps, each with its own slash command. Nothing skips a step.

_Loop: Spec, then you approve, then Plan, Build, Verify, Review, then you playtest, then Log. Verify failures and review changes loop back to Build._

1. **Spec** (`/spec`): Claude interviews you about the feature, then writes `docs/specs/NNN-name.md` with testable acceptance criteria tied to the design doc. You approve it before anything is built.
2. **Plan** (`/plan`): in plan mode, Claude breaks the spec into a vertical slice that works end to end (sim, render and data together), not one layer at a time.
3. **Build** (`/build`): sim tests are written first, then the code. Small commits on a feature branch.
4. **Verify** (`/verify`): typecheck, lint, unit tests and Playwright game tests must all pass. A hook enforces this, so Claude can't declare done with failing checks.
5. **Review** (`/review`): a separate reviewer agent with fresh context checks the diff against the spec, the architecture rules and the design doc. It never sees the build session's reasoning, so the work isn't grading itself.
6. **Log** (`/wrapup`): you playtest the branch's preview build, then Claude marks the spec done, updates `docs/progress.md`, and turns any repeated mistake into a new rule in `.claude/rules`. That's how the process improves over time.

Failures loop back to Build. If the spec itself turns out wrong, Claude stops and asks rather than redesigning on its own.

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
| `/spec <item>` | Interviews you, writes the spec, sets status to draft |
| `/plan` | Plans the approved spec as a vertical slice |
| `/build` | Implements the plan, tests first |
| `/verify` | Runs all checks and the `qa` agent |
| `/review` | Runs the `reviewer` agent on the branch diff |
| `/wrapup` | Marks done, updates progress and rules, opens a pull request into main |
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

One file per command, each a short instruction:

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

Each session appends a short entry: date, what changed, what's next, and any notes for the next session. A fresh session reads the latest entry first.

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

**Unattended runs.** Because every bit of context lives in files, a fresh session can pick up work at any time, including a scheduled one after usage limits reset. A scheduled run executes `/next`: it takes the top approved spec, runs plan, build, verify and review on its own branch, and stops with a draft pull request ready for your review. Scheduled runs can happen on your computer (it needs to be on with Claude Code available) or in a Claude Code cloud session, since the repo is on GitHub. It never merges, never writes or approves specs, and never makes design decisions. Your job is to keep a few specs approved ahead of time and review the pull requests it opens.

**Token discipline:**

- **One feature per session.** Start fresh for each backlog item, and clear context between steps when it gets long.
- **Delegate searching.** Use the Explore agent for codebase lookups, so file dumps stay out of the main context.
- **Lazy context.** Path-scoped rules and skills only load when relevant; CLAUDE.md stays under 200 lines.
- **Point, don't paste.** Reference spec and design sections by path instead of pasting them.
- **Data over code.** New content is a data entry, which costs a fraction of a new system.
- **Right-size the model.** Use the strongest model for specs, plans and review, and a faster one for routine builds and fixes.
- **Read the state, not the pixels.** Tests and agents use `getState()` and reserve screenshots for visual criteria.

## Art pipeline

Claude generates all the art itself: crude but consistent 32-pixel top-down sprites in one signature style. No asset packs, so anything the game needs can be made to fit.

**Art spec first.** `docs/art.md` locks the style so every sprite matches:

- Three-quarter top-down view, light from the top left
- 32-pixel tiles; characters 32 pixels wide and 32 to 48 pixels tall
- One locked palette of about 24 colors, with ley-line cyan as the signature accent
- A one-pixel dark outline on characters, enemies, items and machines
- The theme rule: lost magical civilization, rune-carved stone, glowing ley lines, nothing modern

**Sprites are source files.** Each sprite is a text grid in `assets/sprites/`, one character per pixel, each character mapped to a palette color. Animations are a sequence of grids. Because sprites are text, Claude can draw, diff and revise them like code, and the palette can't drift.

**A build script renders them.** `npm run art` turns every grid into PNG sprite sheets plus atlas data for Phaser, so the game loads normal images and Aseprite can open them for touch-ups.

**The `/sprite` command.** Bootstrap adds `.claude/commands/sprite.md`: "Read docs/art.md. Draw the requested sprite or animation as grids in assets/sprites, run npm run art, view the rendered PNG at 4x, and revise until it reads clearly at game size and matches the art spec. Register its key in src/data/assets.ts. Show me the result for approval."

**When art happens:**

1. **Slice 001** builds the art pipeline and writes `docs/art.md` with the palette.
2. **From slice 002 on,** every new entity gets a generated sprite as part of its slice, so the game looks like a game from the start.
3. **After the prototype proves fun,** key sprites like the player, tube and bosses get a refinement pass, by Claude or by hand in Aseprite.

**Limits to expect:** tiles, items, machines, projectiles and effects come out well this way. Characters and multi-frame animations are the hardest and will look the crudest, which is fine for a prototype.

**What you do:** approve every sprite by eye before it goes in, since consistency is a human judgment.
