import type { AudioManager } from "../audio/AudioManager";
import {
  BOSS_LEVEL_INDEX,
  BOSS_STATS,
  FIRST_STAR_LEVEL_INDEX,
  PHYSICS,
  TILE,
  TIMINGS,
  TOTAL_STARS,
  WEAPONS,
  YAP_MAX,
  YAP_RANGE_TILES,
} from "../constants";
import { followPlayer } from "../core/camera";
import { createEnemy, tuneRespawnedEnemy } from "../core/entities";
import { footTile } from "../core/map";
import { movePlayer, resolvePlayerBossCollision } from "../core/physics";
import { TimerBag } from "../core/timers";
import { spawnTracer, updateTracers } from "../core/tracers";
import { buildWorld, type GameWorld } from "../core/world";
import {
  BOSS_RESUMES_LINES,
  BUBBLE_TEXT,
  sheriffEmptyLines,
} from "../data/dialogue";
import { LEVELS, LEVEL_COUNT } from "../data/levels";
import { TILE_CHARS } from "../data/tiles";
import { SpeechBubble } from "../dom/bubbles";
import { playEnemyDeathEffect, playPlayerDeathEffect, type DeathEffect } from "../dom/effects";
import { SpriteLayer } from "../dom/SpriteLayer";
import { drawPlayerSprite } from "../render/playerSprite";
import { createSceneRenderer, renderScene, type SceneRenderer } from "../render/scene";
import { createSpriteAtlas } from "../render/sprites";
import {
  applyReload,
  canFire,
  canReload,
  consumeRound,
  forwardAimPoint,
  initialAmmo,
  isFullyEmpty,
  muzzlePosition,
} from "../systems/combat";
import {
  distanceToNearestEnemy,
  resolvePlayerEnemyCollisions,
  updateEnemies,
} from "../systems/enemies";
import {
  clampStars,
  collectStars,
  distanceToReward,
  HOSTAGE_AUDIBLE_PX,
  isNearHostage,
  isPlayerInLava,
  isPlayerOnFinish,
  isTouchingReward,
  tryCollectWeapon,
} from "../systems/pickups";
import { updateTraps } from "../systems/traps";
import type { InputState, WeaponType } from "../types";
import type { EngineBridge, SessionElements } from "./EngineBridge";
import { resetLevelFlags, type EngineFlags } from "./engineFlags";
import { BossSequence } from "../scripted/bossSequence";
import { IntroSequence } from "../scripted/introSequence";
import { InputController } from "./InputController";

const INITIAL_HEALTH = 100;

/**
 * One run of one level.
 *
 * A session owns the world, the sprite layer, the timers and the animation
 * frame. It survives for as long as the level does and reads changing UI state
 * from `flags` rather than from React, so a re-render never restarts the loop.
 */
export class GameSession {
  readonly flags: EngineFlags;
  readonly audio: AudioManager;
  readonly bridge: EngineBridge;
  readonly elements: SessionElements;
  readonly timers = new TimerBag();
  readonly sprites: SpriteLayer | null;
  readonly input: InputState = {
    left: false,
    right: false,
    up: false,
    attack: false,
  };

  world: GameWorld;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly renderer: SceneRenderer;
  private readonly starBubble: SpeechBubble | null;
  private readonly sheriffBubble: SpeechBubble | null;
  readonly intro: IntroSequence;
  readonly boss: BossSequence;
  private readonly controls: InputController;

  private rafId: number | null = null;
  private lastFrame = performance.now();
  private deathEffect: DeathEffect | null = null;

  constructor(
    elements: SessionElements,
    flags: EngineFlags,
    audio: AudioManager,
    bridge: EngineBridge,
    initialRows: string[],
    spawnOffscreenLeft: boolean,
  ) {
    this.elements = elements;
    this.flags = flags;
    this.audio = audio;
    this.bridge = bridge;

    this.ctx = elements.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.renderer = createSceneRenderer(createSpriteAtlas());

    const layer = elements.layer;
    this.sprites = layer ? new SpriteLayer(layer) : null;
    this.starBubble = layer ? new SpeechBubble(layer, BUBBLE_TEXT.collectStars) : null;
    this.sheriffBubble = layer ? new SpeechBubble(layer, BUBBLE_TEXT.pickSheriff) : null;

    this.intro = new IntroSequence(this);
    this.boss = new BossSequence(this);
    this.controls = new InputController(this, this.boss);

    this.world = this.loadLevel(initialRows, spawnOffscreenLeft);
    this.resizeCanvas();
  }

