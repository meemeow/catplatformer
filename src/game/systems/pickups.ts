import { HOSTAGE_PROXIMITY_TILES, TILE, TOTAL_STARS } from "../constants";
import { rectCollision } from "../core/collision";
import { footTile } from "../core/map";
import type { GameWorld } from "../core/world";
import { TILE_CHARS } from "../data/tiles";

/** True when the player's feet are in lava. */
export const isPlayerInLava = (world: GameWorld): boolean => {
  const foot = footTile(world.player);
  return world.map.tileAt(foot.x, foot.y) === TILE_CHARS.lava;
};

/** True when the player's feet are on the level's finish flag. */
export const isPlayerOnFinish = (world: GameWorld): boolean => {
  const foot = footTile(world.player);
  return world.map.tileAt(foot.x, foot.y) === TILE_CHARS.finish;
};

/** Marks the weapon collected if the player is touching it. */
export const tryCollectWeapon = (world: GameWorld): boolean => {
  const { weapon, player } = world;
  if (!weapon || weapon.collected || !rectCollision(player, weapon)) return false;

  weapon.collected = true;
  return true;
};

/** Collects any stars the player overlaps; returns how many were picked up. */
export const collectStars = (world: GameWorld): number => {
  let collected = 0;
  for (const star of world.stars) {
    if (star.collected || !rectCollision(world.player, star)) continue;
    star.collected = true;
    collected++;
  }
  return collected;
};

/** Caps a running star total at the game-wide maximum. */
export const clampStars = (count: number): number => Math.min(TOTAL_STARS, count);

/** True when the player is standing on the reward tile. */
export const isTouchingReward = (world: GameWorld): boolean =>
  world.reward !== null && rectCollision(world.player, world.reward);

/**
 * True when the player is close enough to the hostage to be offered the cutter:
 * within one tile horizontally and on the same row.
 */
export const isNearHostage = (world: GameWorld): boolean => {
  const { reward, cutTile } = world;
  if (!reward || !cutTile || cutTile.cut) return false;

  const rewardTileX = Math.floor(reward.x / TILE);
  const rewardTileY = Math.floor(reward.y / TILE);
  const foot = footTile(world.player);

  return Math.abs(foot.x - rewardTileX) <= 1 && Math.abs(foot.y - rewardTileY) <= 0;
};

/** Distance from the player to the reward, used to fade the hostage's crying. */
export const distanceToReward = (world: GameWorld): number => {
  const { reward, player } = world;
  if (!reward) return Infinity;

  return Math.hypot(
    player.x + player.w / 2 - (reward.x + reward.w / 2),
    player.y + player.h / 2 - (reward.y + reward.h / 2),
  );
};

/** Radius, in world pixels, within which the hostage can be heard. */
export const HOSTAGE_AUDIBLE_PX = TILE * HOSTAGE_PROXIMITY_TILES;
