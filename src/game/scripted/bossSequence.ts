import { GIFS, IMAGES } from "../assets";
import { BOSS_LEVEL_INDEX, TILE, TIMINGS } from "../constants";
import { applyBossFall, moveBossPatrol } from "../core/physics";
import { footTile } from "../core/map";
import { collapseBridges, hasBossHitLava, isBossOnBridge } from "../core/world";
import {
  BOSS_DEFEATED_LINES,
  CUTTER_HANDOVER_LINES,
  UPGRADE_FOLLOWUP_LINES,
  UPGRADE_LINES,
} from "../data/dialogue";
import { TILE_CHARS } from "../data/tiles";
import { playCutterHandover, startCelebrationFlip } from "../dom/effects";
import type { GameSession } from "../engine/GameSession";
import { canBossPatrol } from "../systems/boss";
import { initialAmmo } from "../systems/combat";

/**
 * The boss level's story: the walk-on cutscene, the cutter handover, the
 * sniper upgrade, cutting the bridge, and the victory fade.
 *
 * All of it is scripted around a single rule — the boss only moves when the
 * script says it may — which is why `flags.bossCanMove` is toggled so often.
 */
export class BossSequence {
  private readonly session: GameSession;
  private walkTimer: number | null = null;
  private cutTimer: number | null = null;
  /** True between the cutscene opening and its last line being advanced. */
  private cutsceneRunning = false;
  /**
   * True from the moment the handover starts until the cutter is in hand.
   *
   * `flags.cutterGiven` only turns true when the handover dialogue ends, and
   * `cutsceneActive` is mirrored from React a frame later, so without this a
   * second press of F would start the whole animation over the top of itself.
   */
  private handoverRunning = false;
  private stopCelebration: (() => void) | null = null;

  constructor(session: GameSession) {
    this.session = session;
  }

  /**
   * Clears anything still running; safe to call on every level load.
   *
   * A cutscene torn down before it finished counts as not having been shown.
   * Without rolling that back, the session that replaces this one skips it and
   * leaves `cutsceneActive` raised with nothing left to lower it, which locks
   * the player out of their own controls. React's development double-mount
   * does exactly that, so starting the game directly on the boss level used to
   * open with no dialogue and no way to move.
   */
  cancel(): void {
    if (this.walkTimer !== null) window.clearInterval(this.walkTimer);
    this.walkTimer = null;
    if (this.cutTimer !== null) this.session.timers.clearInterval(this.cutTimer);
    this.cutTimer = null;
    this.stopCelebration?.();
    this.stopCelebration = null;
    this.handoverRunning = false;
    this.session.bridge.setCutProgress(null);

    if (!this.cutsceneRunning) return;
    const { flags, bridge } = this.session;
    this.cutsceneRunning = false;
    flags.shownCutscenes[flags.levelIndex] = false;
    bridge.setCutsceneActive(false);
  }

  // ------------------------------------------------------------- cutscene

  /** Walks the cat in from the left edge, then opens the opening dialogue. */
  startCutsceneIfNeeded(): void {
    const { world, flags, bridge, timers } = this.session;

    if (!world.boss) return;
    if (flags.shownCutscenes[flags.levelIndex]) return;
    if (flags.introActive) return;

    flags.shownCutscenes[flags.levelIndex] = true;
    this.cutsceneRunning = true;
    bridge.setPaused(false);
    bridge.setCutsceneActive(true);
    bridge.dialogue()?.setVisible(false);

    world.player.x = 0;
    const targetX = world.playerSpawn ? world.playerSpawn.x * TILE : world.player.x;

    if (this.walkTimer !== null) window.clearInterval(this.walkTimer);
    // Stepped on its own interval rather than the game loop, because the loop
    // is paused for the whole cutscene.
    this.walkTimer = window.setInterval(() => {
      world.player.x = Math.min(
        targetX,
        world.player.x + TIMINGS.cutsceneWalkSpeed * 0.016,
      );
      if (world.player.x < targetX - 0.5) return;

      if (this.walkTimer !== null) window.clearInterval(this.walkTimer);
      this.walkTimer = null;
      timers.setTimeout(
        () => bridge.dialogue()?.showFrom(0),
        TIMINGS.cutsceneDialogDelayMs,
      );
    }, 16);
  }