  // ------------------------------------------------------------- lifecycle

  start(): void {
    this.controls.attach();
    this.boss.startCutsceneIfNeeded();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    this.controls.detach();
    this.intro.cancel();
    this.boss.cancel();
    this.timers.clearAll();
    this.sprites?.clear();
    this.starBubble?.remove();
    this.sheriffBubble?.remove();
    this.deathEffect?.remove();
    this.deathEffect = null;
  }

  /** Rebuilds the world for a set of level rows and resets per-level flags. */
  loadLevel(rows: string[], spawnOffscreenLeft: boolean): GameWorld {
    this.sprites?.clear();
    this.starBubble?.remove();
    this.sheriffBubble?.remove();
    this.renderer.tiles.clear();

    const world = buildWorld(rows, this.flags.levelIndex, { spawnOffscreenLeft });

    for (const enemy of world.enemies) this.sprites?.addEnemy(enemy);
    if (world.boss) this.sprites?.addBoss();
    if (world.reward) this.sprites?.addReward();

    resetLevelFlags(this.flags);
    // `sprites.clear()` above took the corpse with it, so the handle is stale.
    this.deathEffect = null;
    this.flags.deathActive = false;
    this.flags.starsAtLevelStart = this.flags.collectedStars;
    this.flags.showFirstStarBubble =
      this.flags.levelIndex === FIRST_STAR_LEVEL_INDEX && world.stars.length > 0;

    this.boss.cancel();
    this.clearInput();

    this.bridge.setHasWeapon(false);
    this.bridge.setBossHealth(BOSS_STATS.maxHealth);
    this.bridge.setHealth(INITIAL_HEALTH);

    this.world = world;
    // A reloaded level brings a fresh camera, and a restart does not resize
    // the canvas, so the viewport has to be restored here too.
    this.syncCameraViewport();
    return world;
  }

  /** Matches the canvas to the current map and tells React its new size. */
  resizeCanvas(): void {
    const { canvas } = this.elements;
    canvas.width = this.world.map.widthPx;
    canvas.height = this.world.map.heightPx;
    this.syncCameraViewport();
    this.bridge.setCanvasSize({ w: canvas.width, h: canvas.height });
  }

  /**
   * Gives the camera the canvas it draws into.
   *
   * The viewport is a property of the canvas, not of whether the game is
   * running, but `followPlayer` is the only other thing that sets it and the
   * loop skips that while paused outside the intro. Since `renderTiles` walks
   * the visible range from these two numbers, a session that starts paused
   * would otherwise paint its background and not a single tile.
   */
  private syncCameraViewport(): void {
    const { canvas } = this.elements;
    this.world.camera.width = canvas.width;
    this.world.camera.height = canvas.height;
  }

  clearInput(): void {
    this.input.left = false;
    this.input.right = false;
    this.input.up = false;
    this.input.attack = false;
  }

  /** True while the player has no control: cutscene, dialogue or intro. */
  get inputsBlocked(): boolean {
    return this.flags.cutsceneActive || this.flags.dialogVisible || this.flags.introActive;
  }

  // ------------------------------------------------------------ level flow

