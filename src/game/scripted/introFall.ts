import { TILE } from "../constants";
import type { Player } from "../types";

/**
 * The tiles Banana Cat tumbles through on the way into the cave, as
 * 1-based (column, row) pairs taken from the intro map.
 */
const TUMBLE_PATH: Array<[number, number]> = [
  ...Array.from({ length: 9 }, (_, i) => [17 + i, 12] as [number, number]),
  [27, 13],
  [28, 14],
  [29, 15],
  [30, 15],
  [31, 16],
  [37, 16],
];

const FALL = { dropPx: 8, durationMs: 150, faceDownDegrees: 90 } as const;
const TUMBLE = { stepMs: 120, spinIntervalMs: 20, degreesPerTick: 30 } as const;

/** Converts a tile coordinate to the player's top-left world position. */
const toWorld = (col: number, row: number, playerHeight: number) => ({
  x: col * TILE,
  y: row * TILE - playerHeight,
});

export interface IntroFallCallbacks {
  /** Rotates the frozen-frame overlay, which is what sells the tumble. */
  setRotation: (degrees: number) => void;
  onLanded: () => void;
  onTumbleStart: () => void;
  onTumbleEnd: () => void;
}

/**
 * Plays the scripted fall: a short face-plant, then a spin along a fixed path
 * down into the cave. Returns a cancel function.
 *
 * Driven by `requestAnimationFrame` rather than the game loop because the loop
 * is paused for the whole intro.
 */
export const playIntroFall = (
  player: Player,
  callbacks: IntroFallCallbacks,
): (() => void) => {
  let cancelled = false;
  let rafId: number | null = null;
  let spinTimer: number | null = null;

  const cancel = () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (spinTimer !== null) window.clearInterval(spinTimer);
  };

  const animate = (durationMs: number, onFrame: (t: number) => void, onDone: () => void) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      onFrame(t);
      if (t < 1) rafId = requestAnimationFrame(tick);
      else onDone();
    };
    rafId = requestAnimationFrame(tick);
  };

  const startY = player.y;
  animate(
    FALL.durationMs,
    (t) => {
      player.y = startY + FALL.dropPx * t;
      callbacks.setRotation(FALL.faceDownDegrees * t);
    },
    () => {
      callbacks.onLanded();
      window.setTimeout(startTumble, 200);
    },
  );

  function startTumble(): void {
    if (cancelled) return;
    callbacks.onTumbleStart();

    let spinAngle = 0;
    spinTimer = window.setInterval(() => {
      spinAngle = (spinAngle + TUMBLE.degreesPerTick) % 360;
      callbacks.setRotation(spinAngle);
    }, TUMBLE.spinIntervalMs);

    let step = 0;
    const nextStep = () => {
      if (cancelled) return;
      if (step >= TUMBLE_PATH.length) {
        if (spinTimer !== null) window.clearInterval(spinTimer);
        spinTimer = null;
        callbacks.onTumbleEnd();
        return;
      }

      const [col, row] = TUMBLE_PATH[step++];
      const target = toWorld(col, row, player.h);
      const fromX = player.x;
      const fromY = player.y;

      animate(
        TUMBLE.stepMs,
        (t) => {
          player.x = fromX + (target.x - fromX) * t;
          player.y = fromY + (target.y - fromY) * t;
        },
        () => window.setTimeout(nextStep, 10),
      );
    };

    nextStep();
  }

  return cancel;
};
