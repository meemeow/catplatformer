import { BOSS_STATS, TIMINGS } from "../constants";
import { initialAmmo } from "../systems/combat";
import type { Ammo, WeaponType } from "../types";

/** Named beats of the scripted intro walk. */
export type IntroBeat = "firstDialog" | "secondDialog" | "fallSequence";

/**
 * The engine's view of the world, mirrored from React state.
 *
 * The render loop runs for the lifetime of a level and must not be torn down
 * whenever a piece of UI state changes, so it reads this object instead of
 * closing over props. The original code did the same thing with roughly forty
 * separate refs; collecting them here makes the state machine readable and
 * means a single `syncEngineFlags` call keeps everything current.
 */
export interface EngineFlags {
  // --- Mirrored React state ---
  levelIndex: number;
  paused: boolean;
  introActive: boolean;
  cutsceneActive: boolean;
  dialogVisible: boolean;
  showHud: boolean;
  hasWeapon: boolean;
  weaponType: WeaponType | null;
  ammo: Ammo;
  health: number;
  bossHealth: number;
  collectedStars: number;
  showUpgradeHint: boolean;
  showAimHint: boolean;

  // --- Story progression ---
  /** True once the boss level's opening dialogue has finished. */
  bossCutsceneDone: boolean;
  /** Granted and revoked by the dialogue script. */
  bossCanMove: boolean;
  /** Levels whose cutscene has already played, so it never repeats. */
  shownCutscenes: Record<number, boolean>;
  /** The player has accepted the bridge cutter from the hostage. */
  cutterGiven: boolean;
  /**
   * The rope has been cut, so the cat stands and watches the rest play out.
   *
   * The fall, the defeat dialogue and the celebration are one unbroken beat;
   * being able to wander off part way through reads as a bug, and walking into
   * the gap where the bridge used to be would end the level the wrong way.
   */
  movementLocked: boolean;
  /** Both hostage prompts have been seen, so the reward can be used. */
  rewardUnlocked: boolean;
  seenHostageOutOfBullets: boolean;
  seenHostageBossMoving: boolean;
  /** One-shot guards so the out-of-ammo scenes do not replay. */
  sheriffEmptyHandled: boolean;
  sniperEmptyHandled: boolean;

  // --- Presentation ---
  /** The player is dying; the sprite stays hidden until the level resets. */
  deathActive: boolean;
  /** Holds the cat's GIF on a single frame during scripted beats. */
  freezePlayerAnim: boolean;
  showSheriffBubble: boolean;
  showFirstStarBubble: boolean;
  /** Extra scale applied to the cat while celebrating. */
  happyScale: number;

  // --- Scripted movement ---
  /** Pixels left to walk in the boss cutscene, and the line to show after. */
  scriptedWalkRemaining: number;
  scriptedWalkNextLine: number | null;
  scriptedWalkSpeed: number;
  /** One-shot facing change requested by a dialogue cue. */
  scriptedFace: number | null;
  introWalkRemaining: number;
  introWalkNextBeat: IntroBeat | null;

  // --- Combat timing ---
  /** Timestamp before which no shot may be fired. */
  nextShotAllowedAt: number;
  reloading: boolean;
  /** Shots taken since the aim hint appeared; it hides after two. */
  aimShotsFired: number;

  // --- Level bookkeeping ---
  /** Stars held when the level began, restored if the player dies. */
  starsAtLevelStart: number;
  /** True while the player is standing next to the hostage. */
  nearHostage: boolean;
}

export const createEngineFlags = (): EngineFlags => ({
  levelIndex: 0,
  paused: false,
  introActive: true,
  cutsceneActive: false,
  dialogVisible: false,
  showHud: false,
  hasWeapon: false,
  weaponType: null,
  ammo: initialAmmo(null),
  health: 100,
  bossHealth: BOSS_STATS.maxHealth,
  collectedStars: 0,
  showUpgradeHint: false,
  showAimHint: false,

  bossCutsceneDone: false,
  bossCanMove: false,
  shownCutscenes: {},
  cutterGiven: false,
  movementLocked: false,
  rewardUnlocked: false,
  seenHostageOutOfBullets: false,
  seenHostageBossMoving: false,
  sheriffEmptyHandled: false,
  sniperEmptyHandled: false,

  deathActive: false,
  freezePlayerAnim: false,
  showSheriffBubble: false,
  showFirstStarBubble: false,
  happyScale: 1,

  scriptedWalkRemaining: 0,
  scriptedWalkNextLine: null,
  scriptedWalkSpeed: TIMINGS.cutsceneWalkSpeed,
  scriptedFace: null,
  introWalkRemaining: 0,
  introWalkNextBeat: null,

  nextShotAllowedAt: 0,
  reloading: false,
  aimShotsFired: 0,

  starsAtLevelStart: 0,
  nearHostage: false,
});

/**
 * Clears everything tied to a single attempt at a level.
 * Story flags that span levels (collected stars, shown cutscenes) survive.
 */
export const resetLevelFlags = (flags: EngineFlags): void => {
  flags.bossCanMove = false;
  flags.bossCutsceneDone = false;
  flags.cutterGiven = false;
  flags.movementLocked = false;
  flags.rewardUnlocked = false;
  flags.seenHostageOutOfBullets = false;
  flags.seenHostageBossMoving = false;
  flags.sheriffEmptyHandled = false;
  flags.freezePlayerAnim = false;
  flags.showSheriffBubble = false;
  flags.scriptedWalkRemaining = 0;
  flags.scriptedWalkNextLine = null;
  flags.scriptedFace = null;
  flags.introWalkRemaining = 0;
  flags.introWalkNextBeat = null;
  flags.happyScale = 1;
  flags.nearHostage = false;
};
