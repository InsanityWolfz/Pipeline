# Pipeline — How we work

Rewritten 2026-10-29 (Shaun: "can we get rid of all this junk?"). The old spec/plan/build/verify/review/wrapup loop,
its agents and its 152 browser test files are gone; the old version of this doc is in git history.

## The loop

1. **Talk.** Agree on the change in chat. A design question goes to Shaun with AskUserQuestion, recommended option
   first; his answers go in docs/brainstorm/. A big change gets a short note in docs/ first; nothing else is written
   before building.
2. **Build.** On a branch off `main` (`claude/<name>`), in small commits, pushed as they land. Keep `npm run check`
   green.
3. **Play.** CI goes green on the branch's head and its preview build is up; Shaun plays it.
4. **Merge.** Only when Shaun says "merge" for that PR, with a merge commit.

The design rules from CLAUDE.md still hold: never invent design (ask), never edit docs/design.md without Shaun's
approval, never add a dependency without asking.

## Tests

- **Unit tests (Vitest, tests/)** for game rules: combat, AI, bosses, saving, determinism. New rules get a unit test.
- **Browser tests (Playwright, tests/e2e)** are a handful of smoke tests: the game boots, the title reaches play,
  quitting and a new game work, firing works, saving and continuing work. Add one only for a flow that could break.
  No browser test per visual change.
- **Locally:** `npm run check` only (typecheck, lint, and the unit tests the branch touches). Run a browser test
  locally only to reproduce a CI failure.
- **CI** (`.github/workflows/ci.yml`) runs every unit test (`npm run check:full`), the browser smoke tests and the
  production build's smoke test on every push, at no cost to Claude usage. A PR is ready only with CI green on its head.
- **Balance** is measured, not tested: `npm run measure` prints fight lengths and the like; a missed target never fails.
- Screenshots and motion strips only when Shaun asks.

## Usage

- Do the work in the main session. No builder, reviewer or qa agents unless Shaun asks; at most one agent at a time.
- Read state (`window.__GAME__.getState()`), not pixels.
- Watch CI from the main session; don't poll in a loop.

## Working with Shaun

Shaun follows from his phone.

- **Replies:** short and phone-friendly: what's ready, the preview link, and what's needed, at the end. List a build's
  own small decisions as bullets with the conservative choice already built; he OKs or changes them.
- **The status page:** "Pipeline Build Status", https://claude.ai/artifact/A7a8wWq39rvSPn6PpeKEdQ, rendered from its
  own database (update it with `ArtifactData`, reading each document first and pinning writes with `if_version`).
  `meta/now`: `headline`, `needsYou` (exactly what Shaun should do, or `""`), `updated` (ISO time). One row per PR
  under `specs/<id>`: `order`, `num`, `name`, `step` (1 Build, 4 Playtest, 5 Merged), `state` (`working`, `you`,
  `queued`, `done`), `eta` (Eastern time), `note`, `pr`, `preview`. Update it when a PR is opened, ready to play and
  merged.
- **Notifications:** when something needs Shaun (a playtest, a decision, a merge), set `needsYou` and send one
  `PushNotification` that leads with what to do. Clear `needsYou` once done. Nothing for routine progress.
- **Saves:** old saves aren't preserved. A change that breaks the save format bumps `SAVE_VERSION`, no migration.
- **docs/progress.md:** one entry per merged PR or per session that leaves something unfinished.

## Preview builds

`.github/workflows/pages.yml` builds every pushed branch to GitHub Pages: `main` at
https://insanitywolfz.github.io/Pipeline/, any other branch at `/Pipeline/branch/<branch-name>/` (add `?playtest`
for a full kit, `?sandbox` for the sandbox). Previews are production builds, so `window.__GAME__` isn't there. A
deleted branch's folder is removed.

## Hooks

- **Stop hook** (`.claude/hooks/check.mjs`): runs `npm run check` when Claude finishes, unless only docs/ changed or
  the tree is the one it last passed on. A failure blocks finishing and feeds the errors back.
- **Edit hook:** ESLint with autofix on each edited file.

## Repo layout

```
CLAUDE.md               project memory
docs/                   design.md (source of truth), process.md, progress.md, art.md, decisions.md, brainstorm/;
                        specs/, plans/, backlog.md and review/ are history from the old loop
src/sim/                pure TypeScript game rules, no Phaser, deterministic
src/render/             Phaser scenes and views, no game rules
src/data/               content as typed data (art in src/data/art)
tests/                  Vitest (sim, data, render, scripts), measure/, e2e/ smoke tests, prod/
.claude/                rules/, hooks/, skills/phaser, commands/sprite.md, settings.json
```

## Art

Every sprite is vector shape data in `src/data/art/` (docs/art.md locks the style); `npm run dev` then `/sheet.html`
shows every frame at 4×. `/sprite` draws a new one. Shaun approves art by eye.
