import { SOUNDS } from "../assets";
import { TRACKS, type TrackName, type TrackSpec } from "./tracks";

/**
 * Owns every `HTMLAudioElement` in the game.
 *
 * Browsers reject playback until the page has seen a gesture and reject it
 * again whenever a clip is interrupted, so every call here is guarded. The
 * original code wrapped each of these in its own try/catch; that handling now
 * lives in one place.
 */
export class AudioManager {
  private readonly elements = new Map<TrackName, HTMLAudioElement>();

  /**
   * Each track's volume before the master level is applied.
   *
   * Kept separately so the master slider and the per-track mixing (the enemy
   * proximity loop fades itself) can both move without overwriting each other.
   */
  private readonly baseVolumes = new Map<TrackName, number>();

  /** Master level, 0..1. Every track's volume is scaled by this. */
  private master = 1;

  /** Flipped by the first pointer or key event; nothing plays before then. */
  private unlocked = false;

  constructor() {
    const specs = TRACKS as Record<TrackName, TrackSpec>;
    for (const [name, spec] of Object.entries(specs)) {
      const track = name as TrackName;
      const audio = new Audio(spec.src);
      audio.preload = "auto";
      audio.volume = spec.volume;
      audio.loop = spec.loop ?? false;
      this.elements.set(track, audio);
      this.baseVolumes.set(track, spec.volume);
    }
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get masterVolume(): number {
    return this.master;
  }

  /** Sets the master level and re-applies it to every track. */
  setMasterVolume(volume: number): void {
    this.master = clamp01(volume);
    for (const name of this.elements.keys()) this.applyVolume(name);
  }

  private applyVolume(name: TrackName): void {
    const audio = this.elements.get(name);
    if (!audio) return;
    audio.volume = clamp01((this.baseVolumes.get(name) ?? 0) * this.master);
  }

  /** Called once the page has received a user gesture. */
  unlock(): void {
    this.unlocked = true;
  }

  get(name: TrackName): HTMLAudioElement | undefined {
    return this.elements.get(name);
  }

  /** Restarts a clip from the beginning. Ignores rejected playback. */
  play(name: TrackName): void {
    const audio = this.elements.get(name);
    if (!audio) return;
    try {
      audio.currentTime = 0;
    } catch {
      // Seeking can throw before metadata loads; playing anyway is fine.
    }
    void audio.play().catch(() => {});
  }

  /** Plays only if it is not already running, for loops like footsteps. */
  playIfIdle(name: TrackName): void {
    const audio = this.elements.get(name);
    if (!audio || !audio.paused) return;
    void audio.play().catch(() => {});
  }

  /** Plays only after the page has been unlocked by a gesture. */
  playWhenAllowed(name: TrackName): void {
    if (!this.unlocked) return;
    this.play(name);
  }

  pause(name: TrackName): void {
    const audio = this.elements.get(name);
    if (!audio || audio.paused) return;
    audio.pause();
  }

  /** Pauses and rewinds, so the next play starts clean. */
  stop(name: TrackName): void {
    const audio = this.elements.get(name);
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Same as above: a failed rewind is harmless.
    }
  }

  stopAll(names: TrackName[]): void {
    for (const name of names) this.stop(name);
  }

  /**
   * Sets a track's own level, before the master. Used by sounds that mix
   * themselves, such as the enemy loop fading with distance.
   */
  setVolume(name: TrackName, volume: number): void {
    this.baseVolumes.set(name, clamp01(volume));
    this.applyVolume(name);
  }

  /**
   * Points the music track at a level's theme, rewinding only when the source
   * actually changes so re-renders do not restart the song.
   */
  setMusicTrack(src: string): void {
    const music = this.elements.get("music");
    if (!music) return;

    const resolved = new URL(src, window.location.origin).href;
    if (music.src === resolved) return;

    music.src = src;
    try {
      music.currentTime = 0;
    } catch {
      // Ignore: the new source will start at zero regardless.
    }
  }

  /** Runs `handler` once the given clip finishes, with a duration fallback. */
  onEnded(name: TrackName, handler: () => void): () => void {
    const audio = this.elements.get(name);
    if (!audio) {
      handler();
      return () => {};
    }

    let fallback: number | null = null;
    const cleanup = () => {
      audio.removeEventListener("ended", onEnded);
      if (fallback !== null) window.clearTimeout(fallback);
    };
    const onEnded = () => {
      cleanup();
      handler();
    };

    audio.addEventListener("ended", onEnded);

    // Some browsers drop `ended` on interrupted clips; fall back to duration.
    if (isFinite(audio.duration) && audio.duration > 0) {
      fallback = window.setTimeout(
        onEnded,
        Math.max(0, Math.floor(audio.duration * 1000)) + 200,
      );
    }

    return cleanup;
  }

  /**
   * Silences everything without tearing the manager down.
   *
   * A paused media element keeps itself alive, so leaving the page has to stop
   * playback explicitly. It must stay reusable afterwards: React re-runs
   * effects on remount, and under StrictMode it does so on every mount, so a
   * cleanup that destroyed the elements would leave the game permanently mute.
   */
  pauseAll(): void {
    for (const audio of this.elements.values()) audio.pause();
  }
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Which theme plays on a given level. */
export const musicForLevel = (levelIndex: number, isIntro: boolean): string => {
  if (isIntro) return SOUNDS.levelMusic;
  return levelIndex < 4 ? SOUNDS.levelMusic : SOUNDS.bossMusic;
};
