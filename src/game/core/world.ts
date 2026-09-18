import { MAX_STARS_PER_LEVEL, TILE } from "../constants";
import { TILE_CHARS } from "../data/tiles";
import type {
  Boss,
  Camera,
  CutTile,
  Enemy,
  Reward,
  Star,
  TilePoint,
  Tracer,
  Trap,
  Player,
  WeaponPickup,
} from "../types";
import { createCamera } from "./camera";
import {
  createBoss,
  createEnemy,
  createPlayer,
  createReward,
  createStar,
  createWeaponPickup,
  tuneEnemyForLevel,
} from "./entities";
import { GameMap } from "./map";

/**
 * Everything that makes up one playable level. Rebuilt from scratch on every
 * level change and on every death, so nothing leaks between attempts.
 */
export interface GameWorld {
  map: GameMap;
  player: Player;
  enemies: Enemy[];
  boss: Boss | null;
  weapon: WeaponPickup | null;
  reward: Reward | null;
  stars: Star[];
  tracers: Tracer[];
  traps: Trap[];
  /** Keys of traps the player is currently standing on, for tile shading. */
  activatedTraps: Set<string>;
  deactivatedWalls: TilePoint[];
  bridges: TilePoint[];
  lavaTiles: TilePoint[];
  cutTile: CutTile | null;
  playerSpawn: TilePoint | null;
  camera: Camera;
  /** Monotonic id source so DOM sprites can be matched to their enemy. */
  nextEnemyId: number;
}

export interface BuildWorldOptions {
  /** Intro only: start the cat six tiles left of the spawn marker. */
  spawnOffscreenLeft?: boolean;
}

const INTRO_SPAWN_OFFSET_TILES = 6;

/**
 * Parses a level's rows into a playable world.
 *
 * Marker tiles for the weapon and the stars are blanked as they are read, so
 * they never register as geometry.
 */
export const buildWorld = (
  rows: string[],
  levelIndex: number,
  options: BuildWorldOptions = {},
): GameWorld => {
  const map = new GameMap(rows);

  const world: GameWorld = {
    map,
    player: createPlayer(),
    enemies: [],
    boss: null,
    weapon: null,
    reward: null,
    stars: [],
    tracers: [],
    traps: [],
    activatedTraps: new Set<string>(),
    deactivatedWalls: [],
    bridges: [],
    lavaTiles: [],
    cutTile: null,
    playerSpawn: null,
    camera: createCamera(),
    nextEnemyId: 0,
  };

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      switch (map.grid[y][x]) {
        case TILE_CHARS.spawn:
          world.playerSpawn = { x, y };
          break;

        case TILE_CHARS.enemy:
          world.enemies.push(
            tuneEnemyForLevel(createEnemy(++world.nextEnemyId, x, y), levelIndex),
          );
          break;

        case TILE_CHARS.boss:
          world.boss = createBoss(x, y);
          break;

        case TILE_CHARS.weapon:
          world.weapon = createWeaponPickup(x, y);
          map.setTile(x, y, TILE_CHARS.empty);
          break;

        case TILE_CHARS.star:
          if (world.stars.length < MAX_STARS_PER_LEVEL) {
            world.stars.push(createStar(x, y));
          }
          map.setTile(x, y, TILE_CHARS.empty);
          break;

        case TILE_CHARS.reward:
          world.reward = createReward(x, y);
          break;

        case TILE_CHARS.cutPost:
          world.cutTile = { x, y, cut: false, progress: 0 };
          break;

        case TILE_CHARS.trap:
          world.traps.push({ x, y, active: false });
          break;

        case TILE_CHARS.deactivatedWall:
          world.deactivatedWalls.push({ x, y });
          break;

        case TILE_CHARS.bridge:
          world.bridges.push({ x, y });
          break;

        case TILE_CHARS.lava:
          world.lavaTiles.push({ x, y });
          break;

        default:
          break;
      }
    }
  }

  if (world.playerSpawn) {
    const offset =
      options.spawnOffscreenLeft && levelIndex === 0
        ? INTRO_SPAWN_OFFSET_TILES * TILE
        : 0;
    world.player = createPlayer(
      world.playerSpawn.x * TILE - offset,
      world.playerSpawn.y * TILE,
    );
  }

  return world;
};

/** Drops every bridge tile, turning them into empty space. */
export const collapseBridges = (world: GameWorld): void => {
  for (const bridge of world.bridges) {
    if (world.map.tileAt(bridge.x, bridge.y) === TILE_CHARS.bridge) {
      world.map.setTile(bridge.x, bridge.y, TILE_CHARS.empty);
    }
  }
};

/** True when any tile under the boss's feet is still bridge. */
export const isBossOnBridge = (world: GameWorld): boolean => {
  const { boss, map } = world;
  if (!boss) return false;

  const footY = Math.floor((boss.y + boss.h + 1) / TILE);
  const leftTile = Math.floor(boss.x / TILE);
  const rightTile = Math.floor((boss.x + boss.w - 1) / TILE);

  for (let tx = leftTile; tx <= rightTile; tx++) {
    if (map.tileAt(tx, footY) === TILE_CHARS.bridge) return true;
  }
  return false;
};

/** True when the falling boss has reached the lava at the bottom of the pit. */
export const hasBossHitLava = (world: GameWorld): boolean => {
  const { boss, map } = world;
  if (!boss) return false;

  const leftTile = Math.floor(boss.x / TILE);
  const rightTile = Math.floor((boss.x + boss.w - 1) / TILE);
  const bottomTile = Math.floor((boss.y + boss.h - 1) / TILE);

  for (let tx = leftTile; tx <= rightTile; tx++) {
    if (map.tileAt(tx, bottomTile) === TILE_CHARS.lava) return true;
  }
  return false;
};
