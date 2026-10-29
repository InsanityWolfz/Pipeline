# Open calls for Shaun

The build decisions the specs left for Shaun's OK, gathered at the end of the 2026-10-26 to 10-28 session (art pass 074–081 merged). Each is already built the conservative way; say "OK" or what to change, by number. Details are in each spec's "Raised after the build".

## Look and feel (play and react)
- **075, wanderer colours:** cobalt is built. Keep it, or switch to rust or bone? (`?scheme=rust` / `?scheme=bone` in the URL to compare.)
- **075.2** Sleeves are dark with bone shoulder caps. OK?
- **075.3 / 075.11** The rarity trim shows mostly at the hood's edge and clasp from the front and side; common trim is hard to tell from none side on. OK?
- **075.12** The bandolier, quiver and bracers are busy at 1×. OK?
- **076.10** The enemy family looks, wind-ups, deaths and calmer walks. Anything off?
- **077.3** A broken chimney stump keeps a low fire. OK?
- **077.4** Brick piles at the end of half the kiln rows. OK?
- **077.16** Gusts don't show in the plants' sway (capped). Raise the cap?
- **077.17** The Stormcrown's dark grass barely shows its sway. OK?
- **078.2** Impacts read mostly as sparks around the enemy. Bolder?
- **078.3** On Medium, glass and storm-glass bolt trails look alike. OK?
- **078.10** The bomb blast's old flash is kept, dimmer and quicker. OK?
- **078.11** Stormsteel's core is violet in flight. OK?
- **079.1** The foundry's torch flicker is calmed. OK?
- **079.4** The foundry is about as bright as the Hollows. OK?
- **079.11** The ley pulses are subtle at game size. OK?
- **080.25** The boss intro poses, sounds, name card and phase colours. Anything off?
- **081.1** The discovery banner's name turns pale brass. OK?
- **081.2** Menu motion (fades, hover, tabs) at real speed on your machine. OK?

## Performance (try on your laptop)
- **074.5 / 077.12** High costs about 3× Low on CI's software renderer. How does High run for you?
- **074.13 / 079.2** Medium uses soft light pools, not full lighting, and has no room for the forges' own lights. OK, or should Medium do more?
- A new game runs slowly for its first ~4 s while the art warms up, and boot is about a second longer. Noticeable?

## Gameplay
- **075.10** Shots leave from 12 px off your centre, not from the drawn muzzle (older than 075, more visible now). Move the spawn point to the muzzle? It changes aim slightly.

Decided this session (no action): 068's balance kept as is; 072.5, 072.7, 072.9 OK'd; 073.12–073.14 OK'd; 080.27 built (the Conductor's fight starts a beat later).
