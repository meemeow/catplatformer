/**
 * The character vocabulary level maps are written in.
 *
 * Marker tiles (`spawn`, `enemy`, `star`, `weapon`, …) are consumed when the
 * level is built: some are replaced with `empty` so they never block movement.
 */
export const TILE_CHARS = {
  empty: ".",
  solid: "#",
  /** Decorative dirt wall the player can walk through. */
  passableDirt: "@",
  /** Decorative half-height rock; also non-blocking. */
  rock: "K",
  spawn: "S",
  enemy: "E",
  star: "P",
  weapon: "W",
  boss: "B",
  /** Rope post that drops the bridge once cut. */
  cutPost: "C",
  reward: "R",
  trap: "T",
  /** Wall that a nearby trap toggles off. */
  deactivatedWall: "&",
  bridge: "-",
  lava: "L",
  finish: "F",
} as const;

export type TileChar = (typeof TILE_CHARS)[keyof typeof TILE_CHARS];

/** Tiles that stop movement. Bridges are handled separately (floor only). */
export const SOLID_TILES: readonly string[] = [
  TILE_CHARS.solid,
  TILE_CHARS.deactivatedWall,
];
