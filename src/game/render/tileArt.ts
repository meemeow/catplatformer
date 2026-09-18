import { TILE } from "../constants";
import { DIRT, GRASS, ROCK, STONE } from "./palette";
import { createSeededRandom, tileSeed } from "./random";

/** Allocates the offscreen tile canvas every painter draws into. */
const createTileCanvas = (): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} => {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  return { canvas, ctx: canvas.getContext("2d") as CanvasRenderingContext2D };
};

/** How deep the grass cap sits before the blades start. */
const GRASS_BODY = 9;

/**
 * Scatters flecks of light and dark over the soil.
 *
 * Two passes at different sizes read as grit rather than noise: a few larger
 * clods, then finer specks between them.
 */
const paintSoilTexture = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
  fromY: number,
): void => {
  const span = TILE - fromY;

  for (let i = 0; i < 14; i++) {
    const x = Math.floor(random() * TILE);
    const y = fromY + Math.floor(random() * span);
    const size = random() > 0.65 ? 2 : 1;
    ctx.fillStyle = random() > 0.5 ? DIRT.speckDark : DIRT.speckLight;
    ctx.fillRect(x, y, size, size);
  }

  // Pebbles sit low, so they look settled into the soil rather than sprinkled.
  const pebbles = 1 + Math.floor(random() * 3);
  for (let i = 0; i < pebbles; i++) {
    const x = Math.floor(2 + random() * (TILE - 6));
    const y = fromY + Math.floor(span * 0.4 + random() * span * 0.5);
    ctx.fillStyle = DIRT.pebble;
    ctx.fillRect(x, y, 3, 2);
    ctx.fillStyle = DIRT.speckDark;
    ctx.fillRect(x, y + 2, 3, 1);
  }
};

/**
 * The grass cap: a lit crown, a body, and blades of uneven length hanging
 * into the soil so the boundary between the two is ragged rather than a line.
 */
const paintGrassCap = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
): void => {
  ctx.fillStyle = GRASS.body;
  ctx.fillRect(0, 0, TILE, GRASS_BODY);
  ctx.fillStyle = GRASS.top;
  ctx.fillRect(0, 0, TILE, 5);
  ctx.fillStyle = GRASS.highlight;
  ctx.fillRect(0, 0, TILE, 2);

  for (let x = 0; x < TILE; x += 2) {
    const depth = 2 + Math.floor(random() * 8);
    ctx.fillStyle = GRASS.body;
    ctx.fillRect(x, GRASS_BODY, 2, depth);
    ctx.fillStyle = GRASS.shadow;
    ctx.fillRect(x, GRASS_BODY + depth - 1, 2, 1);

    // An occasional longer blade breaks up the repetition.
    if (random() > 0.78) {
      ctx.fillStyle = GRASS.shadow;
      ctx.fillRect(x, GRASS_BODY + depth, 1, 2 + Math.floor(random() * 3));
    }
  }

  ctx.fillStyle = GRASS.deep;
  ctx.fillRect(0, GRASS_BODY - 1, TILE, 1);
};

/**
 * Solid ground. Grass is added only when the tile is exposed to the sky,
 * which the caller decides from the tile above.
 */
export const paintSoilTile = (
  tx: number,
  ty: number,
  variant: number,
  showGrass: boolean,
): HTMLCanvasElement => {
  const { canvas, ctx } = createTileCanvas();
  const random = createSeededRandom(tileSeed(tx, ty, variant << 4));

  const soil = ctx.createLinearGradient(0, 0, 0, TILE);
  soil.addColorStop(0, DIRT.top);
  soil.addColorStop(0.5, DIRT.mid);
  soil.addColorStop(1, DIRT.bottom);
  ctx.fillStyle = soil;
  ctx.fillRect(0, 0, TILE, TILE);

  paintSoilTexture(ctx, random, showGrass ? GRASS_BODY : 0);

  // Thin roots trailing down out of the grass.
  if (showGrass) {
    ctx.strokeStyle = DIRT.root;
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(random() * TILE) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, GRASS_BODY + 4);
      ctx.lineTo(x + (random() > 0.5 ? 3 : -3), TILE - 6);
      ctx.stroke();
    }
    paintGrassCap(ctx, random);
  }

  // Grounds the block against whatever is beneath it.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, TILE - 3, TILE, 3);

  return canvas;
};

