---
paths:
  - "tests/e2e/**"
---
- e2e waits on state, not time: poll `getState()` / `ui()` for the condition before asserting, and never use a fixed `waitForTimeout` as proof that something happened.
- Locally run only `npm run check`; CI runs every unit test and the e2e smoke tests. Run an e2e file locally only to reproduce a CI failure (Shaun, 2026-10-29).
- e2e is a handful of smoke tests: add one only for a flow that could break (menus, doors, saving, flow screens); game rules get unit tests (2026-10-29).
- Screenshots only when Shaun asks; then capture short-lived effects (damage numbers, popups, flashes) with their lifetime extended or their tweens stopped.
- Never measure a game duration in wall-clock time: CI's two-core software renderer draws few frames, so read the length on the clock the thing runs on (tween or sim ticks), and wait for screens to settle by drawn frames (`frameSettled`) (fix-e2e-wallclock, 2026-10-28).
- Pixel-colour checks turn off what drifts through the frame (weather, ambient motes) with the test hook (`worldLifeOff`), so only the thing under test is counted.
