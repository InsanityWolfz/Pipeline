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
- Dev builds expose window.__GAME__ with getState() and step(frames, command?)
- One system per file, ~300 lines max, no `any`

## Workflow
Every feature runs /spec -> /plan -> /build -> /verify -> /review -> /wrapup.
One backlog item per branch. Never skip verify or review.
One spec = one branch = one PR into main; never stack specs on one branch.
A spec closes when its criteria are met or recorded; new notes become new specs.
Balance targets are measurements (npm run measure), not check tests.
Never report done while checks fail.
When something needs Shaun (an approval, a decision, a playtest), end the reply with it; when nothing does, leave that out. Report only what is relevant to Shaun; keep internal progress to yourself unless he asks for a status report.

## Never
- Invent design. If docs/design.md or the spec doesn't say, ask, or add
  an open question to the spec.
- Add a dependency without asking.
- Edit docs/design.md without explicit approval.
- Leave a session without updating docs/progress.md.
