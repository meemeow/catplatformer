import { TILE } from "../constants";
import type { Camera, Player } from "../types";
import type { GameMap } from "./map";

export const createCamera = (): Camera => ({ x: 0, y: 0, width: 0, height: 0 });

/**
 * Centres the camera on the player and clamps it to the map bounds, so the
 * view never shows empty space beyond the level.
 */
export const followPlayer = (
  camera: Camera,
  player: Player,
  map: GameMap,
  viewWidth: number,
  viewHeight: number,
): void => {
  camera.width = viewWidth;
  camera.height = viewHeight;
  camera.x = player.x + player.w / 2 - camera.width / 2;
  camera.y = player.y + player.h / 2 - camera.height / 2;

  const maxX = map.cols * TILE - camera.width;
  const maxY = map.rows * TILE - camera.height;
  camera.x = Math.max(0, Math.min(maxX, camera.x));
  camera.y = Math.max(0, Math.min(maxY, camera.y));
};

/** World point -> on-canvas point. */
export const toScreen = (camera: Camera, x: number, y: number) => ({
  x: Math.round(x - camera.x),
  y: Math.round(y - camera.y),
});

/** True when a box of this size is close enough to the view to be worth drawing. */
export const isOnScreen = (
  camera: Camera,
  screenX: number,
  screenY: number,
  w: number,
  h: number,
): boolean =>
  screenX >= -w &&
  screenX <= camera.width + w &&
  screenY >= -h &&
  screenY <= camera.height + h;
