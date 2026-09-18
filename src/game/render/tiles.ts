import { TILE } from "../constants";
import type { GameMap } from "../core/map";
import { tileKey } from "../core/map";
import type { GameWorld } from "../core/world";
import { TILE_CHARS } from "../data/tiles";
import type { Camera, CutTile } from "../types";
import { paintRockTile, paintSoilTile, paintStoneBrickTile } from "./tileArt";
import { LAVA, STONE, WOOD } from "./palette";
import { tileVariant } from "./random";

/** Everything a tile needs to know about the world to draw itself. */
export interface TileDrawContext {
  camera: Camera;
  map: GameMap;
  activatedTraps: Set<string>;
  cutTile: CutTile | null;
  /** The last level floods its pit, so lava is drawn full-height there. */
  fullHeightLava: boolean;
}

/** Builds a draw context from the live world. */
export const tileDrawContext = (
  world: GameWorld,
  fullHeightLava: boolean,
): TileDrawContext => ({
  camera: world.camera,
  map: world.map,
  activatedTraps: world.activatedTraps,
  cutTile: world.cutTile,
  fullHeightLava,
});

/**
 * Draws map tiles, caching the three procedurally generated ones.
 *
 * The cache is keyed by tile type and art variant rather than by coordinate:
 * the first tile of each variant to be drawn defines how all of them look,
 * which is what keeps a full-screen redraw cheap.
 */
export class TileRenderer {
  private readonly cache = new Map<string, HTMLCanvasElement>();

  /** Called when the level changes, so art does not carry over. */
  clear(): void {
    this.cache.clear();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    char: string,
    screenX: number,
    screenY: number,
    context: TileDrawContext,
  ): void {
    const tx = Math.floor((screenX + context.camera.x) / TILE);
    const ty = Math.floor((screenY + context.camera.y) / TILE);

    switch (char) {
      case TILE_CHARS.solid:
        this.drawSolid(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.passableDirt:
        this.drawCached(
          ctx,
          screenX,
          screenY,
          `brick_${tileVariant(tx, ty, 17, 13)}`,
          () => paintStoneBrickTile(tx, ty, tileVariant(tx, ty, 17, 13)),
        );
        break;
      case TILE_CHARS.rock:
        this.drawCached(
          ctx,
          screenX,
          screenY,
          `rock_${tileVariant(tx, ty, 19, 7)}`,
          () => paintRockTile(tx, ty, tileVariant(tx, ty, 19, 7)),
        );
        break;
      case TILE_CHARS.deactivatedWall:
        drawDeactivatedWall(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.lava:
        drawLava(ctx, screenX, screenY, context.fullHeightLava);
        break;
      case TILE_CHARS.cutPost:
        drawCutPost(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.bridge:
        drawBridge(ctx, screenX, screenY);
        break;
      case TILE_CHARS.trap:
        drawTrap(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.finish:
        drawFinishFlag(ctx, screenX, screenY);
        break;
      default:
        // Empty tiles stay transparent so the parallax background shows through.
        break;
    }
  }

  /** Ground grows grass only where nothing sits on top of it. */
  private drawSolid(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    tx: number,
    ty: number,
    context: TileDrawContext,
  ): void {
    const { map } = context;
    const showGrass =
      !map.isSolid(tx, ty - 1) &&
      !map.isBridge(tx, ty - 1) &&
      map.tileAt(tx, ty - 1) !== TILE_CHARS.lava;

    const variant = showGrass ? tileVariant(tx, ty, 31, 17) : 0;
    const key = showGrass ? `soil_grass_${variant}` : "soil_bare";

    this.drawCached(ctx, screenX, screenY, key, () =>
      paintSoilTile(tx, ty, variant, showGrass),
    );
  }

  private drawCached(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    key: string,
    paint: () => HTMLCanvasElement,
  ): void {
    let tile = this.cache.get(key);
    if (!tile) {
      tile = paint();
      this.cache.set(key, tile);
    }
    ctx.drawImage(tile, screenX, screenY, TILE, TILE);
  }
}

/** A trap-controlled wall, hidden entirely while its trap is held down. */
const drawDeactivatedWall = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  if (context.map.disabledWalls.has(tileKey(tx, ty))) return;

  // Cut masonry, so it reads as built rather than grown.
  ctx.fillStyle = STONE.mortar;
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.fillStyle = STONE.brick;
  ctx.fillRect(screenX + 1, screenY + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = STONE.bevel;
  ctx.fillRect(screenX + 1, screenY + 1, TILE - 2, 2);
  ctx.fillStyle = STONE.shade;
  ctx.fillRect(screenX + 1, screenY + TILE - 3, TILE - 2, 2);
};

/** Molten rock: dark below, bright at the surface, with a glowing crust. */
const paintLavaBody = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  surfaceY: number,
  depth: number,
): void => {
  const molten = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + depth);
  molten.addColorStop(0, LAVA.hot);
  molten.addColorStop(0.35, LAVA.body);
  molten.addColorStop(1, LAVA.deep);
  ctx.fillStyle = molten;
  ctx.fillRect(screenX, surfaceY, TILE, depth);

  ctx.fillStyle = LAVA.crust;
  ctx.fillRect(screenX, surfaceY, TILE, 2);
  ctx.fillStyle = LAVA.hot;
  ctx.fillRect(screenX, surfaceY + 2, TILE, 1);
};

const drawLava = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  fullHeight: boolean,
): void => {
  if (fullHeight) {
    paintLavaBody(ctx, screenX, screenY, TILE);
    return;
  }

  // Half-height pools read as shallow, so the sky shows above them.
  paintLavaBody(ctx, screenX, screenY + TILE / 2, TILE / 2);
};

/** The rope anchor, plus a progress bar while the player is cutting it. */
const drawCutPost = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  const postX = screenX + TILE * 0.38;
  const postW = TILE * 0.24;
  ctx.fillStyle = WOOD.mid;
  ctx.fillRect(postX, screenY + TILE * 0.12, postW, TILE * 0.76);
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(postX, screenY + TILE * 0.12, 2, TILE * 0.76);
  ctx.fillStyle = WOOD.dark;
  ctx.fillRect(postX + postW - 2, screenY + TILE * 0.12, 2, TILE * 0.76);

