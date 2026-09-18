import { PHYSICS, TILE } from "../constants";
import type { Boss, Enemy, InputState, Player } from "../types";
import { rectCollision } from "./collision";
import type { GameMap } from "./map";

/** Nudge used to park an entity flush against a tile without re-colliding. */
const EPSILON = 0.01;

const applyGravity = (body: { vy: number }, dt: number, gravity = PHYSICS.gravity): void => {
  body.vy += gravity * dt;
  if (body.vy > PHYSICS.maxFallSpeed) body.vy = PHYSICS.maxFallSpeed;
};

/**
 * Advances the player one step: gravity, horizontal sweep, vertical sweep, jump.
 *
 * Returns whether a jump was started this frame so the caller can play the sound
 * without the physics layer needing to know about audio.
 */
export const movePlayer = (
  player: Player,
  map: GameMap,
  input: InputState,
  dt: number,
): { jumped: boolean } => {
  applyGravity(player, dt);

  player.vx = 0;
  if (input.left) player.vx = -player.speed;
  if (input.right) player.vx = player.speed;
  if (player.vx !== 0) player.dir = Math.sign(player.vx);

  // Horizontal sweep, resolved before the vertical one so corners feel solid.
  player.x += player.vx * dt;

  const leftTile = Math.floor(player.x / TILE);
  const rightTile = Math.floor((player.x + player.w - 1) / TILE);
  const topTile = Math.floor(player.y / TILE);
  const bottomTile = Math.floor((player.y + player.h - 1) / TILE);

  if (player.vx > 0) {
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (map.isSolid(rightTile, ty)) {
        player.x = rightTile * TILE - player.w - EPSILON;
        break;
      }
    }
  } else if (player.vx < 0) {
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (map.isSolid(leftTile, ty)) {
        player.x = (leftTile + 1) * TILE + EPSILON;
        break;
      }
    }
  }

  // Vertical sweep.
  player.y += player.vy * dt;
  player.onGround = false;

  const newLeftTile = Math.floor(player.x / TILE);
  const newRightTile = Math.floor((player.x + player.w - 1) / TILE);
  const newTopTile = Math.floor(player.y / TILE);
  const newBottomTile = Math.floor((player.y + player.h - 1) / TILE);

  if (player.vy >= 0) {
    for (let tx = newLeftTile; tx <= newRightTile; tx++) {
      // Bridges only count as floor, which is what lets the boss walk them.
      if (map.isSolid(tx, newBottomTile) || map.isBridge(tx, newBottomTile)) {
        player.y = newBottomTile * TILE - player.h - EPSILON;
        player.vy = 0;
        player.onGround = true;
        break;
      }

      // Second pass catches the case where the feet are a hair above a tile.
      const footCheckY = Math.floor((player.y + player.h + 1) / TILE);
      if (map.isSolid(tx, footCheckY) && player.y + player.h > footCheckY * TILE - 2) {
        player.y = footCheckY * TILE - player.h - EPSILON;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  if (player.vy < 0) {
    for (let tx = newLeftTile; tx <= newRightTile; tx++) {
      if (map.isSolid(tx, newTopTile)) {
        player.y = (newTopTile + 1) * TILE + EPSILON;
        player.vy = 0;
        break;
      }
    }
  }

  let jumped = false;
  if (input.up && player.onGround) {
    player.vy = -player.jumpForce;
    player.onGround = false;
    input.up = false; // Consume the press so holding the key does not re-fire.
    jumped = true;
  }

  return { jumped };
};

/**
 * Goomba-style patrol: walk until a wall or a ledge, then reverse.
 * Enemies ignore bridges entirely and only stand on solid tiles.
 */
export const moveEnemy = (enemy: Enemy, map: GameMap, dt: number): void => {
  applyGravity(enemy, dt);

  const moveX = enemy.vx * enemy.dir * dt;
  enemy.x += moveX;

  const leftTile = Math.floor(enemy.x / TILE);
  const rightTile = Math.floor((enemy.x + enemy.w - 1) / TILE);
  const topTile = Math.floor(enemy.y / TILE);
  const bottomTile = Math.floor((enemy.y + enemy.h - 1) / TILE);

  if (moveX > 0) {
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (map.isSolid(rightTile, ty)) {
        enemy.x = rightTile * TILE - enemy.w - EPSILON;
        enemy.dir = -1;
        break;
      }
    }
  } else if (moveX < 0) {
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (map.isSolid(leftTile, ty)) {
        enemy.x = (leftTile + 1) * TILE + EPSILON;
        enemy.dir = 1;
        break;
      }
    }
  }

  enemy.y += enemy.vy * dt;
  enemy.onGround = false;

  const newLeftTile = Math.floor(enemy.x / TILE);
  const newRightTile = Math.floor((enemy.x + enemy.w - 1) / TILE);
  const newTopTile = Math.floor(enemy.y / TILE);
  const newBottomTile = Math.floor((enemy.y + enemy.h - 1) / TILE);

  if (enemy.vy >= 0) {
    for (let tx = newLeftTile; tx <= newRightTile; tx++) {
      if (map.isSolid(tx, newBottomTile)) {
        enemy.y = newBottomTile * TILE - enemy.h - EPSILON;
        enemy.vy = 0;
        enemy.onGround = true;
        break;
      }
    }
  }

  if (enemy.vy < 0) {
    for (let tx = newLeftTile; tx <= newRightTile; tx++) {
      if (map.isSolid(tx, newTopTile)) {
        enemy.y = (newTopTile + 1) * TILE + EPSILON;
        enemy.vy = 0;
        break;
      }
    }
  }

  // Turn at ledges and walls.
  const feetY = Math.floor((enemy.y + enemy.h + 1) / TILE);
  const aheadX =
    enemy.dir > 0
      ? Math.floor((enemy.x + enemy.w + 1) / TILE)
      : Math.floor((enemy.x - 1) / TILE);
  if (!map.isSolid(aheadX, feetY) || map.isSolid(aheadX, feetY - 1)) {
    enemy.dir *= -1;
  }
};

