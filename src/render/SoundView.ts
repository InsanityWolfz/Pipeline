import { Input, type Scene, type Sound } from 'phaser';
import { ROOM_AMBIENCE, SOUND_MIX, SOUNDS, VOLUME_STEP, type SoundKey } from '../data/sounds';
import { loadSoundSettings, saveSoundSettings, type SoundSettings } from './soundSettings';

// Plays the synth sounds (014): one-shot effects, and an ambient loop per room
// that crossfades on a room change. M mutes, [ and ] set the volume; both are saved. The
// browser holds audio back until the first input, which Phaser waits out.

const URLS = import.meta.glob<string>('../../assets/build/sounds/*.wav', { query: '?url', import: 'default', eager: true });

const urlOf = (key: SoundKey): string | undefined => URLS[`../../assets/build/sounds/${key}.wav`];

export class SoundView {
  private readonly scene: Scene;
  private readonly settings: SoundSettings;
  private ambient: { roomId: string; sound: Sound.BaseSound } | null = null;
  /** Keys played this frame, so a burst of hits sounds once. */
  private readonly played = new Set<SoundKey>();

  /** Queues every sound for loading; call from the scene's preload. */
  static preload(scene: Scene): void {
    for (const key of Object.values(SOUNDS)) {
      const url = urlOf(key);
      if (url) scene.load.audio(key, url);
    }
  }

  constructor(scene: Scene) {
    this.scene = scene;
    this.settings = loadSoundSettings(window.location.search, navigator.webdriver);
    this.apply();
    const keys = scene.input.keyboard;
    keys?.addKey(Input.Keyboard.KeyCodes.M).on('down', () => this.toggleMute());
    keys?.addKey(Input.Keyboard.KeyCodes.OPEN_BRACKET).on('down', () => this.nudgeVolume(-VOLUME_STEP));
    keys?.addKey(Input.Keyboard.KeyCodes.CLOSED_BRACKET).on('down', () => this.nudgeVolume(VOLUME_STEP));
    scene.events.once('shutdown', () => this.ambient?.sound.destroy());
  }

  get volume(): number {
    return this.settings.volume;
  }

  get muted(): boolean {
    return this.settings.muted;
  }

  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.apply();
    saveSoundSettings(this.settings);
  }

  /** [ and ] step the master volume, kept between 0 and 1 and saved. */
  nudgeVolume(step: number): void {
    this.settings.volume = Math.round(Math.min(1, Math.max(0, this.settings.volume + step)) * 10) / 10;
    this.apply();
    saveSoundSettings(this.settings);
  }

  private apply(): void {
    this.scene.sound.mute = this.settings.muted;
    this.scene.sound.volume = this.settings.volume;
  }

  /** Plays an effect once this frame; `volume` scales it (0–1). */
  play(key: SoundKey, volume = 1): void {
    if (this.played.has(key) || !this.scene.cache.audio.exists(key)) return;
    this.played.add(key);
    this.scene.sound.play(key, { volume });
  }

  /** Call once per frame after playing: lets the next frame's sounds through. */
  endFrame(): void {
    this.played.clear();
  }

  /** Crossfades to the shown room's loop; rooms without one fade to silence. */
  ambience(roomId: string): void {
    if (this.ambient?.roomId === roomId) return;
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
    this.scene.tweens.add({ targets: sound, volume: SOUND_MIX.ambient, duration: SOUND_MIX.crossfadeMs });
    this.ambient = { roomId, sound };
  }
}
