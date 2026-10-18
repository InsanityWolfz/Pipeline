---
paths:
  - "tests/e2e/**"
---
- e2e waits on state, not time: poll `getState()` / `ui()` for the condition before asserting, and never use a fixed `waitForTimeout` as proof that something happened.
- Screenshot short-lived effects (damage numbers, popups, flashes) with their lifetime extended or their tweens stopped; a capture can land after they're gone.