  /** Wipes the level and starts it again after a short message. */
  restartLevel(reason: string): void {
    const { flags, bridge } = this;

    // `deathActive` is deliberately left set: it is what keeps the living cat
    // hidden, and clearing it here would put it back on screen, alive, for the
    // whole length of the banner. `loadLevel` clears it once the level is gone.
    bridge.setCollectedStars(flags.starsAtLevelStart);
    bridge.setPaused(true);
    bridge.setCompletionMessage(`${reason}! Restarting level...`);
    // Cancelling the timers orphans any animation they were due to remove, so
    // sweep now rather than leaving corpses on screen behind the banner.
    this.timers.clearAll();
    this.sprites?.clearEffects();

    this.timers.setTimeout(() => {
      bridge.setCompletionMessage(null);
      this.loadLevel(LEVELS[flags.levelIndex], false);

      // The boss cutscene has to play again after dying on that level.
      flags.shownCutscenes[flags.levelIndex] = false;
      if (flags.levelIndex === BOSS_LEVEL_INDEX) {
        bridge.setHasWeapon(false);
        bridge.setWeaponType(null);
        bridge.setAmmo(initialAmmo(null));
        flags.sniperEmptyHandled = false;
        flags.sheriffEmptyHandled = false;
        bridge.dialogue()?.reset();
        this.boss.startCutsceneIfNeeded();
      }

      bridge.setPaused(false);
    }, TIMINGS.levelResetMs);
  }

  /**
   * Plays the death animation, waits for the death sound, then restarts.
   * Guarded so a second cause of death cannot start a second sequence.
   */
  killPlayer(reason: string): void {
    if (this.flags.deathActive) return;

    this.bridge.setPaused(true);
    this.clearInput();

    const sprite = this.elements.playerSprite();
    if (sprite) sprite.style.display = "none";
    const overlay = this.elements.playerOverlay();
    if (overlay) {
      overlay.style.display = "none";
      overlay.style.transform = "rotate(0deg)";
    }

    this.flags.deathActive = true;
    this.deathEffect = playPlayerDeathEffect(
      this.elements.layer,
      this.world.player,
      this.world.camera,
      this.elements.canvas.height,
      this.timers,
    );

    this.audio.play("playerDeath");
    this.audio.onEnded("playerDeath", () => {
      this.timers.setTimeout(() => {
        // The corpse stays, and so does `deathActive`: the cat should not be
        // standing there alive while the restart banner is up. `loadLevel`
        // clears both once the new level is built.
        this.bridge.setCompletionMessage(null);
        this.restartLevel(reason);
      }, TIMINGS.deathRespawnDelayMs);
    });
  }

  /** Shows the completion banner, then moves on to the next level. */
  completeLevel(delayMs: number): void {
    const { flags, bridge } = this;

    bridge.setPaused(true);
    bridge.setCompletionMessage(`Level ${flags.levelIndex + 1} complete!`);
    this.audio.play("levelFinish");

    this.timers.setTimeout(() => {
      bridge.setCompletionMessage(null);
      bridge.setPaused(false);
      // The last level ends on its cutscene rather than advancing.
      if (flags.levelIndex < LEVEL_COUNT - 1) bridge.advanceLevel();
      else bridge.setPaused(true);
    }, delayMs);
  }

  // --------------------------------------------------------------- combat

  fireAt(targetX: number, targetY: number, weapon: WeaponType): void {
    const muzzle = muzzlePosition(this.world.player);

    this.bridge.setAmmo((ammo) => consumeRound(ammo));
    this.flags.nextShotAllowedAt = Date.now() + WEAPONS[weapon].cooldownMs;
    this.audio.play(weapon === "sniper" ? "sniperShot" : "sheriffShot");

    this.world.tracers.push(
      spawnTracer(muzzle.x, muzzle.y, targetX, targetY, weapon, this.world.map),
    );
  }

  canFireNow(): boolean {
    return canFire(
      {
        reloading: this.flags.reloading,
        nextShotAllowedAt: this.flags.nextShotAllowedAt,
        ammo: this.flags.ammo,
        hasWeapon: this.flags.hasWeapon,
      },
      Date.now(),
    );
  }

  startReload(): void {
    if (this.flags.reloading || !canReload(this.flags.weaponType, this.flags.ammo)) return;

    this.flags.reloading = true;
    this.audio.play("sheriffReload");
    this.timers.setTimeout(() => {
      this.bridge.setAmmo((ammo) => applyReload(ammo));
      this.flags.reloading = false;
    }, WEAPONS.sheriff.reloadMs);
  }

  /** Schedules an enemy to return to its spawn tile. */
  scheduleRespawn(tileX: number, tileY: number): void {
    this.timers.setTimeout(() => {
      const enemy = tuneRespawnedEnemy(
        createEnemy(++this.world.nextEnemyId, tileX, tileY),
        this.flags.levelIndex,
      );
      this.world.enemies.push(enemy);
      this.sprites?.addEnemy(enemy);
    }, TIMINGS.enemyRespawnMs);
  }

