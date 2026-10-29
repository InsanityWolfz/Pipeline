---
paths:
  - "src/render/**"
---
- Phaser 4 APIs only. Check .claude/skills/phaser for anything unfamiliar.
- Read sim state; send input as commands. No game rules here.
- Asset keys come from src/data/assets.ts, never string literals.
- Animation and motion (walks, sway, particles, effects) are judged in motion, never from stills, when Shaun asks for a look: capture about a second of frames at real game speed and look at the strip. Guard tests keep cadence and bob in bounds (Shaun, 2026-10-28, after 075's walk ran at 12 steps a second; strips only on request since 2026-10-29).
