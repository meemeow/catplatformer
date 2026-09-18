import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioManager } from "../game/audio/AudioManager";

const STORAGE_KEY = "cattachasm:volume";
const DEFAULT_VOLUME = 1;

/**
 * Reads the saved level.
 *
 * Storage can throw outright in a private window or with site data blocked,
 * so a failure here just means the player starts at full volume.
 */
const readStoredVolume = (): number => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, parsed));
  } catch {
    return DEFAULT_VOLUME;
  }
};

const writeStoredVolume = (volume: number): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(volume));
  } catch {
    // Not worth surfacing: the slider still works for this session.
  }
};

export interface VolumeControl {
  /** Master level, 0..1. */
  volume: number;
  setVolume: (volume: number) => void;
  /** Silences audio, or restores the level it was at before muting. */
  toggleMute: () => void;
}

/**
 * Master volume, remembered per browser.
 *
 * This is a per-viewer convenience rather than game state, which is why it
 * lives in `localStorage` and not alongside the rest of the engine's state.
 */
export const useVolume = (audio: AudioManager): VolumeControl => {
  const [volume, setVolumeState] = useState(readStoredVolume);

  /** The level to come back to when unmuting. */
  const lastAudibleRef = useRef(volume > 0 ? volume : DEFAULT_VOLUME);

  // Applied as an effect so the manager matches the restored value on mount,
  // not only after the player moves the slider.
  useEffect(() => {
    audio.setMasterVolume(volume);
  }, [audio, volume]);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    if (clamped > 0) lastAudibleRef.current = clamped;
    setVolumeState(clamped);
    writeStoredVolume(clamped);
  }, []);

  const toggleMute = useCallback(() => {
    setVolume(volume === 0 ? lastAudibleRef.current : 0);
  }, [setVolume, volume]);

  return { volume, setVolume, toggleMute };
};