  // Ropes reach toward whichever neighbours are bridge tiles.
  ctx.strokeStyle = WOOD.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (context.map.tileAt(tx - 1, ty) === TILE_CHARS.bridge) {
    ctx.moveTo(screenX + TILE * 0.35, screenY + TILE * 0.28);
    ctx.lineTo(screenX - TILE * 0.5, screenY + TILE * 0.28);
  }
  if (context.map.tileAt(tx + 1, ty) === TILE_CHARS.bridge) {
    ctx.moveTo(screenX + TILE * 0.65, screenY + TILE * 0.28);
    ctx.lineTo(screenX + TILE * 1.5, screenY + TILE * 0.28);
  }
  ctx.stroke();

  const cut = context.cutTile;
  if (!cut || cut.x !== tx || cut.y !== ty || cut.cut || cut.progress <= 0) return;

  const barWidth = Math.round(TILE * 0.6);
  const barHeight = 6;
  const barX = screenX + Math.round((TILE - barWidth) / 2);
  const barY = screenY + TILE - 10;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(
    barX + 1,
    barY + 1,
    Math.max(0, Math.round((barWidth - 2) * cut.progress)),
    barHeight - 2,
  );
};

/** Plank decking, lit along the top edge and shadowed underneath. */
const drawBridge = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  ctx.fillStyle = WOOD.mid;
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(screenX, screenY, TILE, 3);

  // Board seams, and the gaps you can see daylight through.
  ctx.fillStyle = WOOD.dark;
  for (let x = 0; x < TILE; x += 8) ctx.fillRect(screenX + x, screenY, 1, TILE);
  ctx.fillStyle = WOOD.grain;
  ctx.fillRect(screenX, screenY + 11, TILE, 1);
  ctx.fillRect(screenX, screenY + 21, TILE, 1);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(screenX, screenY + TILE - 4, TILE, 4);
};

/** Pressure plate; turns green while the player stands on it. */
const drawTrap = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  ctx.fillStyle = context.activatedTraps.has(tileKey(tx, ty)) ? "#4caf50" : "#ff9800";
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.fillStyle = "#333";
  ctx.fillRect(screenX + 8, screenY + 8, TILE - 16, TILE - 16);
};

const drawFinishFlag = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  ctx.fillStyle = "#8b8b8b";
  ctx.fillRect(screenX + TILE / 2 - 2, screenY + 4, 4, TILE - 8);
  ctx.fillStyle = "#ff2d55";
  ctx.fillRect(screenX + TILE / 2 + 2, screenY + 6, TILE / 2 - 4, TILE / 3);
};
