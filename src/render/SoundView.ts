import { Input, type Scene } from 'phaser';
import { ROOM_AMBIENCE, SOUND_MIX, SOUNDS, type SoundKey } from '../data/sounds';
import { onSettings, settings, stepVolume, updateSettings } from './flow/settingsStore';

// Plays the synth sounds (014): one-shot effects, and an ambient loop per room
// that crossfades on a room change. The browser holds audio back until the first input, which Phaser waits out.
// 042: the levels come from the shared settings: master × music for the room loops, master × effects for one-shots;
// M mutes and [ and ] step the master volume (in the flow scene, so they work everywhere).

const URLS = import.meta.glob<string>('../../assets/build/sounds/*.wav', { query: '?url', import: 'default', eager: true });

const urlOf = (key: SoundKey): string | undefined => URLS[`../../assets/build/sounds/${key}.wav`];

type Loop = ReturnType<Scene['sound']['add']>;

export class SoundView {
  private readonly scene: Scene;
  private ambient: { roomId: string; sound: Loop } | null = null;
  /** Keys played this frame, so a burst of hits sounds once. */
  private readonly played = new Set<SoundKey>();

  /** Queues every sound for loading; call from the scene's preload. */
  static preload(scene: Scene): void {
    for (const key of Object.values(SOUNDS)) {
      const url = urlOf(key);
      if (url && !scene.cache.audio.exists(key)) scene.load.audio(key, url);
    }
  }

  /**
   * `keys`: M, [ and ] work in this scene (the flow scene's, 042), except while `keysHeld()` says another screen is
   * taking keys (a key list row waiting for its key).
   */
  constructor(scene: Scene, keys = false, keysHeld: () => boolean = () => false) {
    this.scene = scene;
    this.apply();
    if (keys) this.bindKeys(keysHeld);
    const off = onSettings(() => this.apply());
    scene.events.once('shutdown', () => {
      off();
      this.ambient?.sound.destroy();
    });
  }

  private bindKeys(held: () => boolean): void {
    const keys = this.scene.input.keyboard;
    const unlessHeld = (f: () => void) => () => void (held() || f());
    keys?.addKey(Input.Keyboard.KeyCodes.M).on('down', unlessHeld(() => updateSettings({ muted: !settings().muted })));
    // [ and ] step the master volume, saved.
    keys?.addKey(Input.Keyboard.KeyCodes.OPEN_BRACKET).on('down', unlessHeld(() => updateSettings({ master: stepVolume(settings().master, -1) })));
    keys?.addKey(Input.Keyboard.KeyCodes.CLOSED_BRACKET).on('down', unlessHeld(() => updateSettings({ master: stepVolume(settings().master, 1) })));
  }

  private apply(): void {
    const s = settings();
    this.scene.sound.mute = s.muted;
    this.scene.sound.volume = s.master;
    this.ambient?.sound.setVolume(this.loopLevel());
  }

  /** How loud a room loop sits: under the effects, scaled by the music channel. */
  private loopLevel(): number {
    return SOUND_MIX.ambient * settings().music;
  }

  /** Plays an effect once this frame; `volume` scales it (0–1), then the effects channel. */
  play(key: SoundKey, volume = 1): void {
    if (this.played.has(key) || !this.scene.cache.audio.exists(key)) return;
    this.played.add(key);
    this.scene.sound.play(key, { volume: volume * settings().effects });
  }

  /** Call once per frame after playing: lets the next frame's sounds through. */
  endFrame(): void {
    this.played.clear();
  }

  /** Crossfades to the shown room's loop; rooms without one fade to silence. */
  ambience(roomId: string): void {
    if (this.ambient?.roomId === roomId || (!this.ambient && !ROOM_AMBIENCE[roomId])) return;
    const old = this.ambient;
    if (old) {
      this.scene.tweens.add({
        targets: old.sound,
        volume: 0,
        duration: SOUND_MIX.crossfadeMs,
        onComplete: () => old.sound.destroy(),
      });
    }
    this.ambient = null;
    const key = ROOM_AMBIENCE[roomId];
    if (!key || !this.scene.cache.audio.exists(key)) return;
    const sound = this.scene.sound.add(key, { loop: true, volume: 0 });
    sound.play();
    this.scene.tweens.add({ targets: sound, volume: this.loopLevel(), duration: SOUND_MIX.crossfadeMs });
    this.ambient = { roomId, sound };
  }
}
