import {
  BOSS_STATS,
  ENEMY_SCALE,
  ENEMY_STATS,
  PLAYER_STATS,
  TILE,
} from "../constants";
import type { Boss, Enemy, Player, Reward, Star, WeaponPickup } from "../types";

export const createPlayer = (
  spawnX = TILE * 2,
  spawnY = TILE * 6,
): Player => ({
  x: spawnX,
  y: spawnY,
  w: PLAYER_STATS.width,
  h: PLAYER_STATS.height,
  vx: 0,
  vy: 0,
  speed: PLAYER_STATS.speed,
  jumpForce: PLAYER_STATS.jumpForce,
  onGround: false,
  dir: 1,
});

/** `tx`/`ty` are tile coordinates; the enemy remembers them for respawning. */
export const createEnemy = (id: number, tx: number, ty: number): Enemy => ({
  id,
  x: tx * TILE,
  y: ty * TILE,
  w: ENEMY_STATS.width * ENEMY_SCALE,
  h: ENEMY_STATS.height * ENEMY_SCALE,
  vx: ENEMY_STATS.speed,
  vy: 0,
  dir: 1,
  health: ENEMY_STATS.health,
  onGround: false,
  spawnTX: tx,
  spawnTY: ty,
});

/**
 * Levels 3 and 4 use unscaled, faster enemies.
 *
 * Note: respawns on level 4 use `tuneRespawnedEnemy` instead, which applies
 * different numbers. That discrepancy exists in the original game and is kept
 * here deliberately so behaviour does not change.
 */
export const tuneEnemyForLevel = (enemy: Enemy, levelIndex: number): Enemy => {
  if (levelIndex === 2) {
    enemy.w = TILE * 0.95;
    enemy.h = TILE * 0.99;
    enemy.vx = Math.round(enemy.vx * 2);
  }
  if (levelIndex === 3) {
    enemy.w = TILE * 0.95;
    enemy.h = TILE * 0.99;
    enemy.vx = Math.round(enemy.vx * 3);
  }
  return enemy;
};

/** Sizing applied when an enemy returns after being killed. See the note above. */
export const tuneRespawnedEnemy = (enemy: Enemy, levelIndex: number): Enemy => {
  if (levelIndex === 3) {
    enemy.w = TILE * 0.75;
    enemy.h = TILE * 0.85;
    enemy.vx = Math.round(enemy.vx * 1.6);
  }
  return enemy;
};

export const createBoss = (tx: number, ty: number): Boss => ({
  x: tx * TILE,
  // Stand the boss one tile higher so it reads as being on top of the bridge.
  y: ty * TILE - TILE,
  w: BOSS_STATS.width,
  h: BOSS_STATS.height,
  vx: BOSS_STATS.speed,
  vy: 0,
  dir: 1,
  health: BOSS_STATS.maxHealth,
  canFall: false,
});

export const createWeaponPickup = (tx: number, ty: number): WeaponPickup => ({
  x: tx * TILE,
  y: ty * TILE,
  w: TILE * 0.6,
  h: TILE * 0.3,
  collected: false,
});

export const createStar = (tx: number, ty: number): Star => ({
  x: tx * TILE,
  y: ty * TILE,
  w: TILE * 0.9,
  h: TILE * 0.9,
  collected: false,
});

export const createReward = (tx: number, ty: number): Reward => ({
  x: tx * TILE,
  y: ty * TILE,
  w: TILE,
  h: TILE,
});
