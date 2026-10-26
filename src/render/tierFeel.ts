import { AMMO } from '../data/ammo';
import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRE_SOUNDS, SOUND_LEVELS, type SoundKey } from '../data/sounds';
import { roundTier } from '../data/tags';
import { STEEL_FIRE_SOUNDS, WORK_SOUNDS } from '../data/tierSounds';
import type { SimState } from '../sim/state';

// 062's feel: a steel round fires with its family's heavier sound (a glass bolt as a ley bolt), and a Forge machine
// (the Smelter, the kiln) sounds its pour or roar as it starts working a craft, while the player is in the foundry.

/** The sound a shot of this round fires with: its family's (029: a tagged round's base's; 062: a steel one's heavier). */
export function fireSoundOf(ammoId: string): SoundKey | undefined {
  const base = AMMO[ammoId]?.base ?? ammoId;
  const steel = roundTier(ammoId) === 'steel' ? (STEEL_FIRE_SOUNDS as Readonly<Record<string, SoundKey>>)[base] : undefined;
  return steel ?? FIRE_SOUNDS[base];
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
