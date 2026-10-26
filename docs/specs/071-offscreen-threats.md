# 071: Off-screen threat markers
status: approved

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-26. Plan: docs/plans/071-offscreen-threats.md.

Drafted from the Hollows and late-game playtesters' findings (killed by Snipers, sentinels and others off-screen; docs/brainstorm/2026-10-26-agent-playtest.md) and the proposal Shaun approved.

## Goal
You always know where an attack is coming from. An enemy winding up an attack on you from off-screen shows a pulsing red arrow at the screen's edge.

## Design references
- docs/design.md, "Combat": "Every enemy still telegraphs attacks you read and dodge".
- Specs 035 (the Sniper's laser), 054 (combat readability), 065 (the storm sentinel).

## Acceptance criteria
- [ ] While any enemy that is outside the camera's view is winding up an attack on the player, a red arrow shows at the screen's edge on the line from the player to that enemy. It pulses through the wind-up and fades when the attack lands or is cancelled.
  - This covers: the Sniper's tracking, the storm sentinel's call, the Wisp's charge, the thunderhawk's dive, the bellows hound's lane, the Charger's lane, and the Bulwark's lobs.
- [ ] Several arrows can show at once. Arrows closer than a set gap merge.
- [ ] Strike circles and lanes that land on screen keep drawing as now.
- [ ] The arrows sit clear of the HUD panels, the minimap and the objective banner.
- [ ] Settings gains an "Off-screen warnings" toggle, on by default, saved with the other settings.
- [ ] The sim exposes which off-screen enemies are winding up on the player (render reads it).
- [ ] Review shots (docs/review/071): a Sniper's arrow; two merged arrows; the setting off.

## Out of scope
Markers for idle or wandering enemies; sound cues.

## Test plan
- Sim or render tests for: which wind-ups count, edge placement, merging, the setting.
- Playwright: a sandbox Sniper off-screen shows the arrow.
- Review shots.

## Decisions in this draft
- Only wind-ups aimed at the player show an arrow; enemies merely nearby don't.
- An arrow's colour is the shared enemy red.