/** Brick rows per tile, and the offset alternating rows are shifted by. */
const BRICK_ROWS = 4;
const BRICK_H = TILE / BRICK_ROWS;
const BRICK_W = TILE / 2;

/**
 * Mossy masonry, used for the decorative walls the player can pass through.
 *
 * The courses are sized so the pattern tiles seamlessly: two bricks across,
 * four rows down, with every other row offset by half a brick.
 */
export const paintStoneBrickTile = (
  tx: number,
  ty: number,
  variant: number,
): HTMLCanvasElement => {
  const { canvas, ctx } = createTileCanvas();
  const random = createSeededRandom(tileSeed(tx, ty, variant << 6));

  ctx.fillStyle = STONE.mortar;
  ctx.fillRect(0, 0, TILE, TILE);

  for (let row = 0; row < BRICK_ROWS; row++) {
    const y = row * BRICK_H;
    const offset = row % 2 === 0 ? 0 : -BRICK_W / 2;

    // Three columns, so the half-brick shifted off each edge still lands.
    for (let col = -1; col <= 2; col++) {
      const x = col * BRICK_W + offset;
      ctx.fillStyle = (row + col) % 2 === 0 ? STONE.brick : STONE.brickAlt;
      ctx.fillRect(x + 1, y + 1, BRICK_W - 2, BRICK_H - 2);

      ctx.fillStyle = STONE.bevel;
      ctx.fillRect(x + 1, y + 1, BRICK_W - 2, 1);
      ctx.fillStyle = STONE.shade;
      ctx.fillRect(x + 1, y + BRICK_H - 2, BRICK_W - 2, 1);

      if (random() > 0.55) {
        ctx.fillStyle = STONE.shade;
        ctx.fillRect(
          x + 2 + Math.floor(random() * (BRICK_W - 6)),
          y + 3 + Math.floor(random() * 2),
          2,
          1,
        );
      }
    }
  }

  // Moss gathers along the upper courses, as it does on the reference art.
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(random() * TILE);
    const y = Math.floor(random() * TILE);
    if (random() > 0.45) continue;
    ctx.fillStyle = random() > 0.5 ? STONE.moss : STONE.mossDark;
    ctx.fillRect(x, y, 2, 1);
  }

  return canvas;
};

/** A half-height boulder. Decorative; it does not block movement. */
export const paintRockTile = (
  tx: number,
  ty: number,
  variant: number,
): HTMLCanvasElement => {
  const { canvas, ctx } = createTileCanvas();
  const random = createSeededRandom(tileSeed(tx, ty, variant << 8));

  const rockTop = TILE / 2;
  const curve = 7;

  const stone = ctx.createLinearGradient(0, rockTop, 0, TILE);
  stone.addColorStop(0, ROCK.light);
  stone.addColorStop(0.35, ROCK.mid);
  stone.addColorStop(1, ROCK.dark);
  ctx.fillStyle = stone;

  ctx.beginPath();
  ctx.moveTo(curve, rockTop);
  ctx.quadraticCurveTo(0, rockTop + curve / 2, 0, rockTop + curve);
  ctx.lineTo(0, TILE);
  ctx.lineTo(TILE, TILE);
  ctx.lineTo(TILE, rockTop + curve);
  ctx.quadraticCurveTo(TILE, rockTop, TILE - curve, rockTop);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.clip();

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = ROCK.vein;
    ctx.fillRect(
      Math.floor(random() * TILE),
      rockTop + Math.floor(random() * (TILE - rockTop)),
      2 + Math.floor(random() * 5),
      1,
    );
  }
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = random() > 0.5 ? ROCK.light : ROCK.dark;
    ctx.fillRect(
      Math.floor(random() * TILE),
      rockTop + Math.floor(random() * (TILE - rockTop)),
      1,
      1,
    );
  }

  // Lit crown and a shadow where the rock meets the ground.
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(curve, rockTop, TILE - curve * 2, 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, TILE - 3, TILE, 3);
  ctx.restore();

  // A little moss on top, tying it to the masonry and the grass.
  ctx.fillStyle = STONE.moss;
  for (let x = 2; x < TILE - 2; x += 3) {
    if (random() > 0.55) ctx.fillRect(x, rockTop - 1, 2, 2);
  }

  return canvas;
};
