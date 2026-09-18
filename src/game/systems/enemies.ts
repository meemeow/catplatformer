import { TILE_CHARS } from "../data/tiles";
import { rectCollision } from "../core/collision";
import { footTile } from "../core/map";
import { bounceOffEnemy, isStomping, moveEnemy } from "../core/physics";
import type { GameWorld } from "../core/world";
import type { Enemy } from "../types";

export interface EnemyFrameResult {
  /** Enemies that walked into lava and must be respawned later. */
  drowned: Enemy[];
}

/** Steps every enemy and removes any that ended the frame inside lava. */
export const updateEnemies = (world: GameWorld, dt: number): EnemyFrameResult => {
  const drowned: Enemy[] = [];

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i];
    moveEnemy(enemy, world.map, dt);

    const foot = footTile(enemy);
    if (world.map.tileAt(foot.x, foot.y) === TILE_CHARS.lava) {
      drowned.push(world.enemies.splice(i, 1)[0]);
    }
  }

  return { drowned };
};

export interface PlayerEnemyResult {
  /** Enemies the player landed on this frame. */
  stomped: Enemy[];
  /** True when the player was hit from the side and should die. */
  playerHit: boolean;
}

/**
 * Resolves player-versus-enemy contact. Landing on an enemy kills it and
 * bounces the player; any other contact is fatal.
 */
export const resolvePlayerEnemyCollisions = (
  world: GameWorld,
): PlayerEnemyResult => {
  const result: PlayerEnemyResult = { stomped: [], playerHit: false };

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i];
    if (!rectCollision(world.player, enemy)) continue;

    if (isStomping(world.player, enemy)) {
      bounceOffEnemy(world.player, enemy);
      result.stomped.push(world.enemies.splice(i, 1)[0]);
    } else {
      result.playerHit = true;
      return result;
    }
  }

  return result;
};

/** Distance in world pixels from the player to the closest living enemy. */
export const distanceToNearestEnemy = (world: GameWorld): number => {
  const px = world.player.x + world.player.w / 2;
  const py = world.player.y + world.player.h / 2;

  let nearest = Infinity;
  for (const enemy of world.enemies) {
    const distance = Math.hypot(
      enemy.x + enemy.w / 2 - px,
      enemy.y + enemy.h / 2 - py,
    );
    if (distance < nearest) nearest = distance;
  }
  return nearest;
};
