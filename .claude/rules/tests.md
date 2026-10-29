---
paths:
  - "tests/e2e/**"
---
- e2e waits on state, not time: poll `getState()` / `ui()` for the condition before asserting, and never use a fixed `waitForTimeout` as proof that something happened.
- When a change touches an area that older review-shot specs (`*Shots.spec.ts`) cover, run those specs with REVIEW_SHOTS=1 at /verify (Shaun, 2026-10-20: twice a new spec broke an older spec's shots unnoticed).
- Screenshot short-lived effects (damage numbers, popups, flashes) with their lifetime extended or their tweens stopped; a capture can land after they're gone.
- Never measure a game duration in wall-clock time: CI's two-core software renderer draws few frames, so read the length on the clock the thing runs on (tween or sim ticks), and wait for screens to settle by drawn frames (`frameSettled`) (fix-e2e-wallclock, 2026-10-28).
- Pixel-colour checks turn off what drifts through the frame (weather, ambient motes) with the test hook (`worldLifeOff`), so only the thing under test is counted.
