import { AMMO } from '../data/ammo';
import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRE_SOUNDS, SOUND_LEVELS, type SoundKey } from '../data/sounds';
import { roundTier } from '../data/tags';
import type { Tier } from '../data/tiers';
import { STEEL_FIRE_SOUNDS, STORMSTEEL_FIRE_SOUNDS, WORK_SOUNDS } from '../data/tierSounds';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';

// 062's feel: a steel round fires with its family's heavier sound (a glass bolt as a ley bolt), and a Forge machine
// (the Smelter, the kiln) sounds its pour or roar as it starts working a craft, while the player is in the foundry.
// 066: a stormsteel round fires with steel's sound, sharper; the Tempering coil crackles as it starts a craft.

/** Each metal tier's own fire sounds, by family; any other round (a glass or storm glass bolt) fires with its family's. */
const TIER_FIRE_SOUNDS: Readonly<Partial<Record<Tier, Readonly<Record<string, SoundKey>>>>> = { steel: STEEL_FIRE_SOUNDS, stormsteel: STORMSTEEL_FIRE_SOUNDS };

/** The sound a shot of this round fires with: its family's (029: a tagged round's base's; 062: a steel one's heavier; 066: a stormsteel one's sharper). */
export function fireSoundOf(ammoId: string): SoundKey | undefined {
  const base = AMMO[ammoId]?.base ?? ammoId;
  return TIER_FIRE_SOUNDS[roundTier(ammoId)]?.[base] ?? FIRE_SOUNDS[base];
}

/** Plays each shot's fire sound (029: a tagged round's base's; 062: a steel one's heavier). */
export function playShots(shots: SimEvents['shots'], play: (key: SoundKey) => void): void {
  for (const shot of shots) {
    const key = fireSoundOf(shot.ammoId);
    if (key) play(key);
  }
}

const WORKS = WORK_SOUNDS as Readonly<Record<string, SoundKey>>;

/** Plays a Forge machine's work sound on the frame it starts a craft. */
export class WorkFeel {
  private readonly crafting = new Map<number, boolean>();

  update(sim: SimState, shown: string, play: (key: SoundKey, level: number) => void): void {
    const live = new Set<number>();
    for (const p of sim.foundry.pieces) {
      if (p.kind !== 'machine') continue;
      const key = WORKS[p.pieceId];
      if (!key) continue;
      live.add(p.id);
      const was = this.crafting.get(p.id);
      if (was === false && p.crafting && shown === FOUNDRY_ROOM) play(key, SOUND_LEVELS.quiet);
      this.crafting.set(p.id, p.crafting);
    }
    for (const id of [...this.crafting.keys()]) if (!live.has(id)) this.crafting.delete(id);
  }
}
