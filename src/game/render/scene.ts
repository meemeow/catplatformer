import { TILE } from "../constants";
import { isOnScreen, toScreen } from "../core/camera";
import type { GameWorld } from "../core/world";
import type { SpriteAtlas } from "./sprites";
import {
  drawBoss,
  drawEnemy,
  drawReward,
  drawStar,
  drawWeaponPickup,
} from "./sprites";
import { BackgroundRenderer } from "./background";
import { drawTracers } from "./tracers";
import { TileRenderer, tileDrawContext } from "./tiles";

export interface SceneRenderer {
  tiles: TileRenderer;
  atlas: SpriteAtlas;
  /** Caches the sky layers; rebuilds itself when the canvas size changes. */
  background: BackgroundRenderer;
}

export const createSceneRenderer = (atlas: SpriteAtlas): SceneRenderer => ({
  tiles: new TileRenderer(),
  atlas,
  background: new BackgroundRenderer(),
});

export interface SceneFrame {
  /** `requestAnimationFrame` timestamp, used for all idle animation. */
  now: number;
  /** Which enemy ids currently have a DOM sprite, so canvas art is skipped. */
  hasEnemySprite: (id: number) => boolean;
  hasBossSprite: boolean;
  hasRewardSprite: boolean;
  /** The final level floods its pit, so lava is drawn full-height. */
  fullHeightLava: boolean;
}

/** Draws only the tiles the camera can see. */
const renderTiles = (
  ctx: CanvasRenderingContext2D,
  renderer: SceneRenderer,
  world: GameWorld,
  fullHeightLava: boolean,
  now: number,
): void => {
  const { camera, map } = world;
  const context = tileDrawContext(world, fullHeightLava, now);

  const startCol = Math.floor(camera.x / TILE);
  const endCol = Math.ceil((camera.x + camera.width) / TILE);
  const startRow = Math.floor(camera.y / TILE);
  const endRow = Math.ceil((camera.y + camera.height) / TILE);

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const screen = toScreen(camera, col * TILE, row * TILE);
      renderer.tiles.draw(ctx, map.tileAt(col, row), screen.x, screen.y, context);
    }
  }
};

/**
 * Paints one frame of the world onto the canvas.
 *
 * The player is not drawn here: it lives in the DOM sprite layer above the
 * canvas, so that its GIF keeps animating.
 */
export const renderScene = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  world: GameWorld,
  renderer: SceneRenderer,
  frame: SceneFrame,
): void => {
  const { camera } = world;
  const { atlas } = renderer;

  renderer.background.draw(ctx, canvasWidth, canvasHeight, camera, frame.now);
  renderTiles(ctx, renderer, world, frame.fullHeightLava, frame.now);

  for (const enemy of world.enemies) {
    const screen = toScreen(camera, enemy.x, enemy.y);
    if (!isOnScreen(camera, screen.x, screen.y, TILE, TILE)) continue;
    drawEnemy(ctx, enemy, screen.x, screen.y, frame.hasEnemySprite(enemy.id));
  }

  if (world.boss && !frame.hasBossSprite) {
    const screen = toScreen(camera, world.boss.x, world.boss.y);
    if (isOnScreen(camera, screen.x, screen.y, world.boss.w, world.boss.h)) {
      drawBoss(ctx, world.boss, screen.x, screen.y, atlas);
    }
  }

  if (world.weapon && !world.weapon.collected) {
    const screen = toScreen(camera, world.weapon.x, world.weapon.y);
    if (isOnScreen(camera, screen.x, screen.y, TILE, TILE)) {
      drawWeaponPickup(ctx, world.weapon, screen.x, screen.y, atlas);
    }
  }

  if (world.reward) {
    const screen = toScreen(camera, world.reward.x, world.reward.y);
    if (isOnScreen(camera, screen.x, screen.y, TILE, TILE)) {
      drawReward(ctx, world.reward, screen.x, screen.y, atlas, frame.hasRewardSprite);
    }
  }

  drawTracers(ctx, world.tracers, camera);

  for (const star of world.stars) {
    if (star.collected) continue;
    const screen = toScreen(camera, star.x, star.y);
    if (!isOnScreen(camera, screen.x, screen.y, TILE, TILE)) continue;
    drawStar(ctx, star, screen.x, screen.y, frame.now, atlas);
  }

};