  /** Ends the opening dialogue and hands control back to the player. */
  finishCutscene(): void {
    const { flags, bridge, audio } = this.session;

    if (this.walkTimer !== null) window.clearInterval(this.walkTimer);
    this.walkTimer = null;
    audio.stop("dialogue");

    this.cutsceneRunning = false;
    bridge.setCutsceneActive(false);
    bridge.setPaused(false);

    if (flags.levelIndex !== BOSS_LEVEL_INDEX) return;

    flags.bossCutsceneDone = true;
    bridge.setBossEngaged(true);
    flags.bossCanMove = true;
    flags.showSheriffBubble = true;
    flags.freezePlayerAnim = false;

    // The music effect keeps the theme paused for the length of the cutscene.
    audio.play("music");
  }

  // ---------------------------------------------------------- interactions

  /** Takes the cutter from the hostage, after a short handover animation. */
  acceptCutter(): void {
    const { world, flags, bridge, elements, timers } = this.session;

    if (flags.cutterGiven || this.handoverRunning) return;
    this.handoverRunning = true;

    bridge.setCutsceneActive(true);
    bridge.setPaused(true);

    const grant = () => {
      bridge.dialogue()?.startSequence(CUTTER_HANDOVER_LINES, () => {
        flags.cutterGiven = true;
        this.handoverRunning = false;
        bridge.setCutsceneActive(false);
        bridge.setPaused(false);
      });
    };

    if (!world.reward) {
      grant();
      return;
    }
    playCutterHandover(
      elements.layer,
      world.reward,
      world.player,
      world.camera,
      timers,
      grant,
    );
  }

  /** Trades four stars for the sniper, then nudges the player to use it. */
  upgradeToSniper(): void {
    const { flags, bridge } = this.session;

    bridge.setWeaponType("sniper");
    bridge.setHasWeapon(true);
    bridge.setShowUpgradeHint(false);
    flags.showUpgradeHint = false;
    flags.bossCanMove = false;

    bridge.dialogue()?.startSequence(UPGRADE_LINES, () => {
      bridge.dialogue()?.startSequence(UPGRADE_FOLLOWUP_LINES, () => {
        flags.bossCanMove = true;
      });
    });
  }

  /**
   * Starts cutting the rope. The player must hold the button, stand on the
   * tile immediately right of the post, and already have the cutter.
   */
  beginCut(tileX: number, tileY: number): boolean {
    const { world, flags, timers, bridge } = this.session;

    const cut = world.cutTile;
    if (!cut || cut.cut || !flags.cutterGiven) return false;
    if (tileX !== cut.x || tileY !== cut.y) return false;

    const foot = footTile(world.player);
    if (foot.x !== cut.x + 1 || foot.y !== cut.y) return false;

    cut.progress = 0;
    if (this.cutTimer !== null) timers.clearInterval(this.cutTimer);
    bridge.setCutProgress({ x: cut.x, y: cut.y, progress: 0 });

    const start = Date.now();
    this.cutTimer = timers.setInterval(() => {
      cut.progress = Math.min(1, (Date.now() - start) / TIMINGS.cutDurationMs);
      bridge.setCutProgress({ x: cut.x, y: cut.y, progress: cut.progress });
      if (cut.progress < 1) return;

      timers.clearInterval(this.cutTimer);
      this.cutTimer = null;
      this.severBridge();
    }, 150);

    return true;
  }

  /** Releasing the button abandons the cut and resets its progress. */
  endCut(): void {
    const { world, timers, bridge } = this.session;

    if (this.cutTimer !== null) {
      timers.clearInterval(this.cutTimer);
      this.cutTimer = null;
    }
    if (world.cutTile && !world.cutTile.cut) world.cutTile.progress = 0;
    bridge.setCutProgress(null);
  }

