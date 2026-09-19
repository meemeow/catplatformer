import { GIFS } from "../assets";
import { DEATH_CLASS, EFFECT_CLASS } from "./effects";
import { REWARD_SCALE, SCALE } from "../constants";
import type { Boss, Camera, Enemy, Reward } from "../types";

/**
 * Animated characters are DOM `<img>` elements positioned over the canvas.
 *
 * They cannot be drawn into the canvas: `drawImage` on a GIF captures a single
 * frame, so anything animated would freeze. This class owns those elements and
 * keeps them in sync with world coordinates each frame.
 */
export class SpriteLayer {
  private readonly parent: HTMLElement;
  private readonly enemies = new Map<number, HTMLImageElement>();
  private bossEl: HTMLImageElement | null = null;
  private rewardEl: HTMLImageElement | null = null;

  constructor(parent: HTMLElement) {
    this.parent = parent;
  }

  /** Reward sprite, exposed so the victory sequence can swap its image. */
  get reward(): HTMLImageElement | null {
    return this.rewardEl;
  }

  /** True when the boss is drawn by this layer rather than onto the canvas. */
  get hasBoss(): boolean {
    return this.bossEl !== null;
  }

  private createSprite(src: string, className: string): HTMLImageElement {
    const img = document.createElement("img");
    img.src = src;
    img.draggable = false;
    img.className = `game-sprite ${className}`;
    // Hidden until the first sync positions it, to avoid a flash at 0,0.
    img.style.display = "none";
    this.parent.appendChild(img);
    return img;
  }

  addEnemy(enemy: Enemy): void {
    const img = this.createSprite(GIFS.yapapa, "game-sprite--enemy");
    img.style.width = `${Math.round(enemy.w * SCALE)}px`;
    img.style.height = `${Math.round(enemy.h * SCALE)}px`;
    this.enemies.set(enemy.id, img);
  }

  hasEnemy(id: number): boolean {
    return this.enemies.has(id);
  }

  removeEnemy(id: number): void {
    this.enemies.get(id)?.remove();
    this.enemies.delete(id);
  }

  /**
   * Hands the sprite over to the caller and stops tracking it, so a death
   * animation can keep playing on an element the sync loop no longer hides.
   */
  detachEnemy(id: number): HTMLImageElement | null {
    const img = this.enemies.get(id);
    if (!img) return null;
    this.enemies.delete(id);
    return img;
  }

  addBoss(): void {
    this.bossEl = this.createSprite(GIFS.bossMain, "game-sprite--boss");
  }

  addReward(): void {
    this.rewardEl = this.createSprite(GIFS.catCry, "game-sprite--reward");
  }

  removeBoss(): void {
    this.bossEl?.remove();
    this.bossEl = null;
  }

  /** Repositions every live sprite for the current camera. */
  sync(enemies: Enemy[], boss: Boss | null, reward: Reward | null, camera: Camera): void {
    this.syncEnemies(enemies, camera);
    this.syncBoss(boss, camera);
    this.syncReward(reward, camera);
  }

  private syncEnemies(enemies: Enemy[], camera: Camera): void {
    for (const [id, img] of this.enemies) {
      const enemy = enemies.find((candidate) => candidate.id === id);
      if (!enemy) {
        img.style.display = "none";
        continue;
      }

      placeSprite(img, enemy, camera, enemy.w, enemy.h);
      // The source art faces left, so a right-facing enemy is mirrored.
      img.style.transform = enemy.dir > 0 ? "scaleX(-1)" : "scaleX(1)";
    }
  }

  private syncBoss(boss: Boss | null, camera: Camera): void {
    if (!this.bossEl) return;
    if (!boss) {
      this.bossEl.style.display = "none";
      return;
    }
    placeSprite(this.bossEl, boss, camera, boss.w, boss.h);
  }

  private syncReward(reward: Reward | null, camera: Camera): void {
    if (!this.rewardEl) return;
    if (!reward) {
      this.rewardEl.style.display = "none";
      return;
    }
    placeSprite(
      this.rewardEl,
      reward,
      camera,
      reward.w * REWARD_SCALE.x,
      reward.h * REWARD_SCALE.y,
      reward.w,
      reward.h,
    );
  }

  /**
   * Removes death and hand-over animations still in the layer.
   *
   * These are appended here but deliberately not tracked, so that a detached
   * enemy can keep animating after the sync loop lets go of it. Their only
   * cleanup is a timer, and a level reset cancels every timer, which would
   * otherwise strand them on screen for the rest of the session.
   */
  clearEffects(): void {
    for (const el of this.parent.querySelectorAll(`.${EFFECT_CLASS}`)) {
      el.remove();
    }
  }

  /** Removes every sprite. Called on level change and on unmount. */
  clear(): void {
    for (const img of this.enemies.values()) img.remove();
    this.enemies.clear();
    this.removeBoss();
    this.rewardEl?.remove();
    this.rewardEl = null;
    this.clearEffects();
    // The corpse is exempt from `clearEffects` so it can sit behind the restart
    // banner, which makes the level load the one place that clears it.
    for (const el of this.parent.querySelectorAll(`.${DEATH_CLASS}`)) {
      el.remove();
    }
  }
}

/**
 * Positions one sprite from world coordinates, and hides it once it is more
 * than its own size outside the view.
 *
 * A sprite drawn larger than the box it collides with is anchored on that
 * box's bottom centre, so the extra size grows upward and outward. Anchoring
 * the top-left instead would push the overhang straight down through the floor.
 */
const placeSprite = (
  img: HTMLImageElement,
  box: { x: number; y: number },
  camera: Camera,
  worldWidth: number,
  worldHeight: number,
  /** Collision box, when it differs from the drawn size. */
  boxWidth = worldWidth,
  boxHeight = worldHeight,
): void => {
  const width = Math.round(worldWidth * SCALE);
  const height = Math.round(worldHeight * SCALE);
  const boxW = Math.round(boxWidth * SCALE);
  const boxH = Math.round(boxHeight * SCALE);

  const screenX =
    Math.round((box.x - camera.x) * SCALE) - Math.round((width - boxW) / 2);
  const screenY = Math.round((box.y - camera.y) * SCALE) - (height - boxH);

  img.style.left = `${screenX}px`;
  img.style.top = `${screenY}px`;
  img.style.width = `${width}px`;
  img.style.height = `${height}px`;

  const visible =
    screenX >= -width &&
    screenX <= camera.width * SCALE + width &&
    screenY >= -height &&
    screenY <= camera.height * SCALE + height;
  img.style.display = visible ? "block" : "none";
};
