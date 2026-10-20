---
paths:
  - "src/sim/**"
---
- No imports from phaser or src/render.
- Every new rule gets a Vitest test in tests/sim before the code.
- Use the seeded RNG from src/sim/rng.ts. Never Math.random.
- Advance by fixed ticks; never read real time.
- State is plain serializable data so getState() can summarize it.
- A change to SimState's shape bumps SAVE_VERSION; a rename or reshape adds a migration (042).