  /**
   * Drops the bridge. The timing is the whole puzzle: if the boss is not
   * standing on it at that moment, the level is lost.
   */
  private severBridge(): void {
    const { world, audio, flags } = this.session;

    const cut = world.cutTile;
    if (cut) {
      cut.cut = true;
      world.map.setTile(cut.x, cut.y, TILE_CHARS.empty);
    }
    this.session.bridge.setCutProgress(null);

    // Everything after this point is on rails: the fall, the defeat dialogue
    // and the celebration play out as one beat, and the level is over either
    // way. The cat holds the ledge and watches rather than wandering into the
    // gap the bridge left behind. `resetLevelFlags` lifts it on the next load.
    flags.movementLocked = true;
    this.session.clearInput();
    // The loop zeroes `vx` after it has already moved the player, so without
    // this the cat coasts one last frame after the rope parts.
    world.player.vx = 0;

    // Checked before the tiles are removed, or there is nothing left to stand on.
    const bossWasOnBridge = isBossOnBridge(world);
    collapseBridges(world);

    if (bossWasOnBridge && world.boss) {
      audio.play("bonk");
      world.boss.canFall = true;
      world.boss.vy = 150;
      // Nudge it clear of the tile it was resting on so the fall starts.
      world.boss.y += 2;
      return;
    }

    if (world.boss && world.boss.health > 0) {
      this.session.restartLevel("Level Failed. Boss is still alive");
    }
  }

  // ------------------------------------------------------------ per frame

  step(dt: number): void {
    const { world, flags } = this.session;
    const boss = world.boss;
    if (!boss) return;

    if (boss.canFall) {
      applyBossFall(boss, dt);
      if (hasBossHitLava(world)) this.onDefeated();
      return;
    }

    const allowed = canBossPatrol({
      levelIndex: flags.levelIndex,
      cutsceneActive: flags.cutsceneActive,
      introActive: flags.introActive,
      cutsceneDone: flags.bossCutsceneDone,
      movementAllowed: flags.bossCanMove,
      weaponType: flags.weaponType,
      ammo: flags.ammo,
    });
    if (allowed) moveBossPatrol(boss, world.map, dt);
  }

  // --------------------------------------------------------------- ending

  private onDefeated(): void {
    const { session } = this;
    const { world, flags, bridge, audio, sprites, elements, timers } = session;

    sprites?.removeBoss();
    world.boss = null;
    bridge.setBossHealth(0);
    flags.bossHealth = 0;

    // If the player died on the same frame, their death takes precedence.
    if (flags.deathActive) return;

    audio.stop("rewardCry");
    audio.stop("music");
    flags.cutterGiven = false;
    flags.showSheriffBubble = false;
    flags.hasWeapon = false;
    flags.weaponType = null;
    bridge.setHasWeapon(false);
    bridge.setWeaponType(null);
    bridge.setAmmo(initialAmmo(null));

    const weaponSprite = elements.weaponSprite();
    if (weaponSprite) weaponSprite.style.display = "none";

    timers.setTimeout(() => {
      if (flags.deathActive) return;
      bridge.setPaused(false);
      bridge.setCutsceneActive(false);
      bridge.dialogue()?.startSequence(BOSS_DEFEATED_LINES, () => this.playVictory());
    }, TIMINGS.bossDefeatDialogDelayMs);
  }

  /** The celebration, then a slow fade into the end screen. */
  private playVictory(): void {
    const { flags, bridge, elements, sprites, timers, audio } = this.session;

    audio.play("victory");

    const playerSprite = elements.playerSprite();
    if (playerSprite) {
      playerSprite.src = GIFS.happyCat;
      playerSprite.style.display = "block";
    }
    flags.freezePlayerAnim = false;
    flags.happyScale = 1.6;

    if (sprites?.reward) sprites.reward.src = IMAGES.bananaCatHeart;
    this.stopCelebration?.();
    this.stopCelebration = startCelebrationFlip(
      sprites?.reward ?? null,
      () =>
        elements.layer?.querySelector<HTMLImageElement>(
          ".dialogue-box__portrait img",
        ) ?? null,
      timers,
    );

    bridge.setCompletionMessage("Level 5 complete!");

    bridge.setBlackOverlay(true);
    bridge.setBlackOverlayOpacity(0);
    timers.setTimeout(() => {
      let opacity = 0;
      const fade = timers.setInterval(() => {
        opacity = Math.min(1, opacity + TIMINGS.fadeStep);
        bridge.setBlackOverlayOpacity(opacity);
        if (opacity < 1) return;

        timers.clearInterval(fade);
        bridge.setCompletionMessage(null);
        bridge.setShowEndScreen(true);
      }, TIMINGS.fadeTickMs);
    }, TIMINGS.endFadeDelayMs);
  }
}
