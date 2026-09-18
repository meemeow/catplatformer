import { IMAGES, GIFS } from "../assets";
import { REWARD_SCALE, TILE, WEAPON_PICKUP_WIDTH_PX } from "../constants";
import type { Boss, Enemy, Reward, Star, WeaponPickup } from "../types";

/**
 * The canvas-drawn image set. GIFs drawn into a canvas freeze on their first
 * frame, which is why animated characters use DOM `<img>` layers instead and
 * these act as fallbacks.
 */
export interface SpriteAtlas {
  enemy: HTMLImageElement;
  boss: HTMLImageElement;
  star: HTMLImageElement;
  reward: HTMLImageElement;
  sheriff: HTMLImageElement;
  sniper: HTMLImageElement;
  cutter: HTMLImageElement;
}

const loadImage = (src: string): HTMLImageElement => {
  const img = new Image();
  img.src = src;
  return img;
};

export const createSpriteAtlas = (): SpriteAtlas => ({
  enemy: loadImage(GIFS.yapapa),
  boss: loadImage(GIFS.bossMain),
  star: loadImage(IMAGES.star),
  reward: loadImage(GIFS.catCry),
  sheriff: loadImage(IMAGES.sheriff),
  sniper: loadImage(IMAGES.sniper),
  cutter: loadImage(IMAGES.cutter),
});

/**
 * Enemies always get their contact shadow drawn on the canvas; the body is
 * only drawn here when no DOM sprite has taken over.
 */
export const drawEnemy = (
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  screenX: number,
  screenY: number,
  hasDomSprite: boolean,
): void => {
  ctx.fillStyle = "#2f2f2f";
  ctx.fillRect(screenX + 2, screenY + enemy.h - 6, enemy.w - 4, 4);

  if (hasDomSprite) return;

  ctx.fillStyle = "#ff6b6b";
  ctx.fillRect(screenX, screenY, enemy.w, enemy.h);
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(screenX + 6, screenY + 6, 4, 4);
  ctx.fillRect(screenX + enemy.w - 12, screenY + 6, 4, 4);
};

/** Canvas fallback for the boss, used only when its DOM sprite is missing. */
export const drawBoss = (
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  screenX: number,
  screenY: number,
  atlas: SpriteAtlas,
): void => {
  if (atlas.boss.complete) {
    ctx.drawImage(atlas.boss, screenX, screenY, boss.w, boss.h);
    return;
  }

  ctx.fillStyle = "#8b0000";
  ctx.fillRect(screenX, screenY, boss.w, boss.h);
  ctx.fillStyle = "#dc143c";
  ctx.fillRect(screenX + 8, screenY + 8, boss.w - 16, boss.h - 16);
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(screenX + 12, screenY + 12, 8, 8);
  ctx.fillRect(screenX + boss.w - 20, screenY + 12, 8, 8);
};

/** Stars bob, pulse and rock gently, all driven off the frame timestamp. */
export const drawStar = (
  ctx: CanvasRenderingContext2D,
  star: Star,
  screenX: number,
  screenY: number,
  now: number,
  atlas: SpriteAtlas,
): void => {
  const t = now * 0.001;
  const phase = star.x + star.y;
  const bob = Math.sin(t * 2 + phase * 0.001) * 4;
  const pulse = 1 + 0.08 * Math.sin(t * 3 + phase * 0.002);
  const rotation = 0.08 * Math.sin(t * 2.5 + phase * 0.003);

  ctx.save();
  ctx.translate(
    Math.round(screenX + star.w / 2),
    Math.round(screenY + star.h / 2 + bob),
  );
  ctx.rotate(rotation);
  ctx.scale(pulse, pulse);
  ctx.drawImage(atlas.star, -star.w / 2, -star.h / 2, star.w, star.h);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffd966";
  ctx.beginPath();
  ctx.ellipse(0, 0, star.w * 0.7, star.h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** Height that keeps a weapon image's aspect ratio at the given width. */
export const weaponDrawHeight = (
  img: HTMLImageElement,
  drawWidth: number,
  fallbackHeight: number,
): number => {
  if (!img.naturalWidth || !img.naturalHeight) return fallbackHeight;
  return Math.max(8, Math.round(drawWidth * (img.naturalHeight / img.naturalWidth)));
};

/**
 * The uncollected weapon pickup, sitting on the tile below it.
 * The sheriff art faces the wrong way, so it is mirrored.
 */
export const drawWeaponPickup = (
  ctx: CanvasRenderingContext2D,
  weapon: WeaponPickup,
  screenX: number,
  screenY: number,
  atlas: SpriteAtlas,
): void => {
  const drawWidth = WEAPON_PICKUP_WIDTH_PX;
  const drawHeight = weaponDrawHeight(
    atlas.sheriff,
    drawWidth,
    Math.round(weapon.h * 2.2),
  );

  const x = screenX + Math.round((TILE - drawWidth) / 2);
  const y = screenY + TILE - drawHeight - 2;

  ctx.save();
  ctx.translate(x + drawWidth, y);
  ctx.scale(-1, 1);
  ctx.drawImage(atlas.sheriff, 0, 0, drawWidth, drawHeight);
  ctx.restore();
};

/**
 * Canvas fallback for the hostage. When a DOM sprite exists it owns the
 * visuals, and this draws nothing.
 */
export const drawReward = (
  ctx: CanvasRenderingContext2D,
  reward: Reward,
  screenX: number,
  screenY: number,
  atlas: SpriteAtlas,
  hasDomSprite: boolean,
): void => {
  if (hasDomSprite) return;

  if (atlas.reward.complete && atlas.reward.naturalWidth) {
    ctx.drawImage(
      atlas.reward,
      screenX,
      screenY,
      reward.w * REWARD_SCALE,
      reward.h * REWARD_SCALE,
    );
    return;
  }

  ctx.fillStyle = "#ffd700";
  ctx.fillRect(screenX + 4, screenY + 4, reward.w - 8, reward.h - 8);
  ctx.fillStyle = "#ff6b00";
  ctx.beginPath();
  ctx.arc(screenX + reward.w / 2, screenY + reward.h / 2, reward.w / 3, 0, Math.PI * 2);
  ctx.fill();
};