  // ------------------------------------------------------------ frame work

  private readonly loop = (now: number): void => {
    const dt = Math.min(PHYSICS.maxTimestep, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (this.flags.introActive) this.intro.step(dt);
    this.stepScriptedWalk(dt);

    const simulating = !this.flags.paused && !this.flags.introActive;
    if (simulating) {
      const { jumped } = movePlayer(this.world.player, this.world.map, this.input, dt);
      if (jumped) this.audio.play("jump");
      this.stepFootsteps();

      this.stepPickups();
      this.blockInputDuringDialogue();
      this.stepShooting();
      this.stepEnemies(dt);
      this.boss.step(dt);
      this.stepEnemyProximityAudio();
      this.stepPlayerEnemyContact();
    } else {
      this.blockInputDuringDialogue();
    }

    if (simulating || this.flags.introActive) {
      followPlayer(
        this.world.camera,
        this.world.player,
        this.world.map,
        this.elements.canvas.width,
        this.elements.canvas.height,
      );
    }

    this.sprites?.sync(
      this.world.enemies,
      this.world.boss,
      this.world.reward,
      this.world.camera,
    );
    this.stepBubbles();
    this.stepSheriffEmpty();
    this.stepTracers(dt);

    this.render(now);
    this.stepHostagePrompt();
    this.stepRewardAudio();

    this.rafId = requestAnimationFrame(this.loop);
  };

  /** The two-tile walk that interrupts the boss's opening dialogue. */
  private stepScriptedWalk(dt: number): void {
    const { flags } = this;

    if (flags.scriptedWalkRemaining > 0) {
      const step = Math.min(flags.scriptedWalkSpeed * dt, flags.scriptedWalkRemaining);
      this.world.player.x -= step;
      this.world.player.dir = -1;
      flags.scriptedWalkRemaining -= step;

      if (flags.scriptedWalkRemaining <= 0) {
        flags.scriptedWalkRemaining = 0;
        const nextLine = flags.scriptedWalkNextLine;
        flags.scriptedWalkNextLine = null;
        // Freeze the cat facing left while the hostage replies.
        flags.freezePlayerAnim = true;
        this.timers.setTimeout(() => {
          if (nextLine !== null) this.bridge.dialogue()?.showFrom(nextLine);
        }, TIMINGS.scriptedWalkDialogDelayMs);
      }
    }

    if (flags.scriptedFace !== null) {
      this.world.player.dir = flags.scriptedFace;
      flags.scriptedFace = null;
    }
  }

  /** Stops the player drifting while a dialogue box is open. */
  private blockInputDuringDialogue(): void {
    if (!this.flags.dialogVisible && !this.flags.introActive) return;
    this.clearInput();
    this.world.player.vx = 0;
  }

  private stepFootsteps(): void {
    const moving =
      Math.abs(this.world.player.vx) > 0.5 && this.world.player.onGround;
    if (moving && !this.flags.paused) this.audio.playIfIdle("footsteps");
    else this.audio.pause("footsteps");
  }

  private stepPickups(): void {
    if (isPlayerInLava(this.world)) {
      this.killPlayer("You fell in lava");
      return;
    }

    updateTraps(this.world);

    if (tryCollectWeapon(this.world)) {
      this.bridge.setHasWeapon(true);
      this.bridge.setWeaponType("sheriff");
      // A brief delay stops the pickup click from also firing the gun.
      this.input.attack = false;
      this.flags.nextShotAllowedAt = Date.now() + TIMINGS.pickupFireDelayMs;
    }

    if (this.world.boss) {
      resolvePlayerBossCollision(this.world.player, this.world.boss);
    }

    const gathered = collectStars(this.world);
    if (gathered > 0) {
      this.bridge.setCollectedStars((count) => clampStars(count + gathered));
      this.audio.play("collect");
      this.flags.showFirstStarBubble = false;
      this.starBubble?.remove();
    }

    if (isPlayerOnFinish(this.world)) {
      this.completeLevel(TIMINGS.levelCompleteMs);
      return;
    }

    if (isTouchingReward(this.world)) this.stepRewardContact();
  }

  /** The hostage can only be freed once she has asked, and the boss is down. */
  private stepRewardContact(): void {
    if (!this.flags.rewardUnlocked) return;

    if (this.world.boss && this.world.boss.health > 0) {
      this.bridge.setCompletionMessage("Defeat the boss first!");
      this.audio.pause("rewardCry");
      this.timers.setTimeout(
        () => this.bridge.setCompletionMessage(null),
        TIMINGS.bossAliveWarningMs,
      );
      return;
    }

    this.completeLevel(TIMINGS.rewardCompleteMs);
  }

  private stepShooting(): void {
    if (!this.input.attack || !this.flags.hasWeapon) return;

    const weapon = this.flags.weaponType ?? "sheriff";
    if (!this.canFireNow()) {
      this.input.attack = false;
      return;
    }

    const aim = forwardAimPoint(this.world.player, weapon, this.world.map);
    this.fireAt(aim.x, aim.y, weapon);
    this.input.attack = false;
  }

  private stepEnemies(dt: number): void {
    if (this.flags.cutsceneActive || this.flags.introActive) return;

    const { drowned } = updateEnemies(this.world, dt);
    for (const enemy of drowned) {
      this.sprites?.removeEnemy(enemy.id);
      this.scheduleRespawn(enemy.spawnTX, enemy.spawnTY);
    }
  }

  private stepPlayerEnemyContact(): void {
    if (this.flags.introActive) return;

    const { stomped, playerHit } = resolvePlayerEnemyCollisions(this.world);

    for (const enemy of stomped) {
      this.audio.play("enemyDeath");
      if (this.elements.layer) {
        playEnemyDeathEffect(
          this.elements.layer,
          enemy,
          this.world.camera,
          this.sprites?.detachEnemy(enemy.id) ?? null,
          this.timers,
        );
      }
      this.scheduleRespawn(enemy.spawnTX, enemy.spawnTY);
    }

    if (playerHit) this.killPlayer("You were hit by an enemy");
  }

  private stepTracers(dt: number): void {
    if (this.flags.paused || this.flags.introActive) return;

    const { enemiesHit, bossDamage } = updateTracers(
      this.world.tracers,
      this.world.enemies,
      this.world.boss,
      this.world.map,
      dt,
    );

    for (const enemy of enemiesHit) {
      this.sprites?.removeEnemy(enemy.id);
      this.audio.play("enemyDeath");
    }

    if (bossDamage > 0 && this.world.boss) {
      const remaining = Math.max(0, this.flags.bossHealth - bossDamage);
      this.flags.bossHealth = remaining;
      this.bridge.setBossHealth(remaining);
      if (remaining <= 0) this.world.boss = null;
    }
  }

  /** Enemies grow louder as they get closer, with a quadratic falloff. */
  private stepEnemyProximityAudio(): void {
    const maxDistance = YAP_RANGE_TILES * TILE;
    const nearest = distanceToNearestEnemy(this.world);

    const audible =
      nearest <= maxDistance &&
      !this.flags.paused &&
      this.audio.isUnlocked &&
      !this.flags.introActive;

    if (!audible) {
      this.audio.setVolume("enemyProximity", 0);
      this.audio.pause("enemyProximity");
      return;
    }

    const closeness = Math.max(0, 1 - nearest / maxDistance);
    this.audio.setVolume("enemyProximity", Math.min(YAP_MAX, YAP_MAX * closeness ** 2));
    this.audio.playIfIdle("enemyProximity");
  }

  private stepRewardAudio(): void {
    const audible =
      this.world.reward !== null &&
      this.world.boss !== null &&
      this.world.boss.health > 0 &&
      this.audio.isUnlocked &&
      !this.flags.introActive &&
      distanceToReward(this.world) <= HOSTAGE_AUDIBLE_PX;

    if (audible) this.audio.playIfIdle("rewardCry");
    else this.audio.pause("rewardCry");
  }

  private stepBubbles(): void {
    const { flags, world } = this;
    const firstStar = world.stars[0];

    const showStarBubble =
      flags.showFirstStarBubble &&
      flags.levelIndex === FIRST_STAR_LEVEL_INDEX &&
      firstStar !== undefined &&
      !firstStar.collected;

    if (showStarBubble) this.starBubble?.showAbove(firstStar, world.camera);
    else this.starBubble?.remove();

    if (flags.showSheriffBubble && world.weapon && !world.weapon.collected) {
      this.sheriffBubble?.showAbove(world.weapon, world.camera);
    } else if (world.weapon?.collected) {
      this.sheriffBubble?.remove();
      flags.showSheriffBubble = false;
    } else {
      this.sheriffBubble?.hide();
    }
  }

  private stepHostagePrompt(): void {
    const near = isNearHostage(this.world);
    this.flags.nearHostage = near;
    this.bridge.setShowHostagePrompt(
      near &&
        this.flags.showHud &&
        (this.flags.seenHostageOutOfBullets || this.flags.seenHostageBossMoving),
    );
  }

  /**
   * Running the sheriff dry is a story beat: the boss stops, the hostage asks
   * about stars, and with all four the player is offered the sniper.
   */
  private stepSheriffEmpty(): void {
    const { flags, bridge } = this;

    const dry =
      flags.weaponType === "sheriff" &&
      isFullyEmpty(flags.ammo) &&
      this.world.boss !== null &&
      !flags.sheriffEmptyHandled &&
      !flags.introActive;
    if (!dry) return;

    flags.sheriffEmptyHandled = true;
    bridge.setShowReloadHint(false);
    flags.bossCanMove = false;
    this.clearInput();
    this.world.player.vx = 0;

    const stars = flags.collectedStars;
    if (stars === TOTAL_STARS) {
      bridge.setShowUpgradeHint(true);
      flags.showUpgradeHint = true;
    }

    bridge.dialogue()?.startSequence(sheriffEmptyLines(stars), () => {
      if (stars === TOTAL_STARS) {
        bridge.setShowUpgradeHint(true);
        flags.showUpgradeHint = true;
        return;
      }
      flags.bossCanMove = true;
      bridge.dialogue()?.startSequence(BOSS_RESUMES_LINES, () => {
        flags.bossCanMove = true;
      });
    });
  }

  // --------------------------------------------------------------- drawing

  private render(now: number): void {
    const { canvas } = this.elements;

    renderScene(this.ctx, canvas.width, canvas.height, this.world, this.renderer, {
      now,
      hasEnemySprite: (id) => this.sprites?.hasEnemy(id) ?? false,
      hasBossSprite: this.sprites?.hasBoss ?? false,
      hasRewardSprite: Boolean(this.sprites?.reward),
      fullHeightLava: this.flags.levelIndex === LEVEL_COUNT - 1,
    });

    this.renderPlayer();
  }

  private renderPlayer(): void {
    const { flags, world } = this;

    const moving =
      Math.abs(world.player.vx) > 0.5 ||
      flags.scriptedWalkRemaining > 0 ||
      flags.introWalkRemaining > 0;

    // On the boss level's spawn tile the cat stays still even mid-cutscene.
    const foot = footTile(world.player);
    const onBossSpawnTile =
      flags.levelIndex === BOSS_LEVEL_INDEX &&
      world.map.tileAt(foot.x, foot.y) === TILE_CHARS.spawn;

    const bossDefeated =
      flags.levelIndex === BOSS_LEVEL_INDEX && (!world.boss || flags.bossHealth <= 0);

    const animate =
      bossDefeated ||
      moving ||
      (flags.cutsceneActive && !onBossSpawnTile && !flags.freezePlayerAnim) ||
      (flags.introActive && !flags.freezePlayerAnim);

    drawPlayerSprite(
      world.player,
      world.camera,
      {
        body: this.elements.playerSprite(),
        weapon: this.elements.weaponSprite(),
        overlay: this.elements.playerOverlay(),
      },
      {
        deathActive: flags.deathActive,
        animate,
        hasWeapon: flags.hasWeapon,
        weaponType: flags.weaponType,
        cutterGiven: flags.cutterGiven,
        introActive: flags.introActive,
        happyScale: flags.happyScale,
      },
      this.renderer.atlas,
    );
  }
}
