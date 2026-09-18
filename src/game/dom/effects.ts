import { GIFS, IMAGES } from "../assets";
import { SCALE, TIMINGS } from "../constants";
import type { TimerBag } from "../core/timers";
import type { Camera, Enemy, Player, Rect } from "../types";

/** World point -> pixel offset inside the scaled sprite layer. */
const toLayerPx = (box: { x: number; y: number }, camera: Camera) => ({
  left: Math.round((box.x - camera.x) * SCALE),
  top: Math.round((box.y - camera.y) * SCALE),
});

/**
 * The shocked-cat GIF shown where an enemy died.
 *
 * When the enemy had a DOM sprite we reuse a detached copy of it, so the
 * animation starts at exactly the size and position the enemy occupied.
 */
export const playEnemyDeathEffect = (
  parent: HTMLElement,
  enemy: Enemy,
  camera: Camera,
  detachedSprite: HTMLImageElement | null,
  timers: TimerBag,
): void => {
  let el: HTMLImageElement;

  if (detachedSprite) {
    el = detachedSprite.cloneNode(true) as HTMLImageElement;
    detachedSprite.remove();
  } else {
    el = document.createElement("img");
    el.draggable = false;
    el.className = "game-sprite";
    const { left, top } = toLayerPx(enemy, camera);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${Math.round(enemy.w * SCALE)}px`;
    el.style.height = `${Math.round(enemy.h * SCALE)}px`;
  }

  el.src = GIFS.catShock;
  el.style.zIndex = "3";
  el.style.display = "block";
  parent.appendChild(el);

  timers.setTimeout(() => el.remove(), TIMINGS.enemyDeathGifMs);
};

/**
 * Slides the cutter from the hostage to the player, then calls `onArrive`.
 * Falls back to calling `onArrive` straight away if the layer is unavailable.
 */
export const playCutterHandover = (
  parent: HTMLElement | null,
  from: Rect,
  to: Player,
  camera: Camera,
  timers: TimerBag,
  onArrive: () => void,
): void => {
  if (!parent) {
    onArrive();
    return;
  }

  const el = document.createElement("img");
  el.src = IMAGES.cutter;
  el.draggable = false;
  el.className = "game-sprite game-sprite--cutter";

  const start = toLayerPx(from, camera);
  const end = toLayerPx(to, camera);
  el.style.left = `${start.left}px`;
  el.style.top = `${start.top}px`;
  parent.appendChild(el);

  // One frame of delay so the browser registers the start position before
  // the transition begins; otherwise it jumps straight to the end.
  timers.setTimeout(() => {
    el.style.left = `${end.left}px`;
    el.style.top = `${end.top}px`;

    timers.setTimeout(() => {
      el.remove();
      onArrive();
    }, 700);
  }, 20);
};

/** Handle for the death animation, so the caller can clear it on respawn. */
export interface DeathEffect {
  remove: () => void;
}

/**
 * The dead-cat sprite popping up and then dropping off the bottom of the
 * screen. Purely visual — the level reset is driven by the death sound.
 */
export const playPlayerDeathEffect = (
  parent: HTMLElement | null,
  player: Player,
  camera: Camera,
  viewHeight: number,
  timers: TimerBag,
): DeathEffect | null => {
  if (!parent) return null;

  const el = document.createElement("img");
  el.src = IMAGES.catDead;
  el.draggable = false;
  el.className = "game-sprite game-sprite--death";

  const { left, top } = toLayerPx(player, camera);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  parent.appendChild(el);

  const riseBy = Math.max(120, Math.round(viewHeight * 0.25));
  const riseMs = 700;
  const fallMs = 1000;

  el.style.transition = `top ${riseMs}ms ease-out`;
  timers.setTimeout(() => {
    el.style.top = `${top - riseBy}px`;
  }, 20);

  timers.setTimeout(() => {
    el.style.transition = `top ${fallMs}ms linear`;
    el.style.top = `${parent.clientHeight + 300}px`;
  }, riseMs + 40);

  // Safety net: if the respawn never runs, do not leave the sprite behind.
  timers.setTimeout(() => el.remove(), riseMs + fallMs + 10000);

  return { remove: () => el.remove() };
};

/**
 * Flips the hostage and the dialogue portrait back and forth during the
 * victory celebration. Returns a stop function.
 */
export const startCelebrationFlip = (
  rewardEl: HTMLImageElement | null,
  dialoguePortrait: () => HTMLImageElement | null,
  timers: TimerBag,
): (() => void) => {
  let flipped = false;

  const id = timers.setInterval(() => {
    flipped = !flipped;
    const transform = flipped ? "scaleX(-1)" : "scaleX(1)";

    if (rewardEl) rewardEl.style.transform = transform;

    const portrait = dialoguePortrait();
    if (portrait) {
      portrait.style.transform = transform;
      if (portrait.src.includes(GIFS.catCry)) portrait.src = IMAGES.bananaCatHeart;
    }
  }, TIMINGS.celebrationFlipMs);

  return () => timers.clearInterval(id);
};
