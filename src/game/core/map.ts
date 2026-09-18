import { TILE } from "../constants";
import { SOLID_TILES, TILE_CHARS } from "../data/tiles";
import type { TileMap } from "../types";

/** Stable key for a tile coordinate, used by the trap and wall sets. */
export const tileKey = (tx: number, ty: number): string => `${tx},${ty}`;

/**
 * A level's tile grid plus the queries the engine runs against it.
 *
 * The grid is mutable on purpose: cutting the bridge and collecting markers
 * rewrite tiles in place, exactly as the original loop did.
 */
export class GameMap {
  readonly grid: TileMap;

  /**
   * Keys of `&` walls a trap is currently holding open. Kept here because
   * solidity cannot be answered without it.
   */
  readonly disabledWalls = new Set<string>();

  constructor(rows: string[]) {
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
    this.grid = rows.map((row) => row.padEnd(width, TILE_CHARS.empty).split(""));
  }

  get rows(): number {
    return this.grid.length;
  }

  get cols(): number {
    return this.grid[0]?.length ?? 0;
  }

  get widthPx(): number {
    return this.cols * TILE;
  }

  get heightPx(): number {
    return this.rows * TILE;
  }

  /** Reads outside the grid report solid, so nothing can walk off the map. */
  tileAt(tx: number, ty: number): string {
    if (ty < 0 || ty >= this.rows) return TILE_CHARS.solid;
    if (tx < 0 || tx >= this.cols) return TILE_CHARS.solid;
    return this.grid[ty][tx];
  }

  setTile(tx: number, ty: number, char: string): void {
    const row = this.grid[ty];
    if (row && tx >= 0 && tx < row.length) row[tx] = char;
  }

  isSolid(tx: number, ty: number): boolean {
    if (this.disabledWalls.has(tileKey(tx, ty))) return false;
    return SOLID_TILES.includes(this.tileAt(tx, ty));
  }

  /** Bridges are floor-only: solid underfoot, passable from every other side. */
  isBridge(tx: number, ty: number): boolean {
    return this.tileAt(tx, ty) === TILE_CHARS.bridge;
  }
}

/** Tile column/row under a world-space point. */
export const toTileX = (worldX: number): number => Math.floor(worldX / TILE);
export const toTileY = (worldY: number): number => Math.floor(worldY / TILE);

/** Tile the given box is standing on (horizontal centre, one pixel above its feet). */
export const footTile = (box: { x: number; y: number; w: number; h: number }) => ({
  x: Math.floor((box.x + box.w / 2) / TILE),
  y: Math.floor((box.y + box.h - 1) / TILE),
});
