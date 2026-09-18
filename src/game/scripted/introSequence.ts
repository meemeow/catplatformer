import { TILE, TIMINGS } from "../constants";
import { INTRO_DIALOG_LINES, INTRO_DIALOG_SLICES } from "../data/dialogue";
import { LEVELS } from "../data/levels";
import type { GameSession } from "../engine/GameSession";
import type { IntroBeat } from "../engine/engineFlags";
import { playIntroFall } from "./introFall";

/** How far the cat walks at each beat, in tiles. */
const WALK_TILES = { toSpawn: 6, toCaveMouth: 6, toEdge: 5 } as const;

/**
 * Banana Cat's arrival: three short walks broken up by narration, then the
 * tumble into the cave and the fade into level one.
 *
 * The game loop is paused throughout, so the walking is driven by `step` and
 * the fall by its own animation frames.
 */
export class IntroSequence {
  private readonly session: GameSession;
  private cancelFall: (() => void) | null = null;

  constructor(session: GameSession) {
    this.session = session;
  }

  cancel(): void {
    this.cancelFall?.();
    this.cancelFall = null;
  }

  /** Advances the scripted walk; called every frame while the intro is active. */
  step(dt: number): void {
    const { flags, world, audio } = this.session;
    if (flags.introWalkRemaining <= 0) return;

    const step = Math.min(TIMINGS.cutsceneWalkSpeed * dt, flags.introWalkRemaining);
    if (audio.isUnlocked) audio.playIfIdle("footsteps");

    world.player.x += step;
    world.player.dir = 1;
    flags.introWalkRemaining -= step;

    if (flags.introWalkRemaining > 0) return;

    flags.introWalkRemaining = 0;
    audio.stop("footsteps");

    const beat = flags.introWalkNextBeat;
    flags.introWalkNextBeat = null;
    if (beat) this.runBeat(beat);
  }

  private runBeat(beat: IntroBeat): void {
    const { timers } = this.session;

    if (beat === "firstDialog") {
      timers.setTimeout(
        () =>
          this.speak(INTRO_DIALOG_SLICES.firstBeat, () => {
            this.queueWalk(WALK_TILES.toCaveMouth, "secondDialog");
          }),
        500,
      );
      return;
    }

    if (beat === "secondDialog") {
      timers.setTimeout(
        () =>
          this.speak(INTRO_DIALOG_SLICES.secondBeat, () => {
            this.queueWalk(WALK_TILES.toEdge, "fallSequence");
          }),
        500,
      );
      return;
    }

    timers.setTimeout(() => this.runFall(), 50);
  }

  /** Freezes the cat, then types out a slice of the intro narration. */
  private speak(slice: readonly [number, number], onDone: () => void): void {
    const { flags, bridge } = this.session;

    flags.freezePlayerAnim = true;
    bridge.dialogue()?.queueSequence(INTRO_DIALOG_LINES.slice(...slice), onDone);
    bridge.dialogue()?.showFrom(0);
  }

  private queueWalk(tiles: number, next: IntroBeat): void {
    const { flags } = this.session;
    flags.introWalkRemaining = tiles * TILE;
    flags.introWalkNextBeat = next;
    flags.freezePlayerAnim = false;
  }

  /** The face-plant and tumble down into the cave. */
  private runFall(): void {
    const { flags, world, audio, elements } = this.session;

    flags.freezePlayerAnim = true;

    // The tumble is drawn on the overlay canvas, which can be rotated;
    // the GIF element cannot be spun without spinning its bounding box.
    const body = elements.playerSprite();
    if (body) body.style.display = "none";

    const overlay = elements.playerOverlay();
    if (overlay) {
      overlay.style.display = "block";
      overlay.style.transformOrigin = "center center";
    }

    this.cancelFall = playIntroFall(world.player, {
      setRotation: (degrees) => {
        if (overlay) overlay.style.transform = `rotate(${degrees}deg)`;
      },
      onLanded: () => audio.play("bonk"),
      onTumbleStart: () => audio.play("roll"),
      onTumbleEnd: () => {
        audio.stop("roll");
        if (overlay) {
          overlay.style.display = "none";
          overlay.style.transform = "rotate(0deg)";
        }
        if (body) body.style.display = "block";
        flags.freezePlayerAnim = true;
        this.speak(INTRO_DIALOG_SLICES.fallBeat, () => this.enterFirstLevel());
      },
    });
  }

  /** Fades out of the cave, loads level one, and plays the last narration. */
  private enterFirstLevel(): void {
    const { flags, bridge, timers } = this.session;

    bridge.setBlackOverlay(true);
    let opacity = 0;

    const fade = timers.setInterval(() => {
      opacity = Math.min(1, opacity + TIMINGS.fadeStep);
      bridge.setBlackOverlayOpacity(opacity);
      if (opacity < 1) return;

      timers.clearInterval(fade);
      timers.setTimeout(() => {
        bridge.setIntroActive(false);
        flags.introActive = false;
        bridge.setBlackOverlay(false);
        bridge.setShowHud(false);
        flags.freezePlayerAnim = false;

        this.session.loadLevel(LEVELS[flags.levelIndex], false);
        this.session.resizeCanvas();

        timers.setTimeout(() => {
          this.speak(INTRO_DIALOG_SLICES.arrivalBeat, () => {
            bridge.setShowHud(true);
            bridge.setPaused(false);
          });
        }, 500);
      }, 1000);
    }, TIMINGS.fadeTickMs);
  }

  /** The opening walk, kicked off once the title fade clears. */
  static begin(flags: { introWalkRemaining: number; introWalkNextBeat: IntroBeat | null }): void {
    flags.introWalkRemaining = WALK_TILES.toSpawn * TILE;
    flags.introWalkNextBeat = "firstDialog";
  }
}
