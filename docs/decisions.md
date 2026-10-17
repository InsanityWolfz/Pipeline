# Decisions

Technical choices and why. Newest last.

## 2026-10-17: Bootstrap
- **Versions:** Phaser 4.2.1 (pinned), Vite 8, TypeScript 6, Vitest 5, ESLint 10 with typescript-eslint strict. Playwright pinned to 1.56.1 because its Chromium (revision 1194) is preinstalled in the cloud environment.
- **Node 22.18+** so TypeScript scripts (the art build) can run with Node's built-in type stripping, no extra runner.
- **ESLint enforces the sim rules:** `src/sim` can't import Phaser or render code, or use `Math.random`, `Date` or `performance.now`.
- **Hooks are Node scripts** run as `node .claude/hooks/*.mjs`, so they behave the same on Windows, macOS and Linux. The Stop check skips when there's no `package.json` or only `docs/` changed.
- **Pages previews** use plain git in `.github/workflows/pages.yml`, only first-party GitHub actions. Vite uses `base: './'` so a build works at any path.
- **Phaser skills** are copied from the package (`node_modules/phaser/skills`) into `.claude/skills/phaser/` as reference docs. Claude Code only auto-discovers skills one level deep, so these are read on demand, as CLAUDE.md says, not auto-loaded.
- **Rule frontmatter** uses the documented list form (`paths:` then `- "glob"`).
