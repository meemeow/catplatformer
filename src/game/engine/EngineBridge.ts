import type { DialogueController } from "../../hooks/useDialogue";
import type { Ammo, WeaponType } from "../types";

/** The DOM nodes a session drives. */
export interface SessionElements {
  canvas: HTMLCanvasElement;
  /** Positioning context for the DOM sprite layer; the canvas's parent. */
  layer: HTMLElement | null;
  playerSprite: () => HTMLImageElement | null;
  weaponSprite: () => HTMLImageElement | null;
  playerOverlay: () => HTMLCanvasElement | null;
}

/**
 * Everything the engine needs to push back into React.
 *
 * Keeping it behind an interface is what lets the engine be plain TypeScript:
 * it never imports React, and it can be driven by a test harness just as
 * easily as by the hook.
 */
export interface EngineBridge {
  setPaused: (paused: boolean) => void;
  setCompletionMessage: (message: string | null) => void;
  advanceLevel: () => void;
  setCollectedStars: (update: number | ((count: number) => number)) => void;
  setHasWeapon: (hasWeapon: boolean) => void;
  setWeaponType: (weapon: WeaponType | null) => void;
  setAmmo: (update: Ammo | ((ammo: Ammo) => Ammo)) => void;
  setBossHealth: (health: number) => void;
  /** True once the boss cutscene ends and its health bar should be shown. */
  setBossEngaged: (engaged: boolean) => void;
  setHealth: (health: number) => void;
  setCutsceneActive: (active: boolean) => void;
  setShowHud: (show: boolean) => void;
  setIntroActive: (active: boolean) => void;
  setBlackOverlay: (visible: boolean) => void;
  setBlackOverlayOpacity: (opacity: number) => void;
  setShowEndScreen: (show: boolean) => void;
  setShowUpgradeHint: (show: boolean) => void;
  setShowReloadHint: (show: boolean) => void;
  setShowHostagePrompt: (show: boolean) => void;
  setCanvasSize: (size: { w: number; h: number }) => void;
  /** The live dialogue controller, or null before the first commit. */
  dialogue: () => DialogueController | null;
}