/** The boss's ordinary patrol across the bridge. */
export const moveBossPatrol = (boss: Boss, map: GameMap, dt: number): void => {
  boss.x += boss.vx * boss.dir * dt;

  const groundY = Math.floor((boss.y + boss.h + 1) / TILE);
  const nextX =
    boss.dir > 0
      ? Math.floor((boss.x + boss.w + 1) / TILE)
      : Math.floor((boss.x - 1) / TILE);

  const groundAhead = map.isSolid(nextX, groundY) || map.isBridge(nextX, groundY);
  const wallAhead = map.isSolid(nextX, groundY - 1);

  if (!groundAhead || wallAhead) boss.dir *= -1;
};

/** Free-fall after the bridge is cut; uses its own heavier gravity. */
export const applyBossFall = (boss: Boss, dt: number): void => {
  boss.vy += PHYSICS.bossFallGravity * dt;
  boss.y += boss.vy * dt;
};

/**
 * Stops the player walking through the boss. Landing on its head bounces;
 * anything else pushes the player clear sideways.
 */
export const resolvePlayerBossCollision = (player: Player, boss: Boss): void => {
  if (!rectCollision(player, boss)) return;

  const playerBottom = player.y + player.h;
  if (player.vy > 0 && playerBottom - boss.y < TILE * 0.6) {
    player.y = boss.y - player.h - EPSILON;
    player.vy = -player.jumpForce * PHYSICS.stompBounce;
    player.onGround = true;
    return;
  }

  const playerCenterX = player.x + player.w / 2;
  const bossCenterX = boss.x + boss.w / 2;
  player.x =
    playerCenterX < bossCenterX
      ? boss.x - player.w - EPSILON
      : boss.x + boss.w + EPSILON;
  player.vx = 0;
};

/** True when the player landed on the enemy rather than walking into it. */
export const isStomping = (player: Player, enemy: Enemy): boolean =>
  player.vy > 0 && player.y + player.h - enemy.y < TILE * 0.5;

/** Places the player on top of a stomped enemy and bounces them off it. */
export const bounceOffEnemy = (player: Player, enemy: Enemy): void => {
  player.y = enemy.y - player.h - EPSILON;
  player.vy = -player.jumpForce * PHYSICS.stompBounce;
  player.onGround = true;
};
