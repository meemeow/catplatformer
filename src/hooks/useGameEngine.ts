import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GIFS } from "../game/assets";
import { AudioManager, musicForLevel } from "../game/audio/AudioManager";
import {
  BOSS_LEVEL_INDEX,
  BOSS_STATS,
  START_LEVEL_INDEX,
  TILE,
  TIMINGS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "../game/constants";
import {
  BOSS_DIALOG_CUES,
  BOSS_DIALOG_LINES,
  HOSTAGE_UNLOCK_LINES,
  SNIPER_EMPTY_LINES,
  SPEAKERS,
} from "../game/data/dialogue";
import { INTRO_MAP, LEVELS } from "../game/data/levels";
import type { EngineBridge } from "../game/engine/EngineBridge";
import { createEngineFlags } from "../game/engine/engineFlags";
import { GameSession } from "../game/engine/GameSession";
import { IntroSequence } from "../game/scripted/introSequence";
import { initialAmmo, isFullyEmpty } from "../game/systems/combat";
import type { Ammo, WeaponType } from "../game/types";
import { useDialogue, type DialogueController } from "./useDialogue";
import { useVolume, type VolumeControl } from "./useVolume";

/** DOM nodes the page attaches to the elements the engine drives. */
export interface GameElementRefs {
  canvas: React.RefObject<HTMLCanvasElement | null>;
  playerSprite: React.RefObject<HTMLImageElement | null>;
  weaponSprite: React.RefObject<HTMLImageElement | null>;
  playerOverlay: React.RefObject<HTMLCanvasElement | null>;
}

/** Everything the page renders. */
export interface GameEngineState {
  levelIndex: number;
  canvasSize: { w: number; h: number };
  health: number;
  stars: number;
  /** The boss's remaining health, or null while no boss bar should show. */
  bossHealth: number | null;
  /** The rope being cut and how far through it is, or null when not cutting. */
  cutProgress: { x: number; y: number; progress: number } | null;
  ammo: Ammo;
  hasWeapon: boolean;
  weaponType: WeaponType | null;
  showHud: boolean;
  completionMessage: string | null;
  blackOverlay: boolean;
  blackOverlayOpacity: number;
  showEndScreen: boolean;
  showAimHint: boolean;
  showReloadHint: boolean;
  showUpgradeHint: boolean;
  showHostagePrompt: boolean;
  dialogue: DialogueController;
  volume: VolumeControl;
}

const INITIAL_HEALTH = 100;
/** Shots the player must take before the aim hint is considered understood. */
const AIM_HINT_SHOTS = 2;

/**
 * Wires the engine to React.
 *
 * The hook owns UI state and the audio manager; `GameSession` owns the game.
 * State flows one way into the engine through `flagsRef`, and back out through
 * the `EngineBridge` — so the render loop never restarts because a banner
 * appeared.
 */
export const useGameEngine = (refs: GameElementRefs): GameEngineState => {
  const [levelIndex, setLevelIndex] = useState(START_LEVEL_INDEX);
  const [canvasSize, setCanvasSize] = useState({ w: VIEW_WIDTH, h: VIEW_HEIGHT });
  const [paused, setPaused] = useState(false);
  const [health, setHealth] = useState(INITIAL_HEALTH);
  const [bossHealth, setBossHealth] = useState<number>(BOSS_STATS.maxHealth);
  const [collectedStars, setCollectedStars] = useState(0);
  const [hasWeapon, setHasWeapon] = useState(false);
  const [weaponType, setWeaponType] = useState<WeaponType | null>(null);
  const [ammo, setAmmo] = useState<Ammo>(() => initialAmmo(null));
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  // The arrival cutscene walks the cat into level one, so it only plays when
  // that is where the game starts.
  const [introActive, setIntroActive] = useState(START_LEVEL_INDEX === 0);
  const [cutsceneActive, setCutsceneActive] = useState(false);
  const [showHud, setShowHud] = useState(false);
  /** The boss bar waits for the opening cutscene, like the rest of the HUD. */
  const [bossEngaged, setBossEngaged] = useState(false);
  const [cutProgress, setCutProgress] = useState<{
    x: number;
    y: number;
    progress: number;
  } | null>(null);
  const [blackOverlay, setBlackOverlay] = useState(true);
  const [blackOverlayOpacity, setBlackOverlayOpacity] = useState(1);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [showAimHint, setShowAimHint] = useState(false);
  const [showReloadHint, setShowReloadHint] = useState(false);
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);
  const [showHostagePrompt, setShowHostagePrompt] = useState(false);

  /** The engine's mirror of the state above. */
  const flagsRef = useRef(createEngineFlags());

  const audioRef = useRef<AudioManager | null>(null);
  if (audioRef.current === null) audioRef.current = new AudioManager();
  const audio = audioRef.current;

  /** Master volume, remembered across sessions. */
  const volume = useVolume(audio);

  const sessionRef = useRef<GameSession | null>(null);
  const dialogueRef = useRef<DialogueController | null>(null);
  const prevAmmoRef = useRef<Ammo>(ammo);

  // ---------------------------------------------------------------- dialogue

  const dialogue = useDialogue(BOSS_DIALOG_LINES, audio, {
    onAdvanceRequested: () => {
      audio.stopAll([
        "narrator",
        "bossGerman",
        "bossChinese",
        "rewardCry",
        "hostageCry",
      ]);
    },
    onLineStart: (line) => {
      const flags = flagsRef.current;
      if (line.speaker !== SPEAKERS.hostage) return;

      // Seeing both hostage prompts is what unlocks the reward.
      if (line.text === HOSTAGE_UNLOCK_LINES.outOfBullets) {
        flags.seenHostageOutOfBullets = true;
      }
      if (line.text === HOSTAGE_UNLOCK_LINES.bossMovingAgain) {
        flags.seenHostageBossMoving = true;
      }
      if (flags.seenHostageOutOfBullets && flags.seenHostageBossMoving) {
        flags.rewardUnlocked = true;
      }
    },
    interceptAdvance: (current, next) => {
      const flags = flagsRef.current;

      // The cat walks two tiles left before the hostage replies.
      if (current === BOSS_DIALOG_CUES.walkLeftAfter) {
        dialogueRef.current?.setVisible(false);
        setCutsceneActive(true);
        setPaused(false);
        flags.scriptedWalkRemaining = 2 * TILE;
        flags.scriptedWalkNextLine = next;
        flags.scriptedWalkSpeed = TIMINGS.cutsceneWalkSpeed;
        return true;
      }

      if (current === BOSS_DIALOG_CUES.faceRightAfter) flags.scriptedFace = 1;
      return false;
    },
    onBuiltInEnd: () => {
      dialogueRef.current?.reset();
      sessionRef.current?.boss.finishCutscene();
    },
  });

  // Refreshed after every commit, which is always before a handler can fire.
  useEffect(() => {
    dialogueRef.current = dialogue;
  });

  // ------------------------------------------------------------ state mirror

  useEffect(() => {
    const flags = flagsRef.current;
    flags.levelIndex = levelIndex;
    flags.paused = paused;
    flags.introActive = introActive;
    flags.cutsceneActive = cutsceneActive;
    flags.dialogVisible = dialogue.visible;
    flags.showHud = showHud;
    flags.hasWeapon = hasWeapon;
    flags.weaponType = weaponType;
    flags.ammo = ammo;
    flags.health = health;
    flags.bossHealth = bossHealth;
    flags.collectedStars = collectedStars;
    flags.showUpgradeHint = showUpgradeHint;
    flags.showAimHint = showAimHint;
  }, [
    levelIndex,
    paused,
    introActive,
    cutsceneActive,
    dialogue.visible,
    showHud,
    hasWeapon,
    weaponType,
    ammo,
    health,
    bossHealth,
    collectedStars,
    showUpgradeHint,
    showAimHint,
  ]);

  // ------------------------------------------------------------------- audio

  /** Stop playback on unmount, but keep the manager usable for a remount. */
  useEffect(() => () => audioRef.current?.pauseAll(), []);

  /**
   * Whether the level theme should be running right now.
   *
   * The intro keeps playing while "paused", because the pause is only there to
   * stop the player moving during the cutscene.
   */
  const shouldMusicPlay = useCallback(() => {
    const flags = flagsRef.current;
    if (flags.paused && !flags.introActive) return false;

    // On the boss level the theme waits for the opening dialogue to finish.
    return !(
      !flags.introActive &&
      flags.levelIndex === BOSS_LEVEL_INDEX &&
      !flags.bossCutsceneDone
    );
  }, []);

  // Every level starts with the boss bar down; the cutscene raises it again.
  useEffect(() => {
    setBossEngaged(false);
  }, [levelIndex]);

  /** Browsers block playback until the page has seen a gesture. */
  useEffect(() => {
    if (audio.isUnlocked) return;

    const unlock = () => {
      audio.unlock();
      // The music effect already ran and was refused; start it now instead of
      // waiting for the next state change to re-trigger it.
      if (shouldMusicPlay()) audio.playIfIdle("music");
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audio, shouldMusicPlay]);

  useEffect(() => {
    audio.setMusicTrack(musicForLevel(levelIndex, introActive));
    if (shouldMusicPlay()) audio.playIfIdle("music");
    else audio.pause("music");
  }, [audio, levelIndex, paused, introActive, shouldMusicPlay]);

  /** Voice clip matching the portrait on the current dialogue line. */
  useEffect(() => {
    audio.stopAll(["bossGerman", "bossChinese", "narrator", "rewardCry"]);
    if (!dialogue.visible) return;

    switch (dialogue.currentLine?.img) {
      case GIFS.yapapa:
        audio.play("narrator");
        break;
      case GIFS.bossExplaining:
        audio.play("bossGerman");
        break;
      case GIFS.bossAngry:
        audio.play("bossChinese");
        break;
      case GIFS.catCry:
        audio.playWhenAllowed("hostageCry");
        break;
      default:
        break;
    }
  }, [audio, dialogue.visible, dialogue.currentLine]);

  // -------------------------------------------------------------------- ammo

  useEffect(() => {
    setAmmo(initialAmmo(weaponType));
  }, [weaponType]);

  /** The aim hint only appears with the sheriff, on the boss level. */
  useEffect(() => {
    const show =
      levelIndex === BOSS_LEVEL_INDEX && hasWeapon && weaponType === "sheriff";
    if (show) flagsRef.current.aimShotsFired = 0;
    setShowAimHint(show);
  }, [levelIndex, hasWeapon, weaponType]);

  useEffect(() => {
    const flags = flagsRef.current;
    const previous = prevAmmoRef.current;

    // Hide the aim hint once the player has actually taken a couple of shots.
    if (ammo.mag < previous.mag) {
      flags.aimShotsFired += previous.mag - ammo.mag;
      if (flags.showAimHint && flags.aimShotsFired >= AIM_HINT_SHOTS) {
        setShowAimHint(false);
      }
    }

    setShowReloadHint(
      weaponType === "sheriff" && ammo.mag === 0 && ammo.reserve > 0,
    );

    // Running the sniper dry is a story beat, not just an empty magazine.
    const sniperJustEmptied =
      weaponType === "sniper" &&
      !isFullyEmpty(previous) &&
      isFullyEmpty(ammo) &&
      !flags.sniperEmptyHandled;

    if (sniperJustEmptied) {
      flags.sniperEmptyHandled = true;
      flags.bossCanMove = false;
      setCutsceneActive(true);
      dialogueRef.current?.startSequence(SNIPER_EMPTY_LINES, () => {
        setCutsceneActive(false);
      });
      flags.bossCanMove = true;
    }

    prevAmmoRef.current = ammo;
  }, [ammo, weaponType]);

  // ------------------------------------------------------------------- intro

  useEffect(() => {
    setPaused(true);

    // Fade the opening black screen out, then walk the cat in from the left.
    const start = window.setTimeout(() => {
      let opacity = 1;
      const fade = window.setInterval(() => {
        opacity -= TIMINGS.fadeStep;
        setBlackOverlayOpacity(opacity);
        if (opacity > 0) return;

        window.clearInterval(fade);
        setBlackOverlay(false);

        // Normally the cutscene shows the HUD and unpauses once the cat has
        // walked in. Starting on a later level skips all that, so the same
        // handover has to happen here instead.
        if (flagsRef.current.introActive) {
          IntroSequence.begin(flagsRef.current);
        } else {
          setShowHud(true);
          setPaused(false);
        }
      }, TIMINGS.fadeTickMs);
    }, TIMINGS.fadeTickMs);

    return () => window.clearTimeout(start);
  }, []);

  // ------------------------------------------------------------------ bridge

  const advanceLevel = useCallback(() => setLevelIndex((index) => index + 1), []);

  const bridge = useMemo<EngineBridge>(
    () => ({
      setPaused,
      setCompletionMessage,
      advanceLevel,
      setCollectedStars,
      setHasWeapon,
      setWeaponType,
      setAmmo,
      setBossHealth,
      setHealth,
      setCutsceneActive,
      setShowHud,
      setBossEngaged,
      setCutProgress,
      setIntroActive,
      setBlackOverlay,
      setBlackOverlayOpacity,
      setShowEndScreen,
      setShowUpgradeHint,
      setShowReloadHint,
      setShowHostagePrompt,
      setCanvasSize,
      dialogue: () => dialogueRef.current,
    }),
    [advanceLevel],
  );

  // ------------------------------------------------------------ game session

  useEffect(() => {
    const canvas = refs.canvas.current;
    if (!canvas) return;

    const flags = flagsRef.current;
    const session = new GameSession(
      {
        canvas,
        layer: canvas.parentElement,
        playerSprite: () => refs.playerSprite.current,
        weaponSprite: () => refs.weaponSprite.current,
        playerOverlay: () => refs.playerOverlay.current,
      },
      flags,
      audio,
      bridge,
      flags.introActive ? INTRO_MAP : LEVELS[levelIndex],
      flags.introActive,
    );

    sessionRef.current = session;
    session.start();

    return () => {
      session.stop();
      sessionRef.current = null;
    };
    // A session owns one level for its whole lifetime; everything else it needs
    // it reads from `flagsRef`, so only the level may restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  return {
    levelIndex,
    canvasSize,
    health,
    stars: collectedStars,
    bossHealth: bossEngaged ? bossHealth : null,
    cutProgress,
    ammo,
    hasWeapon,
    weaponType,
    showHud,
    completionMessage,
    blackOverlay,
    blackOverlayOpacity,
    showEndScreen,
    showAimHint,
    showReloadHint,
    showUpgradeHint,
    showHostagePrompt,
    dialogue,
    volume,
  };
};
